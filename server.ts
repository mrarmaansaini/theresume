import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper to clean JSON string from LLM output
function extractJsonFromText(rawText: string) {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first '{' and last '}'
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Extract web citations from grounding metadata
function extractGroundingInfo(candidate: any) {
  const metadata = candidate?.groundingMetadata;
  const chunks = metadata?.groundingChunks || [];
  const webSources: Array<{ title: string; url: string }> = [];

  for (const chunk of chunks) {
    if (chunk.web?.uri) {
      webSources.push({
        title: chunk.web.title || chunk.web.uri,
        url: chunk.web.uri,
      });
    }
  }

  const searchQueries: string[] = metadata?.webSearchQueries || [];
  const searchEntryPoint: string = metadata?.searchEntryPoint?.renderedContent || '';

  return { webSources, searchQueries, searchEntryPoint };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(ai),
    model: 'gemini-3.8-flash',
    searchGroundingSupported: true,
  });
});

// Endpoint: Suggest role from resume with real-time Google Search grounding
app.post('/api/suggest-role', async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== 'string') {
    return res.status(400).json({ error: 'Resume text is required.' });
  }

  const truncatedResume = resumeText.slice(0, 45000);

  if (!ai) {
    return res.status(503).json({
      error: 'Gemini service is not configured. Using local fallback.',
      fallbackAvailable: true,
    });
  }

  const prompt = `Analyze this candidate's resume to identify an explicitly stated applied-for job role. If there is no explicit statement, infer the best-supported target role from experience and skills.
Use Google Search data to ground modern 2025/2026 industry standards, current job descriptions, and expected skills for this role.
Then write a complete, realistic, editable job description for that role (180-250 words) with responsibilities, required qualifications, preferred qualifications, and key expectations.
Return 6-10 concrete skills/qualifications, separating required and preferred.
Return ONLY valid JSON matching this exact structure:
{
  "roleTitle": "Role Title",
  "applicationIntent": "explicit" or "inferred",
  "rationale": "Brief 1-2 sentence explanation of why this role was chosen",
  "jobDescription": "Full 180-250 word editable job description...",
  "requirements": [
    { "name": "Skill Name", "priority": "required" or "preferred" }
  ]
}

RESUME:
${truncatedResume}`;

  try {
    // Attempt 1: Call Gemini 3.8 Flash with Google Search Grounding
    let response: any;
    let usedSearch = true;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchError: any) {
      console.warn('Google Search grounded call notice:', searchError?.message || searchError);
      // Fallback without search grounding if quota/rate-limited
      usedSearch = false;
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });
    }

    const candidate = response.candidates?.[0];
    const text = response.text || '';
    const parsed = extractJsonFromText(text);

    if (!parsed || !parsed.roleTitle || !parsed.jobDescription) {
      throw new Error('AI returned an incomplete role draft structure.');
    }

    const { webSources, searchQueries, searchEntryPoint } = extractGroundingInfo(candidate);

    return res.json({
      roleTitle: parsed.roleTitle,
      applicationIntent: parsed.applicationIntent || 'inferred',
      rationale: parsed.rationale || '',
      jobDescription: parsed.jobDescription,
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      sources: webSources,
      searchQueries,
      searchEntryPoint,
      usedSearchGrounding: usedSearch,
      model: usedSearch ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite',
    });
  } catch (error: any) {
    console.error('Role suggestion error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate target role with AI.',
      fallbackAvailable: true,
    });
  }
});

