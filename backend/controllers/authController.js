const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const safeUser = user.toSafeObject ? user.toSafeObject() : user;
  res.status(statusCode).json({ success: true, token, user: safeUser });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, ward, district } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email is already registered', 400);

  const user = await User.create({ name, email, password, phone, ward, district, role: 'citizen' });
  sendToken(user, 201, res);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('department', 'name code');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('Account has been deactivated. Contact admin.', 403);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  sendToken(user, 200, res);
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('department', 'name code contactEmail contactPhone');
  res.json({ success: true, user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, ward, district } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone, ward, district },
    { new: true, runValidators: true }
  ).populate('department', 'name code');
  res.json({ success: true, user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();
  sendToken(user, 200, res);
});
