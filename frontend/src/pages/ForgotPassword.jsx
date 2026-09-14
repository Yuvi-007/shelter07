import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('Password reset functionality is not available in this demo.');
  };

  return (
    <main className="auth-page">
      <form className="card form-card auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="auth-brand">Shelter<span>X</span></Link>
        <div className="auth-heading">
          <h1>Forgot Password?</h1>
          <p>Enter your email address and we'll help you reset your password.</p>
        </div>
        <div className="field">
          <label htmlFor="forgot-password-email">Email</label>
          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {message && <p className="demo-message" role="status">{message}</p>}
        <button className="btn accent auth-submit" type="submit">Send Reset Link</button>
        <Link className="back-link" to="/login">← Back to Login</Link>
      </form>
    </main>
  );
}
