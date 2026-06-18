import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getComplaint, assignComplaint, updateComplaintStatus, citizenVerify, getOfficers } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage, formatStatus, formatCategory } from '../utils/helpers';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MapPin, User, AlertTriangle, CheckCircle, Share2 } from 'lucide-react';
import CommentsThread from '../components/shared/CommentsThread';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isEmployee, isCitizen } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [verifyConfirm, setVerifyConfirm] = useState(null);
  const [verifyReason, setVerifyReason] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getComplaint(id).then(({ data }) => {
      if (cancelled) return;
      setComplaint(data.complaint);
      if (isAdmin() || user?.role === 'department_head') {
        getOfficers({ department: data.complaint.department?._id }).then((r) => !cancelled && setOfficers(r.data.officers));
      }
    }).catch((err) => {
      toast.error(getErrorMessage(err, 'Could not load complaint'));
      navigate('/complaints');
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  const refreshComplaint = async () => {
    const { data } = await getComplaint(id);
    setComplaint(data.complaint);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/track/${complaint.ticketId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Tracking link copied to clipboard!');
    } catch {
      toast(url, { duration: 8000 });
    }
  };

  const resetVerifyModal = () => { setShowVerify(false); setVerifyConfirm(null); setVerifyReason(''); setRating(0); };

  const handleAssign = async () => {
    if (!selectedOfficer) return toast.error('Select an officer');
    setActionLoading(true);
    try {
      await assignComplaint(id, { officerId: selectedOfficer, note: assignNote });
      toast.success('Complaint assigned successfully');
      setShowAssign(false);
      setAssignNote('');
      setSelectedOfficer('');
      refreshComplaint();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Assignment failed'));
    } finally { setActionLoading(false); }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return toast.error('Select a status');
    setActionLoading(true);
    try {
      await updateComplaintStatus(id, { status: newStatus, note: statusNote });
      toast.success('Status updated');
      setShowStatus(false);
      setNewStatus('');
      setStatusNote('');
      refreshComplaint();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'));
    } finally { setActionLoading(false); }
  };

  const handleVerify = async (confirmed) => {
    if (confirmed && rating === 0) return toast.error('Please rate the resolution (1-5 stars)');
    if (!confirmed && !verifyReason.trim()) return toast.error("Please explain why you're rejecting");
    setActionLoading(true);
    try {
      const { data } = await citizenVerify(id, { confirmed, feedback: verifyReason, rating, rejectionReason: verifyReason });
      toast.success(data.message);
      resetVerifyModal();
      refreshComplaint();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Verification failed'));
    } finally { setActionLoading(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
  if (!complaint) return null;

  const isOwner = (complaint.citizen?._id || complaint.citizen) === user?._id;
  const isAssigned = (complaint.assignedTo?._id || complaint.assignedTo) === user?._id;
  const canVerify = isCitizen() && isOwner && complaint.status === 'pending_verification';
  const canAssign = isAdmin() || user?.role === 'department_head';
  const canUpdateStatus = (isEmployee() && isAssigned) || canAssign;

  const PRIORITY_STYLES = { critical: { bg: '#fef2f2', color: '#991b1b' }, high: { bg: '#fff7ed', color: '#c2410c' }, medium: { bg: '#fffbeb', color: '#92400e' }, low: { bg: '#f0fdf4', color: '#166534' } };
  const ps = PRIORITY_STYLES[complaint.priority] || { bg: '#f8fafc', color: 'var(--text)' };

  return (
    <div style={{ maxWidth: 900 }}>
      <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}>← Back</button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4 }}>{complaint.ticketId}</span>
                <span className={`badge badge-${complaint.status}`}>{formatStatus(complaint.status)}</span>
                <span className="badge" style={{ background: ps.bg, color: ps.color }}>{complaint.isCritical && '🚨 '}{complaint.priority?.toUpperCase()}</span>
                {complaint.isDuplicate && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Duplicate</span>}
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>{complaint.title}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{complaint.description}</p>
              {complaint.criticalReason && (
                <div className="alert alert-critical" style={{ marginTop: 10 }}><AlertTriangle size={14} /> Critical: {complaint.criticalReason}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              {canAssign && complaint.status !== 'resolved' && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}><User size={14} /> {complaint.assignedTo ? 'Reassign' : 'Assign Officer'}</button>
              )}
              {canUpdateStatus && !['resolved', 'rejected'].includes(complaint.status) && (
                <button className="btn btn-outline btn-sm" onClick={() => setShowStatus(true)}>Update Status</button>
              )}
              {canVerify && <button className="btn btn-success btn-sm" onClick={() => setShowVerify(true)}><CheckCircle size={14} /> Verify Resolution</button>}
              <button className="btn btn-outline btn-sm" onClick={handleShare}><Share2 size={14} /> Share Tracking Link</button>
            </div>
          </div>
        </div>
      </div>

      {canVerify && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <CheckCircle size={16} />
          <div style={{ flex: 1 }}>
            <strong>Please verify if your complaint has been resolved</strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>Our officer marked this as resolved. Please confirm whether the issue is actually fixed.</div>
          </div>
          <button className="btn btn-sm btn-success" onClick={() => setShowVerify(true)}>Verify Now</button>
        </div>
      )}

      <div className="grid grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">📋 Details</div></div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  ['Category', formatCategory(complaint.category)],
                  ['Department', complaint.department?.name || 'Not assigned'],
                  ['Source', complaint.source],
                  ['AI Confidence', complaint.aiConfidence ? `${(complaint.aiConfidence * 100).toFixed(0)}%` : 'N/A'],
                  complaint.sentimentScore != null && ['Sentiment', `${complaint.sentimentLabel?.replace(/_/g, ' ')} (${(complaint.sentimentScore * 100).toFixed(0)}%)`],
                  complaint.estimatedResolutionHours && ['Est. Resolution', `${complaint.estimatedResolutionHours}h`],
                  ['Upvotes', complaint.upvoteCount || 0],
                  ['Submitted', format(new Date(complaint.createdAt), 'dd MMM yyyy HH:mm')],
                  ['Due Date', complaint.dueDate ? format(new Date(complaint.dueDate), 'dd MMM yyyy') : 'N/A'],
                  complaint.resolvedAt && ['Resolved', format(new Date(complaint.resolvedAt), 'dd MMM yyyy HH:mm')],
                  complaint.resolutionTimeHours && ['Resolution Time', `${complaint.resolutionTimeHours}h`],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', textTransform: 'capitalize' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">📍 Location</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8 }}>
                <MapPin size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{complaint.address}</div>
                  {complaint.ward && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ward: {complaint.ward}</div>}
                  {complaint.district && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>District: {complaint.district}</div>}
                  {complaint.landmark && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Landmark: {complaint.landmark}</div>}
                </div>
              </div>
            </div>
          </div>

          {complaint.assignedTo && (
            <div className="card">
              <div className="card-header"><div className="card-title">👤 Assigned Officer</div></div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{complaint.assignedTo?.name?.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{complaint.assignedTo?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{complaint.assignedTo?.designation}</div>
                    {complaint.assignedTo?.phone && <div style={{ fontSize: 12, color: 'var(--primary)' }}>📞 {complaint.assignedTo?.phone}</div>}
                  </div>
                </div>
                {complaint.assignedAt && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>Assigned: {format(new Date(complaint.assignedAt), 'dd MMM yyyy HH:mm')}</div>}
              </div>
            </div>
          )}

          {complaint.verification?.respondedAt && (
            <div className="card">
              <div className="card-header"><div className="card-title">✅ Citizen Verification</div></div>
              <div className="card-body">
                <div className={`alert ${complaint.verification.citizenConfirmed ? 'alert-success' : 'alert-critical'}`}>
                  {complaint.verification.citizenConfirmed ? '✅ Citizen confirmed resolution' : '❌ Citizen REJECTED — False closure detected'}
                </div>
                {complaint.verification.satisfactionRating && <div style={{ marginTop: 8 }}>Rating: {'⭐'.repeat(complaint.verification.satisfactionRating)}</div>}
                {complaint.verification.rejectionReason && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--danger)' }}>Reason: {complaint.verification.rejectionReason}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">📅 Activity Timeline</div></div>
          <div className="card-body">
            <div className="timeline">
              {[...complaint.timeline].reverse().map((t, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${t.status === 'resolved' ? 'success' : t.status === 'reopened' ? 'danger' : ''}`}>{t.status === 'resolved' ? '✓' : i + 1}</div>
                  <div className="timeline-content">
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{formatStatus(t.status)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.message}</div>
                    {t.updatedBy?.name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {t.updatedBy.name}</div>}
                    <div className="timeline-time">{t.timestamp ? format(new Date(t.timestamp), 'dd MMM yyyy HH:mm') : ''}</div>
                    {t.proofImages?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {t.proofImages.map((img, j) => <img key={j} src={img} alt="proof" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CommentsThread complaintId={complaint._id} />

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Assign Officer</div><button className="btn btn-icon" onClick={() => setShowAssign(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Officer</label>
                <select className="form-control" value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)}>
                  <option value="">Choose officer...</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id} disabled={o.isFull}>
                      {o.name} — {o.department?.name || o.department} ({o.activeComplaints}/{o.bandwidth} complaints){o.isFull ? ' FULL' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOfficer && (() => {
                const o = officers.find((x) => x.id === selectedOfficer);
                return o ? <div className={`alert ${o.capacityPercent > 80 ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: 12 }}>Workload: {o.capacityPercent}% ({o.activeComplaints}/{o.bandwidth})</div> : null;
              })()}
              <div className="form-group">
                <label className="form-label">Assignment Note (optional)</label>
                <textarea className="form-control" rows={3} value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="Instructions for the officer..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAssign(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={actionLoading}>{actionLoading ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {showStatus && (
        <div className="modal-overlay" onClick={() => setShowStatus(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Update Status</div><button className="btn btn-icon" onClick={() => setShowStatus(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="">Select status...</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_verification">Send for Citizen Verification ✅</option>
                  <option value="escalated">Escalate</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              {newStatus === 'pending_verification' && (
                <div className="alert alert-info" style={{ marginBottom: 12 }}>ℹ️ This will send a verification request to the citizen. They must confirm the issue is resolved.</div>
              )}
              <div className="form-group">
                <label className="form-label">Update Note</label>
                <textarea className="form-control" rows={3} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Describe what action was taken..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowStatus(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={actionLoading}>{actionLoading ? 'Updating...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {showVerify && (
        <div className="modal-overlay" onClick={resetVerifyModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">✅ Verify Resolution</div></div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>The officer has marked your complaint as resolved. Has your issue actually been fixed?</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <button className={`btn ${verifyConfirm === true ? 'btn-success' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setVerifyConfirm(true)}>✅ Yes, it's resolved</button>
                <button className={`btn ${verifyConfirm === false ? 'btn-danger' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setVerifyConfirm(false)}>❌ No, still not fixed</button>
              </div>
              {verifyConfirm === true && (
                <div className="form-group">
                  <label className="form-label">Rate the resolution (1-5 ⭐)</label>
                  <div style={{ display: 'flex', gap: 8, fontSize: 28 }}>
                    {[1, 2, 3, 4, 5].map((n) => <span key={n} style={{ cursor: 'pointer', opacity: rating >= n ? 1 : 0.3 }} onClick={() => setRating(n)}>⭐</span>)}
                  </div>
                </div>
              )}
              {verifyConfirm === false && (
                <div className="form-group">
                  <label className="form-label">Why is it not resolved? <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea className="form-control" rows={3} value={verifyReason} onChange={(e) => setVerifyReason(e.target.value)} placeholder="Describe the issue still present..." />
                  <div className="alert alert-warning" style={{ marginTop: 8 }}>⚠️ This will be flagged as a false closure and the officer will be held accountable.</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={resetVerifyModal}>Cancel</button>
              {verifyConfirm !== null && (
                <button className={`btn ${verifyConfirm ? 'btn-success' : 'btn-danger'}`} onClick={() => handleVerify(verifyConfirm)} disabled={actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Submit Verification'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
