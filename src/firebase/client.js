import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { isTransientAiError, retryTransientAiRequest } from '../utils/aiRetry.js';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
export const firebaseApp = firebaseConfigured ? initializeApp(config) : null;
const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_ENTERPRISE_KEY;
const appCheckDebugValue = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG;
const appCheckDebug = import.meta.env.DEV && Boolean(appCheckDebugValue);
if (appCheckDebug && typeof self !== 'undefined') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugValue === 'true' ? true : appCheckDebugValue;
}
if (firebaseApp && appCheckKey && typeof window !== 'undefined') {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });
}
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const database = firebaseApp ? getFirestore(firebaseApp) : null;
const ai = firebaseApp ? getAI(firebaseApp, { backend: new GoogleAIBackend() }) : null;
const aiModelName = import.meta.env.VITE_FIREBASE_AI_MODEL || 'gemini-3.8-flash';
const googleSearchGrounding = import.meta.env.VITE_FIREBASE_AI_GROUNDING === 'true';
const model = ai ? getGenerativeModel(ai, {
  model: aiModelName,
  ...(googleSearchGrounding ? { tools: [{ googleSearch: {} }] } : {}),
  generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096, temperature: 0.2 },
}) : null;

export function observeAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function signInWithPassword(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccount(email, password, name) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
  return credential;
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  return signOut(auth);
}

export async function updateUserDisplayName(name) {
  if (!auth?.currentUser) throw new Error('You are signed out. Sign in to update your profile.');
  await updateProfile(auth.currentUser, { displayName: name.trim() });
  return auth.currentUser;
}

export async function loadUserScreenings(uid, email = '', audience = 'recruiter') {
  const screenings = collection(database, 'screenings');
  const queries = [getDocs(query(screenings, where('ownerUid', '==', uid)))];
  if (audience === 'candidate' && email) {
    queries.push(getDocs(query(screenings, where('candidateEmail', '==', email.trim().toLowerCase()))));
  }
  const snapshots = await Promise.all(queries);
  const unique = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((item) => unique.set(item.id, item.data())));
  return [...unique.values()].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export async function saveUserScreening(uid, screening) {
  const { resumeText, ...savedRecord } = screening;
  await setDoc(doc(database, 'screenings', screening.id), {
    ...savedRecord,
    candidateEmail: String(savedRecord.candidateEmail || '').trim().toLowerCase(),
    ownerUid: uid,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUserScreening(id) {
  await deleteDoc(doc(database, 'screenings', id));
}

export async function deleteFirebaseAccount(uid) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) throw new Error('You are signed out. Sign in again to delete this account.');
  const token = await currentUser.getIdTokenResult();
  const authenticatedAt = Number(token.claims.auth_time) * 1000;
  if (!Number.isFinite(authenticatedAt) || Date.now() - authenticatedAt > 5 * 60 * 1000) {
    throw new Error('For security, sign out and sign back in, then immediately retry account deletion. No data was deleted.');
  }
  const screenings = await getDocs(query(collection(database, 'screenings'), where('ownerUid', '==', uid)));
  await Promise.all(screenings.docs.map((item) => deleteDoc(item.ref)));
  await deleteUser(currentUser);
}

async function generateJson(prompt) {
  if (!model) throw new Error('Connect Firebase and enable Firebase AI Logic to use AI analysis.');
  let result;
  try {
    result = await retryTransientAiRequest(() => model.generateContent(prompt));
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/app check token is invalid|invalid app.?check token/i.test(message)) {
      throw new Error('App Check validation could not be completed in this browser session. The local match analysis will continue without AI enhancements.');
    }
    if (isTransientAiError(error)) {
      throw new Error('The AI service is temporarily unavailable. The local match analysis will continue without AI enhancements.');
    }
    throw error;
  }
  const response = result.response;
  const text = response.text();
  if (!text) throw new Error('The AI service returned an empty response.');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The AI service returned an unreadable response. Please retry.');
  }
  const candidate = response.candidates?.[0];
  const grounding = candidate?.groundingMetadata;
  return {
    data: parsed,
    model: aiModelName,
    sources: (grounding?.groundingChunks || []).flatMap((chunk) => chunk.web?.uri ? [{ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri }] : []),
    searchEntryPoint: grounding?.searchEntryPoint?.renderedContent || '',
    searchQueries: grounding?.webSearchQueries || [],
  };
}

