import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
const router = Router();
// Sử dụng __dirname thay vì import.meta
const dataPath = path.join(process.cwd(), 'data', 'threads.json');
// Get all blogs with pagination
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const data = await fs.readFile(dataPath, "utf8");
        const threads = JSON.parse(data);
        const paginatedThreads = threads.slice(skip, skip + limit);
        return res.json({
            threads: paginatedThreads,
            total: threads.length,
            currentPage: page,
            totalPages: Math.ceil(threads.length / limit),
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching blogs",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Get single blog
router.get("/:id", async (req, res) => {
    try {
        const data = await fs.readFile(dataPath, "utf8");
        const threads = JSON.parse(data);
        const thread = threads[parseInt(req.params.id)];
        if (!thread) {
            return res.status(404).json({ message: "Blog not found" });
        }
        return res.json(thread);
    }
    catch (error) {
        return res.status(500).json({
            message: "Error fetching blog",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
export default router;