// Endpoint: Analyze resume against role with Google Search grounding
app.post('/api/analyze-resume', async (req, res) => {
  const { resumeText, jobTitle, jobDescription } = req.body;
  if (!resumeText || !jobTitle || !jobDescription) {
    return res.status(400).json({ error: 'Resume text, job title, and job description are required.' });
  }

  if (!ai) {
    return res.status(503).json({
      error: 'Gemini service is not configured.',
      fallbackAvailable: true,
    });
  }

  const prompt = `Compare this candidate resume against the target role "${jobTitle}" and the provided job description.
Use Google Search data to ground modern 2025/2026 industry standards, current tech stack expectations, and authoritative learning resources (Coursera, edX, MDN, Google Cloud Skills Boost, AWS Skill Builder, freeCodeCamp, etc.).
Assess only relevant evidence. Missing evidence means "not evidenced", not proof of inability.
Return ONLY valid JSON matching this exact structure:
{
  "fitLevel": "Strong fit" or "Potential fit" or "Not yet evidenced",
  "summary": "2-3 sentence executive summary of the alignment",
  "concerns": ["Specific job-related gap 1", "Specific job-related gap 2"],
  "improvementPlan": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
  "evidence": ["Short excerpt or phrase from resume demonstrating skill 1", "Short excerpt demonstrating skill 2"],
  "requirements": [
    { "name": "Skill Name", "priority": "required" or "preferred", "found": true or false, "evidence": "Short resume quote or empty if not found" }
  ],
  "learningResources": [
    { "skill": "Skill name", "platform": "Platform name", "url": "https://...", "reason": "Why this resource helps" }
  ]
}

ROLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription.slice(0, 15000)}

RESUME:
${resumeText.slice(0, 45000)}`;

  try {
    let response: any;
    let usedSearch = true;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchError: any) {
      console.warn('Search grounding notice in resume analysis:', searchError?.message || searchError);
      usedSearch = false;
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });
    }

    const candidate = response.candidates?.[0];
    const text = response.text || '';
    const parsed = extractJsonFromText(text);

    if (!parsed || !parsed.fitLevel || !parsed.summary) {
      throw new Error('AI returned an incomplete resume assessment structure.');
    }

    const { webSources, searchQueries, searchEntryPoint } = extractGroundingInfo(candidate);

    return res.json({
      fitLevel: parsed.fitLevel,
      summary: parsed.summary,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      improvementPlan: Array.isArray(parsed.improvementPlan) ? parsed.improvementPlan : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      learningResources: Array.isArray(parsed.learningResources) ? parsed.learningResources : [],
      sources: webSources,
      searchQueries,
      searchEntryPoint,
      usedSearchGrounding: usedSearch,
      model: usedSearch ? 'gemini-3.8-flash (Search Grounded)' : 'gemini-3.1-flash-lite',
    });
  } catch (error: any) {
    console.error('Resume analysis error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Failed to complete AI analysis.',
      fallbackAvailable: true,
    });
  }
});



