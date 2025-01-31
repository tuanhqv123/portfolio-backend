import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import initializePassport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import passwordRoutes from "./routes/password.js";
import blogRoutes from "./routes/blog.js";
dotenv.config();
const app = express();
// Initialize passport
initializePassport();
// CORS configuration
const corsOptions = {
    origin: "https://portfolio-frontend-r1rmsbfi0-tuanhqv123s-projects.vercel.app",
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "X-CSRF-Token",
        "X-Requested-With",
        "Accept",
        "Accept-Version",
        "Content-Length",
        "Content-MD5",
        "Content-Type",
        "Date",
        "X-Api-Version",
        "Authorization",
    ],
    optionsSuccessStatus: 204,
};
// Move CORS middleware to top
app.use(cors(corsOptions));
// Add pre-flight handling
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://portfolio-frontend-r1rmsbfi0-tuanhqv123s-projects.vercel.app");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    next();
});
app.use(express.json());
app.use(cookieParser());
// Session configuration for production
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
    },
}));
app.use(passport.initialize());
app.use(passport.session());
// Add logging middleware
app.use((req, _, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log("Headers:", req.headers);
    next();
});
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/blog", blogRoutes);
// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Add catch-all route for debugging
app.all("*", (req, res) => {
    res.status(404).json({
        message: "Route not found",
        method: req.method,
        path: req.path,
        routes: {
            auth: "/api/auth",
            password: "/api/password",
            blog: "/api/blog",
        },
    });
});
// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
    console.log("Connected to MongoDB");
})
    .catch((error) => {
    console.error("MongoDB connection error:", error);
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
        message: "Something went wrong!",
        error: process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
    });
});
// For Vercel serverless deployment
module.exports = app;
// Start server only if not running on Vercel
if (process.env.NODE_ENV !== "production") {
    const port = 5002;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
