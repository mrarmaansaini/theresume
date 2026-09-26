import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeResume, containsTerm, detectRequirements } from '../src/utils/analysis.js';

test('skill matching recognizes aliases without matching substrings', () => {
  assert.equal(containsTerm('I build with React.js and TypeScript.', 'React'), true);
  assert.equal(containsTerm('I know JavaScript.', 'Java'), false);
  assert.equal(containsTerm('Reactive layouts are my focus.', 'React'), false);
});

test('requirements keep required and preferred groups distinct', () => {
  const requirements = detectRequirements('Must have: Python, SQL.\nNice to have: Tableau, Power BI.');
  const byName = Object.fromEntries(requirements.map((item) => [item.name, item.priority]));
  assert.equal(byName.Python, 'required');
  assert.equal(byName.SQL, 'required');
  assert.equal(byName.Tableau, 'preferred');
  assert.equal(byName['Power BI'], 'preferred');
});

test('preferred skills count at half weight and are visible as gaps', () => {
  const result = analyzeResume({
    resumeText: 'Nia Patel\nFrontend engineer with React experience.',
    jobTitle: 'Frontend Engineer',
    jobDescription: 'Required: React. Preferred: AWS.',
  });
  assert.equal(result.skillScore, 67);
  assert.equal(result.requirements.find((item) => item.name === 'AWS')?.found, false);
  assert.equal(result.experienceScore, null);
  assert.equal(result.components.some((item) => item.key === 'experience'), false);
});

test('custom skills can be matched and source resume text is not returned', () => {
  const result = analyzeResume({
    resumeText: 'Kai Chen\nWorkday implementation lead with 4 years of experience.',
    jobTitle: 'HR Systems Lead',
    jobDescription: 'Looking for a systems lead.',
    manualRequirements: [{ name: 'Workday', priority: 'required' }],
  });
  assert.equal(result.requirements[0].found, true);
  assert.equal('resumeText' in result, false);
  assert.equal(result.candidateName, 'Kai Chen');
});
