import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import initializePassport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import passwordRoutes from "./routes/password.js";
import blogRoutes from "./routes/blog.js";
import { connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const app: Express = express();

// Initialize passport
initializePassport();
console.log("Passport initialized");

// CORS configuration
const corsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

// Apply CORS before other middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: env.jwt.secret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.mongodb.uri,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/blog", blogRoutes);

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: env.nodeEnv === "production" ? "Internal server error" : err.message,
  });
});

// Connect to MongoDB and start server
connectToDatabase()
  .then(() => {
    console.log("Connected to MongoDB");
    const port = env.port;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

export default app;
