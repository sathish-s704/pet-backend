import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addToCart,
  getCart,
  clearCart,
  updateCartItemQuantity,
  removeCartItem
} from "../controllers/CartController.js";

const router = express.Router();

router.use(protect);

// Add item to cart
router.post("/add", addToCart);

// Get cart
router.get("/", getCart);

// Update cart item quantity
router.put("/update", updateCartItemQuantity);

// Remove item from cart
router.delete("/remove/:productId", removeCartItem);

// 🗑️ Clear entire cart
router.delete("/clear", clearCart);

export default router;
