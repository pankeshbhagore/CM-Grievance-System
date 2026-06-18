const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { classifyComplaint, detectDuplicate, calculateSLA } = require('../services/aiClassification');
const { syncComplaintToMCD311 } = require('../services/mcd311');
const { notify, notifyMany } = require('../services/notificationService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// ---- Submit new complaint ----
exports.submitComplaint = asyncHandler(async (req, res) => {
  const { title, description, address, ward, district, pincode, landmark, coordinates, source, socialMediaRef } = req.body;
  const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

  const ai = classifyComplaint(title, description);
  const dept = await Department.findOne({ complaintCategories: ai.category, isActive: true });

  let location;
  if (coordinates) {
    try {
      const parsed = JSON.parse(coordinates);
      if (Array.isArray(parsed) && parsed.length === 2) location = { type: 'Point', coordinates: parsed };
    } catch {
      // invalid coordinates payload — proceed without location rather than failing the whole submission
    }
  }

  let isDuplicate = false;
  let parentComplaint = null;
  const duplicate = await detectDuplicate(Complaint, title, description, location);
  if (duplicate) {
    isDuplicate = true;
    parentComplaint = duplicate._id;
    await Complaint.findByIdAndUpdate(duplicate._id, { $inc: { duplicateCount: 1 } });
  }

  const dueHours = calculateSLA(ai.category, ai.priority);
  const dueDate = new Date(Date.now() + dueHours * 60 * 60 * 1000);

  const complaint = await Complaint.create({
    title, description, address, ward, district, pincode, landmark,
    location,
    category: ai.category,
    priority: ai.isCritical ? 'critical' : ai.priority,
    isCritical: ai.isCritical,
    criticalReason: ai.criticalReason,
    aiConfidence: ai.confidence,
    aiSuggestedCategory: ai.category,
    aiSuggestedPriority: ai.priority,
    department: dept?._id,
    citizen: req.user._id,
    images,
    source: source || 'portal',
    socialMediaRef,
    isDuplicate,
    parentComplaint,
    dueDate,
    sentimentScore: ai.sentiment?.score,
    sentimentLabel: ai.sentiment?.label,
    estimatedResolutionHours: ai.estimatedResolutionHours?.estimatedHours,
    timeline: [{ status: 'submitted', message: 'Complaint submitted successfully', updatedBy: req.user._id }]
  });

  // Background MCD311 sync — never blocks the response
  syncComplaintToMCD311(complaint)
    .then(async (mcdResult) => {
      await Complaint.findByIdAndUpdate(complaint._id, {
        mcd311TicketId: mcdResult.mcd311TicketId,
        mcd311Status: mcdResult.status,
        mcd311LastSync: new Date(),
        mcd311SyncFailed: !mcdResult.success
      });
    })
    .catch((err) => console.error('[MCD311 sync error]', err.message));

  if (dept) {
    await Department.findByIdAndUpdate(dept._id, { $inc: { 'stats.totalComplaints': 1, 'stats.pending': 1 } });
  }

  if (ai.sentiment?.label === 'highly_frustrated' && !complaint.isCritical) {
    const officials = await User.find({ role: { $in: ['cm', 'super_admin'] }, isActive: true }).select('_id');
    await notifyMany(req.io, officials.map(o => o._id), {
      type: 'high_frustration_alert',
      title: '😤 Highly Frustrated Citizen',
      message: `${complaint.title} — Sentiment score: ${ai.sentiment?.score}`,
      complaintId: complaint._id
    });
  }

  // Real-time + persisted notifications to CM/admins for critical complaints
  if (complaint.isCritical) {
    const officials = await User.find({ role: { $in: ['cm', 'super_admin'] }, isActive: true }).select('_id');
    await notifyMany(req.io, officials.map((o) => o._id), {
      type: 'critical_complaint',
      title: '🚨 Critical Complaint Reported',
      message: `${complaint.title} — ${complaint.address}`,
      complaintId: complaint._id
    });
    req.io?.emit('critical_complaint', {
      id: complaint._id, ticketId: complaint.ticketId, title: complaint.title,
      address: complaint.address, criticalReason: complaint.criticalReason
    });
  }
  req.io?.emit('new_complaint', { ticketId: complaint.ticketId, category: complaint.category });

  const populated = await Complaint.findById(complaint._id)
    .populate('citizen', 'name email')
    .populate('department', 'name');
  res.status(201).json({ success: true, complaint: populated });
});

// ---- List complaints (role-filtered) ----
exports.getComplaints = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, category, priority, department, ward, search, sort = '-createdAt' } = req.query;
  const query = {};

  if (req.user.role === 'citizen') query.citizen = req.user._id;
  else if (req.user.role === 'employee') query.assignedTo = req.user._id;
  else if (req.user.role === 'department_head' && req.user.department) query.department = req.user.department._id;

  if (status) query.status = { $in: status.split(',') };
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (department && ['cm', 'super_admin'].includes(req.user.role)) query.department = department;
  if (ward) query.ward = ward;
  if (search) query.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const [total, complaints] = await Promise.all([
    Complaint.countDocuments(query),
    Complaint.find(query)
      .populate('citizen', 'name phone')
      .populate('assignedTo', 'name designation')
      .populate('department', 'name code')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
  ]);

  res.json({
    success: true,
    complaints,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
  });
});

