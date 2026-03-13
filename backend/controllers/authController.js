import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "../config/mailer.js";

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Reusable email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password must be ≥8 chars, contain at least:
// one uppercase letter, one lowercase letter, one special character
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character";

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    // const { username, email, password, profileImageUrl, adminInviteToken } =
    //   req.body;

    const { username, email, password, profileImageUrl } = req.body;

    // --- Validation (đặt đầu tiên, trước mọi thao tác DB) ---
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }
    if (username.trim().length < 2 || username.trim().length > 50) {
      return res
        .status(400)
        .json({ message: "Username must be between 2 and 50 characters" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Determine user role: Admin if correct invite token is provided, otherwise regular user
    // let role = "user";
    // if (
    //   adminInviteToken &&
    //   adminInviteToken === process.env.ADMIN_INVITE_TOKEN
    // ) {
    //   role = "admin";
    // }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await User.create({
      username: username.trim(),
      email,
      password: hashedPassword,
      profileImageUrl,
      // role,
      role: "user", // Mặc định tất cả người đăng ký đều là "user". Chỉ có admin mới có thể nâng cấp role sau này.
    });

    res.status(201).json({
      _id: user._id,
      name: user.username,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Validation ---
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Không tiết lộ email có tồn tại hay không
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Tài khoản Google-only không có password
    if (!user.password) {
      return res.status(401).json({
        message: "This account uses Google Sign-In. Please login with Google.",
      });
    }

    // So sánh mật khẩu plain-text với hash đã lưu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      _id: user._id,
      name: user.username,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Forgot password — generate a short-lived reset token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // --- Validation ---
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email address",
      });
    }

    // Token được ký bằng JWT_SECRET + password hash hiện tại của user
    // → Token tự động vô hiệu hóa ngay khi password thay đổi (stateless, không cần lưu DB)
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET + user.password,
      { expiresIn: "15m" },
    );

    // Gửi email chứa link reset password đến người dùng
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({
      message:
        "If that email is registered, a password reset link has been sent",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // --- Validation (trước khi chạm vào DB) ---
    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ message: "Reset token and new password are required" });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message: PASSWORD_MESSAGE,
      });
    }

    // Decode token mà không verify để lấy user ID
    const decoded = jwt.decode(resetToken);
    if (!decoded || !decoded.id) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    // Tải user để lấy password hash (dùng làm một phần của signing secret)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    // Xác thực token bằng JWT_SECRET + password hash hiện tại
    // Nếu password đã đổi trước đó, token sẽ không còn hợp lệ
    try {
      jwt.verify(resetToken, process.env.JWT_SECRET + user.password);
    } catch {
      return res
        .status(400)
        .json({ message: "Reset token is invalid or has expired" });
    }

    // Hash mật khẩu mới và lưu
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    // req.user được set bởi protect middleware (không có trường password)
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const { username, email, profileImageUrl, currentPassword, newPassword } =
      req.body;

    // --- Validation ---
    if (!username && !email && profileImageUrl === undefined && !newPassword) {
      return res.status(400).json({ message: "No fields provided to update" });
    }
    if (
      username &&
      (username.trim().length < 2 || username.trim().length > 50)
    ) {
      return res
        .status(400)
        .json({ message: "Username must be between 2 and 50 characters" });
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }
      if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character",
        });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Xác thực mật khẩu hiện tại trước khi cho phép thay đổi mật khẩu
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Kiểm tra email mới chưa được dùng bởi user khác
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    if (username) user.username = username.trim();
    if (profileImageUrl !== undefined) user.profileImageUrl = profileImageUrl;

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.username,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Redirect user to Google OAuth consent screen
// @route   GET /api/auth/google
// @access  Public
export const googleLogin = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// @desc    Handle Google OAuth callback — exchange code → token → user info → JWT
// @route   GET /api/auth/callback/google
// @access  Public
export const googleCallback = async (req, res) => {
  const { code, error } = req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (error || !code) {
    return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${clientUrl}/login?error=token_exchange_failed`);
    }

    // 2. Get user info from Google
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const googleUser = await userInfoRes.json();
    if (!userInfoRes.ok || !googleUser.email) {
      return res.redirect(`${clientUrl}/login?error=userinfo_failed`);
    }

    // 3. Find or create user in DB
    let user = await User.findOne({ googleId: googleUser.id });
    if (!user) {
      user = await User.findOne({ email: googleUser.email });
      if (user) {
        // Link Google ID to existing email account
        user.googleId = googleUser.id;
        if (!user.profileImageUrl && googleUser.picture) {
          user.profileImageUrl = googleUser.picture;
        }
        await user.save();
      } else {
        // Create brand-new user
        user = await User.create({
          googleId: googleUser.id,
          username: googleUser.name,
          email: googleUser.email,
          profileImageUrl: googleUser.picture || null,
          role: "user",
        });
      }
    }

    // 4. Issue JWT and redirect to frontend
    const token = generateToken(user._id);
    res.redirect(
      `${clientUrl}/oauth-callback?token=${token}&name=${encodeURIComponent(user.username)}&role=${user.role}`,
    );
  } catch (err) {
    res.redirect(`${clientUrl}/login?error=server_error`);
  }
};

export default {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  googleLogin,
  googleCallback,
};
