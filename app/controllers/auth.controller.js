const prisma = require('../database/prisma');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password.util');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.util');


const register = async (req, res) => {
  try {
    const {
      // Business details
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      taxId,
      fiscalYearStart,
      // Admin user details
      email,
      password,
      fullName,
    } = req.body;

    if (!businessName || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Business name, email, password, and full name are required.',
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements.',
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create business and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create business
      const business = await tx.business.create({
        data: {
          name: businessName,
          address: businessAddress,
          phone: businessPhone,
          email: businessEmail,
          taxId,
          fiscalYearStart: fiscalYearStart ? new Date(fiscalYearStart) : null,
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          businessId: business.id,
          email,
          passwordHash,
          fullName,
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          businessId: true,
          isActive: true,
          createdAt: true,
        },
      });

      return { business, user };
    });

    // Generate tokens
    const tokens = generateTokens(result.user);

    // Update last login
    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLogin: new Date() },
    });

    return res.status(201).json({
      success: true,
      message: 'Business and admin user registered successfully.',
      data: {
        user: result.user,
        business: result.business,
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


const logout = async (req, res) => {
  try {


    return res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from client storage.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during logout.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        businessId: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
    }

    const tokens = generateTokens(user);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: tokens,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired refresh token.',
    });
  }
};


const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        businessId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            taxId: true,
            fiscalYearStart: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements.',
        errors: passwordValidation.errors,
      });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Check if new password is same as current
    const isSamePassword = await comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.',
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while changing password.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


const createBusinessUser = async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, full name, and role are required.',
      });
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'STAFF'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    if (!req.user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'You must be associated with a business to create users.',
      });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements.',
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        businessId: req.user.businessId,
        email,
        passwordHash,
        fullName,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        businessId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: newUser,
    });
  } catch (error) {
    console.error('Create business user error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
  createBusinessUser,
};
