import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboardStats, getComplaints, getAiAnomalies } from '../services/api';
import { formatCategory, formatStatus, DATE_RANGE_PRESETS } from '../utils/helpers';
import { SkeletonStatsGrid } from '../components/shared/Skeletons';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#1a3a6b', '#ff6b35', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

export default function CMDashboard() {
  const [stats, setStats] = useState(null);
  const [criticalComplaints, setCriticalComplaints] = useState([]);
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(null); // null = all time
  const navigate = useNavigate();

  const fetchStats = useCallback(() => {
    setLoading(true);
    Promise.all([
      getDashboardStats(rangeDays === null ? {} : { days: rangeDays }),
      getComplaints({ priority: 'critical', status: 'submitted,under_review,assigned,in_progress', limit: 5 }),
      getAiAnomalies()
    ]).then(([statsRes, critRes, anomalyRes]) => {
      setStats(statsRes.data.stats);
      setCriticalComplaints(critRes.data.complaints);
      setAnomalies(anomalyRes.data);
    }).finally(() => setLoading(false));
  }, [rangeDays]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading && !stats) return (
    <div>
      <div style={{ marginBottom: 24 }}><div className="skeleton skeleton-text" style={{ width: 280, height: 28 }} /></div>
      <SkeletonStatsGrid count={4} />
    </div>
  );

  const categoryData = stats?.categoryCounts?.map((c) => ({ name: formatCategory(c._id), value: c.count })) || [];
  const trendData = stats?.trend?.map((t) => ({ date: t._id?.slice(5), complaints: t.count })) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>CM Grievance Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Delhi Grievance Intelligence System • {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="date-range-pills">
          {DATE_RANGE_PRESETS.map((p) => (
            <button key={p.label} className={`date-pill${rangeDays === p.days ? ' active' : ''}`} onClick={() => setRangeDays(p.days)} disabled={loading}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {criticalComplaints.length > 0 && (
        <div className="alert alert-critical" style={{ marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/complaints?priority=critical')}>
          <AlertTriangle size={18} />
          <strong>🚨 {criticalComplaints.length} CRITICAL complaint{criticalComplaints.length > 1 ? 's' : ''} require immediate attention</strong>
          <span style={{ marginLeft: 'auto', fontSize: 12 }}>Click to view →</span>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>📋</div>
          <div><div className="stat-value" style={{ color: 'var(--primary)' }}>{stats?.total || 0}</div><div className="stat-label">Total Complaints</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/complaints?status=submitted')}>
          <div className="stat-icon" style={{ background: '#fff7ed' }}>⏳</div>
          <div><div className="stat-value" style={{ color: 'var(--warning)' }}>{stats?.pending || 0}</div><div className="stat-label">Pending Action</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>✅</div>
          <div><div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.resolved || 0}</div><div className="stat-label">Resolved</div><div className="stat-change" style={{ color: 'var(--success)' }}>{stats?.resolutionRate}% rate</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/complaints?priority=critical')}>
          <div className="stat-icon" style={{ background: '#fef2f2' }}>🚨</div>
          <div><div className="stat-value" style={{ color: 'var(--danger)' }}>{stats?.critical || 0}</div><div className="stat-label">Critical Alerts</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2' }}>⚠️</div>
          <div><div className="stat-value" style={{ color: 'var(--danger)' }}>{stats?.falseClosures || 0}</div><div className="stat-label">False Closures Caught</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fefce8' }}>📅</div>
          <div><div className="stat-value" style={{ color: 'var(--warning)' }}>{stats?.overdueCount || 0}</div><div className="stat-label">Overdue Complaints</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', gridColumn: 'span 2' }} onClick={() => navigate('/map')}>
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>🗺️</div>
          <div><div className="stat-value" style={{ color: 'var(--primary)', fontSize: 20 }}>View Grievance Map</div><div className="stat-label">See all complaints on Delhi map with hotspots</div></div>
        </div>
      </div>

      {anomalies && (anomalies.officerAnomalies?.length > 0 || anomalies.departmentBottlenecks?.length > 0) && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(124, 58, 237, 0.3)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, rgba(26, 58, 107, 0.05), rgba(124, 58, 237, 0.05))', borderRadius: '12px 12px 0 0' }}>
            <div className="card-title">🤖 AI Insights & Anomalies</div>
          </div>
          <div className="card-body">
            <div className="grid grid-2">
              {anomalies.departmentBottlenecks?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>DEPARTMENT BOTTLENECKS</div>
                  {anomalies.departmentBottlenecks.slice(0, 3).map((b, i) => (
                    <div key={i} className="anomaly-alert" style={{ marginBottom: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--danger)' }}>{b.department}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', background: '#fecaca', color: '#991b1b', borderRadius: 4 }}>{b.severity.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 12 }}>{b.overdue} overdue complaints • Avg age: {b.avgAgeHours}h</div>
                    </div>
                  ))}
                </div>
              )}
              {anomalies.officerAnomalies?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>OFFICER BEHAVIOR</div>
                  {anomalies.officerAnomalies.slice(0, 3).map((a, i) => (
                    <div key={i} className="anomaly-alert" style={{ marginBottom: 8, padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--danger)' }}>{a.officer.name}</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        {a.anomalies.map((an, j) => <div key={j}>⚠️ {an.message}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">📈 {rangeDays === 0 ? "Today's" : rangeDays ? `${Math.min(rangeDays, 90)}-Day` : '7-Day'} Complaint Trend</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="complaints" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: 'var(--primary)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">🏷️ Complaints by Category</div></div>
          <div className="card-body">
            {categoryData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏛️ Department Performance</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/officers')}>View All</button>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.topDepts?.map((d) => ({ dept: d.dept?.[0]?.name?.split(' ')?.[0] || 'Unknown', total: d.total, resolved: d.resolved })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#1a3a6b" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="#16a34a" name="Resolved" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">🚨 Critical Complaints</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/complaints?priority=critical')}>View All</button>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            {criticalComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div>No critical complaints pending</div>
              </div>
            ) : criticalComplaints.map((c) => (
              <div key={c._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate(`/complaints/${c._id}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--danger)' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.address}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.criticalReason}</div>
                  </div>
                  <span className="badge badge-critical">CRITICAL</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">📊 Status Distribution</div></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {stats?.statusCounts?.map((s) => (
              <div key={s._id} style={{ flex: '1 1 120px', background: 'var(--card-hover)', borderRadius: 10, padding: '14px 18px', cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => navigate(`/complaints?status=${s._id}`)}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{s.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatStatus(s._id)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
