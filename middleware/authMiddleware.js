
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// 🔒 Middleware to protect routes (supports both cookie and header tokens)
export const protect = async (req, res, next) => {
  console.log('=== Auth Middleware ===');
  console.log('Request headers:', req.headers);
  console.log('Request cookies:', req.cookies);
  
  let token = null;

  // 1. Try reading token from cookie
  if (req.cookies?.token) {
    token = req.cookies.token;
    console.log('Token found in cookies');
  }

  // 2. If not in cookie, try Authorization header
  else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    console.log('Token found in Authorization header');
  }

  // 3. If no token, reject access
  if (!token) {
    console.log('No token found, rejecting request');
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }

  try {
    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    req.user = await User.findById(decoded.id).select("-password");
    console.log('User found:', req.user);
    
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ message: "Token invalid or expired", error: err.message });
  }
};

// 🛡️ Admin middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admins only" });
  }
};
