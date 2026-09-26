// Deterministic, explainable matching rules. No resume text leaves the browser.

export const SKILL_CATALOG = [
  { name: 'JavaScript', group: 'Engineering', aliases: ['javascript', 'js'] },
  { name: 'TypeScript', group: 'Engineering', aliases: ['typescript', 'ts'] },
  { name: 'React', group: 'Engineering', aliases: ['react.js', 'reactjs', 'react'] },
  { name: 'Next.js', group: 'Engineering', aliases: ['next.js', 'nextjs'] },
  { name: 'Vue.js', group: 'Engineering', aliases: ['vue.js', 'vuejs', 'vue'] },
  { name: 'Angular', group: 'Engineering', aliases: ['angular'] },
  { name: 'HTML', group: 'Engineering', aliases: ['html', 'html5'] },
  { name: 'CSS', group: 'Engineering', aliases: ['css', 'css3'] },
  { name: 'Tailwind CSS', group: 'Engineering', aliases: ['tailwind css', 'tailwind'] },
  { name: 'Node.js', group: 'Engineering', aliases: ['node.js', 'nodejs', 'node'] },
  { name: 'Express', group: 'Engineering', aliases: ['express.js', 'expressjs', 'express'] },
  { name: 'REST APIs', group: 'Engineering', aliases: ['rest api', 'rest apis', 'restful api', 'restful apis'] },
  { name: 'GraphQL', group: 'Engineering', aliases: ['graphql'] },
  { name: 'Python', group: 'Engineering', aliases: ['python'] },
  { name: 'Java', group: 'Engineering', aliases: ['java'] },
  { name: 'C++', group: 'Engineering', aliases: ['c++'] },
  { name: 'C#', group: 'Engineering', aliases: ['c#', 'c sharp'] },
  { name: 'Go', group: 'Engineering', aliases: ['golang', 'go language'] },
  { name: 'SQL', group: 'Data', aliases: ['sql'] },
  { name: 'PostgreSQL', group: 'Data', aliases: ['postgresql', 'postgres'] },
  { name: 'MySQL', group: 'Data', aliases: ['mysql'] },
  { name: 'MongoDB', group: 'Data', aliases: ['mongodb', 'mongo db'] },
  { name: 'Redis', group: 'Engineering', aliases: ['redis'] },
  { name: 'Pandas', group: 'Data', aliases: ['pandas'] },
  { name: 'NumPy', group: 'Data', aliases: ['numpy'] },
  { name: 'scikit-learn', group: 'AI & data', aliases: ['scikit-learn', 'scikit learn', 'sklearn'] },
  { name: 'Machine learning', group: 'AI & data', aliases: ['machine learning', 'ml'] },
  { name: 'Deep learning', group: 'AI & data', aliases: ['deep learning'] },
  { name: 'Natural language processing', group: 'AI & data', aliases: ['natural language processing', 'nlp'] },
  { name: 'TensorFlow', group: 'AI & data', aliases: ['tensorflow'] },
  { name: 'PyTorch', group: 'AI & data', aliases: ['pytorch', 'torch'] },
  { name: 'Data visualization', group: 'Data', aliases: ['data visualization', 'data visualisation'] },
  { name: 'Tableau', group: 'Data', aliases: ['tableau'] },
  { name: 'Power BI', group: 'Data', aliases: ['power bi', 'powerbi'] },
  { name: 'Microsoft Excel', group: 'Data', aliases: ['microsoft excel', 'excel'] },
  { name: 'Statistics', group: 'Data', aliases: ['statistics', 'statistical analysis'] },
  { name: 'A/B testing', group: 'Product & data', aliases: ['a/b testing', 'ab testing', 'split testing'] },
  { name: 'Product analytics', group: 'Product & data', aliases: ['product analytics'] },
  { name: 'Figma', group: 'Design', aliases: ['figma'] },
  { name: 'Design systems', group: 'Design', aliases: ['design systems', 'design system'] },
  { name: 'User research', group: 'Design', aliases: ['user research', 'user interviews'] },
  { name: 'Prototyping', group: 'Design', aliases: ['prototyping', 'prototypes'] },
  { name: 'Wireframing', group: 'Design', aliases: ['wireframing', 'wireframes'] },
  { name: 'Accessibility', group: 'Design & engineering', aliases: ['accessibility', 'wcag', 'a11y'] },
  { name: 'Agile', group: 'Product & delivery', aliases: ['agile'] },
  { name: 'Scrum', group: 'Product & delivery', aliases: ['scrum'] },
  { name: 'Jira', group: 'Product & delivery', aliases: ['jira'] },
  { name: 'Git', group: 'Engineering', aliases: ['git', 'github'] },
  { name: 'Docker', group: 'Cloud & operations', aliases: ['docker'] },
  { name: 'AWS', group: 'Cloud & operations', aliases: ['amazon web services', 'aws'] },
  { name: 'Microsoft Azure', group: 'Cloud & operations', aliases: ['microsoft azure', 'azure'] },
  { name: 'Google Cloud', group: 'Cloud & operations', aliases: ['google cloud platform', 'google cloud', 'gcp'] },
  { name: 'CI/CD', group: 'Cloud & operations', aliases: ['ci/cd', 'continuous integration', 'continuous delivery'] },
  { name: 'Kubernetes', group: 'Cloud & operations', aliases: ['kubernetes', 'k8s'] },
  { name: 'Cybersecurity', group: 'Security', aliases: ['cybersecurity', 'cyber security'] },
  { name: 'Communication', group: 'People skills', aliases: ['communication', 'written communication', 'verbal communication'] },
  { name: 'Leadership', group: 'People skills', aliases: ['leadership', 'team leadership'] },
  { name: 'Project management', group: 'Product & delivery', aliases: ['project management', 'project planning'] },
  { name: 'SEO', group: 'Marketing', aliases: ['seo', 'search engine optimization', 'search engine optimisation'] },
  { name: 'Salesforce', group: 'Business', aliases: ['salesforce'] },
  { name: 'CRM', group: 'Business', aliases: ['crm', 'customer relationship management'] },
  { name: 'Financial modeling', group: 'Business & data', aliases: ['financial modeling', 'financial modelling'] },
  { name: 'Market research', group: 'Business & product', aliases: ['market research', 'competitive analysis'] },
  { name: 'Copywriting', group: 'Marketing', aliases: ['copywriting', 'copywriting skills'] },
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function termRegex(term) {
  const escaped = escapeRegex(String(term).trim()).replace(/\s+/g, '\\s+');
  // Non-alphanumeric boundaries let aliases such as C++, C#, and A/B testing work too.
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i');
}

export function containsTerm(text, term) {
  if (!text || !term) return false;
  return termRegex(term).test(String(text));
}

function getCatalogEntry(name) {
  return SKILL_CATALOG.find((skill) => skill.name.toLowerCase() === String(name).toLowerCase());
}

export function findSkills(text) {
  const source = String(text || '');
  return SKILL_CATALOG.filter((skill) => skill.aliases.some((alias) => containsTerm(source, alias)));
}

function skillPriorityInText(text, skill) {
  const source = String(text || '');
  const aliases = skill.aliases || [skill.name];
  const markers = [...source.matchAll(/\b(required(?:\s+skills?)?|must[\s-]+have|essential|preferred|nice[\s-]+to[\s-]+have|bonus|desirable|optional)\b/gi)]
    .map((match) => ({ index: match.index, end: match.index + match[0].length, preferred: /preferred|nice|bonus|desirable|optional/i.test(match[0]) }));
  let sawPreferred = false;
  for (const alias of aliases) {
    const regex = termRegex(alias);
    for (const match of source.matchAll(new RegExp(regex.source, 'gi'))) {
      const previous = markers.filter((marker) => marker.index <= match.index).at(-1);
      const next = markers.find((marker) => marker.index >= match.index + match[0].length && marker.index - (match.index + match[0].length) < 55);
      const marker = previous || next;
      if (marker && !marker.preferred) return 'required';
      if (marker?.preferred) sawPreferred = true;
    }
  }
  return sawPreferred ? 'preferred' : 'required';
}

export function detectRequirements(jobDescription) {
  return findSkills(jobDescription).map((skill) => ({
    name: skill.name,
    group: skill.group,
    priority: skillPriorityInText(jobDescription, skill),
    source: 'description',
  }));
}

export function inferRoleFromResume(resumeText) {
  const text = String(resumeText || '').trim();
  const cleaned = text.replace(/\s+/g, ' ');
  const skillNames = findSkills(cleaned).map((skill) => skill.name);
  const selectedSkills = [...new Set(skillNames.length ? skillNames.slice(0, 8) : ['Communication', 'Problem solving', 'Project management'])];

  const hasDesignSignals = ['Figma', 'Wireframing', 'User research', 'Prototyping', 'Design systems', 'Accessibility', 'UX', 'UI'].some((term) => containsTerm(cleaned, term));
  const hasAnalyticsSignals = ['Python', 'SQL', 'Tableau', 'Power BI', 'Pandas', 'NumPy', 'scikit-learn', 'Machine learning', 'Deep learning', 'Statistics', 'Data visualization'].some((term) => containsTerm(cleaned, term));
  const hasFrontendSignals = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Next.js', 'Vue.js', 'Angular', 'HTML', 'CSS', 'Tailwind CSS', 'REST APIs'].some((term) => containsTerm(cleaned, term));
  const hasBackendSignals = ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'REST APIs', 'GraphQL', 'Java', 'Go', 'Python', 'SQL'].some((term) => containsTerm(cleaned, term));
  const hasProjectSignals = ['Project management', 'Jira', 'Agile', 'Scrum', 'Leadership', 'Stakeholder', 'Roadmap'].some((term) => containsTerm(cleaned, term));

  let roleTitle = 'Generalist Professional';
  let rationale = 'The target role was inferred from the strongest visible skill and experience signals in the resume.';

  if (hasDesignSignals) {
    roleTitle = 'Product Designer';
    rationale = 'Design, research, and prototyping signals suggest a product design role.';
  } else if (hasAnalyticsSignals) {
    roleTitle = 'Data Analyst';
    rationale = 'Analytics and reporting keywords point to a data-focused role.';
  } else if (hasFrontendSignals) {
    roleTitle = 'Frontend Engineer';
    rationale = 'Frontend and JavaScript capabilities suggest a product engineering role.';
  } else if (hasBackendSignals) {
    roleTitle = 'Full Stack Engineer';
    rationale = 'Product delivery and platform tooling point to an engineering role with cross-stack ownership.';
  } else if (hasProjectSignals) {
    roleTitle = 'Project Manager';
    rationale = 'Delivery, planning, and stakeholder language suggest a project leadership role.';
  }

  const requirementList = selectedSkills.map((name, index) => ({
    name,
    priority: index < Math.min(4, selectedSkills.length) ? 'required' : 'preferred',
  }));

  const summarySkills = selectedSkills.slice(0, 3).join(', ');
  const description = `We are seeking a ${roleTitle} to contribute to measurable product and delivery outcomes. The role will involve translating requirements into clear execution, collaborating with cross-functional teams, and using ${summarySkills || 'communication and stakeholder coordination'} to improve clarity, quality, and momentum throughout delivery. The ideal candidate brings practical ownership, evidence of relevant experience, and the ability to adapt to fast-changing goals while keeping work grounded in user value and business impact.`;

  return {
    roleTitle,
    applicationIntent: 'inferred',
    rationale,
    jobDescription: description,
    requirements: requirementList,
  };
}

