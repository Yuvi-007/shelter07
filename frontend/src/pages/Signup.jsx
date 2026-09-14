import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath } from '../utils/rbac';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { auth, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect directly to active role dashboard
  useEffect(() => {
    if (auth?.user) {
      navigate(getRoleDashboardPath(auth.user), { replace: true });
    }
  }, [auth, navigate]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // Public signups are strictly for citizens / users (role: 'user')
      const data = await api.signup({
        ...form,
        role: 'user',
        confirm_password: confirmPassword,
      });
      login(data);
      const dest = getRoleDashboardPath(data.user);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="card form-card auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="auth-brand">Shelter<span>X</span></Link>
        <div className="auth-heading">
          <h1>Create Account</h1>
          <p>Join ShelterX to access citizen emergency shelter services.</p>
        </div>
        <div className="field">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            value={form.name}
            onChange={update('name')}
            placeholder="e.g. Rahul Sharma"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              placeholder="••••••••"
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm Password</label>
          <div className="password-field">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn accent auth-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
        <p className="muted auth-link-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
        <Link className="back-link" to="/">← Back to Home</Link>
      </form>
    </main>
  );
}
