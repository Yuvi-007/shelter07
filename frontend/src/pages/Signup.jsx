import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.signup(form);
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
        <h1>Create an account</h1>
        <p>
          For this MVP demo, you can pick your role directly. In a real deployment, only an
          admin would create manager and authority accounts.
        </p>
      </div>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" value={form.name} onChange={update('name')} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={update('email')} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={update('password')} required minLength={6} />
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" value={form.role} onChange={update('role')}>
            <option value="user">Authority (region-wide view)</option>
            <option value="manager">Manager (single shelter)</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn accent" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
