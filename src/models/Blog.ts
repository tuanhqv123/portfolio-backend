import { Schema, model } from "mongoose";

interface IBlog {
  title: string;
  content: string;
  thumbnail?: string;
  videoUrl?: string;
  threadLink: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  thumbnail: { type: String },
  videoUrl: { type: String },
  threadLink: { type: String, required: true },
  author: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Blog = model<IBlog>("Blog", blogSchema);
export type { IBlog };
