import type { ReactNode } from 'react';
import { EmptyState, LinkButton, Page } from '../components/ui';
import { SparkIcon } from '../components/icons';

/** "Coming soon" stand-in. Later agents replace the route element that uses this. */
export function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Page width="reading" className="page-center">
      <h1 className="sr-only">{title}</h1>
      <EmptyState icon={SparkIcon} title="Coming soon" action={<LinkButton to="/" variant="secondary">Back to home</LinkButton>}>
        {children ?? `${title} is still being built. Thanks for your patience.`}
      </EmptyState>
    </Page>
  );
}
