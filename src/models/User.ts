import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  googleId?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    googleId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    const user = this as IUser;
    if (!user.password) {
      const freshUser = await User.findById(user._id).select("+password");
      if (!freshUser) return false;
      return bcrypt.compare(candidatePassword, freshUser.password);
    }
    return bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser>("User", userSchema);
