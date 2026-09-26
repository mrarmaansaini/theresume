import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  CirclePlus,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  Info,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { DEMO_JOB_DESCRIPTION, DEMO_PROFILES, DEMO_RESUME } from './data/demo.js';
import {
  analyzeResume,
  detectRequirements,
  extractEmail,
  guessCandidateName,
  inferRoleFromResume,
  scoreTone,
} from './utils/analysis.js';
import { extractResumeText, MAX_FILE_BYTES } from './utils/fileParser.js';
import { isTransientAiError } from './utils/aiRetry.js';
import { downloadScreeningPdf } from './utils/reportPdf.js';
import {
  analyzeResumeWithAi,
  createAccount,
  deleteFirebaseAccount,
  deleteUserScreening,
  firebaseConfigured,
  loadUserScreenings,
  observeAuth,
  saveUserScreening,
  signInWithGoogle,
  signInWithPassword,
  signOutUser,
  suggestRoleFromResume,
  updateUserDisplayName,
} from './firebase/index.js';

function initials(name = '') {
  const pieces = String(name).trim().split(/\s+/).filter(Boolean);
  return (pieces.length > 1 ? `${pieces[0][0]}${pieces[pieces.length - 1][0]}` : (pieces[0] || '?').slice(0, 2)).toUpperCase();
}

function colorForName(name = '') {
  const palette = ['lavender', 'mint', 'peach', 'sky', 'rose', 'lime'];
  const value = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[value % palette.length];
}

