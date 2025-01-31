import dotenv from "dotenv";
import mongoose from "mongoose";
import crawlerService from "../services/crawler.service.js";
// Load environment variables
dotenv.config();
// Connect to MongoDB
async function connectToMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI environment variable is not set");
        }
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}
// Main function to run the crawler
async function main() {
    try {
        await connectToMongoDB();
        // Start crawling with max 10 pages
        await crawlerService.startCrawling(10);
        console.log("Crawler script completed successfully");
        process.exit(0);
    }
    catch (error) {
        console.error("Error running crawler script:", error);
        process.exit(1);
    }
}
// Run the script
main();
