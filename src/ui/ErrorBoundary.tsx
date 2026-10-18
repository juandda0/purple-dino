import { Component, type ReactNode } from 'react';

/** Shows a "reload" screen instead of a blank page (e.g. a lazy chunk that disappeared after a deploy). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Purple Dino crashed', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const update = /dynamically imported module|Failed to fetch|Loading chunk/i.test(this.state.error.message);
    return (
      <div className="center-col" style={{ minHeight: '100dvh', padding: 24 }} role="alert">
        <div className="disp" style={{ fontSize: 18, lineHeight: '28px' }}>{update ? 'A NEW VERSION IS READY' : 'SOMETHING WENT WRONG'}</div>
        <p className="muted" style={{ fontSize: 18 }}>{update ? 'Reload to get the latest Purple Dino.' : 'Reload the page to continue.'}</p>
        <button className="btn btn-primary" style={{ padding: '18px 24px', fontSize: 16 }} onClick={() => window.location.reload()}>RELOAD</button>
      </div>
    );
  }
}
