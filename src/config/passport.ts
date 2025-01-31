import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";
import { env } from "./env.js";
import { sendWelcomeEmail } from "./email.js";

const initializePassport = () => {
  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log(
            "Processing Google OAuth callback for:",
            profile.emails?.[0].value
          );

          // Tìm user theo email hoặc googleId
          let user = await User.findOne({
            $or: [
              { email: profile.emails?.[0].value },
              { googleId: profile.id },
            ],
          });

          if (user) {
            // Nếu user đã tồn tại nhưng chưa có googleId, cập nhật googleId
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
              console.log("Updated existing user with Google ID:", user.email);
            }
          } else {
            // Tạo user mới
            user = await User.create({
              username: profile.displayName,
              email: profile.emails?.[0].value,
              googleId: profile.id,
              // Tạo mật khẩu ngẫu nhiên cho user đăng nhập bằng Google
              password: Math.random().toString(36).slice(-8),
            });
            console.log("Created new user from Google OAuth:", user.email);

            // Gửi email chào mừng
            try {
              await sendWelcomeEmail(user.email, user.username);
            } catch (emailError) {
              console.error("Failed to send welcome email:", emailError);
            }
          }

          return done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error as Error);
        }
      }
    )
  );

  return passport;
};

export default initializePassport;