export async function suggestRoleFromResume(resumeText) {
  const resume = resumeText.slice(0, 70000);
  const prompt = `Analyze this resume to identify an explicitly stated applied-for job role. If there is no explicit application statement, infer the best-supported target role from experience and skills and label it inferred. Never say the candidate applied if that is not stated. Then write a complete, editable job description for that role (150-220 words) with responsibilities, required qualifications, preferred qualifications, and success expectations. Return 6-10 concrete skills/qualifications, separating required and preferred. Use current occupation expectations; do not invent seniority or credentials unsupported by the resume.${googleSearchGrounding ? ' Use Google Search grounding to verify current occupation expectations.' : ' Do not claim to have searched the live web.'} Return JSON only with keys: roleTitle (string), applicationIntent ("explicit" or "inferred"), rationale (string), jobDescription (string), requirements (array of {name:string,priority:"required"|"preferred"}). Requirements must be concrete skills or qualifications, not generic words. Do not include protected characteristics.\n\nRESUME:\n${resume}`;
  let response = await generateJson(prompt);
  const isComplete = (data) => String(data.roleTitle || '').trim()
    && String(data.jobDescription || '').trim().length >= 450
    && Array.isArray(data.requirements)
    && data.requirements.filter((item) => String(item.name || '').trim()).length >= 4;
  if (!isComplete(response.data)) {
    response = await generateJson(`Return a complete role draft in the required JSON structure. The jobDescription must be 150-220 words (at least 450 characters) and requirements must contain 6-10 concrete skills/qualifications with required or preferred priority. Do not return only a role title or a one-line description.\n\nResume:\n${resume}\n\nIncomplete first draft to repair:\n${JSON.stringify(response.data)}`);
  }
  const roleTitle = String(response.data.roleTitle || '').trim();
  const jobDescription = String(response.data.jobDescription || '').trim();
  const requirements = Array.isArray(response.data.requirements) ? response.data.requirements.map((item) => ({
    name: String(item.name || '').trim(),
    priority: item.priority === 'preferred' ? 'preferred' : 'required',
  })).filter((item) => item.name) : [];
  if (!roleTitle || jobDescription.length < 300 || requirements.length < 3) {
    throw new Error('AI could not produce a complete target role draft. Check Firebase AI Logic, then select “Suggest role from resume” to retry.');
  }
  return {
    ...response.data,
    roleTitle,
    jobDescription,
    requirements,
    sources: response.sources,
    searchEntryPoint: response.searchEntryPoint,
    searchQueries: response.searchQueries,
  };
}

export async function analyzeResumeWithAi({ resumeText, jobTitle, jobDescription }) {
  const { data, sources, searchEntryPoint, searchQueries, model: modelName } = await generateJson(`Compare the candidate resume against the provided job role and job description. Assess only relevant evidence. Missing evidence means "not evidenced", not proof of inability. Do not infer or consider protected characteristics.${googleSearchGrounding ? ' Use Google Search grounding to verify reputable, current learning resources and return their URLs.' : ' Recommend established learning platforms with their official homepages; do not claim links or information were verified through live web search.'} Return JSON only with keys: fitLevel ("Strong fit"|"Potential fit"|"Not yet evidenced"), summary (string), concerns (array of strings explaining role-related gaps), improvementPlan (array of practical steps), evidence (array of short resume excerpts), requirements (array of {name:string,priority:"required"|"preferred",found:boolean,evidence:string}), learningResources (array of {skill:string,platform:string,url:string,reason:string}), webSources (array of {title:string,url:string}). Recommend accessible learning platforms (for example official vendor learning, freeCodeCamp, Coursera, edX, or Khan Academy) but never invent a specific course URL. Treat this as advisory decision support, not an automated employment decision.\n\nROLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 30000)}\n\nRESUME:\n${resumeText.slice(0, 70000)}`);
  const assessedRequirements = Array.isArray(data.requirements) ? data.requirements.filter((item) => String(item.name || '').trim()) : [];
  if (!String(data.fitLevel || '').trim() || !String(data.summary || '').trim() || assessedRequirements.length < 3) {
    throw new Error('AI returned an incomplete role assessment. Retry the analysis to get a fit summary and required-skill checks.');
  }
  const cleanUrl = (url) => {
    try {
      const parsed = new URL(String(url));
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch {
      return '';
    }
  };
  const learningDomains = [
    'coursera.org', 'edx.org', 'learn.microsoft.com', 'cloudskillsboost.google',
    'skillbuilder.aws', 'freecodecamp.org', 'kaggle.com', 'developer.mozilla.org',
    'codecademy.com', 'udemy.com', 'skillsforall.com', 'khanacademy.org',
  ];
  const isLearningDomain = (url) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return learningDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  };
  return {
    ...data,
    requirements: assessedRequirements,
    learningResources: Array.isArray(data.learningResources) ? data.learningResources.map((item) => ({
      skill: String(item.skill || ''),
      platform: String(item.platform || ''),
      url: cleanUrl(item.url),
      reason: String(item.reason || ''),
    })).filter((item) => item.skill && item.platform && item.url && isLearningDomain(item.url)) : [],
    sources: sources.map((item) => ({ title: String(item.title || item.url || ''), url: cleanUrl(item.url) })).filter((item) => item.title && item.url),
    searchEntryPoint,
    searchQueries,
    model: modelName,
  };
}