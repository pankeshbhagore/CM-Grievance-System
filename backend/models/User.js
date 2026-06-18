const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  phone: { type: String, trim: true },
  role: {
    type: String,
    enum: ['citizen', 'employee', 'department_head', 'cm', 'super_admin'],
    default: 'citizen'
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  designation: { type: String },
  employeeId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },

  bandwidth: { type: Number, default: 10, min: 1 },
  activeComplaints: { type: Number, default: 0, min: 0 },

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] }
  },
  ward: { type: String },
  district: { type: String },
  pincode: { type: String },

  stats: {
    totalAssigned: { type: Number, default: 0 },
    totalResolved: { type: Number, default: 0 },
    sumResolutionHours: { type: Number, default: 0 },
    avgResolutionHours: { type: Number, default: 0 },
    falseClosures: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    sumRatings: { type: Number, default: 0 },
    avgSatisfactionScore: { type: Number, default: 0 }
  },

  passwordChangedAt: Date,
  lastLogin: Date,
  fcmToken: String
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ department: 1 });
// email already unique-indexed via field option

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000); // ensure JWT iat comparison works
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    return parseInt(this.passwordChangedAt.getTime() / 1000, 10) > jwtTimestamp;
  }
  return false;
};

userSchema.methods.addRating = async function (rating) {
  this.stats.sumRatings += rating;
  this.stats.totalRatings += 1;
  this.stats.avgSatisfactionScore = parseFloat((this.stats.sumRatings / this.stats.totalRatings).toFixed(2));
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.addResolutionTime = async function (hours) {
  this.stats.sumResolutionHours += hours;
  this.stats.avgResolutionHours = parseFloat((this.stats.sumResolutionHours / Math.max(this.stats.totalResolved, 1)).toFixed(1));
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
