import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// Get reviews for a product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments({ product: productId });

    res.json({
      reviews,
      totalReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a review
export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ user: userId, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    // Check if user has purchased this product (for verified reviews)
    const hasPurchased = await Order.findOne({
      user: userId,
      'products.product': productId,
      paymentStatus: 'Paid'
    });

    const review = new Review({
      user: userId,
      product: productId,
      rating,
      title,
      comment,
      verified: !!hasPurchased
    });

    await review.save();

    // Update product review statistics
    await updateProductReviewStats(productId);

    // Populate user info before sending response
    await review.populate('user', 'name');

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a review
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this review" });
    }

    review.rating = rating;
    review.title = title;
    review.comment = comment;

    await review.save();

    // Update product review statistics
    await updateProductReviewStats(review.product);

    await review.populate('user', 'name');

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns this review or is admin
    if (review.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Update product review statistics
    await updateProductReviewStats(productId);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark review as helpful
export const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user already marked this review as helpful
    const alreadyHelpful = review.helpful.some(h => h.user.toString() === userId.toString());
    
    if (alreadyHelpful) {
      // Remove helpful mark
      review.helpful = review.helpful.filter(h => h.user.toString() !== userId.toString());
      review.helpfulCount = review.helpful.length;
    } else {
      // Add helpful mark
      review.helpful.push({ user: userId });
      review.helpfulCount = review.helpful.length;
    }

    await review.save();

    res.json({ 
      helpful: !alreadyHelpful,
      helpfulCount: review.helpfulCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ user: userId })
      .populate('product', 'name imageUrl')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments({ user: userId });

    res.json({
      reviews,
      totalReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to update product review statistics
const updateProductReviewStats = async (productId) => {
  try {
    const reviews = await Review.find({ product: productId });
    
    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    await Product.findByIdAndUpdate(productId, {
      averageRating: parseFloat(averageRating),
      reviewCount: reviews.length,
      ratingDistribution
    });
  } catch (error) {
    console.error('Error updating product review stats:', error);
  }
};
