import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for clearing products');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const clearProducts = async () => {
  try {
    await connectDB();
    
    // Get count before clearing
    const count = await Product.countDocuments();
    console.log(`Found ${count} products to remove`);
    
    // Clear all products
    const result = await Product.deleteMany({});
    console.log(`Successfully removed ${result.deletedCount} products`);
    
    console.log('All products cleared from database!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing products:', error);
    process.exit(1);
  }
};

clearProducts();
