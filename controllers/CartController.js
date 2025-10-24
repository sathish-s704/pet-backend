import Cart from "../models/Cart.js";
import Product from "../models/Product.js"; // ✅ Import Product model

// 🛒 Add item to cart
export const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    // First, get the product to check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product is in stock
    if (!product.inStock || product.totalStock === 0) {
      return res.status(400).json({ message: `${product.name} is currently out of stock` });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    const requestedQuantity = quantity || 1;
    let newTotalQuantity = requestedQuantity;

    if (existingItem) {
      newTotalQuantity = existingItem.quantity + requestedQuantity;
    }

    // Check if the total requested quantity exceeds available stock
    if (newTotalQuantity > product.totalStock) {
      return res.status(400).json({ 
        message: `Cannot add ${requestedQuantity} items. Only ${product.totalStock - (existingItem ? existingItem.quantity : 0)} more items available for ${product.name}` 
      });
    }

    if (existingItem) {
      existingItem.quantity = newTotalQuantity;
    } else {
      cart.items.push({ product: productId, quantity: requestedQuantity });
    }

    // ✅ Recalculate totalAmount
    let total = 0;
    for (let item of cart.items) {
      const prod = await Product.findById(item.product);
      if (prod) {
        total += prod.price * item.quantity;
      }
    }

    cart.totalAmount = total;
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧾 Get user cart
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
      "name price imageUrl"
    );

    if (!cart) return res.status(404).json({ message: "Cart is empty" });

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ Clear user cart
export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.id });
    res.json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Update cart item quantity
export const updateCartItemQuantity = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    // Get the product to check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product is in stock
    if (!product.inStock || product.totalStock === 0) {
      return res.status(400).json({ message: `${product.name} is currently out of stock` });
    }

    // Check if requested quantity exceeds available stock
    if (quantity > product.totalStock) {
      return res.status(400).json({ 
        message: `Cannot set quantity to ${quantity}. Only ${product.totalStock} items available for ${product.name}` 
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    item.quantity = quantity;

    // Recalculate totalAmount
    let total = 0;
    for (let cartItem of cart.items) {
      const prod = await Product.findById(cartItem.product);
      if (prod) {
        total += prod.price * cartItem.quantity;
      }
    }

    cart.totalAmount = total;
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ Remove item from cart
export const removeCartItem = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    // Recalculate totalAmount
    let total = 0;
    for (let item of cart.items) {
      const product = await Product.findById(item.product);
      if (product) {
        total += product.price * item.quantity;
      }
    }

    cart.totalAmount = total;
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
