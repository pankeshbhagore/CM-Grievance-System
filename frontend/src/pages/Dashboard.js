import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getComplaints } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCategory, formatStatus } from '../utils/helpers';
import { format } from 'date-fns';
import { Plus, CheckCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getComplaints({ limit: 100 })
      .then(({ data }) => setComplaints(data.complaints))
      .catch((err) => toast.error('Failed to load complaints'))
      .finally(() => setLoading(false));
  }, []);

  const pending = complaints.filter((c) => !['resolved', 'rejected'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const needsVerification = complaints.filter((c) => c.status === 'pending_verification');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Track your grievances and help us verify resolutions</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/complaints/new')}><Plus size={16} /> New Complaint</button>
      </div>

      {needsVerification.map((c) => (
        <div key={c._id} className="alert alert-warning" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => navigate(`/complaints/${c._id}`)}>
          <CheckCircle size={16} />
          <div style={{ flex: 1 }}><strong>Action Required: Verify Resolution</strong><div style={{ fontSize: 12 }}>{c.title} — Please confirm if your issue is resolved</div></div>
          <button className="btn btn-sm btn-success">Verify Now →</button>
        </div>
      ))}

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#eff6ff' }}>📋</div><div><div className="stat-value" style={{ color: 'var(--primary)' }}>{complaints.length}</div><div className="stat-label">Total Submitted</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fff7ed' }}><Clock size={22} color="var(--warning)" /></div><div><div className="stat-value" style={{ color: 'var(--warning)' }}>{pending}</div><div className="stat-label">In Progress</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#f0fdf4' }}><CheckCircle size={22} color="var(--success)" /></div><div><div className="stat-value" style={{ color: 'var(--success)' }}>{resolved}</div><div className="stat-label">Resolved</div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Recent Complaints</div><button className="btn btn-sm btn-outline" onClick={() => navigate('/complaints')}>View All</button></div>
        <div className="card-body">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> :
          complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ color: 'var(--text-muted)' }}>No complaints yet</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/complaints/new')}>Submit Your First Complaint</button>
            </div>
          ) : complaints.slice(0, 5).map((c) => (
            <div key={c._id} onClick={() => navigate(`/complaints/${c._id}`)} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20 }}>{c.status === 'resolved' ? '✅' : c.isCritical ? '🚨' : c.status === 'in_progress' ? '🔧' : '📋'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.ticketId} • {formatCategory(c.category)} • {format(new Date(c.createdAt), 'dd MMM yyyy')}</div>
              </div>
              <span className={`badge badge-${c.status}`}>{formatStatus(c.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
