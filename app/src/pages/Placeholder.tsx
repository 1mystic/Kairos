import type { ReactNode } from 'react';
import { EmptyState, LinkButton, Page, PageHeader } from '../components/ui';
import { SparkIcon } from '../components/icons';

/** "Coming soon" stand-in. Later agents replace the route element that uses this. */
export function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Page width="reading">
      <PageHeader title={title} />
      <EmptyState icon={SparkIcon} title="Coming soon" action={<LinkButton to="/" variant="secondary">Back to home</LinkButton>}>
        {children ?? `${title} is still being built. Thanks for your patience.`}
      </EmptyState>
    </Page>
  );
}
