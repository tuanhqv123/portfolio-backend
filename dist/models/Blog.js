import mongoose, { Schema } from "mongoose";
const blogSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    images: [{ type: String }],
    videoUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    tags: [{ type: String }],
});
export const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
