import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, Chip, LinkButton, LogoMark, Page, PageHeader, StickySideNav, TwoColumnPage } from '../components/ui';
import { useDocumentTitle } from '../shell/useDocumentTitle';

/** Bump this whenever either document changes. */
export const LEGAL_LAST_UPDATED = '9 November 2026';

interface Sec { id: string; title: string; body: ReactNode }

/** A value the owner must supply before launch. Rendered as an accent chip so it cannot be missed. */
function Ph({ children }: { children: string }) {
  return <Chip tone="accent">{children}</Chip>;
}

const List = ({ children }: { children: ReactNode }) => <ul className="stack-text list-disc pl-s5">{children}</ul>;

function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: Sec[] }) {
  useDocumentTitle(title);
  return (
    <>
      <header className="topbar">
        <Link to="/" aria-label="Kairos home" className="row-inline"><LogoMark /><span className="text-h3 font-bold text-ink">Kairos</span></Link>
        <LinkButton to="/" variant="ghost" size="sm">Back to home</LinkButton>
      </header>
      <Page>
        <PageHeader title={title} subtitle={intro} actions={<Chip>Last updated {LEGAL_LAST_UPDATED}</Chip>} />
        <TwoColumnPage nav={<StickySideNav label="On this page" items={sections.map(({ id, title: t }) => ({ id, label: t }))} />}>
          {sections.map((s) => (
            <Card as="section" key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className="text-h2">{s.title}</h2>
              <div className="stack-card max-w-measure text-slate">{s.body}</div>
            </Card>
          ))}
        </TwoColumnPage>
      </Page>
    </>
  );
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      intro="What Kairos collects, why, where it is kept, and the choices you have. Written to be read, not skimmed past."
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          body: (
            <>
              <p>Kairos helps you prepare for JEE Main, NEET UG, IAT and GATE DA by planning what to practise each day, counted back from your exam date. We collect only what we need to do that. We do not run ads, we do not sell your data, and your practice data is used only for your own learning.</p>
              <p>The service is run by <Ph>[LEGAL ENTITY / ADDRESS]</Ph> ("we", "us"). This notice is written with India's Digital Personal Data Protection Act, 2023 (DPDP Act) in mind.</p>
            </>
          ),
        },
        {
          id: 'collect',
          title: 'What we collect',
          body: (
            <>
              <p>If you create an account, we store:</p>
              <List>
                <li><strong>Account details:</strong> your email address and name (from email sign-up or from your Google account), and your date of birth.</li>
                <li><strong>Your set-up:</strong> your target exam, exam date, daily study capacity and other plan settings.</li>
                <li><strong>Study activity:</strong> practice sessions, the answers you give and how long you take, mock tests and their results, and the mastery estimates we calculate from them.</li>
                <li><strong>Your uploads:</strong> questions and images you choose to upload. They are stored in your account and are not shown to other users.</li>
              </List>
              <p>We also keep <strong>anonymous aggregate counters</strong> (for example, how many practice sessions were completed in a day). They are not linked to you.</p>
              <p>We do not ask for your phone number, address, school or government identifiers, and we do not use advertising or cross-site tracking.</p>
            </>
          ),
        },
        {
          id: 'guest',
          title: 'Guest mode: nothing leaves your device',
          body: (
            <>
              <p>You can use Kairos without signing in. In guest mode all your practice data stays in your browser on your device. It is not sent to us, and we cannot see it.</p>
              <p>If you later sign in, we offer to move your guest data into your account. That happens only when you agree. Clearing your browser data removes guest data for good.</p>
            </>
          ),
        },
        {
          id: 'purposes',
          title: 'Why we use it',
          body: (
            <>
              <p>Only to run Kairos for you: to show your plan, choose practice questions, grade your mocks, track your progress and keep your data in sync across devices. We do not show ads, we do not sell or rent your data, and we do not use attempt data for anything other than your own learning.</p>
              <p>Anonymous aggregate counters help us see whether the service is healthy and stay within free usage limits.</p>
            </>
          ),
        },
        {
          id: 'storage',
          title: 'Where it is stored',
          body: (
            <>
              <p>Account data is stored in Google Firebase (Cloud Firestore, region asia-south1, Mumbai) and sign-in is handled by Firebase Authentication. Data is sent over encrypted connections and access is restricted by security rules so that you can read and write only your own records.</p>
              <p>Google processes this data on our behalf under its own terms and privacy policy.</p>
            </>
          ),
        },
        {
          id: 'retention',
          title: 'How long we keep it, and deleting it',
          body: (
            <>
              <p>We keep your account data while your account exists. You can export or clear your study data from <Link to="/settings" className="text-primary underline">Settings</Link> at any time. To delete your account and everything stored in it, write to <Ph>[CONTACT EMAIL]</Ph> from the email address on the account and we will delete it. <Ph>[OWNER: confirm deletion time frame, for example within 30 days]</Ph></p>
              <p>Anonymous aggregate counters are not personal data and are kept.</p>
            </>
          ),
        },
        {
          id: 'minors',
          title: 'Age and young students',
          body: (
            <>
              <p>Kairos is open to students of all ages: there is no minimum age to use it. Many students are under 18. We ask for your date of birth at sign-up so that we can look after younger students properly and treat their data with extra care.</p>
              <p>We never use students' data for advertising, tracking or profiling beyond helping them learn, and we do not send targeted advertising to anyone. We encourage students under 18 to use Kairos with a parent or guardian's knowledge. A parent or guardian can contact us at <Ph>[CONTACT EMAIL]</Ph> to see, correct or delete a child's data at any time. Guest mode collects no personal data: everything stays on the device.</p>
            </>
          ),
        },
        {
          id: 'rights',
          title: 'Your rights',
          body: (
            <>
              <p>Under the DPDP Act you can:</p>
              <List>
                <li>ask what personal data we hold about you and get a copy (you can also export it from Settings);</li>
                <li>ask us to correct data that is wrong or out of date (you can edit most of it in Settings);</li>
                <li>ask us to erase your data;</li>
                <li>withdraw consent, and nominate someone to exercise these rights for you;</li>
                <li>make a complaint, first to us and then to the Data Protection Board of India.</li>
              </List>
              <p>Grievance officer: <Ph>[GRIEVANCE OFFICER NAME/EMAIL]</Ph>. We aim to reply within a reasonable time and not later than the law requires.</p>
            </>
          ),
        },
        {
          id: 'storage-local',
          title: 'Cookies and local storage',
          body: (
            <>
              <p>Kairos does not use advertising or analytics cookies. It uses storage in your browser to work:</p>
              <List>
                <li><strong>IndexedDB:</strong> your guest data, and a buffer of recent practice events before they are saved to your account.</li>
                <li><strong>localStorage:</strong> small settings such as your theme, the guest-mode flag, dismissed notices, an onboarding draft, cached app configuration and a local usage counter.</li>
                <li><strong>Service worker cache:</strong> the app itself and the question bank, so Kairos opens quickly and works offline.</li>
                <li><strong>Firebase Authentication</strong> keeps you signed in using its own browser storage.</li>
              </List>
              <p>You can clear all of this from your browser settings. Doing so signs you out and removes guest data.</p>
            </>
          ),
        },
        {
          id: 'third-parties',
          title: 'Third parties',
          body: (
            <>
              <p>We use Google Firebase (Authentication, Cloud Firestore, Hosting). If you choose "Continue with Google", Google tells us your name and email address. We self-host our fonts, so no font requests go to Google Fonts.</p>
              <p>We do not share your data with advertisers or data brokers. We may disclose data if the law requires it.</p>
            </>
          ),
        },
        {
          id: 'security',
          title: 'Security',
          body: <p>Connections use HTTPS, and database rules limit each account to its own data. No system is perfectly secure. If a breach affects your data, we will tell you and the authorities as the law requires.</p>,
        },
        {
          id: 'changes',
          title: 'Changes to this notice',
          body: <p>If we change this notice in a way that matters, we will update the date at the top and, for significant changes, tell you in the app.</p>,
        },
        {
          id: 'contact',
          title: 'Contact',
          body: (
            <>
              <p>Questions, requests or complaints: <Ph>[CONTACT EMAIL]</Ph></p>
              <p>Operator: <Ph>[LEGAL ENTITY / ADDRESS]</Ph></p>
            </>
          ),
        },
      ]}
    />
  );
}

