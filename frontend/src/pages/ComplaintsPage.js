import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getComplaints } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORY_OPTIONS, PRIORITY_COLORS, formatStatus, exportToCSV } from '../utils/helpers';
import { SkeletonTableRows } from '../components/shared/Skeletons';
import { format } from 'date-fns';
import { Search, Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function ComplaintsPage() {
  const { isCitizen } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: searchParams.get('category') || '',
    search: '',
    page: 1
  });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await getComplaints(params);
      setComplaints(data.complaints);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  const handleExportCSV = () => {
    exportToCSV(
      complaints,
      [
        { label: 'Ticket ID', value: 'ticketId' },
        { label: 'Title', value: 'title' },
        { label: 'Category', value: 'category' },
        { label: 'Priority', value: 'priority' },
        { label: 'Status', value: 'status' },
        { label: 'Ward', value: 'ward' },
        { label: 'District', value: 'district' },
        { label: 'Address', value: 'address' },
        { label: 'Citizen', value: (r) => r.citizen?.name || '' },
        { label: 'Assigned Officer', value: (r) => r.assignedTo?.name || '' },
        { label: 'Submitted', value: (r) => format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm') },
        { label: 'Critical', value: (r) => (r.isCritical ? 'Yes' : 'No') },
      ],
      `complaints-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
  };

  const priorityDot = (p) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[p] || '#ccc', display: 'inline-block', marginRight: 4 }} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{isCitizen() ? 'My Complaints' : 'All Complaints'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pagination.total || 0} total complaints</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={handleExportCSV} disabled={complaints.length === 0}><Download size={16} /> Export CSV</button>
          {isCitizen() && <button className="btn btn-primary" onClick={() => navigate('/complaints/new')}><Plus size={16} /> Submit Complaint</button>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" placeholder="Search complaints..." style={{ paddingLeft: 32 }} value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
            </div>
            <select className="form-control" style={{ flex: '1 1 140px' }} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All Status</option>
              {['submitted', 'under_review', 'assigned', 'in_progress', 'pending_verification', 'resolved', 'reopened', 'escalated', 'rejected'].map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
            <select className="form-control" style={{ flex: '1 1 140px' }} value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
              <option value="">All Priorities</option>
              <option value="critical">🚨 Critical</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <select className="form-control" style={{ flex: '1 1 160px' }} value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {(filters.status || filters.priority || filters.category) && (
              <button className="btn btn-outline btn-sm" onClick={() => setFilters({ status: '', priority: '', category: '', search: '', page: 1 })}>Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Location</th><th>Date</th>
                  {!isCitizen() && <th>Citizen</th>}
                </tr>
              </thead>
              <tbody><SkeletonTableRows rows={6} cols={isCitizen() ? 7 : 8} /></tbody>
            </table>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600 }}>No complaints found</div>
              {isCitizen() && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/complaints/new')}>Submit a Complaint</button>}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Location</th><th>Date</th>
                  {!isCitizen() && <th>Citizen</th>}
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/complaints/${c._id}`)}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{c.ticketId}</span>
                      {c.isCritical && <span style={{ marginLeft: 4 }}>🚨</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      {c.isDuplicate && <span style={{ fontSize: 10, color: 'var(--warning)' }}>Duplicate</span>}
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.category?.replace('_', ' ')}</span></td>
                    <td>{priorityDot(c.priority)}<span style={{ fontSize: 12, textTransform: 'capitalize', color: PRIORITY_COLORS[c.priority] }}>{c.priority}</span></td>
                    <td><span className={`badge badge-${c.status}`}>{formatStatus(c.status)}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.ward || c.district || '—'}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(new Date(c.createdAt), 'dd MMM yy')}</span></td>
                    {!isCitizen() && <td><span style={{ fontSize: 12 }}>{c.citizen?.name || '—'}</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1} onClick={() => setFilter('page', pagination.page - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => setFilter('page', pagination.page + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
