import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import cookieParser from "cookie-parser";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import path from "path";
import { fileURLToPath } from 'url';
const app = express();
//middleware for parsing json request for body
app.use(bodyParser.json());
app.use(cors());
dotenv.config();
const port = process.env.PORT || 4000;
const db = process.env.MONGO_URI;
app.use(cookieParser());    
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/user", userRoutes);
app.use("/api/paypal", paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//connect to database
mongoose.connect(db).then(() => {console.log('Connected to database');
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
})
.catch(err => console.log(err));