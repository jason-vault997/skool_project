import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setIsLoading(true);
    const err = await signIn(email, password);
    setIsLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        {/* Brand mark */}
        <div className="login-brand">
          <img src="/assets/build100-icon.png" alt="BUILD100" className="login-logo-img" />
          <div className="login-brand-text">
            <span className="login-brand-name">BUILD100</span>
            <span className="login-brand-tagline">Build your first 100 clients.</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card skool-card">
          <div className="login-card-header">
            <span className="section-label">PRIVATE OPERATOR SYSTEM</span>
            <h1 className="login-title">Sign in</h1>
            <p className="login-subtitle">Your personal business operating system.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg full-w login-submit-btn"
              disabled={isLoading || !email || !password}
              id="login-submit"
            >
              {isLoading ? 'Signing in…' : 'ACCESS SYSTEM'}
            </button>
          </form>
        </div>

        <p className="login-footer-note">
          This system is private. Only authorized operators can access it.
        </p>
      </div>
    </div>
  );
};
