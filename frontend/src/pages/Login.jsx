import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="auth-page">
      <form className="card form-card auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="auth-brand">Shelter<span>X</span></Link>
        <div className="auth-heading">
          <h1>Welcome Back</h1>
          <p>Access your emergency response workspace.</p>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <Link className="forgot-password-link" to="/forgot-password">Forgot Password?</Link>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn accent auth-submit" type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <p className="muted auth-link-text">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
        <Link className="back-link" to="/">← Back to Home</Link>
      </form>
    </main>
  );
}
