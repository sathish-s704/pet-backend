import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Create Order
export const createOrder = async (req, res) => {
  try {
    console.log('=== Order Creation Request ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const { products, totalAmount } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error('Invalid products array:', products);
      return res.status(400).json({ message: 'Products array is required and must not be empty' });
    }

    if (!totalAmount || totalAmount <= 0) {
      console.error('Invalid total amount:', totalAmount);
      return res.status(400).json({ message: 'Valid total amount is required' });
    }

    const snapshotProducts = [];

    for (const item of products) {
      console.log('Processing product item:', item);
      
      if (!item.product) {
        console.error('Product ID missing in item:', item);
        return res.status(400).json({ message: 'Product ID is required for each item' });
      }

      const prod = await Product.findById(item.product);
      if (!prod) {
        console.error(`Product not found: ${item.product}`);
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }

      const requestedQuantity = item.quantity || 1;

      // Check if enough stock is available
      if (prod.totalStock < requestedQuantity) {
        console.error(`Insufficient stock for product ${prod.name}. Available: ${prod.totalStock}, Requested: ${requestedQuantity}`);
        return res.status(400).json({ 
          message: `Insufficient stock for ${prod.name}. Only ${prod.totalStock} items available.` 
        });
      }

      // Check if product is in stock
      if (!prod.inStock || prod.totalStock === 0) {
        console.error(`Product ${prod.name} is out of stock`);
        return res.status(400).json({ 
          message: `${prod.name} is currently out of stock.` 
        });
      }

      console.log('Found product:', prod);

      snapshotProducts.push({
        product: prod._id,
        name: prod.name,
        price: prod.price,
        imageUrl: prod.imageUrl,
        quantity: requestedQuantity
      });
    }

    console.log('Creating order with snapshot products:', snapshotProducts);

    const order = await Order.create({
      user: req.user._id,
      products: snapshotProducts,
      totalAmount
    });

    // Update stock for each product after successful order creation
    for (const item of snapshotProducts) {
      const product = await Product.findById(item.product);
      if (product) {
        product.totalStock -= item.quantity;
        
        // Update inStock status based on remaining stock
        if (product.totalStock <= 0) {
          product.inStock = false;
          product.totalStock = 0; // Ensure it doesn't go negative
        }
        
        await product.save();
        console.log(`Updated stock for ${product.name}: ${product.totalStock} remaining`);
      }
    }

    console.log('Order created successfully:', order);
    res.status(201).json(order);
  } catch (err) {
    console.error('=== Order Creation Error ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: err.message });
  }
};

// Get Orders by User
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("products.product", "name price imageUrl");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name price");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Order Status (Admin)
export const updateOrderStatus = async (req, res) => {
  const { deliveryStatus, paymentStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (deliveryStatus) order.deliveryStatus = deliveryStatus;
  if (paymentStatus) order.paymentStatus = paymentStatus;

  await order.save();
  res.json(order);
};

// Update Payment Status
export const updatePaymentStatus = async (req, res) => {
  try {
    console.log('=== Payment Status Update Request ===');
    console.log('Order ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const { paypalOrderId, status } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log('Found order:', order);

    // Verify the order belongs to the current user
    if (order.user.toString() !== req.user._id.toString()) {
      console.error('User not authorized for order:', {
        orderUser: order.user.toString(),
        currentUser: req.user._id.toString()
      });
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    // Update payment details
    order.paymentStatus = "Paid";
    order.paidAt = new Date();
    order.paymentResult = {
      paypalOrderId: paypalOrderId,
      status: status,
      email: req.user.email,
    };

    console.log('Updating order with payment details:', {
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt,
      paymentResult: order.paymentResult
    });

    await order.save();

    console.log('Payment status updated successfully:', order);
    res.json({ 
      message: "Payment status updated successfully", 
      order: {
        _id: order._id,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt,
        paymentResult: order.paymentResult
      }
    });
  } catch (err) {
    console.error('=== Payment Status Update Error ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: err.message });
  }
};

// Delete Order (Admin)
export const deleteOrder = async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  res.json({ message: "Order deleted" });
};
