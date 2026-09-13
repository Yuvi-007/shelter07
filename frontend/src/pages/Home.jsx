import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <h1>See shelter overload before it happens.</h1>
          <p>
            ShelterX tracks live occupancy across emergency shelters, predicts which ones
            are about to hit capacity, and suggests where to redirect people before it's
            too late — built for disaster-management teams working floods and other
            fast-moving emergencies.
          </p>
          <div className="actions">
            <Link to="/signup"><button className="btn accent">Get started</button></Link>
            <Link to="/login"><button className="btn ghost" style={{ color: '#fff', borderColor: '#3a4a68' }}>Log in</button></Link>
          </div>
        </div>
      </section>

      <div className="page">
        <div className="grid grid-3">
          <div className="card">
            <h3>Track occupancy</h3>
            <p className="muted">Shelter wardens log real-time headcounts so every dashboard reflects what's actually happening on the ground.</p>
          </div>
          <div className="card">
            <h3>Predict overload</h3>
            <p className="muted">A trend-based model projects when a shelter will hit capacity, flagging risk before it becomes a crisis.</p>
          </div>
          <div className="card">
            <h3>Redistribute smartly</h3>
            <p className="muted">When a shelter is at risk, ShelterX suggests the nearest shelters with room to spare.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