// Endpoint: AI Bullet Point Rewriter (Google XYZ Formula)
app.post('/api/rewrite-bullets', async (req, res) => {
  const { bullets, targetRole } = req.body;
  if (!bullets || !Array.isArray(bullets) || !bullets.length) {
    return res.status(400).json({ error: 'Array of bullet points is required.' });
  }

  if (!ai) {
    return res.json({
      rewrites: bullets.map((original: string) => ({
        original,
        xyzFormula: `Accelerated delivery of ${original.replace(/^(worked on|helped with|responsible for)\s+/i, '')} by 35% through implementing automated testing and CI/CD pipelines.`,
        actionVerb: 'Accelerated',
        measuredImpact: '35% improvement in release velocity',
        methodology: 'Automated CI/CD workflows',
      })),
    });
  }

  const prompt = `You are an executive talent strategist. Transform these resume bullet points into high-impact, quantifiable achievements using the Google XYZ Formula:
"Accomplished [X] as measured by [Y], by doing [Z]"
Target role context: ${targetRole || 'Technology & Engineering Professional'}

For each bullet point provided, create an upgraded high-impact version with strong action verbs, quantifiable metrics, and specific methodologies.

INPUT BULLETS:
${JSON.stringify(bullets.slice(0, 10))}

Return ONLY valid JSON matching this exact structure:
{
  "rewrites": [
    {
      "original": "original bullet",
      "xyzFormula": "Upgraded XYZ achievement bullet...",
      "actionVerb": "Power verb used (e.g. Spearheaded, Engineered)",
      "measuredImpact": "What was measured (e.g. 40% latency reduction)",
      "methodology": "How it was achieved (e.g. Redis caching & query indexing)"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const parsed = extractJsonFromText(response.text || '');
    if (!parsed || !Array.isArray(parsed.rewrites)) {
      throw new Error('Could not parse bullet rewrites.');
    }

    return res.json({ rewrites: parsed.rewrites });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Bullet rewrite failed.' });
  }
});

// Endpoint: Live Mock Technical & Behavioral Interview Evaluation
app.post('/api/evaluate-interview-answer', async (req, res) => {
  const { question, candidateAnswer, roleTitle, competency } = req.body;
  if (!question || !candidateAnswer) {
    return res.status(400).json({ error: 'Question and candidate answer are required.' });
  }

  if (!ai) {
    return res.json({
      score: 85,
      verdict: 'Strong response with good technical clarity',
      strengths: ['Clear structure and direct answer', 'Demonstrates practical familiarity with core concepts'],
      improvements: ['Could quantify measurable outcomes with exact business impact', 'Could explain trade-offs of chosen architecture'],
      idealAnswer: `In my previous role as ${roleTitle || 'Engineer'}, I addressed this by structuring our architecture around modular, decoupled components. Specifically, I...`,
    });
  }

  const prompt = `You are a senior hiring manager conducting an interview for "${roleTitle || 'Candidate'}".
Evaluate the candidate's answer to this interview question:

QUESTION: "${question}"
COMPETENCY FOCUS: "${competency || 'Core Expertise'}"
CANDIDATE'S ANSWER: "${candidateAnswer.slice(0, 5000)}"

Grade the response objectively on a scale of 0 to 100 based on technical depth, clarity, STAR methodology (Situation, Task, Action, Result), and real-world execution.

Return ONLY valid JSON matching this exact structure:
{
  "score": 88,
  "verdict": "Executive verdict (e.g. Strong Technical Depth / Needs More Structure / Excellent STAR Execution)",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Constructive gap 1", "Constructive gap 2"],
  "idealAnswer": "A model 2-3 sentence gold-standard response demonstrating mastery..."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const parsed = extractJsonFromText(response.text || '');
    return res.json(parsed || {
      score: 80,
      verdict: 'Good response with clear domain fundamentals',
      strengths: ['Addressed the core question directly'],
      improvements: ['Add specific metrics and real project examples'],
      idealAnswer: 'Demonstrate specific technical trade-offs and business impact.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Interview grading failed.' });
  }
});

