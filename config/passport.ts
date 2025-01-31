import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { User } from "../src/models/User";
import { VerifyCallback } from "passport-oauth2";
import { sendWelcomeEmail } from "../src/config/email"; // Fix import path
import dotenv from "dotenv";

dotenv.config(); // Ensure environment variables are loaded

// Log environment variables to confirm they are loaded
console.log("Environment variables loaded:");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
console.log("EMAIL_FROM:", process.env.EMAIL_USER);

const initializePassport = () => {
  console.log("Initializing passport");

  const callbackURL =
    "https://portfolio-backend-1y173cf6r-tuanhqv123s-projects.vercel.app/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          console.log("GoogleStrategy callback invoked");

          let user = await User.findOne({ email: profile.emails?.[0].value });

          if (!user) {
            user = await User.create({
              username: profile.displayName,
              email: profile.emails?.[0].value,
              googleId: profile.id,
              password: Math.random().toString(36).slice(-8),
            });

            // Send welcome email
            await sendWelcomeEmail(user.email, user.username);
          }

          return done(null, user);
        } catch (error) {
          console.error("Error sending email:", error);
          return done(error as Error);
        }
      }
    )
  );
};

export default initializePassport;
