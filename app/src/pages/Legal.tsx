import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, Chip, LinkButton, LogoMark, Page, PageHeader, StickySideNav, TwoColumnPage } from '../components/ui';

interface Sec { id: string; title: string; body: ReactNode }

function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: Sec[] }) {
  return (
    <>
      <header className="topbar">
        <Link to="/" aria-label="Kairos home" className="row gap-s2"><LogoMark /><span className="text-h3 font-bold text-ink">Kairos</span></Link>
        <LinkButton to="/" variant="ghost" size="sm">Back to home</LinkButton>
      </header>
      <Page>
        <PageHeader title={title} subtitle={intro} actions={<Chip tone="accent">Draft, to be reviewed</Chip>} />
        <TwoColumnPage nav={<StickySideNav label="On this page" items={sections.map(({ id, title: t }) => ({ id, label: t }))} />}>
          {sections.map((s) => (
            <Card as="section" key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <div className="stack gap-base">
                <h2 id={`${s.id}-h`} className="text-h2">{s.title}</h2>
                <div className="stack gap-base max-w-measure text-slate">{s.body}</div>
              </div>
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
      intro="A placeholder. The full notice will be written and reviewed before launch. Until then, these are the principles Kairos is built on."
      sections={[
        { id: 'overview', title: 'Overview', body: <p>Kairos helps you practise for JEE, NEET and IAT. We collect only what we need to do that, and we do not sell your data.</p> },
        { id: 'practice-data', title: 'Your practice data', body: <p>Attempt data is used only to help you learn. As a guest it stays on your device. If you sign in, it is saved to your account.</p> },
        { id: 'minors', title: 'Students under 18', body: <p>We ask for your date of birth at sign-up. If you are under 18, a parent or guardian is asked to confirm consent.</p> },
        { id: 'choices', title: 'Your choices', body: <p>You can export or clear your data from Settings at any time.</p> },
        { id: 'contact', title: 'Contact', body: <p>Contact details will be added before launch.</p> },
      ]}
    />
  );
}

export function Terms() {
  return (
    <LegalPage
      title="Terms"
      intro="A placeholder. The terms of use will be written and reviewed before launch."
      sections={[
        { id: 'using', title: 'Using Kairos', body: <p>Kairos is a practice tool. It does not guarantee any exam result.</p> },
        { id: 'accounts', title: 'Accounts', body: <p>You can use Kairos as a guest or with an account. Keep your sign-in details to yourself.</p> },
        { id: 'content', title: 'Questions and uploads', body: <p>Questions come from official papers, open datasets and our own solutions. If you upload questions, you confirm you may use them for your own practice.</p> },
        { id: 'changes', title: 'Changes', body: <p>We will update these terms before launch and tell you when they change.</p> },
        { id: 'contact', title: 'Contact', body: <p>Contact details will be added before launch.</p> },
      ]}
    />
  );
}
