import User from "../models/User.js";
import Order from "../models/Order.js";

// Get own profile
export const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("-password -otp -otpExpiry")
    .populate("wishlist", "name price imageUrl");
  res.json({
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    wishlist: user.wishlist,
  });
};

// Update name, phone, address
export const updateProfile = async (req, res) => {
  const { name, phone, address } = req.body;
  const user = await User.findById(req.user.id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  await user.save();
  res.json({ message: "Profile updated", user });
};

// Get user’s orders
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .populate("products.product", "name price imageUrl")
    .sort("-createdAt");
  res.json(orders);
};

// Add to wishlist
export const addWishlist = async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.id);
  if (!user.wishlist.includes(productId)) {
    user.wishlist.push(productId);
    await user.save();
  }
  res.json({ message: "Added to wishlist", wishlist: user.wishlist });
};

// Remove from wishlist
export const removeWishlist = async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.id);
  user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
  await user.save();
  res.json({ message: "Removed from wishlist", wishlist: user.wishlist });
};