// ---- Single complaint ----
exports.getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('citizen', 'name email phone ward')
    .populate('assignedTo', 'name designation phone')
    .populate('assignedBy', 'name')
    .populate('department', 'name code contactEmail contactPhone')
    .populate('timeline.updatedBy', 'name role');

  if (!complaint) throw new AppError('Complaint not found', 404);

  const isOwner = complaint.citizen?._id?.toString() === req.user._id.toString();
  const isAssignee = complaint.assignedTo?._id?.toString() === req.user._id.toString();
  const isPrivileged = ['cm', 'super_admin', 'department_head'].includes(req.user.role);

  if (req.user.role === 'citizen' && !isOwner) throw new AppError('Not authorized to view this complaint', 403);
  if (req.user.role === 'employee' && !isAssignee) throw new AppError('Not authorized to view this complaint', 403);
  if (req.user.role === 'department_head' && complaint.department?._id?.toString() !== req.user.department?._id?.toString()) {
    throw new AppError('Not authorized to view this complaint', 403);
  }

  res.json({ success: true, complaint });
});

// Public tracking — no authentication required, intentionally exposes only
// non-sensitive fields (no citizen contact info, no officer phone numbers,
// no internal notes) so a tracking link can be safely shared with anyone.
exports.trackPublic = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findOne({ ticketId: req.params.ticketId })
    .populate('department', 'name')
    .select('ticketId title category priority status address ward district createdAt resolvedAt dueDate isCritical timeline upvoteCount');

  if (!complaint) throw new AppError('No complaint found with this ticket ID', 404);

  const safeTimeline = complaint.timeline.map((t) => ({ status: t.status, message: t.message, timestamp: t.timestamp }));

  res.json({
    success: true,
    complaint: {
      ticketId: complaint.ticketId,
      title: complaint.title,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      address: complaint.address,
      ward: complaint.ward,
      district: complaint.district,
      department: complaint.department?.name,
      isCritical: complaint.isCritical,
      createdAt: complaint.createdAt,
      resolvedAt: complaint.resolvedAt,
      dueDate: complaint.dueDate,
      upvoteCount: complaint.upvoteCount,
      timeline: safeTimeline
    }
  });
});

// ---- Assign to officer ----
exports.assignComplaint = asyncHandler(async (req, res) => {
  const { officerId, note } = req.body;
  if (!officerId) throw new AppError('officerId is required', 400);

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);
  if (complaint.status === 'resolved') throw new AppError('Cannot reassign a resolved complaint', 400);

  const officer = await User.findById(officerId);
  if (!officer || !['employee', 'department_head'].includes(officer.role)) {
    throw new AppError('Selected user is not a valid officer', 400);
  }
  if (!officer.isActive) throw new AppError('Officer account is deactivated', 400);

  if (officer.activeComplaints >= officer.bandwidth) {
    throw new AppError(`Officer at full capacity (${officer.activeComplaints}/${officer.bandwidth})`, 400);
  }

  const previousOfficerId = complaint.assignedTo;
  if (previousOfficerId && previousOfficerId.toString() !== officerId) {
    await User.findByIdAndUpdate(previousOfficerId, { $inc: { activeComplaints: -1 } });
  }
  if (!previousOfficerId || previousOfficerId.toString() !== officerId) {
    await User.findByIdAndUpdate(officerId, { $inc: { activeComplaints: 1, 'stats.totalAssigned': 1 } });
  }

  complaint.assignedTo = officerId;
  complaint.assignedBy = req.user._id;
  complaint.assignedAt = new Date();
  if (complaint.status === 'submitted' || complaint.status === 'under_review') complaint.status = 'assigned';
  complaint.timeline.push({ status: 'assigned', message: note || `Assigned to ${officer.name}`, updatedBy: req.user._id });
  await complaint.save();

  await notify(req.io, {
    recipientId: officerId,
    type: 'new_assignment',
    title: 'New Complaint Assigned',
    message: `${complaint.ticketId}: ${complaint.title}`,
    complaintId: complaint._id
  });

  await AuditLog.create({ action: 'ASSIGN', entityType: 'complaint', entityId: complaint._id, performedBy: req.user._id, details: { officerId } });

  res.json({ success: true, complaint });
});

