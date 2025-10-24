import express from "express";
import { 
  getDashboardStats, 
  getAllUsers, 
  updateUser, 
  deleteUser, 
  getIncomeAnalytics 
} from "../controllers/adminController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", protect, admin, getDashboardStats);

// User Management
router.get("/users", protect, admin, getAllUsers);
router.put("/users/:id", protect, admin, updateUser);
router.delete("/users/:id", protect, admin, deleteUser);

// Income Analytics
router.get("/income", protect, admin, getIncomeAnalytics);

export default router;
