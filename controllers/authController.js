import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateOTP } from "../utils/generateOTP.js";
import { sendEmail } from "../utils/sendEmail.js";

// 🔐 Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// 🍪 Cookie Settings
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// 🔐 REGISTER
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });

    const token = generateToken(user);

    res
      .cookie("token", token, cookieOptions)
      .status(201)
      .json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
        },
        token, // ✅ added token in response
        message: "Registration successful"
      });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔐 LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user);

    res
      .cookie("token", token, cookieOptions)
      .json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role, // Role determined from JWT token
          phone: user.phone,
          address: user.address,
        },
        token, // ✅ added token in response
        message: "Login successful"
      });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🚪 LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token", { httpOnly: true }).json({ message: "Logged out" });
};

// 🔑 Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const { otp, expiry } = generateOTP();
  user.otp = otp;
  user.otpExpiry = expiry;
  await user.save();

  await sendEmail(email, "Password Reset OTP", `Your OTP is: ${otp}`);
  res.json({ message: "OTP sent to your email" });
};

// 🔎 Verify OTP
export const verifyOTP = async (req, res) => {
  console.log("🔎 verifyOTP called with:", req.body);
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  console.log("➡️ Found user:", user, "Stored OTP:", user?.otp, "Expiry:", user?.otpExpiry);

  if (!user || user.otp !== otp || user.otpExpiry < Date.now()) {
    console.log("❌ Invalid or expired OTP");
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  console.log("✅ OTP verified!");
  res.json({ message: "OTP verified" });
};

// 🔁 Reset Password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Both password fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character."
    });
  }

  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || user.otpExpiry < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  res.json({ message: "Password reset successful" });
};
