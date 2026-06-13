const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Secure all admin routes with auth checks and role verification
router.use(protect);
router.use(authorize('admin'));

router.get('/analytics', adminController.getAnalytics);
router.get('/logs', adminController.getSystemLogs);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
