import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { http } from '../api/http';

const authHighlights = [
  { label: 'Real-time tracking', value: 'Live food, claims, and review updates' },
  { label: 'Role dashboards', value: 'Separate views for admin, restaurant, and NGO users' },
  { label: 'Safer coordination', value: 'Pickup details, status checks, and audit visibility' }
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminLogin = location.pathname === '/admin-login';

  const [form, setForm] = useState(
    isAdminLogin
      ? { email: 'admin@foodbridge.test', password: 'admin123' }
      : { email: '', password: '' }
  );
  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const authCopy = useMemo(() => {
    if (isAdminLogin) {
      return {
        eyebrow: 'Administrative Access',
        title: 'Admin control center',
        description: 'Sign in to manage approvals, reports, dashboard analytics, and website content.',
        badge: 'Admin session'
      };
    }

    return {
      eyebrow: 'Welcome Back',
      title: 'Sign in to FoodBridge',
      description: 'Access the live food exchange dashboard for your restaurant or NGO account.',
      badge: 'Secure login'
    };
  }, [isAdminLogin]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const loggedInUser = await login(form.email, form.password);
      if (loggedInUser.role === 'admin') navigate('/admin');
      else if (loggedInUser.role === 'restaurant') navigate('/restaurant');
      else navigate('/ngo');
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot login right now. Please check your credentials and server status.');
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const { data } = await http.post('/auth/forgot-password', { email: resetEmail });
      setMessage(`OTP sent successfully. For local demo, use code: ${data.otp}`);
      setView('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Email not found');
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await http.post('/auth/reset-password', {
        email: resetEmail,
        otp: otpCode,
        password: newPassword
      });
      setMessage('Password reset successful. You can sign in now.');
      setView('login');
      setForm({ email: resetEmail, password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code');
    }
  }

  function renderLoginForm() {
    return (
      <form className="auth-card auth-form-card" onSubmit={submit}>
        <div className="auth-card-head">
          <span className="eyebrow">{authCopy.eyebrow}</span>
          <h1>{isAdminLogin ? 'Admin Portal' : 'Login to your account'}</h1>
          <p>{authCopy.description}</p>
        </div>

        {error && (
          <p className="error">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Close error">&times;</button>
          </p>
        )}
        {message && (
          <p className="notice">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} aria-label="Close message">&times;</button>
          </p>
        )}

        <div className="auth-form-grid">
          <label>
            <span>Email address</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={event => setForm({ ...form, email: event.target.value })}
              placeholder="you@example.com"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={event => setForm({ ...form, password: event.target.value })}
              placeholder="Enter your password"
            />
          </label>
        </div>

        {!isAdminLogin && (
          <div className="auth-inline-row">
            <button type="button" className="text-button" onClick={() => { setView('forgot'); setError(''); setMessage(''); }}>
              Forgot password?
            </button>
          </div>
        )}

        <button className="primary auth-submit-button">Sign In</button>

        <div style={{ marginTop: '20px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>⚡ Instant Demo Access (1-Click Preview):</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              className="button"
              style={{ padding: '8px', fontSize: '12px', fontWeight: '600' }}
              onClick={async () => {
                await login('admin@foodbridge.test', 'admin123');
                navigate('/admin');
              }}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="button"
              style={{ padding: '8px', fontSize: '12px', fontWeight: '600' }}
              onClick={async () => {
                await login('restaurant@foodbridge.test', 'demo123');
                navigate('/restaurant');
              }}
            >
              🍽️ Restaurant
            </button>
            <button
              type="button"
              className="button"
              style={{ padding: '8px', fontSize: '12px', fontWeight: '600' }}
              onClick={async () => {
                await login('ngo@foodbridge.test', 'demo123');
                navigate('/ngo');
              }}
            >
              🤝 NGO
            </button>
          </div>
        </div>

        <div className="auth-footnote">
          {!isAdminLogin ? (
            <>
              <p>New to FoodBridge? <Link to="/register">Create account</Link></p>
              <p>Admin access is still available from the dedicated <Link to="/admin-login">admin sign-in page</Link>.</p>
            </>
          ) : (
            <p><Link to="/login">Back to user login</Link></p>
          )}
        </div>
      </form>
    );
  }

  function renderForgotForm() {
    return (
      <form className="auth-card auth-form-card" onSubmit={handleForgotPassword}>
        <div className="auth-card-head">
          <span className="eyebrow">Password Recovery</span>
          <h1>Forgot password</h1>
          <p>Enter your registered email address and we will generate a verification code for reset.</p>
        </div>

        {error && <p className="error">{error}</p>}

        <label>
          <span>Email address</span>
          <input
            type="email"
            required
            value={resetEmail}
            onChange={event => setResetEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <button className="primary auth-submit-button">Send verification code</button>

        <div className="auth-footnote">
          <p><button type="button" className="text-button" onClick={() => setView('login')}>Back to login</button></p>
        </div>
      </form>
    );
  }

  function renderVerifyForm() {
    return (
      <form className="auth-card auth-form-card" onSubmit={handleResetPassword}>
        <div className="auth-card-head">
          <span className="eyebrow">Verify & Reset</span>
          <h1>Reset your password</h1>
          <p>Enter the OTP code and choose a fresh password for your FoodBridge account.</p>
        </div>

        {error && (
          <p className="error">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Close error">&times;</button>
          </p>
        )}
        {message && (
          <p className="notice">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} aria-label="Close message">&times;</button>
          </p>
        )}

        <div className="auth-form-grid">
          <label>
            <span>Verification code</span>
            <input
              type="text"
              required
              maxLength="6"
              value={otpCode}
              onChange={event => setOtpCode(event.target.value)}
              placeholder="123456"
            />
          </label>

          <label>
            <span>New password</span>
            <input
              type="password"
              required
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              placeholder="Create a new password"
            />
          </label>
        </div>

        <button className="primary auth-submit-button">Update password</button>

        <div className="auth-footnote">
          <p><button type="button" className="text-button" onClick={() => setView('login')}>Back to login</button></p>
        </div>
      </form>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-hero-card">
          <span className="auth-badge">{authCopy.badge}</span>
          <span className="eyebrow">{authCopy.eyebrow}</span>
          <h2>{authCopy.title}</h2>
          <p>{authCopy.description}</p>

          <div className="auth-highlight-list">
            {authHighlights.map(item => (
              <article className="auth-highlight-card" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </article>
            ))}
          </div>
        </div>

        {view === 'login' && renderLoginForm()}
        {view === 'forgot' && renderForgotForm()}
        {view === 'verify' && renderVerifyForm()}
      </section>
    </main>
  );
}
