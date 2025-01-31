import mongoose from "mongoose";
import { env } from "./env";

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(env.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
