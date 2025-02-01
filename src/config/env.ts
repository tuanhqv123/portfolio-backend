import dotenv from "dotenv";
import path from "path";

// Load biến môi trường từ file .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Kiểm tra các biến môi trường bắt buộc
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URL"
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Export các biến môi trường đã được validate
export const env = {
  mongodb: {
    uri: process.env.MONGODB_URI!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  email: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl:
      process.env.GOOGLE_OAUTH_REDIRECT_URL ||
      "http://localhost:5001/api/auth/google/callback",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3000",
    callbackUrl:
      process.env.FRONTEND_CALLBACK_URL ||
      "http://localhost:3000/auth-callback",
  },
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5001", 10),
} as const;
