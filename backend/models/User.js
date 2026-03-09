import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false, // Google users don't have a password
      default: null,
    },
    googleId: {
      type: String,
      default: null,
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);
export default User;
