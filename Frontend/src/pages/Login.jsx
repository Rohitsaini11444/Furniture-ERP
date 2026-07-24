import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.username, form.password);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  const roleCards = [
    { role: 'Admin', username: 'admin', password: 'admin123', color: '#8b5a2b', desc: 'Full system access' },
    { role: 'Supervisor', username: 'supervisor_sanding', password: 'super123', color: '#a855f7', desc: 'Sanding batch management' },
    { role: 'Contractor', username: 'contractor_ravi', password: 'ravi123', color: '#22c55e', desc: 'View assigned work' },
  ];

  const fillCredentials = (username, password) => {
    setForm({ username, password });
    setError(null);
  };

  return (
    <div className="login-page">
      {/* Left Panel — Branding */}
      <div className="login-branding">
        <div className="login-branding-inner">
          <div className="login-logo">
            <span className="login-logo-icon">🪵</span>
          </div>
          <h1 className="login-brand-title">Pinkcity Enterprises</h1>
          <p className="login-brand-subtitle">
            Manufacturing Intelligence Platform
          </p>
          <div className="login-workflow">
            {['Sanding', 'Polish', 'Fitting', 'Packaging', 'Dispatch'].map((step, i) => (
              <div key={step} className="login-workflow-step">
                <div className="login-workflow-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                <span>{step}</span>
                {i < 4 && <div className="login-workflow-line" />}
              </div>
            ))}
          </div>
          <div className="login-quick-access">
            <p className="login-quick-label">Quick Access (Dev)</p>
            {roleCards.map((card) => (
              <button
                key={card.role}
                className="login-quick-btn"
                style={{ borderColor: card.color }}
                onClick={() => fillCredentials(card.username, card.password)}
              >
                <span className="login-quick-role" style={{ color: card.color }}>{card.role}</span>
                <span className="login-quick-desc">{card.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="login-form-panel">
        <div className="login-form-card">
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="username" className="login-label">Username</label>
              <div className="login-input-wrapper">
                <User size={16} className="login-input-icon" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">Password</label>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading || !form.username || !form.password}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-roles-info">
            <p className="login-roles-title">Role Permissions</p>
            <div className="login-role-badges">
              <span className="login-role-badge admin-badge">Admin — Full Access</span>
              <span className="login-role-badge supervisor-badge">Supervisor — Batch Manage</span>
              <span className="login-role-badge contractor-badge">Contractor — View Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
