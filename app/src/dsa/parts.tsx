import type { ReactNode } from 'react';
import { AlertIcon } from '../components/icons';
import { Button, Chip, EmptyState, Page, PageHeader, PageSkeleton } from '../components/ui';
import { useCatalog, type Catalog, type Diff } from './catalog';
import { DIFF_LABEL, DIFF_TONE } from './logic';

/** Difficulty chip: semantic colour plus the word, never colour alone. */
export function DiffChip({ d }: { d: Diff }) {
  return <Chip tone={DIFF_TONE[d]}>{DIFF_LABEL[d]}</Chip>;
}

/** Loads the catalog and renders skeleton / offline error with retry / the children. */
export function CatalogGate({ title, children }: { title: string; children(cat: Catalog): ReactNode }) {
  const { data, loading, error, retry } = useCatalog();
  if (loading) return <PageSkeleton cards={4} cols={4} />;
  if (error || !data) {
    return (
      <Page width="reading">
        <PageHeader title={title} />
        <EmptyState
          icon={AlertIcon}
          title="Could not load the problems"
          action={<Button onClick={retry}>Try again</Button>}
        >
          Check your connection and try again. Once loaded, the list is saved on this device for offline use.
        </EmptyState>
      </Page>
    );
  }
  return <>{children(data)}</>;
}
