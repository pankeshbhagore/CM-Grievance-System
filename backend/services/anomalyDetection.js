/**
 * AI Anomaly Detection Service
 * Detects suspicious patterns in officer behavior, complaint submissions,
 * and department performance using statistical analysis.
 */

const User = require('../models/User');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { detectOfficerAnomaly } = require('./aiClassification');

/**
 * Scan all active officers for behavioral anomalies.
 * Returns an array of { officer, anomalies } objects.
 */
async function scanOfficerAnomalies() {
  const officers = await User.find({
    role: { $in: ['employee', 'department_head'] },
    isActive: true,
  }).select('-password').lean();

  const results = [];
  for (const officer of officers) {
    const anomalies = detectOfficerAnomaly(officer);
    if (anomalies.length > 0) {
      results.push({ officer: { id: officer._id, name: officer.name, department: officer.department }, anomalies });
    }
  }

  return results;
}

/**
 * Run basic predictive maintenance forecasting.
 * Flags recurring issues in the same ward.
 */
async function runPredictiveMaintenance(io) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const hotspots = await Complaint.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo }, ward: { $exists: true, $ne: '' } } },
    { $group: { _id: { ward: '$ward', category: '$category' }, count: { $sum: 1 }, complaints: { $push: '$_id' } } },
    { $match: { count: { $gte: 5 } } } // Threshold for predictive maintenance
  ]);

  let newAlerts = 0;
  for (const spot of hotspots) {
    const alertId = `pm_${spot._id.ward}_${spot._id.category}_${sevenDaysAgo.toISOString().split('T')[0]}`;
    const existing = await AuditLog.findOne({ action: 'PREDICTIVE_MAINTENANCE_ALERT', 'details.alertId': alertId });
    if (!existing) {
      await AuditLog.create({
        action: 'PREDICTIVE_MAINTENANCE_ALERT',
        entityType: 'department', // general
        suspicious: true, // using suspicious flag to bubble up in UI
        suspicionReason: `Predictive Maintenance: ${spot.count} ${spot._id.category} complaints in ${spot._id.ward} recently. Infrastructure review required.`,
        details: { alertId, ward: spot._id.ward, category: spot._id.category, count: spot.count }
      });

      if (io) {
        io.to('role_cm').to('role_super_admin').emit('predictive_maintenance_alert', {
          ward: spot._id.ward,
          category: spot._id.category,
          count: spot.count
        });
      }
      newAlerts++;
    }
  }
  return newAlerts;
}

/**
 * Detect potential spam — multiple similar complaints from the same citizen
 * within a short timeframe.
 */
async function detectSpamComplaints(citizenId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recent = await Complaint.find({
    citizen: citizenId,
    createdAt: { $gte: since },
  }).select('title description category').lean();

  if (recent.length < 3) return { isSpam: false, count: recent.length };

  // Check if many complaints are in the same category
  const categoryCounts = {};
  for (const c of recent) {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  }
  const maxCategoryCount = Math.max(...Object.values(categoryCounts));
  const spamScore = maxCategoryCount / recent.length;

  return {
    isSpam: recent.length > 5 && spamScore > 0.7,
    count: recent.length,
    spamScore: parseFloat(spamScore.toFixed(2)),
    dominantCategory: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0],
  };
}

/**
 * Identify department bottlenecks — departments with high pending/overdue ratios.
 */
async function detectDepartmentBottlenecks() {
  const bottlenecks = await Complaint.aggregate([
    { $match: { status: { $nin: ['resolved', 'rejected'] } } },
    { $group: {
      _id: '$department',
      pending: { $sum: 1 },
      overdue: { $sum: { $cond: [{ $eq: ['$isOverdue', true] }, 1, 0] } },
      critical: { $sum: { $cond: [{ $eq: ['$isCritical', true] }, 1, 0] } },
      avgAge: { $avg: { $subtract: [new Date(), '$createdAt'] } },
    }},
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
    { $sort: { overdue: -1 } },
  ]);

  return bottlenecks.map(b => ({
    department: b.dept?.[0]?.name || 'Unknown',
    departmentId: b._id,
    pending: b.pending,
    overdue: b.overdue,
    critical: b.critical,
    avgAgeHours: Math.round((b.avgAge || 0) / 3600000),
    severity: b.overdue > 10 ? 'critical' : b.overdue > 5 ? 'high' : b.overdue > 0 ? 'medium' : 'low',
  }));
}

module.exports = {
  scanOfficerAnomalies,
  detectSpamComplaints,
  detectDepartmentBottlenecks,
  runPredictiveMaintenance
};
