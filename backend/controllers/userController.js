const User = require('../models/User');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

exports.getOfficers = asyncHandler(async (req, res) => {
  const { department } = req.query;
  const query = { role: { $in: ['employee', 'department_head'] }, isActive: true };

  // Department heads only see officers in their own department
  if (req.user.role === 'department_head') query.department = req.user.department?._id;
  else if (department) query.department = department;

  const officers = await User.find(query).populate('department', 'name code').select('-password').sort('name');

  const officersWithLoad = officers.map((o) => ({
    ...o.toObject(),
    id: o._id,
    capacityPercent: o.bandwidth > 0 ? Math.round((o.activeComplaints / o.bandwidth) * 100) : 0,
    isFull: o.activeComplaints >= o.bandwidth
  }));

  res.json({ success: true, officers: officersWithLoad });
});

exports.getOfficerPerformance = asyncHandler(async (req, res) => {
  const query = { role: { $in: ['employee', 'department_head'] }, isActive: true };
  if (req.user.role === 'department_head') query.department = req.user.department?._id;

  const officers = await User.find(query).populate('department', 'name').select('-password').sort('-stats.totalResolved');

  const data = officers.map((o) => ({
    id: o._id,
    name: o.name,
    department: o.department?.name,
    designation: o.designation,
    stats: o.stats,
    activeComplaints: o.activeComplaints,
    bandwidth: o.bandwidth,
    capacityPercent: o.bandwidth > 0 ? Math.round((o.activeComplaints / o.bandwidth) * 100) : 0,
    falseClosureRate: o.stats.totalAssigned > 0 ? ((o.stats.falseClosures / o.stats.totalAssigned) * 100).toFixed(1) : '0'
  }));

  res.json({ success: true, officers: data });
});

// Full admin user list with filters — was entirely missing before
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;
  
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (search) query.$or = [{ name: new RegExp(escapeRegex(search), 'i') }, { email: new RegExp(escapeRegex(search), 'i') }];

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query).populate('department', 'name code').select('-password').sort('-createdAt').skip((pageNum - 1) * limitNum).limit(limitNum)
  ]);

  res.json({ success: true, users, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { email, name, password, phone, role, department, designation, employeeId, bandwidth, ward, district } = req.body;
  const existing = await User.findOne({ email: email?.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 400);

  const user = await User.create({ name, email, password, phone, role, department, designation, employeeId, bandwidth, ward, district });
  res.status(201).json({ success: true, user: user.toSafeObject() });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { email, name, phone, role, department, designation, employeeId, bandwidth, ward, district } = req.body;
  const updates = { email, name, phone, role, department, designation, employeeId, bandwidth, ward, district };
  
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, user });
});

// Deactivate/reactivate — was entirely missing before, meaning admins
// had no way to disable a compromised or departing officer's account
exports.toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user._id.toString() === req.user._id.toString()) throw new AppError('You cannot deactivate your own account', 400);

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    action: user.isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'user', entityId: user._id, performedBy: req.user._id
  });

  res.json({ success: true, user: user.toSafeObject() });
});

exports.getDepartments = asyncHandler(async (req, res) => {
  const depts = await Department.find({ isActive: true }).populate('head', 'name email phone').sort('name');
  res.json({ success: true, departments: depts });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, head, complaintCategories, contactEmail, contactPhone, mcd311DeptId, slaHours } = req.body;
  const dept = await Department.create({ name, code, description, head, complaintCategories, contactEmail, contactPhone, mcd311DeptId, slaHours });
  res.status(201).json({ success: true, department: dept });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, head, complaintCategories, contactEmail, contactPhone, mcd311DeptId, isActive, slaHours } = req.body;
  const updates = { name, code, description, head, complaintCategories, contactEmail, contactPhone, mcd311DeptId, isActive, slaHours };
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
  const dept = await Department.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!dept) throw new AppError('Department not found', 404);
  res.json({ success: true, department: dept });
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { suspicious, page = 1, limit = 50 } = req.query;
  const query = {};
  if (suspicious === 'true') query.suspicious = true;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query).populate('performedBy', 'name role').sort('-createdAt').skip((pageNum - 1) * limitNum).limit(limitNum)
  ]);

  res.json({ success: true, logs, total });
});
