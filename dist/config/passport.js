import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();
const initializePassport = () => {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: "/auth/google/callback",
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const existingUser = await User.findOne({ googleId: profile.id });
            if (existingUser) {
                return done(null, existingUser);
            }
            const newUser = await User.create({
                googleId: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
            });
            done(null, newUser);
        }
        catch (error) {
            done(error, undefined);
        }
    }));
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        }
        catch (error) {
            done(error, null);
        }
    });
};
export default initializePassport;
