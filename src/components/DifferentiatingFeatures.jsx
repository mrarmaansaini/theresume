import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Fingerprint,
  Globe,
  GraduationCap,
  Layers,
  LoaderCircle,
  Mail,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  Upload,
  UserCheck,
  UserRound,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  evaluateInterviewAnswer,
  rewriteResumeBullets,
} from '../firebase/index.js';

// ========================================================
// 1. INTERACTIVE "WHAT-IF" CAREER SIMULATOR & UPSKILLING
// ==========================================
export function CareerUpskillingSimulator({ record, onToast }) {
  if (!record) return null;
  const baseScore = record.score ?? 50;
  const missingSkills = (record.missingRequired || []).map((m) => m.name);
  const preferredMissing = (record.requirements || [])
    .filter((r) => r.priority === 'preferred' && !r.found)
    .map((r) => r.name);
  
  const allGaps = [...new Set([...missingSkills, ...preferredMissing])];
  const [simulatedSkills, setSimulatedSkills] = useState([]);
  const [learningPlanOpen, setLearningPlanOpen] = useState(false);

  const toggleSkill = (skill) => {
    setSimulatedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Calculate simulated score: each missing core skill added gives +5-8%, preferred gives +3%
  const simulatedScore = Math.min(
    100,
    baseScore +
      simulatedSkills.reduce((acc, skill) => {
        const isCore = missingSkills.includes(skill);
        return acc + (isCore ? 7 : 4);
      }, 0)
  );

  const scoreDelta = simulatedScore - baseScore;
  const newFitLabel =
    simulatedScore >= 82 ? 'Strong alignment' : simulatedScore >= 65 ? 'Potential match' : 'Skill gap to explore';

  return (
    <section className="panel simulator-panel">
      <div className="panel-heading panel-heading-row">
        <div>
          <div className="eyebrow">
            <Zap size={13} />
            <span>INTERACTIVE WHAT-IF CAREER SIMULATOR</span>
          </div>
          <h3>Simulate Skill Acquisition &amp; Role Fit Jump</h3>
          <p>
            Toggle potential future skills or certifications to see how candidate alignment changes in real time.
          </p>
        </div>
        <div className="simulator-score-badge">
          <span className="sim-badge-label">Simulated Match</span>
          <strong className="sim-badge-score">{simulatedScore}%</strong>
          {scoreDelta > 0 && <span className="sim-badge-delta">+{scoreDelta}% jump</span>}
        </div>
      </div>

      <div className="simulator-body-grid">
        <div className="simulator-controls-col">
          <span className="sim-col-title">Test hypothetical skill gains:</span>
          {allGaps.length ? (
            <div className="sim-skills-checklist">
              {allGaps.map((skill) => {
                const isSelected = simulatedSkills.includes(skill);
                const isCore = missingSkills.includes(skill);
                return (
                  <label key={skill} className={`sim-skill-chip ${isSelected ? 'sim-chip-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSkill(skill)}
                    />
                    <span className="sim-chip-name">{skill}</span>
                    <span className={`sim-priority-pill ${isCore ? 'priority-core' : 'priority-pref'}`}>
                      {isCore ? '+7% Core' : '+4% Pref'}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="sim-no-gaps">
              Candidate already evidenced all core role requirements! Try adding new advanced competencies to test mastery.
            </p>
          )}

          <div className="sim-actions-row">
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={() => setSimulatedSkills(allGaps)}
            >
              Select all gaps
            </button>
            <button
              type="button"
              className="text-button button-sm"
              onClick={() => setSimulatedSkills([])}
            >
              Reset
            </button>
            <button
              type="button"
              className="button button-primary button-sm"
              onClick={() => {
                setLearningPlanOpen((o) => !o);
                onToast?.('30-Day Accelerated Upskilling Roadmap generated.');
              }}
            >
              <BookOpen size={14} /> 30-Day Learning Action Plan
            </button>
          </div>
        </div>

        <div className="simulator-projection-col">
          <div className="projection-card">
            <div className="projection-header">
              <Sparkles size={16} />
              <strong>Career Alignment Trajectory</strong>
            </div>
            <div className="projection-bars">
              <div className="proj-bar-item">
                <div className="proj-bar-label">
                  <span>Current Evidenced Match</span>
                  <strong>{baseScore}%</strong>
                </div>
                <div className="proj-track">
                  <span style={{ width: `${baseScore}%`, background: '#7a70cc' }} />
                </div>
              </div>
              <div className="proj-bar-item">
                <div className="proj-bar-label">
                  <span>Projected With Selected Skills ({simulatedSkills.length} added)</span>
                  <strong style={{ color: '#27a768' }}>{simulatedScore}%</strong>
                </div>
                <div className="proj-track">
                  <span style={{ width: `${simulatedScore}%`, background: '#32ad82' }} />
                </div>
              </div>
            </div>
            <div className="projection-verdict">
              <span>Projected Band:</span>
              <strong>{newFitLabel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Action Roadmap Drawer */}
      {learningPlanOpen && (
        <div className="learning-roadmap-drawer">
          <div className="roadmap-header">
            <div className="eyebrow">ACCELERATED CAREER ROADMAP</div>
            <h4>30-Day Upskilling Plan for {record.jobTitle}</h4>
            <p>Milestone schedule to close detected skill gaps with verified hands-on projects.</p>
          </div>
          <div className="roadmap-milestones">
            <div className="milestone-card">
              <span className="milestone-step">WEEK 1 – 2</span>
              <strong>Foundational Architecture &amp; Core Tooling</strong>
              <p>
                Complete deep-dive tutorials on {simulatedSkills.slice(0, 2).join(' & ') || 'core missing skills'}. Build isolated proof-of-concepts.
              </p>
              <small>Goal: Hands-on syntax &amp; CLI mastery</small>
            </div>
            <div className="milestone-card">
              <span className="milestone-step">WEEK 3</span>
              <strong>Integration &amp; Full-Stack Deployment</strong>
              <p>
                Integrate {simulatedSkills[2] || 'cloud CI/CD workflows'} into a real portfolio application with automated tests.
              </p>
              <small>Goal: Demonstrable GitHub repository evidence</small>
            </div>
            <div className="milestone-card">
              <span className="milestone-step">WEEK 4</span>
              <strong>STAR Interview Rehearsal &amp; Resume Upgrades</strong>
              <p>
                Synthesize quantified XYZ achievements and run mock interview drills on system design questions.
              </p>
              <small>Goal: 88%+ Technical Interview Readiness</small>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ========================================================
// 3. LIVE MOCK TECHNICAL & BEHAVIORAL INTERVIEW STUDIO
// ========================================================
export function MockInterviewStudio({ record, onToast }) {
  if (!record) return null;
  const missing = (record.missingRequired || []).map((m) => m.name);
  const defaultQuestions = [
    `How have you architected and scaled production applications for ${record.jobTitle}?`,
    missing[0]
      ? `Walk us through how you would apply ${missing[0]} in a mission-critical distributed environment.`
      : 'Describe a challenging bug you debugged in production and what metrics improved after resolution.',
    missing[1]
      ? `What are the trade-offs of using ${missing[1]} compared to alternative industry tooling?`
      : 'How do you structure code reviews and automated CI/CD testing pipelines for team reliability?',
  ];

  const [questions, setQuestions] = useState(defaultQuestions);
  const [selectedQIdx, setSelectedQIdx] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const activeQuestion = questions[selectedQIdx] || questions[0];

  const handleGrade = async () => {
    if (!candidateAnswer.trim()) {
      onToast?.('Please write or speak your answer before grading.');
      return;
    }
    setIsGrading(true);
    setEvaluation(null);
    try {
      const result = await evaluateInterviewAnswer({
        question: activeQuestion,
        candidateAnswer: candidateAnswer.trim(),
        roleTitle: record.jobTitle,
        competency: missing[selectedQIdx] || 'Technical Mastery',
      });
      setEvaluation(result);
      onToast?.('Answer evaluated with STAR methodology scoring.');
    } catch (err) {
      onToast?.(err?.message || 'Failed to grade interview response.');
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <section className="panel interview-studio-panel">
      <div className="panel-heading panel-heading-row">
        <div>
          <div className="eyebrow">
            <Sparkles size={13} />
            <span>AI INTERVIEW PREPARATION STUDIO</span>
          </div>
          <h3>Live Mock Technical Interview Practice</h3>
          <p>
            Rehearse real interview probing questions derived directly from {record.candidateName}'s target role requirements.
          </p>
        </div>
        <span className="interview-live-chip">
          <Play size={12} /> Interactive Drill
        </span>
      </div>

      <div className="interview-studio-layout">
        {/* Question Selector List */}
        <div className="interview-q-list">
          <span className="q-list-title">Targeted Probing Questions:</span>
          {questions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className={`interview-q-btn ${selectedQIdx === idx ? 'q-btn-active' : ''}`}
              onClick={() => {
                setSelectedQIdx(idx);
                setEvaluation(null);
                setCandidateAnswer('');
              }}
            >
              <span className="q-number">Q{idx + 1}</span>
              <span className="q-text">{q}</span>
            </button>
          ))}
        </div>

        {/* Answer & Evaluation Studio */}
        <div className="interview-answer-studio">
          <div className="active-question-card">
            <span className="active-q-badge">Question {selectedQIdx + 1} of {questions.length}</span>
            <h4>{activeQuestion}</h4>
          </div>

          <div className="answer-input-area">
            <label className="field-label" htmlFor="interview-answer-input">
              Candidate Response (STAR format: Situation, Task, Action, Result)
            </label>
            <textarea
              id="interview-answer-input"
              className="text-area interview-textarea"
              rows={4}
              placeholder="Structure your answer: 'In my previous project at [Company], we faced [Situation]. I was tasked with [Task]. I engineered [Action using specific tools], which resulted in [Measurable Result]...'"
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
            />
            <div className="answer-actions">
              <button
                type="button"
                className="button button-primary button-sm"
                onClick={handleGrade}
                disabled={isGrading || !candidateAnswer.trim()}
              >
                {isGrading ? <LoaderCircle className="spin" size={14} /> : <Wand2 size={14} />}
                {isGrading ? 'Grading with AI…' : 'Grade Answer & Feedback'}
              </button>
            </div>
          </div>

          {/* Grading & Feedback Result */}
          {evaluation && (
            <div className="interview-evaluation-card">
              <div className="eval-header">
                <div className="eval-score-ring">
                  <strong>{evaluation.score}</strong>
                  <small>/100</small>
                </div>
                <div className="eval-verdict-copy">
                  <div className="eyebrow">INTERVIEW EVALUATION VERDICT</div>
                  <h5>{evaluation.verdict}</h5>
                </div>
              </div>

              <div className="eval-insights-grid">
                <div className="eval-strengths-box">
                  <div className="eval-block-title text-green">
                    <CheckCircle2 size={14} />
                    <span>Key Strengths</span>
                  </div>
                  <ul>
                    {(evaluation.strengths || []).map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>

                <div className="eval-gaps-box">
                  <div className="eval-block-title text-orange">
                    <CircleAlert size={14} />
                    <span>Areas to Elevate (STAR proof)</span>
                  </div>
                  <ul>
                    {(evaluation.improvements || []).map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {evaluation.idealAnswer && (
                <div className="eval-model-answer">
                  <div className="eval-block-title text-purple">
                    <Trophy size={14} />
                    <span>Gold-Standard Example Response</span>
                  </div>
                  <p>{evaluation.idealAnswer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ========================================================
// 4. QUANTIFIED RESUME BULLET REWRITER (GOOGLE XYZ FORMULA)
// ========================================================
export function BulletRewriterStudio({ targetRole, onToast }) {
  const [inputBullets, setInputBullets] = useState(
    `Worked on backend authentication and database queries\nHelped with frontend UI redesign in React\nResponsible for deployment and bug fixes`
  );
  const [rewrites, setRewrites] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleRewrite = async () => {
    const lines = inputBullets.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      onToast?.('Enter at least one bullet point.');
      return;
    }
    setLoading(true);
    setRewrites([]);
    try {
      const results = await rewriteResumeBullets({
        bullets: lines,
        targetRole: targetRole || 'Senior Software Engineer',
      });
      setRewrites(results);
      onToast?.('Rewrote bullets using Google XYZ Formula.');
    } catch (err) {
      onToast?.(err?.message || 'Rewrite failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    onToast?.('Copied to clipboard!');
  };

  return (
    <section className="panel bullet-rewriter-panel">
      <div className="panel-heading panel-heading-row">
        <div>
          <div className="eyebrow">
            <Award size={13} />
            <span>EXECUTIVE RESUME BULLET REWRITER</span>
          </div>
          <h3>Google XYZ Formula Bullet Transformer</h3>
          <p>
            Transform passive phrases into high-impact, quantified bullets: <em>"Accomplished [X] as measured by [Y], by doing [Z]"</em>.
          </p>
        </div>
      </div>

      <div className="bullet-rewriter-body">
        <div className="rewriter-input-col">
          <label className="field-label" htmlFor="bullets-textarea">
            Paste raw bullet points (one per line):
          </label>
          <textarea
            id="bullets-textarea"
            className="text-area rewriter-textarea"
            rows={4}
            value={inputBullets}
            onChange={(e) => setInputBullets(e.target.value)}
          />
          <button
            type="button"
            className="button button-primary button-sm"
            onClick={handleRewrite}
            disabled={loading || !inputBullets.trim()}
          >
            {loading ? <LoaderCircle className="spin" size={14} /> : <Wand2 size={14} />}
            {loading ? 'Upgrading with XYZ Formula…' : 'Upgrade Bullets with AI'}
          </button>
        </div>

        {rewrites.length > 0 && (
          <div className="rewrites-output-col">
            <span className="rewrites-col-title">High-Impact Upgraded Bullets:</span>
            <div className="rewrites-list">
              {rewrites.map((r, i) => (
                <div key={i} className="rewrite-item-card">
                  <div className="rewrite-original">
                    <small>Original:</small>
                    <span>{r.original}</span>
                  </div>
                  <div className="rewrite-upgraded">
                    <small>Google XYZ Formula:</small>
                    <strong>{r.xyzFormula}</strong>
                    <div className="rewrite-pills">
                      <span className="pill-verb">Verb: {r.actionVerb || 'Spearheaded'}</span>
                      <span className="pill-metric">Impact: {r.measuredImpact || 'Measured metrics'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-button rewrite-copy-btn"
                    title="Copy bullet"
                    onClick={() => copyToClipboard(r.xyzFormula)}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ========================================================
// 5. BATCH MULTI-RESUME BULK SCREENING
// ========================================================
export function BatchScreeningPanel({ onBatchScreen, targetRole, onToast }) {
  const [resumesList, setResumesList] = useState([
    {
      id: 'cand-1',
      name: 'Alex Rivera',
      text: `Alex Rivera\nSenior Full-Stack Engineer\n8 years building distributed systems, TypeScript, React 19, Node.js, PostgreSQL, AWS, Docker, Microservices, CI/CD pipelines. Led microservices migration serving 2M users.`,
    },
    {
      id: 'cand-2',
      name: 'Priya Sharma',
      text: `Priya Sharma\nProduct Architect\n6 years in UI/UX architecture, React, GraphQL, TypeScript, Design Systems, Next.js, Figma, performance optimization, automated testing.`,
    },
    {
      id: 'cand-3',
      name: 'Marcus Vance',
      text: `Marcus Vance\nBackend Engineer\n4 years experience with Python, FastAPI, Django, SQL databases, Docker, basic React knowledge. Built REST APIs.`,
    },
  ]);

  const [customName, setCustomName] = useState('');
  const [customText, setCustomText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addCandidate = () => {
    if (!customText.trim()) {
      onToast?.('Paste resume text for this candidate.');
      return;
    }
    const name = customName.trim() || `Candidate #${resumesList.length + 1}`;
    setResumesList((prev) => [...prev, { id: `cand-${Date.now()}`, name, text: customText.trim() }]);
    setCustomName('');
    setCustomText('');
    setIsAdding(false);
    onToast?.(`Added ${name} to batch queue.`);
  };

  const removeCandidate = (id) => {
    setResumesList((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="batch-screening-panel">
      <div className="batch-header">
        <div className="eyebrow">
          <Layers size={13} />
          <span>MULTI-RESUME BATCH SCREENING QUEUE</span>
        </div>
        <h4>Stack-Rank Multiple Candidates for {targetRole || 'Target Role'}</h4>
        <p>Drop multiple candidate profiles to evaluate and rank them in a unified leaderboard.</p>
      </div>

      <div className="batch-queue-list">
        {resumesList.map((cand, idx) => (
          <div key={cand.id} className="batch-queue-item">
            <span className="batch-index">#{idx + 1}</span>
            <div className="batch-cand-info">
              <strong>{cand.name}</strong>
              <span>{cand.text.slice(0, 110)}…</span>
            </div>
            <button
              type="button"
              className="icon-button danger-icon"
              onClick={() => removeCandidate(cand.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="batch-add-form">
          <div className="field">
            <label className="field-label">Candidate Name</label>
            <input
              className="text-input"
              placeholder="e.g. Liam Smith"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Resume Text</label>
            <textarea
              className="text-area"
              rows={3}
              placeholder="Paste candidate resume text…"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          </div>
          <div className="batch-add-actions">
            <button
              type="button"
              className="button button-primary button-sm"
              onClick={addCandidate}
            >
              Add to Queue
            </button>
            <button
              type="button"
              className="button button-subtle button-sm"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="button button-outline button-sm batch-add-trigger"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} /> Add Candidate to Batch Queue
        </button>
      )}

      <div className="batch-submit-row">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onBatchScreen?.(resumesList)}
          disabled={resumesList.length < 2}
        >
          <Layers size={16} /> Stack-Rank &amp; Score {resumesList.length} Candidates <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