// ---- Update status (officer/admin) ----
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note, resolutionNote } = req.body;
  if (!status) throw new AppError('status is required', 400);

  const VALID_STATUSES = ['under_review', 'assigned', 'in_progress', 'pending_verification', 'escalated', 'rejected', 'resolved'];
  if (!VALID_STATUSES.includes(status)) throw new AppError('Invalid status value', 400);

  const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);

  if (req.user.role === 'employee' && complaint.assignedTo?.toString() !== req.user._id.toString()) {
    throw new AppError('You are not assigned to this complaint', 403);
  }
  if (['resolved', 'rejected'].includes(complaint.status)) {
    throw new AppError('Complaint is already closed', 400);
  }

  complaint.timeline.push({ status, message: note || `Status updated to ${status}`, updatedBy: req.user._id, proofImages: images });

  if (status === 'in_progress' && images.length > 0) {
    complaint.resolutionImages.push(...images);
  }

  if (status === 'pending_verification') {
    complaint.status = 'pending_verification';
    complaint.resolutionNote = resolutionNote;
    complaint.resolutionImages.push(...images);
    complaint.verification = { requestedAt: new Date(), citizenConfirmed: null };

    await notify(req.io, {
      recipientId: complaint.citizen,
      type: 'verification_required',
      title: 'Please verify your complaint resolution',
      message: `Officer marked "${complaint.title}" as resolved. Please confirm.`,
      complaintId: complaint._id
    });

    // Suspicious: marked for verification with zero proof images ever attached
    if (images.length === 0 && complaint.resolutionImages.length === 0) {
      await AuditLog.create({
        action: 'SUSPICIOUS_CLOSURE', entityType: 'complaint', entityId: complaint._id,
        performedBy: req.user._id, suspicious: true,
        suspicionReason: 'Sent for verification without any proof images'
      });
    }
  } else {
    complaint.status = status;
  }

  await complaint.save();
  req.io?.emit('complaint_updated', { ticketId: complaint.ticketId, status: complaint.status });

  res.json({ success: true, complaint });
});

// ---- Citizen verification (anti-false-closure core feature) ----
exports.citizenVerify = asyncHandler(async (req, res) => {
  const { confirmed, feedback, rating, rejectionReason } = req.body;
  if (typeof confirmed !== 'boolean') throw new AppError('confirmed (boolean) is required', 400);

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);
  if (complaint.citizen.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);
  if (complaint.status !== 'pending_verification') throw new AppError('This complaint is not awaiting verification', 400);

  complaint.verification.respondedAt = new Date();
  complaint.verification.citizenConfirmed = confirmed;
  complaint.verification.citizenFeedback = feedback;

  if (confirmed) {
    if (!rating || rating < 1 || rating > 5) throw new AppError('A rating from 1-5 is required to confirm resolution', 400);
    complaint.verification.satisfactionRating = rating;
    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    complaint.resolutionTimeHours = Math.max(1, Math.ceil((complaint.resolvedAt - complaint.createdAt) / 3600000));
    complaint.timeline.push({ status: 'resolved', message: `Citizen confirmed resolution. Rating: ${rating}/5`, updatedBy: req.user._id });

    if (complaint.assignedTo) {
      const officer = await User.findById(complaint.assignedTo);
      if (officer) {
        officer.activeComplaints = Math.max(0, officer.activeComplaints - 1);
        officer.stats.totalResolved += 1;
        await officer.save({ validateBeforeSave: false });
        await officer.addRating(rating);
        await officer.addResolutionTime(complaint.resolutionTimeHours);
      }
    }
    if (complaint.department) {
      const dept = await Department.findByIdAndUpdate(complaint.department, {
        $inc: { 'stats.resolved': 1, 'stats.pending': -1, 'stats.sumResolutionHours': complaint.resolutionTimeHours }
      }, { new: true });
      if (dept && dept.stats.resolved > 0) {
        dept.stats.avgResolutionHours = parseFloat((dept.stats.sumResolutionHours / dept.stats.resolved).toFixed(1));
        await dept.save();
      }
    }
  } else {
    if (!rejectionReason?.trim()) throw new AppError('Please explain why the resolution is rejected', 400);
    complaint.status = 'reopened';
    complaint.reopenCount += 1;
    complaint.verification.rejectionReason = rejectionReason;
    complaint.verification.escalatedAfterRejection = true;
    complaint.timeline.push({
      status: 'reopened',
      message: `⚠️ Citizen REJECTED resolution. Reason: ${rejectionReason}. Auto-escalated.`,
      updatedBy: req.user._id
    });

    if (complaint.assignedTo) {
      await User.findByIdAndUpdate(complaint.assignedTo, { $inc: { 'stats.falseClosures': 1 } });
    }

    await AuditLog.create({
      action: 'FALSE_CLOSURE_DETECTED', entityType: 'complaint', entityId: complaint._id,
      performedBy: complaint.assignedTo, suspicious: true, suspicionReason: `Citizen rejected: ${rejectionReason}`
    });

    const officials = await User.find({ role: { $in: ['cm', 'super_admin', 'department_head'] }, isActive: true }).select('_id');
    await notifyMany(req.io, officials.map((o) => o._id), {
      type: 'false_closure_alert',
      title: '⚠️ False Closure Detected',
      message: `${complaint.ticketId} rejected by citizen: ${rejectionReason}`,
      complaintId: complaint._id
    });
    req.io?.emit('false_closure_alert', { complaint: { id: complaint._id, ticketId: complaint.ticketId, title: complaint.title }, officerId: complaint.assignedTo, reason: rejectionReason });
  }

  await complaint.save();
  res.json({ success: true, complaint, message: confirmed ? 'Thank you for confirming!' : 'Complaint reopened and escalated.' });
});