export function extractEmail(text) {
  return String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

export function guessCandidateName(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length > 54 || /@|https?:\/\/|linkedin|github|resume|curriculum|\d{3,}/i.test(line)) continue;
    if (/^[a-z][a-z .'-]{2,}$/i.test(line) && line.split(/\s+/).length <= 5 && !/^(profile|summary|experience|education|skills|contact|curriculum vitae)$/i.test(line)) {
      return line.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
  }
  return '';
}

export function extractYears(text) {
  const source = String(text || '');
  const stated = [];
  const explicit = /\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*(?:(?:of\s+)?(?:professional\s+)?experience)?\b/gi;
  for (const match of source.matchAll(explicit)) {
    const years = Number(match[1]);
    if (years >= 0 && years <= 50) stated.push(years);
  }
  if (stated.length) return Math.max(...stated);

  const ranges = [];
  const yearRange = /\b(19\d{2}|20\d{2})\s*(?:-|–|—|to)\s*(present|current|19\d{2}|20\d{2})\b/gi;
  for (const match of source.matchAll(yearRange)) {
    const start = Number(match[1]);
    const end = /present|current/i.test(match[2]) ? new Date().getFullYear() : Number(match[2]);
    if (end >= start && end - start <= 50) ranges.push(end - start);
  }
  return ranges.length ? Math.max(...ranges) : null;
}

function findEvidence(text, skillName) {
  const source = String(text || '');
  const entry = getCatalogEntry(skillName);
  const aliases = entry?.aliases || [skillName];
  let bestIndex = -1;
  let bestEnd = -1;
  for (const alias of aliases) {
    const regex = termRegex(alias);
    const match = regex.exec(source);
    if (match && (bestIndex === -1 || match.index < bestIndex)) {
      bestIndex = match.index;
      bestEnd = match.index + match[0].length;
    }
  }
  if (bestIndex < 0) return '';
  let start = bestIndex;
  let end = bestEnd;
  while (start > 0 && !/[\n.!?;]/.test(source[start - 1]) && bestIndex - start < 85) start -= 1;
  while (end < source.length && !/[\n.!?;]/.test(source[end]) && end - bestEnd < 95) end += 1;
  const excerpt = source.slice(start, end).replace(/\s+/g, ' ').trim();
  return excerpt.length > 175 ? `${excerpt.slice(0, 172).trimEnd()}…` : excerpt;
}

function titleTokens(title) {
  const stop = new Set(['and', 'the', 'for', 'with', 'senior', 'junior', 'lead', 'staff', 'principal', 'associate', 'mid', 'level', 'ii', 'iii', 'iv']);
  return [...new Set(String(title || '').toLowerCase().match(/[a-z0-9+#.]+/g) || [])]
    .filter((token) => token.length > 2 && !stop.has(token));
}

function getManualRequirements(manualRequirements = []) {
  return manualRequirements.map((value) => typeof value === 'string'
    ? { name: value.trim(), priority: 'required', source: 'manual' }
    : { name: String(value.name || '').trim(), priority: value.priority === 'preferred' ? 'preferred' : 'required', source: 'manual' })
    .filter((requirement) => requirement.name);
}

export function analyzeResume({
  resumeText,
  jobDescription,
  jobTitle,
  candidateName = '',
  candidateEmail = '',
  manualRequirements = [],
}) {
  const resume = String(resumeText || '').trim();
  const description = String(jobDescription || '').trim();
  const title = String(jobTitle || '').trim();
  const automatic = detectRequirements(description);
  const combined = [...automatic, ...getManualRequirements(manualRequirements)];
  const deduped = new Map();
  for (const requirement of combined) {
    const key = requirement.name.toLowerCase();
    const existing = deduped.get(key);
    if (!existing || requirement.priority === 'required') deduped.set(key, requirement);
  }
  const requirements = [...deduped.values()].map((requirement) => {
    const entry = getCatalogEntry(requirement.name);
    const aliases = entry?.aliases || [requirement.name];
    const found = aliases.some((alias) => containsTerm(resume, alias));
    return {
      ...requirement,
      group: entry?.group || 'Custom',
      found,
      evidence: found ? findEvidence(resume, requirement.name) : '',
    };
  });

  const requiredItems = requirements.filter((item) => item.priority === 'required');
  const optionalItems = requirements.filter((item) => item.priority === 'preferred');
  const denominator = requiredItems.length + optionalItems.length * 0.5;
  const numerator = requiredItems.filter((item) => item.found).length + optionalItems.filter((item) => item.found).length * 0.5;
  const skillScore = denominator ? Math.round((numerator / denominator) * 100) : null;

  const resumeYears = extractYears(resume);
  const requiredYears = extractYears(description);
  const roleKeywords = titleTokens(title);
  const overlapKeywords = roleKeywords.filter((word) => containsTerm(resume, word));
  const roleScore = roleKeywords.length ? Math.round((overlapKeywords.length / roleKeywords.length) * 100) : null;
  const experienceScore = requiredYears != null && resumeYears != null
    ? Math.round(Math.min(resumeYears / Math.max(requiredYears, 1), 1) * 100)
    : null;

  const components = [];
  if (skillScore != null) components.push({ key: 'skills', label: 'Skill coverage', value: skillScore, weight: 0.72, detail: `${requirements.filter((item) => item.found).length} of ${requirements.length} listed requirements evidenced` });
  if (experienceScore != null) components.push({ key: 'experience', label: 'Experience signal', value: experienceScore, weight: 0.18, detail: `${resumeYears} years found · ${requiredYears}+ requested` });
  if (roleScore != null) components.push({ key: 'role', label: 'Role-title overlap', value: roleScore, weight: 0.10, detail: `${overlapKeywords.length} of ${roleKeywords.length} title keywords found` });
  const activeWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const score = activeWeight
    ? Math.round(components.reduce((sum, component) => sum + component.value * component.weight, 0) / activeWeight)
    : null;

  const metrics = resume.match(/(?:\b\d+(?:\.\d+)?\s?%|\$\s?\d[\d,.]*|\b\d+(?:\.\d+)?\s?(?:x|users?|clients?|projects?|hours?|days?|months?|years?|k|m)\b)/gi) || [];
  const experienceLabel = resumeYears == null ? 'Not clearly stated' : `${resumeYears} years detected`;
  const resultName = candidateName.trim() || guessCandidateName(resume) || 'Unnamed candidate';
  const email = candidateEmail.trim() || extractEmail(resume);
  const band = score == null ? 'Needs review' : score >= 82 ? 'Strong alignment' : score >= 65 ? 'Potential match' : 'Skill gap';

  return {
    id: globalThis.crypto?.randomUUID?.() || `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    candidateName: resultName,
    candidateEmail: email,
    jobTitle: title || 'Untitled role',
    score,
    band,
    requirements,
    matchedCount: requirements.filter((item) => item.found).length,
    requiredCount: requiredItems.length,
    preferredCount: optionalItems.length,
    missingRequired: requiredItems.filter((item) => !item.found),
    missingPreferred: optionalItems.filter((item) => !item.found),
    matchedSkills: requirements.filter((item) => item.found),
    resumeYears,
    requiredYears,
    experienceLabel,
    roleKeywords,
    overlapKeywords,
    skillScore,
    roleScore,
    experienceScore,
    components,
    evidenceSignals: {
      quantifiedImpact: metrics.length,
      hasEmail: Boolean(email),
      hasExperienceDates: /\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:present|current|(?:19|20)\d{2})\b/i.test(resume),
    },
    // Keep a bounded excerpt for explainability. The full resume text is intentionally never returned.
    summary: score == null
      ? 'Add at least one skill requirement to calculate a match score.'
      : `${resultName} matches ${requirements.filter((item) => item.found).length} of ${requirements.length} listed skill requirements for ${title || 'this role'}.`,
  };
}

export function scoreTone(score) {
  if (score == null) return 'neutral';
  if (score >= 82) return 'good';
  if (score >= 65) return 'mid';
  return 'low';
}
