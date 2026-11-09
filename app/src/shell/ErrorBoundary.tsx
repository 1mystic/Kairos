import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState, Page, PageHeader } from '../components/ui';
import { AlertIcon } from '../components/icons';

/** True for the errors a stale tab gets when a lazy chunk no longer exists after a deploy (or the network dropped). */
export function isChunkLoadError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed/i.test(msg);
}

interface Props { children: ReactNode; /** change this (e.g. the pathname) to clear a shown error */ resetKey?: string }
interface State { error: unknown; key?: string }

/** Catches render errors under it and shows a calm recovery screen. Never shows stack traces; logs to the console. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error ?? new Error('Unknown error') };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { key: props.resetKey, error: state.key === undefined ? state.error : null };
    return null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Kairos: unhandled error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    const chunk = isChunkLoadError(error);
    return (
      <Page width="reading">
        <PageHeader title="Something went wrong" />
        <EmptyState
          icon={AlertIcon}
          title={chunk ? 'This page could not load' : 'We hit a snag'}
          action={
            <div className="row-inline">
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
              <a className="btn btn-secondary" href="/">Go to home</a>
            </div>
          }
        >
          {chunk
            ? 'Kairos may have been updated, or your connection dropped. Reload to get the latest version. Your saved progress is safe.'
            : 'Something unexpected happened. Reloading usually fixes it, and your saved progress is safe.'}
        </EmptyState>
      </Page>
    );
  }
}
