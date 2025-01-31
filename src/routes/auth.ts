import { Router, Request, Response } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AuthResponse, SignUpRequest, SignInRequest } from "../types/user.js";
import "../config/passport.js";
import { sendWelcomeEmail } from "../config/email.js"; // Fix import path
import { auth, AuthRequest } from "../middleware/auth.js";
import { env } from "../config/env.js";

const router = Router();

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failWithError: true,
    failureRedirect: `${env.frontend.url}/auth/callback?error=google-auth-failed`,
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(
          `${env.frontend.url}/auth/callback?error=no-user-data`
        );
      }

      const token = jwt.sign({ userId: user._id }, env.jwt.secret, {
        expiresIn: "24h",
      });

      // Redirect về frontend với token và user info
      const userInfo = {
        id: user._id,
        username: user.username,
        email: user.email,
      };

      const redirectUrl = new URL(`${env.frontend.url}/auth/callback`);
      redirectUrl.searchParams.append("token", token);
      redirectUrl.searchParams.append("user", JSON.stringify(userInfo));

      return res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error("Google callback error:", error);
      return res.redirect(
        `${env.frontend.url}/auth/callback?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error"
        )}`
      );
    }
  }
);

// Register
router.post(
  "/signup",
  async (
    req: Request<{}, {}, SignUpRequest>,
    res: Response<AuthResponse | { message: string; error: string }>
  ) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          message: "All fields are required",
          error: "Missing required fields",
        });
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          message:
            "Username can only contain letters, numbers, and underscores",
          error: "Invalid username format",
        });
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        return res.status(400).json({
          message: "User with this email or username already exists",
          error: "User exists",
        });
      }

      const user = new User({
        username,
        email,
        password,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, env.jwt.secret, {
        expiresIn: "24h",
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(user.email, user.username);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      return res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({
        message: "Error creating user",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Login
router.post(
  "/signin",
  async (
    req: Request<{}, {}, SignInRequest>,
    res: Response<AuthResponse | { message: string; error: string }>
  ) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
          error: "Missing credentials",
        });
      }

      // Find user by email
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "Authentication failed",
        });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "Authentication failed",
        });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, env.jwt.secret, {
        expiresIn: "24h",
      });

      // Return success response
      return res.json({
        message: "Logged in successfully",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Signin error:", error);
      return res.status(500).json({
        message: "Error logging in",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get user info
router.get("/me", auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching user info",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Logout
router.post("/signout", auth, (req: AuthRequest, res: Response) => {
  try {
    // JWT based auth chỉ cần client xóa token
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error logging out",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
