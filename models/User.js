// models/User.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  street:  { type: String },
  city:    { type: String },
  state:   { type: String },
  zip:     { type: String },
  country: { type: String },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, unique: true, required: true },
  password:   { type: String, required: true },
  role:       { type: String, enum: ["user", "admin"], default: "user" },
  phone:      { type: String, default: "" },
  address:    { type: addressSchema, default: {} },
  wishlist:   [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  isBlocked:  { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  otp:        { type: String, default: null },
  otpExpiry:  { type: Date, default: null }
}, { timestamps: true });

// Optionally: hide sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  return obj;
};

export default mongoose.model("User", userSchema);
