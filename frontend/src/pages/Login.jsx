import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      login(data);
      const dest = { admin: '/admin', manager: '/manager', user: '/authority' }[data.user.role] || '/';
      navigate(dest);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Log in</h1>
        <p>Access your ShelterX dashboard.</p>
      </div>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn accent" type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
