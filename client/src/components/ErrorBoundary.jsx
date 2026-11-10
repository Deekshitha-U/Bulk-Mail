import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('UI crashed:', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="crash"><h2>Something went wrong on this page</h2><p>{String(this.state.error?.message || this.state.error)}</p>
      <button className="primary-btn" onClick={() => { this.setState({ error: null }); window.location.assign('/app'); }}>Back to dashboard</button></div>;
  }
}
