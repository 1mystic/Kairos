import { EmptyState, LinkButton, Page, PageHeader } from '../components/ui';
import { SparkIcon } from '../components/icons';
import { useDocumentTitle } from './useDocumentTitle';

/** Catch-all route. Rendered inside AppLayout for signed-in users and guests, inside the plain shell for visitors. */
export function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <Page width="reading">
      <PageHeader title="Page not found" />
      <EmptyState
        icon={SparkIcon}
        title="We could not find that page"
        action={
          <div className="row-inline">
            <LinkButton to="/">Home</LinkButton>
            <LinkButton to="/practice" variant="secondary">Practice</LinkButton>
          </div>
        }
      >
        The link may be old or mistyped. Nothing is lost: your progress is exactly where you left it.
      </EmptyState>
    </Page>
  );
}
