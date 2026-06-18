import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment } from '../services/api';
import { getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Building2 } from 'lucide-react';

const ALL_CATEGORIES = [
  'roads_potholes', 'water_supply', 'garbage_sanitation', 'sewage', 'electricity',
  'street_lights', 'traffic', 'encroachment', 'pollution', 'park_maintenance',
  'building_safety', 'drainage', 'public_transport', 'noise_complaint', 'other'
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', slaHours: 72, contactEmail: '', contactPhone: '', complaintCategories: [] });

  useEffect(() => {
    getDepartments().then(({ data }) => setDepartments(data.departments)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return toast.error('Name and code are required');
    setCreating(true);
    try {
      const { data } = await createDepartment(form);
      setDepartments((d) => [...d, data.department]);
      setShowCreate(false);
      setForm({ name: '', code: '', description: '', slaHours: 72, contactEmail: '', contactPhone: '', complaintCategories: [] });
      toast.success('Department created!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create department'));
    } finally { setCreating(false); }
  };

  const toggleCategory = (cat) => setForm((f) => ({ ...f, complaintCategories: f.complaintCategories.includes(cat) ? f.complaintCategories.filter((c) => c !== cat) : [...f.complaintCategories, cat] }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>🏛️ Departments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Manage government departments and their complaint categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Department</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div> : (
        <div className="grid grid-3">
          {departments.map((d) => (
            <div key={d._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={22} color="white" /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Code: {d.code}</div></div>
                </div>
                {d.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{d.description}</p>}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>{d.stats?.totalComplaints || 0}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total</div></div>
                  <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>{d.stats?.resolved || 0}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Resolved</div></div>
                  <div style={{ flex: 1, background: '#fffbeb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--warning)' }}>{d.slaHours}h</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SLA</div></div>
                </div>
                {d.complaintCategories?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {d.complaintCategories.map((c) => <span key={c} style={{ background: '#eff6ff', color: 'var(--primary)', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>{c.replace('_', ' ')}</span>)}
                  </div>
                )}
                {d.head && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>👤 Head: {d.head?.name}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Add Department</div><button className="btn btn-icon" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Code *</label><input className="form-control" placeholder="e.g. ROADS" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-2">
                  <div className="form-group"><label className="form-label">Contact Email</label><input type="email" className="form-control" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">SLA (hours)</label><input type="number" className="form-control" value={form.slaHours} onChange={(e) => setForm((f) => ({ ...f, slaHours: parseInt(e.target.value) || 1 }))} min={1} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Complaint Categories</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ALL_CATEGORIES.map((cat) => (
                      <span key={cat} onClick={() => toggleCategory(cat)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: form.complaintCategories.includes(cat) ? 'var(--primary)' : '#f1f5f9', color: form.complaintCategories.includes(cat) ? 'white' : 'var(--text)', border: '1px solid var(--border)' }}>{cat.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
