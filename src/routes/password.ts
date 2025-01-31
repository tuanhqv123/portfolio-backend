import { Router, Request, Response } from "express";
import { User } from "../models/User.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = Router();

// Store verification codes temporarily
const verificationCodes = new Map<string, { code: string; expires: Date }>();

// Simplified email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password here
  },
});

// Request password reset
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const code = crypto.randomBytes(3).toString("hex");
    verificationCodes.set(email, {
      code,
      expires: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Simplified email sending
    await transporter.sendMail({
      from: `"Portfolio Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code",
      html: `<p>Your verification code is: <strong>${code}</strong></p>
             <p>This code will expire in 15 minutes.</p>`,
    });

    return res.json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Error sending email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Verify code
router.post("/verify-code", (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const storedData = verificationCodes.get(email);

    if (!storedData) {
      return res.status(400).json({ message: "No verification code found" });
    }

    if (new Date() > storedData.expires) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: "Verification code expired" });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    return res.json({ message: "Code verified successfully" });
  } catch (error) {
    console.error("Error in verify code route:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Reset password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    const storedData = verificationCodes.get(email);

    if (!storedData || storedData.code !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    // Clear verification code
    verificationCodes.delete(email);

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in reset password route:", error);
    return res.status(500).json({
      message: "Error resetting password",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
