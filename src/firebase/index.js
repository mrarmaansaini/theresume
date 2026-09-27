const loadFirebaseClient = () => import('./client.js');

export const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY
  && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  && import.meta.env.VITE_FIREBASE_PROJECT_ID
  && import.meta.env.VITE_FIREBASE_APP_ID,
);

export async function observeAuth(callback) {
  const { observeAuth: observe } = await loadFirebaseClient();
  return observe(callback);
}

export async function signInWithPassword(...args) {
  return (await loadFirebaseClient()).signInWithPassword(...args);
}

export async function createAccount(...args) {
  return (await loadFirebaseClient()).createAccount(...args);
}

export async function signInWithGoogle(...args) {
  return (await loadFirebaseClient()).signInWithGoogle(...args);
}

export async function signInWithGoogleRedirect(...args) {
  return (await loadFirebaseClient()).signInWithGoogleRedirect(...args);
}

export async function formatAuthErrorMessage(...args) {
  return (await loadFirebaseClient()).formatAuthErrorMessage(...args);
}

export async function signOutUser(...args) {
  return (await loadFirebaseClient()).signOutUser(...args);
}

export async function updateUserDisplayName(...args) {
  return (await loadFirebaseClient()).updateUserDisplayName(...args);
}

export async function loadUserScreenings(...args) {
  return (await loadFirebaseClient()).loadUserScreenings(...args);
}

export async function saveUserScreening(...args) {
  return (await loadFirebaseClient()).saveUserScreening(...args);
}

export async function deleteUserScreening(...args) {
  return (await loadFirebaseClient()).deleteUserScreening(...args);
}

export async function deleteFirebaseAccount(...args) {
  return (await loadFirebaseClient()).deleteFirebaseAccount(...args);
}

export async function suggestRoleFromResume(...args) {
  return (await loadFirebaseClient()).suggestRoleFromResume(...args);
}

export async function analyzeResumeWithAi(...args) {
  return (await loadFirebaseClient()).analyzeResumeWithAi(...args);
}

export async function fetchMarketPulse(...args) {
  return (await loadFirebaseClient()).fetchMarketPulse(...args);
}

export async function extractLinkedInProfile(...args) {
  return (await loadFirebaseClient()).extractLinkedInProfile(...args);
}

export async function rewriteResumeBullets(...args) {
  return (await loadFirebaseClient()).rewriteResumeBullets(...args);
}

export async function evaluateInterviewAnswer(...args) {
  return (await loadFirebaseClient()).evaluateInterviewAnswer(...args);
}