// ---- Upvote / un-upvote ----
exports.upvoteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);

  const userId = req.user._id.toString();
  const alreadyVoted = complaint.upvotes.some((u) => u.toString() === userId);

  if (alreadyVoted) complaint.upvotes = complaint.upvotes.filter((u) => u.toString() !== userId);
  else complaint.upvotes.push(req.user._id);

  await complaint.save();
  res.json({ success: true, upvoted: !alreadyVoted, upvoteCount: complaint.upvoteCount });
});

// ---- Nearby (for CM visits / map) ----
exports.getNearbyComplaints = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 1000, status } = req.query;
  if (!lat || !lng) throw new AppError('lat and lng query params are required', 400);

  const query = {
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) }
    }
  };
  if (status) query.status = status;

  const complaints = await Complaint.find(query)
    .populate('citizen', 'name')
    .populate('assignedTo', 'name')
    .populate('department', 'name')
    .limit(50);

  res.json({ success: true, complaints, total: complaints.length });
});

// ---- Dashboard analytics ----
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const { days } = req.query;
  const hasRange = days !== undefined && days !== '';
  const numDays = hasRange ? parseInt(days, 10) : null;

  // days=0 -> since midnight today; days=N -> last N days; omitted/empty -> all time
  let rangeFilter = {};
  if (hasRange && !Number.isNaN(numDays)) {
    const since = numDays === 0
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);
    rangeFilter = { createdAt: { $gte: since } };
  }

  // Trend chart window: same as the selected range, but always at least 1 day
  // wide so a single day's bucket is still visible, capped at 90 for the chart.
  const trendWindowDays = hasRange && !Number.isNaN(numDays) ? Math.min(Math.max(numDays, 1), 90) : 7;
  const trendSince = new Date(Date.now() - trendWindowDays * 24 * 60 * 60 * 1000);

  const [statusCounts, categoryCounts, priorityCounts, recentCritical, topDepts, trend, falseClosures, overdueCount] = await Promise.all([
    Complaint.aggregate([{ $match: rangeFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $match: rangeFilter }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    Complaint.aggregate([{ $match: rangeFilter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.find({ isCritical: true, status: { $nin: ['resolved'] } }).sort('-createdAt').limit(5).populate('department', 'name'),
    Complaint.aggregate([
      { $match: rangeFilter },
      { $group: { _id: '$department', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } },
      { $sort: { total: -1 } }, { $limit: 5 },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } }
    ]),
    Complaint.aggregate([
      { $match: { createdAt: { $gte: trendSince } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    AuditLog.countDocuments({ action: 'FALSE_CLOSURE_DETECTED', ...(rangeFilter.createdAt ? { createdAt: rangeFilter.createdAt } : {}) }),
    Complaint.countDocuments({ dueDate: { $lt: new Date() }, status: { $nin: ['resolved', 'rejected'] }, ...rangeFilter })
  ]);

  const total = statusCounts.reduce((a, b) => a + b.count, 0);
  const resolved = statusCounts.find((s) => s._id === 'resolved')?.count || 0;
  const critical = priorityCounts.find((p) => p._id === 'critical')?.count || 0;
  const pending = statusCounts.filter((s) => !['resolved', 'rejected'].includes(s._id)).reduce((a, b) => a + b.count, 0);

  res.json({
    success: true,
    stats: {
      total, resolved, critical, pending,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : '0',
      falseClosures, overdueCount,
      statusCounts, categoryCounts, priorityCounts, recentCritical, topDepts, trend,
      rangeDays: hasRange ? numDays : null
    }
  });
});