export function Terms() {
  return (
    <LegalPage
      title="Terms"
      intro="The rules for using Kairos. By using it you agree to them."
      sections={[
        {
          id: 'using',
          title: 'Using Kairos',
          body: (
            <>
              <p>Kairos is a practice and planning tool for students preparing for JEE Main, NEET UG, IAT and GATE DA. You may use it as a guest or with an account, for your own personal, non-commercial learning.</p>
              <p>Kairos can help you practise, but it does not guarantee any exam result, rank or score. Predicted scores and plans are estimates.</p>
            </>
          ),
        },
        {
          id: 'accounts',
          title: 'Accounts',
          body: (
            <>
              <p>Give accurate details and keep your sign-in details to yourself. You are responsible for what happens under your account. Tell us if you think someone else has got into it.</p>
              <p>Age rules are in the <Link to="/privacy#minors" className="text-primary underline">Privacy notice</Link>.</p>
            </>
          ),
        },
        {
          id: 'acceptable-use',
          title: 'Acceptable use',
          body: (
            <>
              <p>Please do not:</p>
              <List>
                <li>break the law, or upload anything unlawful, hateful or harmful;</li>
                <li>try to break, overload or get around the security of the service, or access other people's data;</li>
                <li>scrape, copy or resell the question bank, or use bots to automate the service;</li>
                <li>pretend to be someone else, or misuse the service to cheat in a real exam.</li>
              </List>
              <p>We may limit or close accounts that do.</p>
            </>
          ),
        },
        {
          id: 'content',
          title: 'Questions, sources and accuracy',
          body: (
            <>
              <p>Practice questions come from openly licensed datasets, questions we write ourselves, and questions you upload. We work to keep questions, answer keys and solutions correct, but mistakes happen. Tell us if you spot one, and verify important facts against official sources.</p>
              <p>JEE, NEET, NTA, IAT, GATE and the names of institutes (including the IITs and IISERs) are trademarks of their respective owners. Kairos is independent and is not affiliated with, endorsed by or sponsored by the National Testing Agency, the IITs, the IISERs or any exam body. Our exam-style screen copies how a computer-based test behaves, not its branding.</p>
            </>
          ),
        },
        {
          id: 'uploads',
          title: 'Your uploads',
          body: (
            <>
              <p>You keep ownership of questions and images you upload. You give us permission to store and process them in your account so the service can show them to you. They are private to you.</p>
              <p>You are responsible for what you upload. Only upload material you have the right to use for your own practice, and never anything that breaks someone else's copyright.</p>
            </>
          ),
        },
        {
          id: 'ip',
          title: 'Our content and software',
          body: <p>The Kairos name, logo, software, plans, our own questions and solutions belong to us or our licensors. Third-party datasets keep their own licences. You may use the service, but you may not copy or resell it.</p>,
        },
        {
          id: 'availability',
          title: 'Availability',
          body: <p>Kairos is free and is provided as is. It may be unavailable at times, features may change or be removed, and free usage limits may be reached. We try to keep your data safe, but you should export anything you cannot afford to lose.</p>,
        },
        {
          id: 'liability',
          title: 'Liability',
          body: <p>To the extent the law allows, we are not liable for indirect or consequential loss, lost study time, or exam outcomes that follow from using Kairos. Nothing here limits any right you have that cannot be limited by law.</p>,
        },
        {
          id: 'law',
          title: 'Governing law',
          body: <p>These terms are governed by the laws of India. Courts in <Ph>[CITY / JURISDICTION]</Ph> have jurisdiction, subject to any rights you have under consumer law.</p>,
        },
        {
          id: 'changes',
          title: 'Changes',
          body: <p>We may update these terms. We will change the date at the top, and tell you in the app if the change is significant. Using Kairos after a change means you accept it.</p>,
        },
        {
          id: 'contact',
          title: 'Contact',
          body: (
            <>
              <p>Questions about these terms: <Ph>[CONTACT EMAIL]</Ph></p>
              <p>Operator: <Ph>[LEGAL ENTITY / ADDRESS]</Ph></p>
            </>
          ),
        },
      ]}
    />
  );
}
