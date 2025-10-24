import Product from "../models/Product.js";

// Create Product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, actualPrice, discount, category, totalStock, inStock } = req.body;
    const imageUrl = req.file ? req.file.path : null;

    // Parse totalStock to ensure it's a number
    const stockCount = parseInt(totalStock) || 0;

    const productData = {
      name,
      description,
      price,
      actualPrice,
      discount: discount || 0,
      category,
      totalStock: stockCount,
      imageUrl
    };

    // Auto-manage inStock status based on totalStock
    if (stockCount > 0) {
      productData.inStock = true;
    } else {
      productData.inStock = false;
      productData.totalStock = 0; // Ensure it doesn't go negative
    }

    console.log('Creating product with data:', productData);

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: err.message });
  }
};
   
// Get All Products
export const getAllProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

// Get Single Product
export const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};

// Update Product
export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, actualPrice, discount, category, totalStock, inStock } = req.body;
    const imageUrl = req.file ? req.file.path : undefined;

    // Parse totalStock to ensure it's a number
    const stockCount = parseInt(totalStock) || 0;

    // Build update object with all fields
    const updateData = {
      name,
      description,
      price,
      actualPrice,
      discount: discount || 0,
      category,
      totalStock: stockCount,
      ...(imageUrl && { imageUrl })
    };

    // Auto-manage inStock status based on totalStock
    if (stockCount > 0) {
      // If stock is being added, automatically set inStock to true
      updateData.inStock = true;
    } else {
      // If stock is 0 or negative, set inStock to false
      updateData.inStock = false;
      updateData.totalStock = 0; // Ensure it doesn't go negative
    }

    console.log('Updating product with data:', updateData);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Delete Product
export const deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product deleted" });
};