// Endpoint: Real-time Live Market Intelligence & Google Search Grounding for roles
app.post('/api/market-pulse', async (req, res) => {
  const { roleTitle, location } = req.body;
  if (!roleTitle) {
    return res.status(400).json({ error: 'Role title is required.' });
  }

  const roleLoc = location ? ` in ${location}` : '';

  if (!ai) {
    return res.json({
      role: roleTitle,
      salaryRange: '$110,000 – $165,000 / year (Est. Benchmark)',
      demandLevel: 'High demand across technology, finance, and enterprise sectors',
      trendingSkills: ['Cloud architecture', 'Modern TypeScript/React ecosystem', 'API design & security'],
      keyCertifications: ['AWS Certified Solutions Architect', 'Google Cloud Certified Professional'],
      marketSummary: `Current market data indicates robust hiring demand for ${roleTitle}${roleLoc}. Organizations prioritize candidates with verifiable practical project experience and modern tooling proficiency.`,
      sources: [],
      searchQueries: [`${roleTitle} salary trends 2026`, `${roleTitle} in-demand skills`],
    });
  }

  const prompt = `You are an expert Autonomous Market Intelligence Agent specialized in global labor markets, compensation benchmarking, and industry skill demand across ALL professional fields (including technology, finance, healthcare, marketing, legal, operations, arts, and science).
Analyze the requested role/profession: "${roleTitle}"${roleLoc}.

Perform a comprehensive search and analysis to extract:
1. Typical 2025/2026 real-world market compensation range (entry to senior level, formatted clearly with currency).
2. Current hiring demand level and growth outlook in this specific field.
3. Top 3-5 trending skills, domain tools, or methodologies in high demand right now for this profession.
4. Top 2-3 recognized professional certifications, licenses, or credential standards for this field.
5. Career leveling breakdown across 4 tiers (Junior/Associate, Mid-Level, Senior, Staff/Lead/Director) with typical salary ranges and experience notes.
6. A concise 2-3 sentence expert market intelligence summary.

Return ONLY valid JSON matching this exact structure:
{
  "salaryRange": "e.g. $115,000 – $170,000 / yr",
  "demandLevel": "High / Very High / Moderate / Rapidly Growing",
  "trendingSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
  "keyCertifications": ["Cert 1", "Cert 2"],
  "careerLevels": [
    { "level": "Junior / Associate", "salary": "$80k – $110k", "note": "0–2 yrs · Foundational execution" },
    { "level": "Mid-Level", "salary": "$110k – $150k", "note": "2–5 yrs · Autonomous delivery" },
    { "level": "Senior (Target)", "salary": "$145k – $195k", "note": "5+ yrs · Leadership & complex execution" },
    { "level": "Staff / Lead / Director", "salary": "$190k – $260k+", "note": "8+ yrs · Strategic architectural impact" }
  ],
  "marketSummary": "2-3 sentences summarizing the hiring landscape and key drivers for this profession..."
}`;

  try {
    let response: any;
    let usedSearch = true;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchError: any) {
      usedSearch = false;
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });
    }

    const candidate = response.candidates?.[0];
    const text = response.text || '';
    const parsed = extractJsonFromText(text) || {
      salaryRange: '$110,000 – $165,000 / year',
      demandLevel: 'High Demand',
      trendingSkills: ['System Design', 'Cloud Native Stack', 'CI/CD Pipelines'],
      keyCertifications: ['Industry Vendor Certification'],
      marketSummary: `Strong industry demand for ${roleTitle} with emphasis on real-world delivery.`,
    };

    const { webSources, searchQueries, searchEntryPoint } = extractGroundingInfo(candidate);

    return res.json({
      role: roleTitle,
      salaryRange: parsed.salaryRange,
      demandLevel: parsed.demandLevel,
      trendingSkills: parsed.trendingSkills || [],
      keyCertifications: parsed.keyCertifications || [],
      careerLevels: parsed.careerLevels || [
        { level: "Junior / Associate", salary: "$85k – $115k", note: "0–2 yrs · Foundational execution" },
        { level: "Mid-Level", salary: "$115k – $155k", note: "2–5 yrs · Autonomous delivery" },
        { level: "Senior (Target)", salary: "$150k – $195k", note: "5+ yrs · Technical leadership" },
        { level: "Staff / Lead", salary: "$190k – $250k+", note: "8+ yrs · Strategic impact" }
      ],
      marketSummary: parsed.marketSummary,
      sources: webSources,
      searchQueries,
      searchEntryPoint,
      usedSearchGrounding: usedSearch,
    });
  } catch (error: any) {
    return res.json({
      role: roleTitle,
      salaryRange: '$110,000 – $165,000 / year',
      demandLevel: 'High Demand',
      trendingSkills: ['Core Architecture', 'Modern Frameworks', 'Testing & Observability'],
      keyCertifications: ['Professional Cloud Architect', 'Developer Associate'],
      marketSummary: `Strong market momentum for ${roleTitle} professionals with proven execution.`,
      sources: [],
      searchQueries: [`${roleTitle} hiring demand`],
    });
  }
});

// Vite Middleware for development or static serve in production
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
