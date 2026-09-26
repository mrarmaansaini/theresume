# The Resume by Logic Ninjas

Recruiter screening and candidate profile insights with explainable role matching, Firebase sign-in, Firestore reports, and Gemini AI assessment.

## What it does

- Starts with a welcome screen, then offers recruiter or candidate sign-in using email/password or Google.
- Extracts PDF, DOCX, TXT, JPG, PNG, WEBP, and BMP resumes in the browser. Resume files are not uploaded or retained.
- Uses Firebase AI Logic with Gemini to infer a likely target role, draft a job description, identify required/preferred skills, and compare resume evidence.
- Keeps the generated role title, description, and skill list editable before analysis.
- Generates one report shared by the recruiter and the candidate whose authenticated email matches the candidate email on the report. Candidates get read-only access to the shared recruiter report.
- Recommends skill development steps and online learning platforms. When grounded search results are returned, the report includes Google Search suggestions and cited web sources.
- Saves report data in Cloud Firestore, scoped to the authenticated owner. Candidates can print the same report to PDF; recruiters can compare their own profiles side by side.
- Includes an explicit sample preview that does not require Firebase sign-in and does not save synthetic data.

AI results are advisory. The match score is not a validated hiring predictor and must not be used as an automated employment decision.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Without Firebase configuration, the welcome screen and synthetic sample preview work. Real sign-in, Firestore persistence, and AI are disabled until a Firebase project is connected.

## Firebase setup on the Spark plan

1. Create a Firebase project and register a Web app. Keep the project on the no-cost Spark plan.
2. In Firebase Authentication, enable **Email/Password** and **Google** sign-in providers. Add `localhost` and your deployed domain to the authorized domains list.
3. Create a Cloud Firestore database. Publish the repository's `firestore.rules` rules in the Firebase console or deploy them with Firebase CLI.
4. In Firebase Console, open **AI Logic → Get started** and select the **Gemini Developer API** provider. Do not select Agent Platform / Vertex AI if you must stay on Spark.
5. Copy `.env.example` to `.env.local` and fill it with the Firebase Web app configuration from Project settings:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_AI_MODEL=gemini-3.8-flash
VITE_FIREBASE_AI_GROUNDING=false
VITE_FIREBASE_APPCHECK_ENTERPRISE_KEY=...
```

6. On **Security → App Check**, register **The Resume Web** with **reCAPTCHA Enterprise**. In Google Cloud Fraud Defense, create a score-based Web key with your site domains and no checkbox challenge. Put that public site key in `VITE_FIREBASE_APPCHECK_ENTERPRISE_KEY`; it is not an API secret. Add `localhost` for local development and the production domain before deployment. For local development, `VITE_FIREBASE_APPCHECK_DEBUG=true` makes Firebase print a debug token in the browser console; register it under App Check → The Resume Web → Manage debug tokens. A debug token is a secret: keep it out of screenshots, source control, and chat. You can instead create a token in Firebase and set `VITE_FIREBASE_APPCHECK_DEBUG` to that token value in `.env.local`. Revoke any token that has been exposed. Enable App Check enforcement for Firebase AI Logic only after requests are verified in metrics.
7. Restart `npm run dev` after editing `.env.local`.

Firebase Web configuration values are public client identifiers, not secrets. Security comes from Authentication, App Check, and Firestore Rules. Never put a Gemini API key or Firebase Admin credentials in `VITE_*` variables.

### Free-tier caveats

Firebase Authentication and Firestore have no-cost quotas on Spark. Gemini Developer API also has a free tier with limited model access and rate limits. Quotas and regional/project eligibility can change; monitor the Firebase and AI Studio usage dashboards.

The default is `gemini-3.8-flash`, which avoids the retired Gemini 2.5 model. Google Search grounding is off by default because it is not included with Gemini 3 grounding on the no-cost tier. The app still suggests established learning platforms, but without grounding it cannot claim those recommendations were verified against live web pages. Set `VITE_FIREBASE_AI_GROUNDING=true` only if you have checked the current Firebase/Gemini pricing and accept any billing requirements. Keep the project on Spark for a strictly no-paid-plan deployment. Firebase App Check's reCAPTCHA Enterprise Essentials tier includes up to 10,000 assessments/month per organization; verify current Google Cloud terms before deploying.

The Gemini Developer API free tier may use submitted prompts and responses to improve Google products. The app asks for explicit consent before sending a real resume and target role. Do not upload sensitive resumes unless the data handling terms are acceptable to the candidate and your organization.

## Data access model

The `screenings` collection stores extracted profile fields, the editable target role description, assessment, and report. It does not store the original resume text or source file. Each report has an immutable `ownerUid`. The owner can read, update, and delete it. A signed-in user can additionally read a report when their Firebase Auth email exactly matches its `candidateEmail`; this gives the candidate read-only access to the recruiter-created report. Email must be included on the screening for that sharing path to work.

Review and publish `firestore.rules` before enabling Firestore. Do not replace it with a broad “all authenticated users” rule. Account deletion removes screenings owned by that UID before deleting its Firebase Auth user; reports owned by recruiters are not deleted when a candidate deletes their own account.

## Deploy to Vercel

1. Push the repository to GitHub and import it into Vercel.
2. Use the Vite framework preset, repository root as the project root, `npm run build` as the build command, and `dist` as the output directory. `vercel.json` contains the single-page-app rewrite.
3. Add these environment variables in Vercel Project Settings → Environment Variables. Set them for Production; also set Preview values if you use preview deployments.

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_AI_MODEL=gemini-3.8-flash
VITE_FIREBASE_AI_GROUNDING=false
VITE_FIREBASE_APPCHECK_ENTERPRISE_KEY=...
```

Do not set `VITE_FIREBASE_APPCHECK_DEBUG` in Vercel. In Firebase Authentication, add the production hostname to Authorized domains. Configure the reCAPTCHA Enterprise site key to allow that hostname, verify App Check requests in metrics, and only then enable Firebase AI Logic enforcement. Deploy the Firestore rules before using saved reports:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules
```

After adding or changing Vercel environment variables, redeploy so Vite can bake them into the client build. Firebase web config and the Enterprise site key are public client values; never add Admin credentials, private API keys, or `.env.local` to Vercel `VITE_*` variables or source control. `.gitignore` excludes `.env*` other than `.env.example`, `.vercel`, and local `uploads/`. Before pushing, confirm `.env.local` and any real resume files are not already staged or tracked; `.gitignore` does not untrack files that were added earlier.

### Firebase Hosting alternative

To deploy the same build to Firebase Hosting instead, create `.env.local` with the production values before building, then run:

```bash
npm run build
firebase deploy --only firestore:rules,hosting
```

## Tests

```bash
npm test
npm run build
```

The automated tests cover the local explainable matcher. Live Firebase sign-in, Firestore Rules, App Check, and Gemini behavior require a configured Firebase project and should also be verified with Firebase's Rules Simulator and a test account.
