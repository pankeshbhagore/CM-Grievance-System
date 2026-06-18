import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComplaints } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PRIORITY_COLORS, formatStatus, formatCategory } from '../utils/helpers';
import { format } from 'date-fns';
import { Clock, CheckCircle, AlertTriangle, List } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    getComplaints({ limit: 50 }).then(({ data }) => setMyComplaints(data.complaints)).finally(() => setLoading(false));
  }, []);

  const total = myComplaints.length;
  const resolved = myComplaints.filter((c) => c.status === 'resolved').length;
  const critical = myComplaints.filter((c) => c.isCritical).length;
  const pending = total - resolved;

  const filtered = myComplaints.filter((c) => (activeTab === 'active' ? !['resolved', 'rejected'].includes(c.status) : c.status === 'resolved'));

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>👷 My Work Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome, {user?.name} — {user?.designation}</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#eff6ff' }}><List size={22} color="var(--primary)" /></div><div><div className="stat-value" style={{ color: 'var(--primary)' }}>{total}</div><div className="stat-label">Total Assigned</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fff7ed' }}><Clock size={22} color="var(--warning)" /></div><div><div className="stat-value" style={{ color: 'var(--warning)' }}>{pending}</div><div className="stat-label">Pending</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#f0fdf4' }}><CheckCircle size={22} color="var(--success)" /></div><div><div className="stat-value" style={{ color: 'var(--success)' }}>{resolved}</div><div className="stat-label">Resolved</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef2f2' }}><AlertTriangle size={22} color="var(--danger)" /></div><div><div className="stat-value" style={{ color: 'var(--danger)' }}>{critical}</div><div className="stat-label">Critical</div></div></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Your Workload Capacity</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.activeComplaints || 0} / {user?.bandwidth || 10} complaints</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 0.5s',
              width: `${Math.min(100, ((user?.activeComplaints || 0) / (user?.bandwidth || 10)) * 100)}%`,
              background: (user?.activeComplaints || 0) >= (user?.bandwidth || 10) ? 'var(--danger)' : (user?.activeComplaints || 0) > (user?.bandwidth || 10) * 0.7 ? 'var(--warning)' : 'var(--success)'
            }} />
          </div>
        </div>
      </div>

      {myComplaints.filter((c) => c.isCritical && c.status !== 'resolved').map((c) => (
        <div key={c._id} className="alert alert-critical" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => navigate(`/complaints/${c._id}`)}>
          <AlertTriangle size={16} />
          <div style={{ flex: 1 }}><strong>🚨 CRITICAL: {c.title}</strong><div style={{ fontSize: 11 }}>{c.address} • {c.criticalReason}</div></div>
          <span style={{ fontSize: 12 }}>View →</span>
        </div>
      ))}

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('active')}>Active ({myComplaints.filter((c) => !['resolved', 'rejected'].includes(c.status)).length})</button>
            <button className={`btn btn-sm ${activeTab === 'resolved' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('resolved')}>Resolved ({resolved})</button>
          </div>
        </div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><div style={{ fontSize: 36, marginBottom: 8 }}>{activeTab === 'active' ? '✅' : '📭'}</div><div>{activeTab === 'active' ? 'No active complaints!' : 'No resolved complaints yet'}</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((c) => (
                <div key={c._id} onClick={() => navigate(`/complaints/${c._id}`)}
                  style={{ border: `1px solid ${c.isCritical ? '#fecaca' : 'var(--border)'}`, borderLeft: `4px solid ${PRIORITY_COLORS[c.priority] || '#ccc'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: c.isCritical ? '#fff5f5' : 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{c.ticketId}</span>
                    <span className={`badge badge-${c.status}`}>{formatStatus(c.status)}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.isCritical && '🚨 '}{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {c.address}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>📂 {formatCategory(c.category)}</span>
                    <span>📅 {format(new Date(c.createdAt), 'dd MMM')}</span>
                    {c.dueDate && <span style={{ color: new Date(c.dueDate) < new Date() ? 'var(--danger)' : 'inherit' }}>⏰ Due: {format(new Date(c.dueDate), 'dd MMM')}</span>}
                  </div>
                  {c.status === 'pending_verification' && <div style={{ marginTop: 8, fontSize: 12, background: '#fefce8', color: '#854d0e', padding: '4px 8px', borderRadius: 6 }}>⏳ Awaiting citizen verification</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
