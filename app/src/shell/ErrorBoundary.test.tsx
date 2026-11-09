import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ErrorBoundary, isChunkLoadError } from './ErrorBoundary';
import { NotFound } from './NotFound';

function Boom({ msg }: { msg: string }): never { throw new Error(msg); }

describe('ErrorBoundary', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => vi.restoreAllMocks());

  it('shows a friendly screen without the error text or stack', () => {
    render(<MemoryRouter><ErrorBoundary><Boom msg="secret internal detail" /></ErrorBoundary></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/secret internal detail/)).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('offers a reload for chunk-load failures', () => {
    render(<ErrorBoundary><Boom msg="Failed to fetch dynamically imported module: /assets/x.js" /></ErrorBoundary>);
    expect(screen.getByText(/may have been updated/)).toBeInTheDocument();
  });

  it('renders children when nothing throws', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('recognises chunk load errors', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
  });
});

describe('NotFound', () => {
  it('links home and to practice and sets the title', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
    expect(document.title).toBe('Page not found | Kairos');
  });
});
