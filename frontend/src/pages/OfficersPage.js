import React, { useState, useEffect, useMemo } from 'react';
import { getOfficerPerformance, getDepartments } from '../services/api';
import { Trophy } from 'lucide-react';

export default function OfficersPage() {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [sortBy, setSortBy] = useState('totalResolved');

  useEffect(() => {
    Promise.all([getOfficerPerformance(), getDepartments()]).then(([oRes, dRes]) => {
      setOfficers(oRes.data.officers);
      setDepartments(dRes.data.departments);
    }).finally(() => setLoading(false));
  }, []);

  // Top performers leaderboard — ranked by resolved count, with a minimum
  // bar so officers with 0 resolved complaints never appear "ranked"
  const leaderboard = useMemo(
    () => [...officers].filter((o) => o.stats?.totalResolved > 0).sort((a, b) => b.stats.totalResolved - a.stats.totalResolved).slice(0, 3),
    [officers]
  );

  const filtered = officers
    .filter((o) => !filterDept || o.department === departments.find((d) => d._id === filterDept)?.name)
    .sort((a, b) => {
      if (sortBy === 'totalResolved') return b.stats.totalResolved - a.stats.totalResolved;
      if (sortBy === 'falseClosures') return b.stats.falseClosures - a.stats.falseClosures;
      if (sortBy === 'capacity') return b.capacityPercent - a.capacityPercent;
      return 0;
    });

  const getCapacityColor = (pct) => (pct >= 100 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--success)');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>Officer Performance & Bandwidth</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Track officer workload, performance, and integrity</p>
      </div>

      {leaderboard.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title"><Trophy size={16} style={{ marginRight: 6, verticalAlign: -3, color: '#d97706' }} />Top Performers</div></div>
          <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {leaderboard.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 220px', background: 'var(--card-hover)', borderRadius: 10, padding: '10px 14px' }}>
                <div className={`leaderboard-rank rank-${i + 1}`}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.stats.totalResolved} resolved · {o.department}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="form-control" style={{ flex: '1 1 180px' }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="form-control" style={{ flex: '1 1 180px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="totalResolved">Sort by: Most Resolved</option>
            <option value="falseClosures">Sort by: False Closures (⚠️)</option>
            <option value="capacity">Sort by: Workload</option>
          </select>
        </div>
      </div>

      <div className="grid grid-3">
        {filtered.map((o) => (
          <div key={o.id} className="card">
            <div className="card-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{o.name?.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{o.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.designation}</div>
                  <div style={{ fontSize: 11, color: 'var(--primary)' }}>{o.department}</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Workload</span>
                  <span style={{ fontWeight: 600, color: getCapacityColor(o.capacityPercent) }}>{o.capacityPercent}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--card-hover)', borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, o.capacityPercent)}%`, background: getCapacityColor(o.capacityPercent), transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{o.activeComplaints}/{o.bandwidth} active complaints</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  ['Assigned', o.stats?.totalAssigned || 0, 'var(--primary)'],
                  ['Resolved', o.stats?.totalResolved || 0, 'var(--success)'],
                  ['Avg Time', `${o.stats?.avgResolutionHours || 0}h`, 'var(--info)'],
                  ['Satisfaction', o.stats?.avgSatisfactionScore ? `${o.stats.avgSatisfactionScore}/5 ⭐` : 'N/A', 'var(--warning)'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: 'var(--card-hover)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {o.stats?.falseClosures > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ {o.stats.falseClosures} false closure{o.stats.falseClosures > 1 ? 's' : ''} flagged</span>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>Rate: {o.falseClosureRate}%</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><div style={{ fontSize: 40, marginBottom: 12 }}>👥</div><div>No officers found</div></div>}
    </div>
  );
}
