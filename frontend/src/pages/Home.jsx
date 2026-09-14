import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath } from '../utils/rbac';

export default function Home() {
  const { auth } = useAuth();
  const user = auth?.user;

  const getDashboardDestination = () => {
    if (!user) return '/signup';
    return getRoleDashboardPath(user);
  };

  const getDashboardLabel = () => {
    if (!user) return 'Access Platform';
    if (user.role === 'admin') return 'Open Admin Dashboard';
    if (user.role === 'manager') return 'Open My Shelter';
    if (user.role === 'authority') return 'Open Region Overview';
    return 'Find & Request Shelter';
  };

  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">Emergency shelter capacity intelligence</p>
          <h1>Smarter Shelter Decisions When Every Minute Matters.</h1>
          <p>
            ShelterX helps emergency response teams monitor shelter capacity, identify
            overcrowding risks, and make faster redistribution decisions.
          </p>
          <div className="actions">
            <Link to={getDashboardDestination()}><button className="btn accent">{getDashboardLabel()}</button></Link>
            <a href="#how-it-works"><button className="btn ghost hero-secondary">Learn More</button></a>
          </div>
        </div>
      </section>

      <section className="home-section problem-section">
        <div className="home-section-heading">
          <p className="section-eyebrow">The challenge</p>
          <h2>Managing Emergency Shelters Is Complex</h2>
          <p>Teams need a clear, current view of capacity before pressure becomes overcrowding.</p>
        </div>
        <div className="problem-list">
          <p>Shelters can become overcrowded.</p>
          <p>Capacity information needs to remain updated.</p>
          <p>Emergency teams need to make decisions quickly.</p>
          <p>Safe redistribution between shelters can be difficult.</p>
        </div>
      </section>

      <section className="home-section features-section">
        <div className="home-section-heading">
          <p className="section-eyebrow">Core capabilities</p>
          <h2>Clear information for faster action</h2>
        </div>
        <div className="feature-grid">
          <div className="card feature-card">
            <h3>Monitor Capacity</h3>
            <p className="muted">Track shelter occupancy and available space.</p>
          </div>
          <div className="card feature-card">
            <h3>Identify Risk</h3>
            <p className="muted">Identify shelters approaching their capacity limits.</p>
          </div>
          <div className="card feature-card">
            <h3>Predict Capacity</h3>
            <p className="muted">Analyze occupancy trends and estimate potential overcrowding.</p>
          </div>
          <div className="card feature-card">
            <h3>Redistribute People</h3>
            <p className="muted">Support authorities in moving people to shelters with available capacity.</p>
          </div>
        </div>
      </section>

      <section className="home-section workflow-section" id="how-it-works">
        <div className="home-section-heading">
          <p className="section-eyebrow">A focused workflow</p>
          <h2>How ShelterX Works</h2>
        </div>
        <div className="workflow">
          <div className="workflow-step"><span>1. MONITOR</span><p>Managers update shelter occupancy.</p></div>
          <div className="workflow-arrow" aria-hidden="true">→</div>
          <div className="workflow-step"><span>2. ANALYZE</span><p>ShelterX identifies capacity risks and trends.</p></div>
          <div className="workflow-arrow" aria-hidden="true">→</div>
          <div className="workflow-step"><span>3. RESPOND</span><p>Authorities make informed redistribution decisions.</p></div>
        </div>
      </section>

      <section className="home-cta">
        <h2>Ready to Make Smarter Shelter Decisions?</h2>
        <Link to="/signup"><button className="btn accent">Access ShelterX</button></Link>
      </section>

      <footer className="home-footer">
        <strong>ShelterX</strong>
        <span>Emergency Shelter Capacity Intelligence Platform</span>
        <span>Created by Team Moryaz</span>
        <span>© 2026 ShelterX</span>
      </footer>
    </main>
  );
}