function formatDate(date, withTime = false) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function downloadBlob(filename, value, type) {
  const blob = new Blob([value], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function safeFilePart(value) {
  return String(value || 'rolelens-report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'rolelens-report';
}

function toCsvCell(value) {
  let text = String(value ?? '');
  // Prevent spreadsheet formula injection from user-controlled resume/job fields.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCandidateCsv(records) {
  const headings = ['Candidate', 'Email', 'Role', 'Match score', 'Match band', 'Matched skills', 'Required skill gaps', 'Experience found (years)', 'Experience requested (years)', 'Analyzed at', 'Source'];
  const rows = records.map((record) => [
    record.candidateName,
    record.candidateEmail,
    record.jobTitle,
    record.score == null ? '' : record.score,
    record.band,
    (record.matchedSkills || []).map((skill) => skill.name).join('; '),
    (record.missingRequired || []).map((skill) => skill.name).join('; '),
    record.resumeYears ?? '',
    record.requiredYears ?? '',
    record.createdAt,
    record.demo ? 'Sample' : 'Local analysis',
  ]);
  return [headings, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\r\n');
}

function createDemoRecords() {
  return DEMO_PROFILES.map((profile, index) => ({
    ...analyzeResume(profile),
    id: profile.id,
    candidateName: profile.candidateName,
    candidateEmail: profile.candidateEmail,
    jobTitle: profile.jobTitle,
    createdAt: new Date(Date.now() - profile.createdOffset).toISOString(),
    demo: true,
  }));
}

function Logo() {
  return (
    <div className="brand-lockup" aria-label="The Resume by Logic Ninjas">
      <div className="brand-mark"><Fingerprint size={19} strokeWidth={2.2} /></div>
      <div className="brand-text">The Resume<small>BY LOGIC NINJAS</small></div>
    </div>
  );
}

function SplashPage({ onEnter }) {
  return (
    <main className="splash-screen">
      <div className="splash-topline"><Logo /><span>RESUME INTELLIGENCE WORKSPACE</span></div>
      <section className="splash-content">
        <div className="splash-copy">
          <div className="splash-kicker"><span /> LOGIC NINJAS · TALENT TOOLS</div>
          <h1>The Resume</h1>
          <p className="splash-byline">A clearer view of every career story.</p>
          <p className="splash-description">Explore evidence-based role matching, candidate profiles, and practical skill-development guidance.</p>
          <div className="splash-actions">
            <button className="button button-primary" onClick={() => onEnter('recruiter')}><BriefcaseBusiness size={16} /> Recruiter workspace <ArrowRight size={15} /></button>
            <button className="button button-outline" onClick={() => onEnter('candidate')}><UserRound size={16} /> Candidate profile</button>
          </div>
          <button className="splash-sample-link" onClick={() => onEnter('sample')}><Sparkles size={14} /> Explore with sample data <ArrowRight size={14} /></button>
        </div>
        <div className="splash-art" aria-hidden="true">
          <div className="splash-art-sheet splash-art-sheet-back"><span /><span /><span /><i /></div>
          <div className="splash-art-sheet splash-art-sheet-front"><div className="splash-art-avatar" /><span className="splash-art-name" /><span className="splash-art-line" /><span className="splash-art-line short" /><div className="splash-art-skills"><i /><i /><i /></div><div className="splash-art-score"><strong>Role fit</strong><span><i /></span></div></div>
          <div className="splash-art-seal"><Fingerprint size={24} /><span>Evidence<br />over guesswork</span></div>
        </div>
      </section>
      <footer className="splash-footer"><span><LockKeyhole size={13} /> Resume files are parsed in your browser</span><span>AI review is optional and clearly identified</span></footer>
    </main>
  );
}

function LoginPage({ audience, firebaseReady, onBack, onAuthenticated }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const credential = creating
        ? await createAccount(email, password, name)
        : await signInWithPassword(email, password);
      onAuthenticated(credential.user);
    } catch (authError) {
      setError(authError?.code === 'auth/invalid-credential'
        ? 'Email or password is incorrect.'
        : authError?.code === 'auth/email-already-in-use'
          ? 'An account already exists for this email. Sign in instead.'
          : authError?.message || 'Unable to sign in. Check the Firebase Authentication setup.');
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setError('');
    setBusy(true);
    try {
      const credential = await signInWithGoogle();
      onAuthenticated(credential.user);
    } catch (authError) {
      setError(authError?.message || 'Google sign-in failed. Check the Firebase Google provider setup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-brand-row"><Logo /><span>SECURE WORKSPACE</span></div>
      <section className="login-layout">
        <div className="login-editorial"><div className="splash-kicker"><span /> {audience === 'candidate' ? 'CANDIDATE ACCESS' : 'RECRUITER ACCESS'}</div><h1>Your next step,<br />made clearer.</h1><p>Sign in to save reports securely and return to your resume profile from any device.</p><div className="login-reassurance"><ShieldCheck size={16} /><span>Your screening records are private to your signed-in account.</span></div></div>
        <div className="login-panel">
          <button className="login-back" onClick={onBack}><ArrowLeft size={14} /> Back</button>
          <div className="eyebrow">THE RESUME · LOGIC NINJAS</div>
          <h2>{creating ? 'Create your account' : 'Welcome back'}</h2>
          <p className="login-subtitle">{creating ? 'Set up a secure workspace for your reports.' : 'Sign in to continue to your workspace.'}</p>
          {!firebaseReady ? <div className="firebase-setup-notice"><CircleAlert size={17} /><div><strong>Connect Firebase to enable sign-in</strong><p>Add the Firebase web app values to `.env.local`, then enable Email/Password and Google in Firebase Authentication. Sample preview is still available from the welcome screen.</p></div></div> : <>
            <button className="google-login-button" onClick={googleSignIn} disabled={busy}><span className="google-glyph">G</span> Continue with Google</button>
            <div className="login-divider"><span />or use email<span /></div>
            <form className="login-form" onSubmit={submit}>
              {creating && <label className="field"><span className="field-label">Full name</span><input className="text-input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
              <label className="field"><span className="field-label">Email address</span><input className="text-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label className="field"><span className="field-label">Password</span><span className="password-field"><input className="text-input" type={showPassword ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <X size={15} /> : <CircleHelp size={15} />}</button></span></label>
              {error && <div className="inline-error"><CircleAlert size={14} />{error}</div>}
              <button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />}{creating ? 'Create account' : 'Sign in'}<ArrowRight size={15} /></button>
            </form>
            <p className="login-toggle">{creating ? 'Already have an account?' : 'New to The Resume?'} <button onClick={() => { setCreating((value) => !value); setError(''); }}> {creating ? 'Sign in' : 'Create account'}</button></p>
          </>}
          <p className="login-role-note">Entering as <strong>{audience}</strong>. You can switch workspaces after sign-in.</p>
        </div>
      </section>
      <footer className="splash-footer"><span><LockKeyhole size={13} /> Credentials handled by Firebase Authentication</span><span>Resume content is stored only with your account</span></footer>
    </main>
  );
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analyze', label: 'Analyze resume', icon: Sparkles, accent: true },
  { id: 'candidates', label: 'Candidates', icon: UsersRound },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

function Sidebar({ active, navigate, mobileOpen, setMobileOpen, actualCount, audience, setAudience, onSignOut }) {
  return (
    <>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className={`workspace-identity workspace-identity-${audience}`}>
          <div className="workspace-avatar">L</div>
          <div className="workspace-info"><strong>Logic Ninjas</strong><span>{audience === 'candidate' ? 'Candidate space' : 'Recruiter space'}</span></div>
          <span className="workspace-mode-icon" aria-hidden="true">{audience === 'candidate' ? <UserRound size={14} /> : <BriefcaseBusiness size={14} />}</span>
        </div>
        <div className="audience-switch" role="tablist" aria-label="Choose your workspace">
          <button className={audience === 'recruiter' ? 'audience-tab audience-active' : 'audience-tab'} role="tab" aria-selected={audience === 'recruiter'} onClick={() => { setAudience('recruiter'); navigate('overview'); }}><BriefcaseBusiness size={14} /> Recruiter</button>
          <button className={audience === 'candidate' ? 'audience-tab audience-active' : 'audience-tab'} role="tab" aria-selected={audience === 'candidate'} onClick={() => { setAudience('candidate'); navigate('candidate'); }}><UserRound size={14} /> Candidate</button>
        </div>
        <div className="nav-label">{audience === 'candidate' ? 'YOUR SPACE' : 'WORKSPACE'}</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {(audience === 'candidate' ? [
            { id: 'candidate', label: 'My profile', icon: UserRound },
            { id: 'analyze', label: 'Upload resume', icon: Upload, accent: true },
          ] : NAV_ITEMS).map(({ id, label, icon: Icon, accent }) => (
            <button key={id} onClick={() => { navigate(id); setMobileOpen(false); }} className={`nav-item ${active === id || (id === 'candidates' && active === 'report') ? 'nav-active' : ''} ${accent ? 'nav-accent' : ''}`}>
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {id === 'candidates' && actualCount > 0 && <span className="nav-count">{actualCount}</span>}
              {accent && <span className="nav-spark"><Sparkles size={12} /></span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <button className={`nav-item ${active === 'settings' ? 'nav-active' : ''}`} onClick={() => { navigate('settings'); setMobileOpen(false); }}><Settings size={18} /><span>Privacy & settings</span></button>
          {onSignOut && <button className="nav-item signout-item" onClick={onSignOut}><LogOut size={17} /><span>Sign out</span></button>}
          <div className="sidebar-footnote"><span className="status-dot" /> Private to your account</div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, subtitle, setMobileOpen, showDemoBadge, user, audience, navigate, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileName = user?.displayName || user?.email?.split('@')[0] || 'Account';
  return (
    <header className="topbar">
      <div className="topbar-leading">
        <button className="icon-button menu-trigger" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <div>
          <div className="topbar-title-row"><h1>{title}</h1>{showDemoBadge && <span className="workspace-badge"><span className="demo-dot" /> DEMO WORKSPACE</span>}</div>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="topbar-actions">
        {user && <div className="account-profile-wrap">
          <button className="account-profile-button" aria-label="Open account profile" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
            {user.photoURL ? <img className="account-profile-photo" src={user.photoURL} alt="" /> : <span className="account-profile-avatar">{initials(profileName)}</span>}
            <span className="account-profile-copy"><strong>{profileName}</strong><small>{audience === 'candidate' ? 'Candidate account' : 'Recruiter account'}</small></span>
            <ChevronDown size={14} />
          </button>
          {profileOpen && <div className="account-profile-menu" role="menu">
            <div className="account-profile-menu-identity"><strong>{user.displayName || 'Firebase account'}</strong><span>{user.email}</span></div>
            <button role="menuitem" onClick={() => { setProfileOpen(false); navigate('account'); }}><UserRound size={15} /> My profile</button>
            <button role="menuitem" onClick={() => { setProfileOpen(false); navigate('settings'); }}><Settings size={15} /> Privacy & settings</button>
            <button role="menuitem" onClick={() => { setProfileOpen(false); onSignOut(); }}><LogOut size={15} /> Sign out</button>
          </div>}
        </div>}
      </div>
    </header>
  );
}

function ScoreBadge({ score, label }) {
  const tone = scoreTone(score);
  return <span className={`score-badge tone-${tone}`}><span className="score-badge-dot" />{score == null ? 'Not scored' : `${score}%`}{label ? <span className="score-badge-label">{label}</span> : null}</span>;
}

function ScoreRing({ score, size = 150 }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = score == null ? 0 : circumference * Math.max(0, Math.min(score, 100)) / 100;
  const tone = scoreTone(score);
  return (
    <div className={`score-ring score-ring-${tone}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" role="img" aria-label={score == null ? 'Match score not available' : `Match score ${score} percent`}>
        <circle className="ring-track" cx="60" cy="60" r={radius} />
        <circle className="ring-progress" cx="60" cy="60" r={radius} strokeDasharray={`${progress} ${circumference}`} />
      </svg>
      <div className="ring-value"><strong>{score == null ? '—' : score}</strong><span>{score == null ? 'not scored' : 'match score'}</span></div>
    </div>
  );
}

function CandidateAvatar({ name, size = 'md' }) {
  return <span className={`candidate-avatar avatar-${colorForName(name)} avatar-${size}`}>{initials(name)}</span>;
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return <div className="empty-state"><div className="empty-state-icon"><FileText size={21} /></div><strong>{title}</strong><p>{body}</p>{action}</div>;
}

function Dashboard({ records, demoRecords, sampleMode, navigate, openRecord, onEnterSample }) {
  const showingDemo = sampleMode;
  const analytics = showingDemo ? demoRecords : records;
  const avg = analytics.length ? Math.round(analytics.reduce((sum, item) => sum + (item.score || 0), 0) / analytics.length) : 0;
  const strong = analytics.filter((item) => item.score != null && item.score >= 82).length;
  const gapCount = analytics.reduce((sum, item) => sum + (item.missingRequired || []).length, 0);
  const bands = [
    { label: 'Strong alignment', value: analytics.filter((item) => item.score >= 82).length, className: 'bar-strong' },
    { label: 'Potential match', value: analytics.filter((item) => item.score >= 65 && item.score < 82).length, className: 'bar-mid' },
    { label: 'Needs a closer look', value: analytics.filter((item) => item.score < 65).length, className: 'bar-low' },
  ];
  const maxBand = Math.max(1, ...bands.map((item) => item.value));
  const recent = [...analytics].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  return (
    <div className="page-body dashboard-page">
      <section className="welcome-hero">
        <div className="hero-content">
          <div className="hero-kicker"><Sparkles size={14} /> EXPLAINABLE SCREENING</div>
          <h2>A clearer signal in<br className="desktop-br" /> every resume.</h2>
          <p>See how a candidate’s skills line up with a role, where the gaps are, and what to review next.</p>
          <div className="hero-actions">
            <button className="button button-white" onClick={() => navigate('analyze')}>Analyze a resume <ArrowRight size={16} /></button>
            <button className="button button-hero-ghost" onClick={onEnterSample}><Sparkles size={15} /> Explore sample workspace</button>
          </div>
          <div className="hero-footnote"><LockKeyhole size={12} /> Files are read locally in your browser</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-score-card">
            <div className="hero-score-card-top"><span className="hero-mini-label">ROLE ALIGNMENT</span><span className="hero-score-icon"><Activity size={14} /></span></div>
            <div className="hero-score-number hero-score-label">Evidence</div>
            <div className="hero-score-divider" />
            <div className="hero-skill-row"><span className="hero-check"><Check size={12} /></span><span>Skills · experience · context</span></div>
            <div className="hero-score-track"><span style={{ width: '100%', background: '#5ca17f' }} /></div>
            <div className="hero-card-caption">Role-related signals</div>
          </div>
          <div className="hero-floating-note"><span className="floating-note-icon"><Sparkles size={15} /></span><span><strong>Clear, not opaque</strong><small>Every signal has evidence</small></span></div>
          <div className="hero-orb" />
        </div>
      </section>

      {showingDemo && <div className="demo-notice"><div className="demo-notice-icon"><Info size={16} /></div><div><strong>Sample workspace is on.</strong><span>These illustrative profiles are synthetic and never saved to your candidate history.</span></div><button onClick={() => navigate('analyze')}>Try a resume <ArrowRight size={14} /></button></div>}

      <div className="stats-grid">
        <StatCard icon={UsersRound} label={showingDemo ? 'Sample candidates' : 'Profiles screened'} value={analytics.length.toString().padStart(2, '0')} change={showingDemo ? 'Synthetic demo profiles' : 'Saved to your account'} accent="violet" />
        <StatCard icon={Target} label="Strong alignment" value={strong.toString().padStart(2, '0')} change={showingDemo ? 'Score of 82% or higher' : '82% match score or higher'} accent="green" />
        <StatCard icon={Gauge} label="Average match" value={`${avg}%`} change={showingDemo ? 'Across sample profiles' : 'Across your screenings'} accent="blue" />
        <StatCard icon={ArrowDownRight} label="Core skill gaps" value={gapCount.toString().padStart(2, '0')} change="Worth exploring in review" accent="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading panel-heading-row">
            <div><div className="eyebrow">SCREENING ACTIVITY</div><h3>{showingDemo ? 'Sample candidates' : 'Recent screenings'}</h3></div>
            <button className="button button-subtle button-sm" onClick={() => navigate('candidates')}>View candidates <ArrowRight size={14} /></button>
          </div>
          {recent.length ? <CandidateTable records={recent} onOpen={openRecord} compact /> : <EmptyState title="No candidate profiles yet" body="Upload a resume and compare it with a role to start your workspace." action={<button className="button button-primary button-sm" onClick={() => navigate('analyze')}><Upload size={14} /> Add a resume</button>} />}
        </section>
        <section className="panel pulse-panel">
          <div className="panel-heading"><div className="eyebrow">AT A GLANCE</div><h3>Match distribution</h3><p>How the current profiles group by signal strength.</p></div>
          <div className="distribution-list">
            {bands.map((band) => (
              <div className="distribution-item" key={band.label}>
                <div className="distribution-label"><span>{band.label}</span><strong>{band.value}</strong></div>
                <div className="distribution-track"><span className={band.className} style={{ width: `${(band.value / maxBand) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="pulse-divider" />
          <div className="mini-explainer"><span className="mini-explainer-icon"><Fingerprint size={17} /></span><div><strong>Evidence over guesswork</strong><p>Skill matches link back to phrases in the resume. Missing evidence is not proof a skill is absent.</p></div></div>
          <button className="text-link" onClick={() => navigate('insights')}>Explore screening insights <ArrowRight size={14} /></button>
        </section>
      </div>
      <div className="dashboard-bottom-row">
        <div className="dashboard-bottom-note"><ShieldCheck size={16} /><span><strong>Private by account</strong> · files are parsed locally; report data is account-scoped.</span><button onClick={() => navigate('settings')}>Learn more</button></div>
        <span className="snapshot-note">{showingDemo ? 'Sample set · 3 synthetic profiles' : `Updated ${formatDate(new Date().toISOString())}`}</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change, accent }) {
  return <div className={`stat-card stat-${accent}`}><div className="stat-card-top"><span className="stat-icon"><Icon size={17} /></span><span className="stat-overline">{label}</span><span className="stat-spark"><ArrowUpRight size={14} /></span></div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div>;
}

function CandidateTable({ records, onOpen, compact = false, onCompareToggle, compareSelection = [], onRemove }) {
  if (!records.length) return <EmptyState title="No candidates to show" body="Run your first resume screen to create a profile." />;
  return (
    <div className={`candidate-table-wrap ${compact ? 'candidate-table-compact' : ''}`}>
      <table className="candidate-table">
        <thead><tr>{onCompareToggle && <th className="check-col"><span className="sr-only">Compare</span></th>}<th>Candidate</th><th>Role</th><th>Match</th><th className="skills-col">Skills</th><th className="date-col">Added</th><th><span className="sr-only">Open</span></th>{onRemove && <th><span className="sr-only">Remove candidate</span></th>}</tr></thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="candidate-row" onClick={() => onOpen(record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(record); } }} tabIndex={0}>
              {onCompareToggle && <td className="check-cell" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${record.candidateName} for comparison`} checked={compareSelection.includes(record.id)} onChange={() => onCompareToggle(record)} /></td>}
              <td><div className="candidate-cell"><CandidateAvatar name={record.candidateName} size="sm" /><div className="candidate-cell-copy"><strong>{record.candidateName}</strong><span>{record.candidateEmail || 'Contact not detected'}</span>{record.demo && <span className="sample-tag">SAMPLE</span>}</div></div></td>
              <td><span className="role-cell">{record.jobTitle}</span></td>
              <td><ScoreBadge score={record.score} /></td>
              <td className="skills-cell">{record.matchedCount ?? (record.matchedSkills || []).length}<span> / {(record.requirements || []).length}</span></td>
              <td className="date-cell">{formatDate(record.createdAt)}</td>
              <td><button className="row-open" aria-label={`Open ${record.candidateName} report`} onClick={(event) => { event.stopPropagation(); onOpen(record); }}><ChevronRight size={16} /></button></td>
              {onRemove && <td>{!record.demo && <button className="row-open danger-icon" aria-label={`Remove ${record.candidateName}`} title="Remove candidate" onClick={(event) => { event.stopPropagation(); onRemove(record); }}><Trash2 size={15} /></button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyzePage({
  form,
  setForm,
  requirements,
  manualRequirements,
  setManualRequirements,
  onRun,
  isSample,
  setIsSample,
  onSuggestRole,
  roleSuggestionPending,
  onToast,
}) {
  const [mode, setMode] = useState('upload');
  const [manualInput, setManualInput] = useState('');
  const [manualPriority, setManualPriority] = useState('required');
  const [fileStatus, setFileStatus] = useState('');
  const [fileError, setFileError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploadedResumeVersion, setUploadedResumeVersion] = useState(0);
  const lastAutoSuggestedVersion = useRef(0);

  const requestRoleDraft = async (resumeText) => {
    setFileError('');
    try {
      await onSuggestRole(resumeText);
    } catch (error) {
      const message = String(error?.message || error || '');
      const isTransientIssue = isTransientAiError(error);
      if (isTransientIssue) {
        console.warn('AI role draft unavailable; continuing without AI suggestions.', error);
        return;
      }
      setFileError(message || 'AI could not complete the role draft. Check Firebase AI Logic and retry.');
      throw error;
    }
  };

  const onResumeTextChange = (value) => {
    setIsSample(false);
    setAiConsent(false);
    setManualRequirements([]);
    setForm((current) => ({
      ...current,
      resumeText: value,
      fileName: '',
      jobTitle: '',
      jobDescription: '',
      roleInference: '',
      roleRationale: '',
      roleDraftComplete: false,
      candidateName: current.candidateName || guessCandidateName(value),
      candidateEmail: current.candidateEmail || extractEmail(value),
    }));
  };

  const processFile = async (file) => {
    setFileError('');
    setFileStatus('');
    if (!file) return;
    setAiConsent(false);
    if (file.size > MAX_FILE_BYTES) {
      setFileError('This file is larger than 10 MB. Choose a smaller document.');
      return;
    }
    setIsParsing(true);
    try {
      const text = await extractResumeText(file);
      setForm((current) => ({
        ...current,
        resumeText: text,
        fileName: file.name,
        jobTitle: '',
        jobDescription: '',
        roleInference: '',
        roleRationale: '',
        roleDraftComplete: false,
        candidateName: current.candidateName || guessCandidateName(text),
        candidateEmail: current.candidateEmail || extractEmail(text),
      }));
      setManualRequirements([]);
      setIsSample(false);
      setFileStatus(`${file.name} · ${(file.size / 1024).toFixed(0)} KB · parsed locally`);
      setUploadedResumeVersion((version) => version + 1);
    } catch (error) {
      setFileError(error?.message || 'We could not read this file. Try pasting the resume text instead.');
      setForm((current) => ({ ...current, fileName: '' }));
    } finally {
      setIsParsing(false);
    }
  };

  const addRequirement = () => {
    const name = manualInput.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (requirements.some((requirement) => requirement.name.toLowerCase() === name.toLowerCase())) {
      onToast(`${name} is already in the requirements list.`);
      return;
    }
    setManualRequirements((current) => [...current, { name, priority: manualPriority }]);
    setManualInput('');
    setIsSample(false);
  };

  const removeRequirement = (name) => {
    setManualRequirements((current) => current.filter((item) => item.name.toLowerCase() !== name.toLowerCase()));
  };

  const loadDemo = () => {
    setForm({
      candidateName: DEMO_PROFILES[0].candidateName,
      candidateEmail: DEMO_PROFILES[0].candidateEmail,
      jobTitle: DEMO_PROFILES[0].jobTitle,
      jobDescription: DEMO_JOB_DESCRIPTION,
      resumeText: DEMO_RESUME,
      fileName: 'sample-product-designer-resume.txt',
      roleDraftComplete: true,
    });
    setManualRequirements([]);
    setMode('paste');
    setFileError('');
    setFileStatus('Sample resume loaded · synthetic data only');
    setIsSample(true);
    onToast('Sample resume and role are ready to analyze.');
  };

  const canRun = Boolean(form.resumeText.trim() && form.jobTitle.trim() && form.jobDescription.trim().length >= 300 && requirements.length >= 3 && (isSample || (aiConsent && form.roleDraftComplete)));
  useEffect(() => {
    if (aiConsent && uploadedResumeVersion > 0 && form.fileName && form.resumeText.trim() && !roleSuggestionPending && lastAutoSuggestedVersion.current !== uploadedResumeVersion) {
      lastAutoSuggestedVersion.current = uploadedResumeVersion;
      requestRoleDraft(form.resumeText).catch(() => {});
    }
  }, [aiConsent, uploadedResumeVersion, form.fileName, form.resumeText, form.jobTitle, onSuggestRole, roleSuggestionPending]);
  const handleRun = async () => {
    setIsSubmitting(true);
    try {
      await onRun();
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="page-body analyze-page">
      <div className="analyze-intro-row">
        <div><div className="eyebrow">SCREENING WORKSPACE</div><h2>Build a clear, evidence-based view.</h2><p>Compare one resume against a role. Files are read locally; optional AI review uses your configured provider.</p></div>
        <button className="button button-subtle" onClick={loadDemo}><Sparkles size={15} /> Use sample data</button>
      </div>
      <div className="steps-row">
        <div className="step active-step"><span>01</span><div><strong>Resume</strong><small>Upload or paste</small></div></div><div className="step-connector" />
        <div className={`step ${form.jobTitle || form.jobDescription ? 'active-step' : ''}`}><span>02</span><div><strong>Role</strong><small>Define requirements</small></div></div><div className="step-connector" />
        <div className={`step ${canRun ? 'active-step' : ''}`}><span>03</span><div><strong>Review</strong><small>Explainable report</small></div></div>
      </div>

      {!isSample && <div className="ai-consent-block"><label className="ai-consent-row"><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} /><span>I agree to send this resume text and target role to Firebase AI for role drafting and assessment. The original file is not stored.</span></label>{form.resumeText.trim() && <div className={`role-generation-status ${fileError ? 'role-generation-error' : ''}`} role="status">{fileError ? <><CircleAlert size={14} /> {fileError}</> : roleSuggestionPending ? <><LoaderCircle className="spin" size={14} /> AI is identifying the target role, drafting a complete job description, and extracting required skills…</> : form.roleDraftComplete ? <><CheckCircle2 size={14} /> AI role draft ready. Review and edit the description and requirements below.</> : aiConsent ? <><Sparkles size={14} /> AI role draft will start automatically for this uploaded resume.</> : <><LockKeyhole size={14} /> Agree to let AI draft the target role and description from this resume.</>}</div>}</div>}

      <div className="analyzer-grid">
        <section className="panel input-panel">
          <div className="panel-title-line"><div className="numbered-icon">01</div><div><h3>Candidate resume</h3><p>PDF, DOCX, TXT, or image · up to 10 MB</p></div></div>
          <div className="mode-tabs" role="tablist" aria-label="Resume input method">
            <button className={mode === 'upload' ? 'mode-tab active-mode-tab' : 'mode-tab'} onClick={() => setMode('upload')} role="tab" aria-selected={mode === 'upload'}><Upload size={14} /> Upload file</button>
            <button className={mode === 'paste' ? 'mode-tab active-mode-tab' : 'mode-tab'} onClick={() => setMode('paste')} role="tab" aria-selected={mode === 'paste'}><FileText size={14} /> Paste text</button>
          </div>
          {mode === 'upload' ? (
            <div className={`drop-zone ${dragging ? 'drop-zone-active' : ''} ${form.resumeText ? 'drop-zone-ready' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); processFile(event.dataTransfer.files?.[0]); }}>
              <input ref={fileInputRef} className="file-input" type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,image/bmp" onChange={(event) => { processFile(event.target.files?.[0]); event.target.value = ''; }} />
              {isParsing ? <div className="upload-spinner" /> : <div className={`upload-icon ${form.resumeText ? 'upload-icon-ready' : ''}`}>{form.resumeText ? <FileCheck2 size={23} /> : <CloudUpload size={24} />}</div>}
              {form.resumeText ? <><strong>{form.fileName || 'Resume text is ready'}</strong><span>{isParsing ? 'Extracting text locally…' : 'Text extracted in your browser'}</span></> : <><strong>{isParsing ? 'Reading resume…' : 'Drop your resume here'}</strong><span>PDF, DOCX, TXT, JPG, PNG, WEBP, or BMP</span></>}
              <button type="button" className="button button-outline button-sm" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>{form.resumeText ? 'Replace file' : 'Choose a file'}</button>
              {form.resumeText && <button type="button" className="text-button drop-remove" onClick={() => { setForm((current) => ({ ...current, resumeText: '', fileName: '' })); setFileStatus(''); setFileError(''); setIsSample(false); }}>Remove</button>}
            </div>
          ) : (
            <div className="paste-resume-wrap"><label className="field-label" htmlFor="resume-text">Resume text <span>Paste the full text for best coverage</span></label><textarea id="resume-text" className="text-area resume-text-area" placeholder={'Paste resume text here…\n\nTip: include the skills and experience sections for the clearest evidence.'} value={form.resumeText} onChange={(event) => onResumeTextChange(event.target.value)} /><div className="textarea-meta"><span>{form.resumeText.trim() ? `${form.resumeText.trim().split(/\s+/).length.toLocaleString()} words` : 'Text is analyzed locally'}</span>{form.resumeText && <button type="button" className="text-button" onClick={() => { setForm((current) => ({ ...current, resumeText: '', fileName: '' })); setFileStatus(''); setIsSample(false); }}>Clear text</button>}</div></div>
          )}
          {fileStatus && <div className="file-status"><CheckCircle2 size={14} />{fileStatus}</div>}
          {fileError && <div className="inline-error"><CircleAlert size={14} />{fileError}</div>}
          <div className="candidate-fields">
            <div className="field"><label className="field-label" htmlFor="candidate-name">Candidate name <span>Optional · detected if available</span></label><input id="candidate-name" className="text-input" placeholder="e.g. Priya Sharma" value={form.candidateName} onChange={(event) => { setIsSample(false); setForm((current) => ({ ...current, candidateName: event.target.value })); }} /></div>
            <div className="field"><label className="field-label" htmlFor="candidate-email">Candidate email <span>Needed to share report to their sign-in</span></label><input id="candidate-email" type="email" className="text-input" placeholder="candidate@example.com" value={form.candidateEmail} onChange={(event) => { setIsSample(false); setForm((current) => ({ ...current, candidateEmail: event.target.value })); }} /></div>
          </div>
          <div className="privacy-inline"><LockKeyhole size={14} /><span><strong>Browser-side extraction.</strong> Resume text is sent to your configured AI backend only when you submit for AI review.</span></div>
        </section>

        <section className="panel input-panel role-input-panel">
          <div className="panel-title-line"><div className="numbered-icon">02</div><div><h3>Target role</h3><p>Add a job description to surface relevant signals</p></div></div>
          <div className="field"><label className="field-label" htmlFor="job-title">AI-inferred target role <span>Editable</span></label><input id="job-title" className="text-input" placeholder="Upload a resume to suggest a role" value={form.jobTitle} onChange={(event) => { setIsSample(false); setForm((current) => ({ ...current, jobTitle: event.target.value })); }} /></div>
          <div className="field job-description-field"><label className="field-label" htmlFor="job-description">Target job description <span>Editable draft</span></label><textarea id="job-description" className="text-area job-description-area" placeholder={'AI will draft a target-role description from the resume. Review and edit it before analysis.'} value={form.jobDescription} onChange={(event) => { setIsSample(false); setForm((current) => ({ ...current, jobDescription: event.target.value })); }} /></div>
          <div className="role-suggestion-row"><button type="button" className="button button-subtle button-sm" onClick={() => requestRoleDraft(form.resumeText).catch(() => {})} disabled={!form.resumeText.trim() || !aiConsent || roleSuggestionPending}><Sparkles size={14} />{roleSuggestionPending ? 'Drafting role…' : form.roleDraftComplete ? 'Regenerate role draft' : 'Suggest role from resume'}</button><span>{form.roleInference ? `Role ${form.roleInference === 'explicit' ? 'stated in resume' : 'inferred from experience'}` : 'AI-created description can be edited above'}</span></div>
          {form.roleRationale && <p className="role-inference-note">{form.roleRationale}</p>}
          <div className="requirements-area">
            <div className="requirements-heading"><div><strong>Detected requirements</strong><span>{requirements.length} skills · review before screening</span></div><span className="auto-tag"><Sparkles size={11} /> AUTO</span></div>
            {requirements.length ? <div className="requirement-chips">{requirements.map((requirement) => <span key={requirement.name} className={`requirement-chip ${requirement.priority === 'preferred' ? 'preferred-chip' : ''}`} title={`${requirement.priority === 'preferred' ? 'Preferred' : 'Required'} · ${requirement.source === 'manual' ? 'added by you' : 'detected in description'}`}><span className="requirement-chip-dot" />{requirement.name}<small>{requirement.priority === 'preferred' ? 'PREF' : 'CORE'}</small>{requirement.source === 'manual' && <button type="button" aria-label={`Remove ${requirement.name}`} onClick={() => removeRequirement(requirement.name)}><X size={12} /></button>}</span>)}</div> : <div className="no-requirements"><Target size={15} /><span>Paste a role description or add skills below.</span></div>}
            <div className="add-requirement-row"><div className="add-skill-input-wrap"><Plus size={14} /><input value={manualInput} aria-label="Add a requirement" placeholder="Add a skill not listed…" onChange={(event) => setManualInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addRequirement(); } }} /></div><select aria-label="Requirement priority" value={manualPriority} onChange={(event) => setManualPriority(event.target.value)}><option value="required">Core</option><option value="preferred">Preferred</option></select><button type="button" className="icon-button add-skill-button" aria-label="Add skill" onClick={addRequirement}><CirclePlus size={17} /></button></div>
            <p className="requirements-hint"><Info size={12} /> Detected skills update from the role description; add any role-specific skills that were missed. Preferred skills count half.</p>
          </div>
        </section>
      </div>
      <div className="analyze-submit-row">
        <div className="analyze-note"><ShieldCheck size={16} /><span>Assistive screening only — a match score is not a hiring decision.</span></div>
        <button className="button button-primary analyze-submit" onClick={handleRun} disabled={!canRun || isSubmitting}><Sparkles size={16} /> {isSubmitting ? 'Analyzing…' : 'Analyze match'} <ArrowRight size={16} /></button>
      </div>
      {!canRun && <div className="submit-hint">Upload a resume, consent to the AI draft, then review the generated description and at least three skill requirements before analysis.</div>}
      {isSample && <div className="sample-form-note"><Sparkles size={13} /> Synthetic sample data is loaded. Running this screen will open a demo report without saving it.</div>}
    </div>
  );
}

function ReportPage({ record, onBack, onExportJson, onExportPdf, onDelete, canDelete, onToast }) {
  if (!record) return <div className="page-body"><EmptyState title="No report selected" body="Choose a candidate or run a new screen to view a report." action={<button className="button button-primary" onClick={onBack}>Back to overview</button>} /></div>;
  const matched = record.matchedSkills || [];
  const breakdown = record.components || [];
  const activeWeight = breakdown.reduce((sum, item) => sum + item.weight, 0) || 1;
  const tone = scoreTone(record.score);
  const scoreLabel = record.score == null ? 'Not enough signal' : record.score >= 82 ? 'Strong alignment' : record.score >= 65 ? 'Potential match' : 'Skill gap to explore';
  const reportRequirements = record.requirements || [];
  const requiredMatches = reportRequirements.filter((item) => item.priority === 'required' && item.found).length;
  const requiredTotal = reportRequirements.filter((item) => item.priority === 'required').length;

  return (
    <div className="page-body report-page">
      <div className="report-page-top no-print">
        <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to candidates</button>
        {record.demo && <span className="sample-report-tag"><Sparkles size={12} /> SAMPLE REPORT</span>}
      </div>
      <div className="report-title-row">
        <div><div className="eyebrow">EXPLAINABLE SCREENING REPORT · {formatDate(record.createdAt, true)}</div><h2>{record.candidateName}</h2><p className="report-subtitle"><BriefcaseBusiness size={15} /> {record.jobTitle} {record.candidateEmail && <><span className="subtitle-separator">·</span><Mail size={14} /> {record.candidateEmail}</>}</p></div>
        <div className="report-actions no-print"><button className="button button-outline button-sm" onClick={onExportJson}><Download size={15} /> Export JSON</button><button className="button button-primary button-sm" onClick={onExportPdf}><Download size={15} /> Download PDF</button>{!record.demo && canDelete && <button className="icon-button danger-icon" title="Delete saved analysis" aria-label="Delete saved analysis" onClick={onDelete}><Trash2 size={16} /></button>}</div>
      </div>
      {record.demo && <div className="report-demo-banner"><Info size={16} /><span>This is an illustrative sample profile created with synthetic data. Its score does not represent a real person.</span></div>}
      {record.jobDescription && <section className="panel report-role-description"><div className="eyebrow">TARGET ROLE DESCRIPTION{record.roleInference ? ` · ${record.roleInference === 'explicit' ? 'STATED IN RESUME' : 'AI-INFERRED'}` : ''}</div>{record.roleRationale && <strong>{record.roleRationale}</strong>}<p>{record.jobDescription}</p></section>}
      {record.aiInsights && <section className="panel ai-assessment-panel"><div className="ai-assessment-heading"><span className="ai-assessment-icon"><Sparkles size={17} /></span><div><div className="eyebrow">AI ROLE REVIEW</div><h3>{record.aiInsights.fitLevel}</h3></div><span className="ai-model-tag">{record.aiInsights.model}</span></div><p className="ai-assessment-summary">{record.aiInsights.summary}</p><div className="ai-assessment-columns"><div><strong>Gaps to address</strong>{record.aiInsights.concerns?.length ? <ul>{record.aiInsights.concerns.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>No specific job-related gaps were identified.</p>}</div><div><strong>How to improve</strong>{record.aiInsights.improvementPlan?.length ? <ul>{record.aiInsights.improvementPlan.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>Keep building role-relevant experience and make its evidence clear.</p>}</div></div>{record.aiInsights.evidence?.length > 0 && <div className="ai-evidence"><strong>Evidence considered</strong><ul>{record.aiInsights.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}{record.aiInsights.learningResources?.length > 0 && <div className="ai-learning-resources"><div className="eyebrow">LEARNING RESOURCES</div><div className="learning-resource-list">{record.aiInsights.learningResources.map((resource, index) => <article key={`${resource.skill}-${index}`}><span>{resource.skill}</span><a href={resource.url} target="_blank" rel="noreferrer"><strong>{resource.platform}</strong><ExternalLink size={12} /></a><small>{resource.reason}</small></article>)}</div></div>}{record.aiInsights.sources?.length > 0 && <div className="ai-web-sources"><strong>Web sources</strong><ul>{record.aiInsights.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={11} /></a></li>)}</ul></div>}{record.aiInsights.searchEntryPoint && <iframe className="google-search-entry" title="Google Search suggestions for further research" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={record.aiInsights.searchEntryPoint} />}{record.aiInsights.searchQueries?.length > 0 && <p className="search-query-note">Searches used: {record.aiInsights.searchQueries.join(' · ')}</p>}<div className="ai-disclaimer"><ShieldCheck size={14} /> Advisory assessment only. Review the evidence yourself; this is not an automated hiring decision.</div></section>}

      <div className="report-summary-grid">
        <section className={`panel report-score-panel report-score-${tone}`}>
          <div className="report-score-copy"><span className="report-score-overline">OVERALL MATCH</span><ScoreRing score={record.score} size={150} /><strong className={`report-band band-${tone}`}>{scoreLabel}</strong><span className="report-score-caption">An assistive signal, not a decision</span></div>
          <div className="score-panel-divider" />
          <div className="score-panel-stats"><div><span>Core skills</span><strong>{requiredMatches}<small> / {requiredTotal}</small></strong></div><div><span>All skills found</span><strong>{record.matchedCount}<small> / {reportRequirements.length}</small></strong></div><div><span>Experience</span><strong className="stat-experience-text">{record.resumeYears == null ? 'Not stated' : `${record.resumeYears} yrs`}</strong></div></div>
        </section>
        <section className="panel score-breakdown-panel">
          <div className="panel-heading"><div className="eyebrow">HOW THE SIGNAL WAS BUILT</div><h3>Score breakdown</h3><p>Only components with enough text evidence contribute to the score.</p></div>
          {breakdown.length ? <div className="score-breakdown-list">{breakdown.map((item) => <div className="score-breakdown-item" key={item.key}><div className="breakdown-line"><div><strong>{item.label}</strong><span>{item.detail}</span></div><strong className="breakdown-score">{item.value}%</strong></div><div className="breakdown-track"><span style={{ width: `${item.value}%` }} /></div><span className="breakdown-weight">{Math.round((item.weight / activeWeight) * 100)}% of active score</span></div>)}</div> : <div className="no-score-note"><CircleAlert size={16} /> Add skills to the role before calculating a match score.</div>}
          <div className="formula-note"><Info size={13} /><span>Skill coverage is weighted most heavily. Preferred skills count at half weight. Unreadable experience signals are not treated as a penalty.</span></div>
        </section>
      </div>

      <div className="report-caveat"><ShieldCheck size={17} /><div><strong>Human review matters.</strong> A missing keyword means the resume did not clearly evidence that skill — not that the candidate cannot do it. Review context and ask consistent follow-up questions.</div></div>

      <div className="report-detail-grid">
        <section className="panel skills-panel">
          <div className="panel-heading panel-heading-row"><div><div className="eyebrow">ROLE REQUIREMENTS</div><h3>Skill evidence</h3><p>{matched.length} of {reportRequirements.length} requirements surfaced in the resume text.</p></div><span className="skill-coverage-count">{record.skillScore == null ? '—' : `${record.skillScore}%`}<small>coverage</small></span></div>
          {reportRequirements.length ? (
            <div className="skill-evidence-list">
              {reportRequirements.map((item) => (
                <details key={`${item.name}-${item.priority}`} className={`skill-evidence-item ${item.found ? 'skill-found' : 'skill-missing'} ${item.priority === 'preferred' ? 'skill-preferred' : ''}`}>
                  <summary><span className={`skill-status-icon ${item.found ? 'skill-status-found' : 'skill-status-missing'}`}>{item.found ? <Check size={13} /> : <X size={13} />}</span><span className="skill-req-name">{item.name}</span><span className={`priority-pill ${item.priority === 'preferred' ? 'priority-preferred' : ''}`}>{item.priority === 'preferred' ? 'Preferred' : 'Core'}</span><span className={`evidence-label ${item.found ? 'evidence-present' : 'evidence-absent'}`}>{item.found ? 'Evidence found' : 'Not evidenced'}</span><ChevronDown size={15} className="skill-chevron" /></summary>
                  <div className="skill-evidence-detail">{item.found ? <><span className="evidence-quote-mark">“</span><p>{item.evidence || `${item.name} appears in the resume text.`}</p><small>Matched phrase from resume text</small></> : <><div className="gap-followup"><strong>Suggested follow-up</strong><p>Confirm practical experience with {item.name} using a consistent, role-related question.</p></div></>}</div>
                </details>
              ))}
            </div>
          ) : <EmptyState title="No skill requirements" body="The role description did not include recognizable skills. Re-run the screen with a longer description or add requirements." />}
          <div className="skill-legend"><span><i className="legend-dot legend-found" />Evidence found</span><span><i className="legend-dot legend-gap" />Not evidenced</span><span><i className="legend-dot legend-preferred" />Preferred skill</span></div>
        </section>

        <div className="report-side-stack">
          <section className="panel strengths-panel"><div className="side-panel-heading"><span className="side-panel-icon strengths-icon"><CheckCircle2 size={16} /></span><div><h3>Signals to explore</h3><p>Observed in the provided text</p></div></div><ul className="signal-list">{matched.length ? matched.slice(0, 5).map((item) => <li key={item.name}><span className="signal-check"><Check size={12} /></span><span><strong>{item.name}</strong><small>{item.group}{item.priority === 'preferred' ? ' · preferred' : ''}</small></span></li>) : <li className="signal-empty">No requirement matches detected yet.</li>}</ul>{matched.length > 5 && <div className="more-signals">+ {matched.length - 5} more evidenced skills</div>}</section>
          <section className="panel profile-signal-panel"><div className="side-panel-heading"><span className="side-panel-icon profile-signal-icon"><Activity size={16} /></span><div><h3>Resume signals</h3><p>Content checks, not quality judgments</p></div></div><div className="profile-signal-row"><span>Quantified impact markers</span><strong>{record.evidenceSignals?.quantifiedImpact || 0}</strong></div><div className="profile-signal-row"><span>Experience duration</span><strong className={record.resumeYears == null ? 'muted-signal' : ''}>{record.experienceLabel || 'Not clearly stated'}</strong></div><div className="profile-signal-row"><span>Contact email</span><strong>{record.evidenceSignals?.hasEmail ? 'Detected' : 'Not detected'}</strong></div></section>
          <section className="next-step-card"><div className="next-step-icon"><CircleHelp size={16} /></div><div><strong>Make the next step fair</strong><p>Use the same role-related follow-up questions for every candidate.</p></div></section>
        </div>
      </div>
      <div className="report-footer-note"><Fingerprint size={15} /><span>The Resume by Logic Ninjas provides assistive role signals, not a validated predictive hiring model. AI results require human review and should never be used as the sole basis for decisions.</span></div>
    </div>
  );
}

function CandidatesPage({ records, demoRecords, sampleMode, openRecord, onExportCsv, onCompare, onRemove, navigate, onToast }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [includeSamples, setIncludeSamples] = useState(sampleMode);
  const [compareSelection, setCompareSelection] = useState([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleSearchShortcut = (event) => {
      const target = event.target;
      const editingText = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key === '/' && !editingText) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);
  const all = [...records, ...(includeSamples ? demoRecords : [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = all.filter((record) => {
    const search = `${record.candidateName} ${record.candidateEmail} ${record.jobTitle}`.toLowerCase();
    if (query && !search.includes(query.toLowerCase())) return false;
    if (filter === 'strong' && !(record.score >= 82)) return false;
    if (filter === 'potential' && !(record.score >= 65 && record.score < 82)) return false;
    if (filter === 'review' && !(record.score < 65 || record.score == null)) return false;
    return true;
  });

  const toggleCompare = (record) => {
    if (compareSelection.includes(record.id)) {
      setCompareSelection((current) => current.filter((id) => id !== record.id));
      return;
    }
    if (compareSelection.length >= 3) {
      onToast('Compare up to three profiles at a time.');
      return;
    }
    setCompareSelection((current) => [...current, record.id]);
  };
  const selectedRecords = all.filter((record) => compareSelection.includes(record.id));

  return (
    <div className="page-body candidates-page">
      <SectionHeading eyebrow="TALENT LIBRARY" title="Candidate screenings" description="Review match signals and revisit reports saved on this device." action={<button className="button button-primary" onClick={() => navigate('analyze')}><Plus size={16} /> New screening</button>} />
      <section className="panel candidate-library-panel">
        <div className="candidate-toolbar">
          <div className="candidate-filter-tabs" role="tablist" aria-label="Filter candidates">
            {[['all', 'All profiles'], ['strong', 'Strong'], ['potential', 'Potential'], ['review', 'Review']].map(([key, label]) => <button key={key} className={filter === key ? 'filter-tab filter-active' : 'filter-tab'} onClick={() => setFilter(key)} role="tab" aria-selected={filter === key}>{label}<span>{all.filter((record) => key === 'all' || (key === 'strong' ? record.score >= 82 : key === 'potential' ? record.score >= 65 && record.score < 82 : record.score < 65 || record.score == null)).length}</span></button>)}
          </div>
          <div className="candidate-toolbar-actions"><label className="search-field"><Search size={15} /><input ref={searchInputRef} placeholder="Search name or role…" aria-label="Search candidates" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>/</kbd></label><button className="button button-outline button-sm" onClick={() => onExportCsv(all)} disabled={!all.length}><Download size={14} /> Export CSV</button></div>
        </div>
        <div className="candidate-table-heading"><div><strong>{filtered.length} profile{filtered.length === 1 ? '' : 's'}</strong><span>Compare up to 3 profiles at a time</span></div><label className="sample-toggle"><input type="checkbox" checked={includeSamples} onChange={(event) => { setIncludeSamples(event.target.checked); setCompareSelection([]); }} /> Include sample profiles</label></div>
        {filtered.length ? <CandidateTable records={filtered} onOpen={openRecord} onCompareToggle={toggleCompare} compareSelection={compareSelection} onRemove={onRemove} /> : <div className="table-empty"><Search size={20} /><strong>No matching profiles</strong><span>Try a different name, role, or score filter.</span></div>}
        <div className="table-footnote"><Info size={13} />{records.length ? 'Your screenings are stored in Firestore and scoped to this account.' : includeSamples ? 'Only synthetic sample profiles are shown. Your first analysis will appear here.' : 'No saved analyses yet. Run a screen to add a profile.'} {includeSamples && '“Sample” profiles are illustrative and never saved.'}</div>
      </section>
      {compareSelection.length > 0 && <div className="compare-floating-bar"><div className="compare-selected-avatars">{selectedRecords.map((record) => <CandidateAvatar key={record.id} name={record.candidateName} size="xs" />)}</div><span><strong>{selectedRecords.length}</strong> of 3 selected</span><button className="text-button compare-clear" onClick={() => setCompareSelection([])}>Clear</button><button className="button button-primary button-sm" disabled={selectedRecords.length < 2} onClick={() => onCompare(selectedRecords)}>Compare profiles <ArrowRight size={14} /></button></div>}
    </div>
  );
}

function CandidateProfilePage({ records, openRecord, navigate }) {
  const [selectedCandidateKey, setSelectedCandidateKey] = useState('');
  const candidateGroups = [...records.reduce((groups, record) => {
    const email = String(record.candidateEmail || '').trim().toLowerCase();
    const name = String(record.candidateName || '').trim();
    const key = email ? `email:${email}` : name ? `name:${name.toLowerCase()}` : `record:${record.id}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { key, record, reportCount: 1 });
    } else {
      existing.reportCount += 1;
      if (new Date(record.createdAt) > new Date(existing.record.createdAt)) existing.record = record;
    }
    return groups;
  }, new Map()).values()].sort((left, right) => String(left.record.candidateName || 'Candidate').localeCompare(String(right.record.candidateName || 'Candidate')));
  const selectedCandidate = candidateGroups.length === 1
    ? candidateGroups[0]
    : candidateGroups.find((candidate) => candidate.key === selectedCandidateKey);
  const latestProfile = selectedCandidate?.record;

  if (!candidateGroups.length) {
    return <div className="page-body candidate-portal-page"><SectionHeading eyebrow="CANDIDATE SPACE" title="Your profile, clearly explained." description="Upload a resume to review role alignment, evidence, and practical next steps." /><EmptyState title="No profile in this account yet" body="Start with a resume image or document and a target role to create a profile review." action={<button className="button button-primary" onClick={() => navigate('analyze')}><Upload size={15} /> Upload a resume</button>} /><p className="candidate-local-note"><LockKeyhole size={14} /> Sign in with the account that owns the report to view it across devices.</p></div>;
  }

  const missing = latestProfile?.missingRequired || [];
  const matched = latestProfile?.matchedSkills || [];
  return (
    <div className="page-body candidate-portal-page">
      <SectionHeading eyebrow="CANDIDATE SPACE" title="Your profile, clearly explained." description={candidateGroups.length > 1 ? 'Choose which candidate profile to review.' : 'Review what the resume shows for your latest target role and where you could strengthen your evidence.'} action={<button className="button button-subtle" onClick={() => navigate('analyze')}><Upload size={15} /> Update resume</button>} />
      {candidateGroups.length > 1 && <label className="field candidate-profile-picker"><span className="field-label">Choose a candidate</span><select className="text-input" aria-label="Choose a candidate profile" value={selectedCandidateKey} onChange={(event) => setSelectedCandidateKey(event.target.value)}><option value="">Select a candidate…</option>{candidateGroups.map((candidate) => <option key={candidate.key} value={candidate.key}>{candidate.record.candidateName}{candidate.record.candidateEmail ? ` · ${candidate.record.candidateEmail}` : ''} · ${candidate.reportCount} report${candidate.reportCount === 1 ? '' : 's'}</option>)}</select></label>}
      {!latestProfile ? <EmptyState title="Choose a candidate profile" body="Select which candidate you want to view." /> : <>
        <div className="candidate-profile-layout">
          <section className="panel candidate-profile-overview"><div className="candidate-profile-identity"><CandidateAvatar name={latestProfile.candidateName} size="md" /><div><div className="eyebrow">LATEST PROFILE</div><h3>{latestProfile.candidateName}</h3><span>{latestProfile.candidateEmail || 'No email detected'} · {formatDate(latestProfile.createdAt)}</span></div></div><div className="candidate-profile-role"><BriefcaseBusiness size={16} /><div><small>ASSESSED FOR</small><strong>{latestProfile.jobTitle}</strong></div></div><div className="candidate-profile-score"><ScoreRing score={latestProfile.score} size={132} /><div><ScoreBadge score={latestProfile.score} label={latestProfile.band} /><p>{latestProfile.aiInsights?.summary || 'This score summarizes visible role-related evidence. It is a guide for review, not a judgment of your ability.'}</p><button className="button button-outline button-sm" onClick={() => openRecord(latestProfile)}>View full profile <ArrowRight size={14} /></button></div></div></section>
          <section className="panel candidate-development-panel"><div className="panel-heading"><div className="eyebrow">NEXT STEPS</div><h3>Ways to strengthen your fit</h3><p>Focus on role-related evidence and practical examples.</p></div>{latestProfile.aiInsights?.improvementPlan?.length ? <ul className="candidate-next-steps">{latestProfile.aiInsights.improvementPlan.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ul> : missing.length ? <ul className="candidate-next-steps">{missing.slice(0, 5).map((item, index) => <li key={item.name}><span>{String(index + 1).padStart(2, '0')}</span>Build and clearly describe hands-on experience with {item.name}.</li>)}</ul> : <p className="candidate-no-gaps">No core skill gaps were surfaced in this resume text. Add measurable outcomes and relevant project examples to make your experience easier to assess.</p>}{latestProfile.aiInsights?.learningResources?.length > 0 && <div className="candidate-learning-list"><strong>Suggested learning platforms</strong>{latestProfile.aiInsights.learningResources.slice(0, 4).map((resource, index) => <a key={`${resource.skill}-${index}`} href={resource.url} target="_blank" rel="noreferrer"><span>{resource.skill}</span>{resource.platform}<ExternalLink size={11} /></a>)}</div>}<div className="candidate-skill-summary"><div><strong>{matched.length}</strong><span>skills evidenced</span></div><div><strong>{missing.length}</strong><span>core skills to develop</span></div><div><strong>{latestProfile.resumeYears ?? '—'}</strong><span>years detected</span></div></div></section>
        </div>
        <p className="candidate-local-note"><LockKeyhole size={14} /> Showing the latest profile saved to your Firebase account. A missing keyword is not proof that you lack a skill.</p>
      </>}
    </div>
  );
}

function AccountProfilePage({ user, audience, onUpdateName, onToast }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setDisplayName(user?.displayName || ''), [user?.displayName]);
  if (!user) return <div className="page-body"><EmptyState title="No signed-in account" body="Sign in to view account details." /></div>;

  const providers = [...new Set((user.providerData || []).map((provider) => {
    if (provider.providerId === 'google.com') return 'Google';
    if (provider.providerId === 'password') return 'Email and password';
    return provider.providerId;
  }))];
  const saveName = async (event) => {
    event.preventDefault();
    setError('');
    const nextName = displayName.trim();
    if (!nextName || nextName === (user.displayName || '')) return;
    setSaving(true);
    try {
      await onUpdateName(nextName);
      onToast('Profile name updated.');
    } catch (saveError) {
      setError(saveError?.message || 'Could not update your Firebase profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-body account-page">
      <SectionHeading eyebrow="ACCOUNT PROFILE" title="Your account details." description="Manage the profile attached to your Firebase sign-in." />
      <section className="panel account-identity-panel">
        <div className="account-identity-main">
          {user.photoURL ? <img className="account-profile-photo account-profile-photo-large" src={user.photoURL} alt="" /> : <span className="account-profile-avatar account-profile-avatar-large">{initials(user.displayName || user.email || 'Account')}</span>}
          <div><div className="eyebrow">{audience === 'candidate' ? 'CANDIDATE ACCOUNT' : 'RECRUITER ACCOUNT'}</div><h3>{user.displayName || 'Name not set'}</h3><p>{user.email || 'No email associated'}</p></div>
        </div>
        <span className={`account-verified-badge ${user.emailVerified ? 'account-verified' : 'account-unverified'}`}><UserCheck size={14} />{user.emailVerified ? 'Email verified' : 'Email not verified'}</span>
      </section>

      <div className="account-details-grid">
        <section className="panel account-detail-panel">
          <div className="panel-heading"><div className="eyebrow">PERSONAL DETAILS</div><h3>Profile information</h3><p>Your display name appears on saved reports and in the app header.</p></div>
          <form className="account-name-form" onSubmit={saveName}>
            <label className="field"><span className="field-label">Display name</span><input className="text-input" autoComplete="name" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
            <button className="button button-primary button-sm" type="submit" disabled={saving || !displayName.trim() || displayName.trim() === (user.displayName || '')}>{saving ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}{saving ? 'Saving…' : 'Save name'}</button>
          </form>
          {error && <div className="inline-error"><CircleAlert size={14} />{error}</div>}
          <div className="account-detail-list">
            <div><span>Email</span><strong>{user.email || 'Not available'}</strong></div>
            <div><span>Sign-in method</span><strong>{providers.join(', ') || 'Firebase Authentication'}</strong></div>
            <div><span>Workspace</span><strong>{audience === 'candidate' ? 'Candidate' : 'Recruiter'}</strong></div>
            <div><span>Account created</span><strong>{formatDate(user.metadata?.creationTime)}</strong></div>
            <div><span>Last sign-in</span><strong>{formatDate(user.metadata?.lastSignInTime, true)}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InsightsPage({ records, demoRecords, sampleMode }) {
  const showingDemo = sampleMode;
  const analytics = showingDemo ? demoRecords : records;
  const average = analytics.length ? Math.round(analytics.reduce((sum, item) => sum + (item.score || 0), 0) / analytics.length) : 0;
  const strongCount = analytics.filter((record) => record.score >= 82).length;
  const noExperienceCount = analytics.filter((record) => record.resumeYears == null).length;
  const groupedByRole = Object.values(analytics.reduce((result, record) => {
    const key = record.jobTitle || 'Untitled role';
    if (!result[key]) result[key] = { role: key, items: [] };
    result[key].items.push(record);
    return result;
  }, {})).map((group) => ({ ...group, average: Math.round(group.items.reduce((sum, item) => sum + (item.score || 0), 0) / group.items.length) })).sort((a, b) => b.average - a.average);
  const skillMap = {};
  analytics.forEach((record) => (record.requirements || []).forEach((item) => {
    if (item.priority === 'preferred') return;
    if (!skillMap[item.name]) skillMap[item.name] = { name: item.name, total: 0, found: 0 };
    skillMap[item.name].total += 1;
    if (item.found) skillMap[item.name].found += 1;
  }));
  const commonGaps = Object.values(skillMap).map((item) => ({ ...item, gapRate: item.total ? Math.round(((item.total - item.found) / item.total) * 100) : 0 })).filter((item) => item.gapRate > 0).sort((a, b) => b.gapRate - a.gapRate || b.total - a.total).slice(0, 6);
  const maxGap = Math.max(1, ...commonGaps.map((item) => item.gapRate));

  return (
    <div className="page-body insights-page">
      <SectionHeading eyebrow="SCREENING INSIGHTS" title="See the shape of your pipeline." description="Understand match patterns across screened profiles — without hiding the underlying evidence." />
      {showingDemo && <div className="demo-notice insights-demo-notice"><div className="demo-notice-icon"><Info size={16} /></div><div><strong>Sample insights, not hiring data.</strong><span>These visualizations use three synthetic profiles. Analyze resumes to build your private workspace view.</span></div></div>}
      <div className="insight-metric-grid"><div className="insight-metric-card"><div className="insight-metric-icon insight-purple"><UsersRound size={17} /></div><span>Profiles screened</span><strong>{analytics.length}</strong><small>{showingDemo ? 'synthetic sample set' : 'saved locally'}</small></div><div className="insight-metric-card"><div className="insight-metric-icon insight-green"><TrendingUp size={17} /></div><span>Average match</span><strong>{average}%</strong><small>across visible profiles</small></div><div className="insight-metric-card"><div className="insight-metric-icon insight-blue"><Target size={17} /></div><span>Strong alignment</span><strong>{strongCount}</strong><small>82% score or higher</small></div><div className="insight-metric-card"><div className="insight-metric-icon insight-orange"><CircleAlert size={17} /></div><span>Experience unclear</span><strong>{noExperienceCount}</strong><small>not used to penalize score</small></div></div>
      <div className="insights-grid">
        <section className="panel insight-panel"><div className="panel-heading"><div className="eyebrow">BY ROLE</div><h3>Average role alignment</h3><p>Scores are calculated per profile; sample size is shown.</p></div>{groupedByRole.length ? <div className="role-chart-list">{groupedByRole.map((item) => <div className="role-chart-item" key={item.role}><div className="role-chart-top"><span>{item.role}</span><strong>{item.average}% <small>· {item.items.length} profile{item.items.length === 1 ? '' : 's'}</small></strong></div><div className="role-chart-track"><span style={{ width: `${item.average}%` }} /></div></div>)}</div> : <EmptyState title="No role data yet" body="Analyze a resume to see role alignment." />}</section>
        <section className="panel insight-panel"><div className="panel-heading"><div className="eyebrow">CORE SKILLS</div><h3>Most frequent gaps</h3><p>Required skills missing from the visible resume text.</p></div>{commonGaps.length ? <div className="gap-chart-list">{commonGaps.map((item) => <div className="gap-chart-item" key={item.name}><div className="gap-chart-top"><span>{item.name}</span><strong>{item.gapRate}% <small>gap rate</small></strong></div><div className="gap-chart-track"><span style={{ width: `${(item.gapRate / maxGap) * 100}%` }} /></div><small className="gap-sample-size">{item.total} profile{item.total === 1 ? '' : 's'} required this skill</small></div>)}</div> : <EmptyState title="No skill gaps recorded" body="A gap chart will appear once role requirements are screened." />}</section>
      </div>
      <div className="insight-method-card"><div className="insight-method-icon"><Fingerprint size={19} /></div><div><strong>Context is the missing metric.</strong><p>Gap rates describe text evidence, not a person's ability. Equivalent phrases, transferable skills, and context can be missed by keyword matching. Use these trends to improve role descriptions and structured interviews — not to auto-reject applicants.</p></div><span className="method-chip">INTERPRET WITH CARE</span></div>
    </div>
  );
}

function SettingsPage({ records, user, onClearHistory, onDeleteAccount, onToast }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmingAccount, setConfirmingAccount] = useState(false);
  const ownedRecords = records.filter((record) => record.ownerUid === user?.uid);
  return (
    <div className="page-body settings-page">
      <SectionHeading eyebrow="TRUST & CONTROLS" title="Privacy, made practical." description="Know how resume content is processed and which data is stored in your account." />
      <div className="settings-grid">
        <div className="settings-main-column">
          <section className="panel privacy-card">
            <div className="settings-card-heading"><span className="settings-icon settings-icon-green"><ShieldCheck size={18} /></span><div><h3>Your data stays yours</h3><p>Resume files are extracted in the browser. Screening reports are stored in Firestore under your signed-in account. Firebase AI Logic analyzes submitted resume and role text.</p></div><span className="secure-pill"><span className="status-dot" /> ACCOUNT SCOPED</span></div>
              <div className="privacy-flow"><div className="privacy-flow-step"><span className="privacy-flow-number">01</span><div><strong>Read locally</strong><small>Documents and images are extracted in this browser tab.</small></div></div><ArrowRight className="privacy-flow-arrow" size={15} /><div className="privacy-flow-step"><span className="privacy-flow-number">02</span><div><strong>Review role fit</strong><small>Firebase AI Logic assesses the resume against the editable target role.</small></div></div><ArrowRight className="privacy-flow-arrow" size={15} /><div className="privacy-flow-step"><span className="privacy-flow-number">03</span><div><strong>Save report</strong><small>Report data is stored in your authenticated Firestore account.</small></div></div></div>
            <div className="privacy-data-note"><Info size={15} /><span>The complete resume text is sent to Firebase AI Logic for analysis but is not stored in Firestore. Reports contain candidate details, role description, score, skills, AI recommendations, and citations. Configure App Check and review provider data terms before deployment.</span></div>
          </section>

          <section className="panel history-settings-card"><div className="settings-card-heading"><span className="settings-icon settings-icon-blue"><Database size={18} /></span><div><h3>Account screening history</h3><p>{ownedRecords.length} report{ownedRecords.length === 1 ? '' : 's'} owned by this Firebase account.</p></div></div><div className="clear-history-row"><div><strong>Clear account screening history</strong><span>Remove reports owned by this account. Shared recruiter reports stay available to their candidate.</span></div><button className="button button-danger-outline button-sm" onClick={() => setConfirming(true)} disabled={!ownedRecords.length}><Trash2 size={14} /> Clear saved reports</button></div></section>

          <section className="panel engine-card"><div className="settings-card-heading"><span className="settings-icon settings-icon-lilac"><Sparkles size={18} /></span><div><h3>How the match signal works</h3><p>Transparent role signals with optional AI-supported guidance.</p></div></div><div className="engine-weights"><div><span className="weight-bar weight-skills" /><strong>Skill coverage</strong><small>72% base weight</small></div><div><span className="weight-bar weight-experience" /><strong>Experience signal</strong><small>18% · only when explicit</small></div><div><span className="weight-bar weight-role" /><strong>Title overlap</strong><small>10% · only when available</small></div></div><div className="engine-footnote"><CircleAlert size={14} /><span>The score is an assistive keyword signal, not a validated predictor or hiring decision. AI guidance is advisory and needs human review.</span></div></section>
          <section className="panel delete-account-card"><div><h3>Delete Firebase account</h3><p>Permanently delete this sign-in and every saved screening owned by it. Recent sign-in may be required by Firebase.</p></div><button className="button button-danger-outline button-sm" onClick={() => setConfirmingAccount(true)}><Trash2 size={14} /> Delete account</button></section>
        </div>
        <aside className="settings-side-column">
          <section className="settings-side-card"><div className="settings-side-icon"><LockKeyhole size={18} /></div><h3>Security posture</h3><ul><li><CheckCircle2 size={14} /> Firebase Auth identities</li><li><CheckCircle2 size={14} /> Owner-scoped Firestore rules</li><li><CheckCircle2 size={14} /> Resume files are not retained</li><li><CheckCircle2 size={14} /> Firebase AI Logic</li></ul><span className="settings-side-caption">AI calls require App Check when enforcement is enabled for the project.</span></section>
          <section className="fairness-card"><div className="fairness-title"><span><Fingerprint size={17} /></span><h3>Fair-use reminder</h3></div><p>Do not use a match score as the sole basis for an employment decision. Review the candidate's full context and apply the same criteria consistently.</p><button className="text-link" onClick={() => onToast('The Resume does not assess protected characteristics. Human review is always recommended.')}>About responsible use <ArrowRight size={14} /></button></section>
          <div className="build-info"><span>THE RESUME</span><strong>Logic Ninjas · Candidate insights</strong><small>Firebase-backed web app · v1.0</small></div>
        </aside>
      </div>
      {confirming && <ConfirmDialog title="Clear account screening history?" body={`This permanently removes ${ownedRecords.length} saved report${ownedRecords.length === 1 ? '' : 's'} owned by your Firestore account. Your Firebase sign-in remains active.`} confirmLabel="Clear saved reports" onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onClearHistory(); }} />}
      {confirmingAccount && <ConfirmDialog title="Delete this Firebase account?" body="This permanently deletes the account and every screening report it owns. Firebase may require a recent sign-in before deletion can complete." confirmLabel="Delete account" onCancel={() => setConfirmingAccount(false)} onConfirm={() => { setConfirmingAccount(false); onDeleteAccount(); }} />}
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel = 'Confirm', onCancel, onConfirm }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="confirm-icon"><Trash2 size={19} /></span><h3 id="confirm-title">{title}</h3><p>{body}</p><div className="confirm-actions"><button className="button button-subtle" onClick={onCancel}>Cancel</button><button className="button button-danger" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

function CompareModal({ records, onClose }) {
  const names = records.map((record) => record.candidateName).join(', ');
  const requirements = [...new Set(records.flatMap((record) => (record.requirements || []).map((item) => item.name)))];
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="compare-modal" role="dialog" aria-modal="true" aria-label={`Compare ${names}`}>
        <div className="compare-modal-header"><div><div className="eyebrow">SIDE-BY-SIDE REVIEW</div><h2>Compare profiles</h2><p>Use these signals to guide a consistent human review.</p></div><button className="icon-button" onClick={onClose} aria-label="Close comparison"><X size={18} /></button></div>
        <div className="compare-candidate-columns" style={{ '--column-count': records.length }}><div className="compare-metric-header">SCREENING SIGNAL</div>{records.map((record) => <div className="compare-candidate-heading" key={record.id}><CandidateAvatar name={record.candidateName} size="sm" /><div><strong>{record.candidateName}</strong><span>{record.jobTitle}</span></div><ScoreBadge score={record.score} /></div>)}</div>
        <div className="compare-matrix" style={{ '--column-count': records.length }}>
          <div className="compare-metric-row"><strong>Match score</strong>{records.map((record) => <span key={record.id} className={`compare-value tone-text-${scoreTone(record.score)}`}>{record.score == null ? '—' : `${record.score}%`}</span>)}</div>
          <div className="compare-metric-row"><strong>Core skills evidenced</strong>{records.map((record) => <span key={record.id}>{(record.requirements || []).filter((item) => item.priority === 'required' && item.found).length} / {(record.requirements || []).filter((item) => item.priority === 'required').length}</span>)}</div>
          <div className="compare-metric-row"><strong>Experience signal</strong>{records.map((record) => <span key={record.id}>{record.resumeYears == null ? 'Not stated' : `${record.resumeYears} yrs`}</span>)}</div>
          {requirements.slice(0, 12).map((skill) => <div className="compare-metric-row compare-skill-row" key={skill}><strong>{skill}</strong>{records.map((record) => { const found = (record.requirements || []).some((item) => item.name === skill && item.found); return <span key={record.id} className={found ? 'compare-skill-found' : 'compare-skill-missing'}>{found ? <><Check size={12} /> Found</> : <><X size={12} /> Not found</>}</span>; })}</div>)}
        </div>
        <div className="compare-modal-footer"><Info size={14} /><span>“Not found” means a keyword was not detected in the submitted text; verify in context.</span><button className="button button-subtle button-sm" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast-message" role="status"><CheckCircle2 size={16} /><span>{message}</span></div>;
}

function App() {
  const [view, setView] = useState('splash');
  const [audience, setAudience] = useState('recruiter');
  const [pendingAudience, setPendingAudience] = useState('recruiter');
  const [sampleMode, setSampleMode] = useState(false);
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const demoRecords = useMemo(createDemoRecords, []);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState({ candidateName: '', candidateEmail: '', jobTitle: '', jobDescription: '', resumeText: '', fileName: '' });
  const [manualRequirements, setManualRequirements] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compareRecords, setCompareRecords] = useState(null);
  const [roleSuggestionPending, setRoleSuggestionPending] = useState(false);
  const toastTimer = useRef(null);
  const actualCount = records.length;
  const requirements = useMemo(() => {
    const detected = detectRequirements(form.jobDescription);
    const combined = [...detected, ...manualRequirements];
    const unique = new Map();
    combined.forEach((item) => {
      const key = item.name.toLowerCase();
      if (!unique.has(key) || item.priority === 'required') unique.set(key, item);
    });
    return [...unique.values()];
  }, [form.jobDescription, manualRequirements]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    observeAuth(setUser).then((stopObserving) => {
      if (cancelled) stopObserving();
      else unsubscribe = stopObserving;
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setRecordsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setRecords([]);
    setRecordsLoading(true);
    loadUserScreenings(user.uid, user.email || '', audience)
      .then((loadedRecords) => { if (!cancelled) setRecords(loadedRecords); })
      .catch(() => { if (!cancelled) showToast('Could not load your Firebase screening history. Check Firestore rules and setup.'); })
      .finally(() => { if (!cancelled) setRecordsLoading(false); });
    return () => { cancelled = true; };
  }, [user, audience]);

  const navigate = (next) => {
    setView(next);
    setMobileOpen(false);
    if (next !== 'report') setSelectedRecord(null);
  };

  const openRecord = (record) => {
    setSelectedRecord(record);
    setView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ candidateName: '', candidateEmail: '', jobTitle: '', jobDescription: '', resumeText: '', fileName: '' });
    setManualRequirements([]);
    setIsSample(false);
    setView('analyze');
  };

  const suggestRole = async (resumeText) => {
    if (!resumeText.trim()) throw new Error('Upload or paste a resume first.');
    setRoleSuggestionPending(true);
    try {
      let suggestion;
      try {
        suggestion = await suggestRoleFromResume(resumeText);
      } catch (error) {
        const fallback = inferRoleFromResume(resumeText);
        console.warn('AI role draft unavailable; using local fallback.', error);
        suggestion = fallback;
      }
      setForm((current) => ({
        ...current,
        jobTitle: suggestion.roleTitle || current.jobTitle,
        jobDescription: suggestion.jobDescription || current.jobDescription,
        roleInference: suggestion.applicationIntent || 'inferred',
        roleRationale: suggestion.rationale || '',
        roleDraftComplete: true,
        roleDraftRequirementCount: suggestion.requirements?.length || 0,
      }));
      setManualRequirements((suggestion.requirements || []).map((item) => ({
        name: String(item.name || '').trim(),
        priority: item.priority === 'preferred' ? 'preferred' : 'required',
      })).filter((item) => item.name));
      showToast(suggestion.applicationIntent === 'explicit' ? 'Found the stated target role and drafted an editable description.' : 'Suggested a likely role from the resume and drafted an editable description.');
      return suggestion;
    } finally {
      setRoleSuggestionPending(false);
    }
  };

  const runAnalysis = async () => {
    const result = analyzeResume({
      resumeText: form.resumeText,
      jobDescription: form.jobDescription,
      jobTitle: form.jobTitle,
      candidateName: form.candidateName,
      candidateEmail: form.candidateEmail,
      manualRequirements,
    });
    const isDemoResult = isSample;
    let aiInsights = null;
    if (!isDemoResult) {
      try {
        aiInsights = await analyzeResumeWithAi({
          resumeText: form.resumeText,
          jobTitle: form.jobTitle,
          jobDescription: form.jobDescription,
        });
      } catch (error) {
        const message = String(error?.message || error || '');
        const isTransientIssue = isTransientAiError(error);
        console.warn(isTransientIssue
          ? 'AI analysis unavailable; continuing with local match logic.'
          : `AI analysis failed; continuing with local match logic. Details: ${message}`, error);
      }
    }
    let aiScoredResult = result;
    if (aiInsights?.requirements?.length) {
      const aiRequirements = aiInsights.requirements.map((item) => ({
        name: String(item.name || ''),
        priority: item.priority === 'preferred' ? 'preferred' : 'required',
        found: Boolean(item.found),
        evidence: String(item.evidence || ''),
        group: 'Role requirements',
        source: 'AI assessment',
      })).filter((item) => item.name);
      const required = aiRequirements.filter((item) => item.priority === 'required');
      const weightedTotal = aiRequirements.reduce((sum, item) => sum + (item.priority === 'preferred' ? 0.5 : 1), 0);
      const weightedFound = aiRequirements.reduce((sum, item) => sum + (item.found ? (item.priority === 'preferred' ? 0.5 : 1) : 0), 0);
      const skillScore = weightedTotal ? Math.round((weightedFound / weightedTotal) * 100) : null;
      const components = (result.components || []).map((item) => item.key === 'skills' && skillScore != null ? { ...item, value: skillScore } : item);
      if (skillScore != null && !components.some((item) => item.key === 'skills')) {
        components.push({
          key: 'skills',
          label: 'AI-assessed skill coverage',
          value: skillScore,
          weight: 0.72,
          detail: `${matchedSkills.length} of ${aiRequirements.length} AI-identified requirements evidenced`,
        });
      }
      const activeWeight = components.reduce((sum, item) => sum + item.weight, 0) || 1;
      const score = components.length ? Math.round(components.reduce((sum, item) => sum + item.value * item.weight, 0) / activeWeight) : result.score;
      const matchedSkills = aiRequirements.filter((item) => item.found);
      aiScoredResult = {
        ...result,
        requirements: aiRequirements,
        matchedSkills,
        matchedCount: matchedSkills.length,
        requiredCount: required.length,
        preferredCount: aiRequirements.filter((item) => item.priority === 'preferred').length,
        missingRequired: required.filter((item) => !item.found),
        missingPreferred: aiRequirements.filter((item) => item.priority === 'preferred' && !item.found),
        skillScore,
        components,
        score,
        band: score == null ? 'Needs review' : score >= 82 ? 'Strong alignment' : score >= 65 ? 'Potential match' : 'Skill gap',
      };
    }
    const finalized = {
      ...aiScoredResult,
      jobDescription: form.jobDescription,
      roleInference: form.roleInference || '',
      ...(aiInsights ? { aiInsights } : {}),
      demo: isDemoResult,
    };
    // The complete document stays in memory only through scoring; discard it immediately afterward.
    setForm((current) => ({ ...current, resumeText: '', fileName: '', candidateName: '', candidateEmail: '' }));
    setIsSample(false);
    if (!isDemoResult) {
      if (user) {
        try {
          const ownedReport = { ...finalized, ownerUid: user.uid };
          await saveUserScreening(user.uid, ownedReport);
          setRecords((current) => [ownedReport, ...current.filter((record) => record.id !== ownedReport.id)]);
          setSelectedRecord(ownedReport);
        } catch (error) {
          setRecords((current) => [finalized, ...current]);
          showToast(error?.message || 'Report is available for this session but could not be saved to Firestore.');
        }
      }
    }
    setSelectedRecord(finalized);
    setView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportJson = (record = selectedRecord) => {
    if (!record) return;
    const { demo, ...report } = record;
    downloadBlob(`${safeFilePart(record.candidateName)}-resume-report.json`, JSON.stringify({ ...report, demoProfile: Boolean(demo), generatedBy: 'The Resume by Logic Ninjas' }, null, 2), 'application/json');
    showToast('Report downloaded as JSON.');
  };

  const exportCsv = (profiles = [...records, ...demoRecords]) => {
    downloadBlob('the-resume-candidate-screenings.csv', buildCandidateCsv(profiles), 'text/csv;charset=utf-8');
    showToast('Candidate list downloaded as CSV.');
  };

  const deleteRecord = (id) => {
    setRecords((current) => current.filter((record) => record.id !== id));
    if (user) deleteUserScreening(id).catch(() => showToast('Could not remove the Firestore report. Check your database rules.'));
    setSelectedRecord(null);
    setView('candidates');
    showToast('Saved screening removed from your account.');
  };

  const clearHistory = () => {
    const ownedRecords = user ? records.filter((record) => record.ownerUid === user.uid) : [];
    setRecords((current) => current.filter((record) => !ownedRecords.some((owned) => owned.id === record.id)));
    if (ownedRecords.length) Promise.all(ownedRecords.map((record) => deleteUserScreening(record.id))).catch(() => showToast('Some reports could not be removed from Firestore.'));
    showToast('Owned screening reports cleared from your account.');
  };

  const deleteCandidateData = async () => {
    if (!user) return;
    try {
      await deleteFirebaseAccount(user.uid);
    } catch (error) {
      showToast(error?.message || 'Could not delete the Firebase account. Sign in again and retry.');
      return;
    }
    setRecords([]);
    setForm({ candidateName: '', candidateEmail: '', jobTitle: '', jobDescription: '', resumeText: '', fileName: '' });
    setManualRequirements([]);
    setSelectedRecord(null);
    setView('splash');
    showToast('Firebase account and its screening reports were deleted.');
  };

  const removeCandidate = (record) => {
    if (record.demo || !window.confirm(`Remove ${record.candidateName}'s saved candidate profile from this browser?`)) return;
    deleteRecord(record.id);
  };

  const enterWorkspace = (selection) => {
    setRecords([]);
    if (selection === 'sample') {
      setAudience('recruiter');
      setSampleMode(true);
      setView('overview');
      return;
    }
    setSampleMode(false);
    setPendingAudience(selection);
    if (user) {
      setAudience(selection);
      setView(selection === 'candidate' ? 'candidate' : 'overview');
    } else {
      setView('login');
    }
  };

  const onAuthenticated = () => {
    setRecords([]);
    setAudience(pendingAudience);
    setView(pendingAudience === 'candidate' ? 'candidate' : 'overview');
  };

  const handleSignOut = async () => {
    await signOutUser();
    setAudience('recruiter');
    setSampleMode(false);
    setView('splash');
  };

  const handleUpdateProfileName = async (name) => {
    await updateUserDisplayName(name);
    setUser((current) => current ? { ...current, displayName: name } : current);
  };

  const titles = {
    overview: ['Overview', 'A snapshot of your screening workspace'],
    analyze: ['Analyze resume', 'Turn resume text into clear, explainable signals'],
    candidates: ['Candidates', 'Review and compare resume screening reports'],
    insights: ['Insights', 'Understand patterns across role requirements'],
    settings: ['Privacy & settings', 'Control what stays in your browser'],
    report: ['Screening report', 'Evidence-based role alignment'],
    candidate: ['My profile', 'Understand your role fit and next steps'],
    account: ['My profile', 'Detailed Firebase account information'],
  };
  const [pageTitle, pageSubtitle] = titles[view] || titles.overview;

  return (
    <div className="app-shell">
      {view === 'splash' ? <SplashPage onEnter={enterWorkspace} /> : view === 'login' ? <LoginPage audience={pendingAudience} firebaseReady={firebaseConfigured} onBack={() => setView('splash')} onAuthenticated={onAuthenticated} /> : <>
        <Sidebar active={view} navigate={navigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} actualCount={actualCount} audience={audience} setAudience={(nextAudience) => { setRecords([]); setAudience(nextAudience); }} onSignOut={user ? handleSignOut : undefined} />
        <main className="main-shell">
          <Topbar title={pageTitle} subtitle={pageSubtitle} setMobileOpen={setMobileOpen} showDemoBadge={sampleMode && (view !== 'report' || selectedRecord?.demo)} user={sampleMode ? null : user} audience={audience} navigate={navigate} onSignOut={handleSignOut} />
          {recordsLoading && <div className="records-loading"><LoaderCircle className="spin" size={15} /> Loading your saved reports…</div>}
          {view === 'overview' && <Dashboard records={records} demoRecords={demoRecords} sampleMode={sampleMode} navigate={navigate} openRecord={openRecord} onEnterSample={() => setSampleMode(true)} />}
          {view === 'account' && <AccountProfilePage user={user} audience={audience} onUpdateName={handleUpdateProfileName} onToast={showToast} />}
          {view === 'candidate' && <CandidateProfilePage records={records} openRecord={openRecord} navigate={navigate} />}
          {view === 'analyze' && <AnalyzePage form={form} setForm={setForm} requirements={requirements} manualRequirements={manualRequirements} setManualRequirements={setManualRequirements} onRun={runAnalysis} isSample={isSample} setIsSample={setIsSample} onSuggestRole={suggestRole} roleSuggestionPending={roleSuggestionPending} onToast={showToast} />}
          {view === 'report' && <ReportPage record={selectedRecord} onBack={() => navigate(audience === 'candidate' ? 'candidate' : 'candidates')} onExportJson={() => exportJson(selectedRecord)} onExportPdf={() => { downloadScreeningPdf(selectedRecord); showToast('Candidate role assessment downloaded as a PDF.'); }} canDelete={Boolean(user && selectedRecord?.ownerUid === user.uid)} onDelete={() => { if (selectedRecord && window.confirm(`Remove ${selectedRecord.candidateName}'s saved report from your account?`)) deleteRecord(selectedRecord.id); }} onToast={showToast} />}
          {view === 'candidates' && <CandidatesPage records={records} demoRecords={demoRecords} sampleMode={sampleMode} openRecord={openRecord} onExportCsv={exportCsv} onCompare={setCompareRecords} onRemove={removeCandidate} navigate={navigate} onToast={showToast} />}
          {view === 'insights' && <InsightsPage records={records} demoRecords={demoRecords} sampleMode={sampleMode} />}
          {view === 'settings' && <SettingsPage records={records} user={user} onClearHistory={clearHistory} onDeleteAccount={deleteCandidateData} onToast={showToast} />}
        </main>
      </>}
      <Toast message={toast} />
      {compareRecords && <CompareModal records={compareRecords} onClose={() => setCompareRecords(null)} />}
    </div>
  );
}

export default App;
