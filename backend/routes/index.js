const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  validate, registerRules, loginRules, changePasswordRules, complaintRules, commentRules, mongoIdParam
} = require('../middleware/validators');

const authCtrl = require('../controllers/authController');
const complaintCtrl = require('../controllers/complaintController');
const userCtrl = require('../controllers/userController');
const visitCtrl = require('../controllers/visitController');
const notificationCtrl = require('../controllers/notificationController');
const commentCtrl = require('../controllers/commentController');

// ---------- Auth ----------
router.post('/auth/register', registerRules, validate, authCtrl.register);
router.post('/auth/login', loginRules, validate, authCtrl.login);
router.get('/auth/me', protect, authCtrl.getMe);
router.put('/auth/profile', protect, authCtrl.updateProfile);
router.put('/auth/change-password', protect, changePasswordRules, validate, authCtrl.changePassword);

// ---------- Public tracking (no auth) ----------
router.get('/track/:ticketId', complaintCtrl.trackPublic);

// ---------- Complaints ----------
router.post('/complaints', protect, upload.array('images', 5), complaintRules, validate, complaintCtrl.submitComplaint);
router.get('/complaints', protect, complaintCtrl.getComplaints);
router.get('/complaints/nearby', protect, complaintCtrl.getNearbyComplaints);
router.get('/complaints/stats', protect, authorize('cm', 'super_admin', 'department_head'), complaintCtrl.getDashboardStats);
router.get('/complaints/:id', protect, mongoIdParam(), validate, complaintCtrl.getComplaint);
router.post('/complaints/:id/assign', protect, authorize('cm', 'super_admin', 'department_head'), mongoIdParam(), validate, complaintCtrl.assignComplaint);
router.put('/complaints/:id/status', protect, authorize('employee', 'department_head', 'super_admin'), mongoIdParam(), upload.array('images', 5), validate, complaintCtrl.updateStatus);
router.post('/complaints/:id/verify', protect, authorize('citizen'), mongoIdParam(), validate, complaintCtrl.citizenVerify);
router.post('/complaints/:id/upvote', protect, mongoIdParam(), validate, complaintCtrl.upvoteComplaint);

// ---------- Comments ----------
router.get('/complaints/:id/comments', protect, mongoIdParam(), validate, commentCtrl.getComments);
router.post('/complaints/:id/comments', protect, mongoIdParam(), commentRules, validate, commentCtrl.addComment);

// ---------- Users / Officers ----------
router.get('/users/officers', protect, authorize('cm', 'super_admin', 'department_head'), userCtrl.getOfficers);
router.get('/users/officer-performance', protect, authorize('cm', 'super_admin', 'department_head'), userCtrl.getOfficerPerformance);
router.get('/users', protect, authorize('super_admin'), userCtrl.getAllUsers);
router.post('/users', protect, authorize('super_admin'), userCtrl.createUser);
router.put('/users/:id', protect, authorize('super_admin'), mongoIdParam(), validate, userCtrl.updateUser);
router.put('/users/:id/toggle-active', protect, authorize('super_admin'), mongoIdParam(), validate, userCtrl.toggleUserActive);

// ---------- Audit ----------
router.get('/audit-logs', protect, authorize('cm', 'super_admin'), userCtrl.getAuditLogs);

// ---------- Departments ----------
router.get('/departments', protect, userCtrl.getDepartments);
router.post('/departments', protect, authorize('super_admin'), userCtrl.createDepartment);
router.put('/departments/:id', protect, authorize('super_admin'), mongoIdParam(), validate, userCtrl.updateDepartment);

// ---------- CM Visits ----------
router.post('/visits', protect, authorize('cm', 'super_admin'), visitCtrl.createVisit);
router.get('/visits', protect, authorize('cm', 'super_admin', 'department_head'), visitCtrl.getVisits);
router.get('/visits/:id', protect, mongoIdParam(), validate, visitCtrl.getVisit);
router.post('/visits/:id/log', protect, authorize('cm', 'super_admin'), mongoIdParam(), validate, visitCtrl.addVisitLog);
router.put('/visits/:id/complete', protect, authorize('cm', 'super_admin'), mongoIdParam(), validate, visitCtrl.completeVisit);

// ---------- Notifications ----------
router.get('/notifications', protect, notificationCtrl.getNotifications);
router.put('/notifications/:id/read', protect, mongoIdParam(), validate, notificationCtrl.markRead);
router.put('/notifications/read-all', protect, notificationCtrl.markAllRead);

// ---------- MCD311 ----------
router.get('/mcd311/status', protect, async (req, res) => {
  const { isApiAvailable } = require('../services/mcd311');
  const available = await isApiAvailable();
  res.json({ success: true, mcd311Available: available, mode: available ? 'live' : 'mock' });
});

module.exports = router;
