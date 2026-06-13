const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Token generation helpers
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'dev_jwt_access_secret_key_129837192837',
    { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_92837192837',
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
  );
};

// Register user
exports.register = async (req, res, next) => {
  const { fullName, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Determine role: Make first user in DB Admin automatically for easy initial setup
    const isFirstUser = (await User.countDocuments({})) === 0;
    const role = isFirstUser ? 'admin' : 'user';

    // Generate simulated avatar url using initials
    const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'UI';
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366F1&color=fff`;

    // Email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpiry = Date.now() + 24 * 3600 * 1000; // 24 hours

    user = await User.create({
      fullName,
      email,
      password,
      avatar,
      role,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry
    });

    // Write to audit log
    await AuditLog.create({
      action: 'USER_REGISTER',
      performedBy: user._id,
      details: `Registered account for ${email} with role: ${role}. Verification email sent (simulated).`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      verificationToken, // Returned for easy mock/dev completion on client
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    await AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: user._id,
      details: 'User authenticated successfully.',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = undefined;
      await user.save();

      await AuditLog.create({
        action: 'USER_LOGOUT',
        performedBy: user._id,
        details: 'User logged out.',
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_92837192837');
    
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
  }
};

// Verify Email
exports.verifyEmail = async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required' });
  }

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    await AuditLog.create({
      action: 'EMAIL_VERIFIED',
      performedBy: user._id,
      details: 'User email verified successfully.',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await AuditLog.create({
      action: 'FORGOT_PASSWORD_REQUEST',
      performedBy: user._id,
      details: 'Requested password reset token (simulated email output).',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Reset link generated. In production, this will email you. For development, use this token.',
      resetToken // Outputting for easy frontend demo completion
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    // Set new password (will be automatically hashed in pre-save)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_RESET_SUCCESS',
      performedBy: user._id,
      details: 'Password was successfully reset.',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};
