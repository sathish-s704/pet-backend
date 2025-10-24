import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createPayPalOrder, captureOrder } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create", protect, createPayPalOrder);
router.post("/capture/:orderID", protect, captureOrder);

export default router;
