const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  complaintCategories: [{ type: String }],
  contactEmail: { type: String, lowercase: true, trim: true },
  contactPhone: { type: String, trim: true },
  mcd311DeptId: { type: String },
  isActive: { type: Boolean, default: true },
  slaHours: { type: Number, default: 72, min: 1 },
  stats: {
    totalComplaints: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    sumResolutionHours: { type: Number, default: 0 },
    avgResolutionHours: { type: Number, default: 0 }
  }
}, { timestamps: true });

departmentSchema.index({ complaintCategories: 1 });
departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);
