const CMVisit = require('../models/CMVisit');
const Complaint = require('../models/Complaint');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

exports.createVisit = asyncHandler(async (req, res) => {
  const visit = await CMVisit.create({ ...req.body, cm: req.user._id });
  res.status(201).json({ success: true, visit });
});

exports.getVisits = asyncHandler(async (req, res) => {
  const visits = await CMVisit.find()
    .populate('cm', 'name')
    .populate('complaintsIdentified', 'ticketId title status')
    .sort('-createdAt').limit(20);
  res.json({ success: true, visits });
});

exports.getVisit = asyncHandler(async (req, res) => {
  const visit = await CMVisit.findById(req.params.id)
    .populate('cm', 'name')
    .populate('nearbyComplaints')
    .populate('complaintsIdentified');
  if (!visit) throw new AppError('Visit not found', 404);
  res.json({ success: true, visit });
});

exports.addVisitLog = asyncHandler(async (req, res) => {
  const { coordinates, address, ward, notes } = req.body;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new AppError('coordinates must be an array of [lng, lat]', 400);
  }

  const visit = await CMVisit.findById(req.params.id);
  if (!visit) throw new AppError('Visit not found', 404);

  const nearby = await Complaint.find({
    location: { $near: { $geometry: { type: 'Point', coordinates }, $maxDistance: 500 } },
    status: { $nin: ['resolved', 'rejected'] }
  }).limit(10).populate('department', 'name');

  visit.logs.push({ location: { type: 'Point', coordinates }, address, ward, notes });
  visit.nearbyComplaints.push(...nearby.map((c) => c._id));
  visit.status = 'in_progress';
  await visit.save();

  res.json({ success: true, visit, nearbyComplaints: nearby });
});

exports.completeVisit = asyncHandler(async (req, res) => {
  const { summary, followUpRequired } = req.body;
  const visit = await CMVisit.findById(req.params.id);
  if (!visit) throw new AppError('Visit not found', 404);

  visit.status = 'completed';
  visit.actualDate = new Date();
  if (summary) visit.summary = summary;
  if (followUpRequired) visit.followUpRequired = followUpRequired;
  await visit.save();

  res.json({ success: true, visit });
});
