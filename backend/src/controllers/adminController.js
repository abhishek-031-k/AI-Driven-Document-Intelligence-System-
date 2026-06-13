const User = require('../models/User');
const Document = require('../models/Document');
const Query = require('../models/Query');
const AuditLog = require('../models/AuditLog');

// Get system analytics dashboard metrics
exports.getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalDocuments = await Document.countDocuments({});
    
    // Aggregation: Storage Usage
    const storageStats = await Document.aggregate([
      { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } }
    ]);
    const storageUsage = storageStats.length > 0 ? storageStats[0].totalBytes : 0;

    // Aggregation: AI Requests (Document vectorization runs + Q&A queries)
    const totalQAs = await Query.countDocuments({});
    const processedDocuments = await Document.countDocuments({ status: 'completed' });
    const totalAIRequests = totalQAs + processedDocuments;

    // Aggregation: Popular document categories
    const categoryStats = await Document.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const popularCategories = categoryStats.map(item => ({
      name: item._id,
      value: item.count
    }));

    // Aggregation: Popular document types (Extensions)
    const typeStats = await Document.aggregate([
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const popularTypes = typeStats.map(item => ({
      name: (item._id || 'unknown').toUpperCase(),
      value: item.count
    }));

    // Aggregation: Monthly upload trends (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendStats = await Document.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly trend output for chart display (e.g. "Jan", "Feb")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const uploadTrends = trendStats.map(item => {
      const monthLabel = monthNames[item._id.month - 1];
      return {
        month: `${monthLabel} ${item._id.year}`,
        documents: item.count
      };
    });

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalDocuments,
        storageUsage, // In bytes
        totalAIRequests,
        popularCategories,
        popularTypes,
        uploadTrends
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get system logs (AuditLog)
exports.getSystemLogs = async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const totalLogs = await AuditLog.countDocuments({});
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'fullName email role');

    res.status(200).json({
      success: true,
      count: logs.length,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: page,
      logs
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (Admin view)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password -refreshToken').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// Manage user roles or statuses
exports.updateUserRole = async (req, res, next) => {
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid role (user or admin)' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent removing own admin privileges
    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot revoke your own admin rights.' });
    }

    user.role = role;
    await user.save();

    await AuditLog.create({
      action: 'ADMIN_USER_UPDATE',
      performedBy: req.user._id,
      details: `Updated role of ${user.email} to ${role}`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    // Delete associated documents
    const userDocs = await Document.find({ uploadedBy: user._id });
    for (const doc of userDocs) {
      // Clean up files
      const filePath = path.join(__dirname, '../../uploads', doc.fileKey);
      await fs.unlink(filePath).catch(() => {});
      await doc.deleteOne();
    }

    // Clean up Q&A Queries
    await Query.deleteMany({ user: user._id });

    await user.deleteOne();

    await AuditLog.create({
      action: 'ADMIN_USER_DELETE',
      performedBy: req.user._id,
      details: `Deleted user account ${user.email} and all their documents.`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'User account and associated documents successfully deleted.'
    });
  } catch (error) {
    next(error);
  }
};
