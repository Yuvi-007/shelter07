import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      const data = await api.signup({ ...form, confirm_password: confirmPassword });
      login(data);
      const dest =
        data.user.role === 'admin'
          ? '/admin'
          : data.user.role === 'manager'
          ? '/manager'
          : data.user.role === 'authority' || data.user.email?.toLowerCase().startsWith('authority@')
          ? '/authority'
          : '/user';
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
          <h1>Create Account</h1>
          <p>Join ShelterX to access emergency shelter services.</p>
        </div>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={update('name')} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={update('email')} required />
        </div>
        <div className="field">
          <label htmlFor="role">Account Role</label>
          <select id="role" value={form.role} onChange={update('role')} className="select-input" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', fontSize: '14px', fontFamily: 'inherit' }}>
            <option value="user">Citizen / General User</option>
            <option value="authority">Disaster Response Authority</option>
            <option value="manager">Shelter Facility Manager</option>
            <option value="admin">System Administrator</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} required minLength={6} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}>
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
            />
            <button className="password-toggle" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
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
