import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getUserReviews
} from "../controllers/reviewController.js";

const router = express.Router();

// Public routes
router.get("/product/:productId", getProductReviews);

// Protected routes
router.use(protect);

router.get("/my-reviews", getUserReviews);
router.post("/product/:productId", createReview);
router.put("/:reviewId", updateReview);
router.delete("/:reviewId", deleteReview);
router.post("/:reviewId/helpful", markHelpful);

export default router;
