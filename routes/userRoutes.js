import express from "express";
import {
  getProfile,
  updateProfile,
  getMyOrders,
  addWishlist,
  removeWishlist
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/profile",getProfile);
router.put("/profile", updateProfile);
router.get("/orders", getMyOrders);
router.post("/wishlist/:productId", addWishlist);
router.delete("/wishlist/:productId", removeWishlist);


export default router;
