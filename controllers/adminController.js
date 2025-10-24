import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const orders = await Order.find().populate("user", "name");
    const totalOrders = orders.length;
    const totalIncome = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      totalProducts,
      totalUsers,
      totalOrders,
      totalIncome,
      orders: orders.map(o => ({
        id: o._id,
        user: o.user?.name || "Unknown",
        count: o.products.length,
        total: o.totalAmount,
        status: o.deliveryStatus,
        date: o.createdAt.toISOString().split('T')[0]
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all users for admin management
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update user role and status
export const updateUser = async (req, res) => {
  try {
    const { role, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isBlocked },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get income analytics
export const getIncomeAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'daily':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      default: // month
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get orders for the period
    const orders = await Order.find({
      createdAt: { $gte: startDate },
      paymentStatus: 'Paid'
    }).populate('products.product', 'name price').populate('user', 'name');

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate previous period for growth comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const previousOrders = await Order.find({
      createdAt: { $gte: previousStartDate, $lt: startDate },
      paymentStatus: 'Paid'
    });
    
    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Generate daily data for the last 30 days or period
    const dailyData = [];
    const dailyRevenue = {};
    const dailyOrders = {};

    // Initialize daily data
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      dailyRevenue[dateString] = 0;
      dailyOrders[dateString] = 0;
    }

    // Populate with actual order data
    orders.forEach(order => {
      const dateString = order.createdAt.toISOString().split('T')[0];
      if (dailyRevenue.hasOwnProperty(dateString)) {
        dailyRevenue[dateString] += order.totalAmount;
        dailyOrders[dateString] += 1;
      }
    });

    // Convert to array format for charts
    Object.keys(dailyRevenue).reverse().forEach(date => {
      const revenue = dailyRevenue[date];
      const orderCount = dailyOrders[date];
      dailyData.push({
        date: new Date(date).toLocaleDateString(),
        revenue: revenue,
        orders: orderCount,
        avgOrderValue: orderCount > 0 ? revenue / orderCount : 0
      });
    });

    // Generate monthly data
    const monthlyData = [];
    if (period === 'year') {
      const monthlyRevenue = {};
      const monthlyOrderCount = {};
      
      // Initialize 12 months
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        monthlyRevenue[monthKey] = 0;
        monthlyOrderCount[monthKey] = 0;
      }

      // Populate with order data
      orders.forEach(order => {
        const monthKey = order.createdAt.toISOString().slice(0, 7);
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += order.totalAmount;
          monthlyOrderCount[monthKey] += 1;
        }
      });

      // Convert to array
      Object.keys(monthlyRevenue).reverse().forEach((month, index) => {
        const revenue = monthlyRevenue[month];
        const orderCount = monthlyOrderCount[month];
        const prevMonth = Object.keys(monthlyRevenue).reverse()[index - 1];
        const prevRevenue = prevMonth ? monthlyRevenue[prevMonth] : 0;
        const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

        monthlyData.push({
          period: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          revenue: revenue,
          orders: orderCount,
          growth: growth
        });
      });
    }

    // Get top products
    const productSales = {};
    orders.forEach(order => {
      order.products.forEach(item => {
        const productName = item.name || item.product?.name || 'Unknown Product';
        if (!productSales[productName]) {
          productSales[productName] = { sales: 0, revenue: 0 };
        }
        productSales[productName].sales += item.quantity;
        productSales[productName].revenue += item.quantity * (item.price || item.product?.price || 0);
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({
        name,
        sales: data.sales,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent transactions
    const recentTransactions = orders
      .slice(-10)
      .map(order => ({
        id: order._id.toString().slice(-8),
        customer: order.user?.name || 'Unknown',
        amount: order.totalAmount,
        paymentMethod: order.paymentResult?.paypalOrderId ? 'PayPal' : 'Test Payment',
        status: order.paymentStatus,
        date: order.createdAt
      }));

    res.json({
      totalRevenue,
      monthlyRevenue: totalRevenue, // Same as total for the period
      totalOrders,
      averageOrderValue,
      revenueGrowth,
      topProducts,
      recentTransactions,
      monthlyData,
      dailyData: dailyData.slice(0, 30) // Last 30 days
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
