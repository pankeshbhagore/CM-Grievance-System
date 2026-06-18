import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { label: 'CM (Rekha Gupta)', email: 'cm@delhi.gov.in' },
  { label: 'Super Admin', email: 'admin@delhi.gov.in' },
  { label: 'Dept Head', email: 'dh.roads@delhi.gov.in' },
  { label: 'Officer', email: 'officer1@delhi.gov.in' },
  { label: 'Citizen', email: 'citizen1@example.com' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await login(form);
      toast.success(`Welcome, ${user.name}!`);
      if (user.role === 'cm') navigate('/cm-dashboard');
      else if (['employee', 'department_head'].includes(user.role)) navigate('/my-complaints');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
    } finally { setLoading(false); }
  };

  const quickLogin = (email) => setForm({ email, password: 'password123' });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2247 0%, #1a3a6b 50%, #2653a3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #ff6b35, #ffaa00)', borderRadius: 16, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🏛️</div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>CM Grievance System</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Delhi Government • Grievance Intelligence Dashboard</p>
        </div>

        <div className="card" style={{ padding: 32, borderRadius: 16 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '16px', background: 'var(--card-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Demo Accounts (Password: password123)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button key={acc.email} type="button" onClick={() => quickLogin(acc.email)}
                  style={{ padding: '4px 10px', fontSize: 11, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 500 }}>
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
            New citizen? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register here</Link>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
            <Link to="/track" style={{ color: 'var(--text-muted)' }}>Just want to check a ticket status? Track without logging in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
