import axios from "axios";
import dotenv from "dotenv";
import Order from "../models/Order.js";
dotenv.config();

// 🔐 Generate PayPal Access Token
const generateAccessToken = async () => {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API } = process.env;
  
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_API) {
    throw new Error('PayPal configuration is missing. Please check your environment variables.');
  }
  
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('PayPal token generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate PayPal access token');
  }
};

// 🛒 Create PayPal Order
export const createPayPalOrder = async (req, res) => {
  const { amount } = req.body;

  try {
    const accessToken = await generateAccessToken();

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount.toString(),
          },
        },
      ],
    };

    const response = await axios.post(
      `${process.env.PAYPAL_API}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ paypalOrderId: response.data.id });
  } catch (err) {
    console.error('PayPal order creation error:', err.response?.data || err.message);
    res.status(500).json({ 
      message: "PayPal order creation failed", 
      error: err.response?.data?.message || err.message 
    });
  }
};

// ✅ Capture PayPal Payment & Update MongoDB Order
export const captureOrder = async (req, res) => {
  const { orderID } = req.params;
  const { localOrderId } = req.body;

  try {
    console.log('Capturing PayPal order:', orderID, 'for local order:', localOrderId);

    // 🛠 Update local MongoDB order
    const order = await Order.findById(localOrderId);
    if (!order) {
      console.error('Local order not found:', localOrderId);
      return res.status(404).json({ message: "Local order not found" });
    }

    // Verify the order belongs to the current user
    if (order.user.toString() !== req.user._id.toString()) {
      console.error('Order ownership mismatch:', order.user, req.user._id);
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    // Update order with payment details
    order.paymentStatus = "Paid";
    order.paidAt = new Date();
    order.paymentResult = {
      paypalOrderId: orderID,
      status: "COMPLETED",
      email: req.user.email,
    };

    await order.save();

    console.log('Order updated successfully:', order._id);

    res.json({ 
      message: "Payment captured and order updated", 
      order: {
        _id: order._id,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt,
        paymentResult: order.paymentResult
      }
    });
  } catch (err) {
    console.error('Payment capture error:', err);
    res.status(500).json({ 
      message: "Payment capture failed", 
      error: err.message 
    });
  }
};
