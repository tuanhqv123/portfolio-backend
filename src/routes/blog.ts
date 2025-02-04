import express from "express";
import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db.js";
import axios from "axios";
import * as cheerio from "cheerio";

const router = Router();

interface Post {
  _id: ObjectId;
  title: string;
  content: string;
  summary: string;
  thumbnail?: string;
  videoUrl?: string;
  threadLink: string;
  author: string;
  authorLink: string;
  media: Array<{
    type: "image" | "video";
    url: string;
    thumbnail?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoInfo {
  thumbnail: string | null;
  index: number;
}

const BASE_URL = "https://www.x-stalk.com";
const MAX_RETRIES = 3;
const DELAY_BETWEEN_RETRIES = 5000;

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying ${url}, ${retries} attempts left`);
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_RETRIES)
      );
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

async function getVideoUrlsFromPage(url: string): Promise<Map<string, string>> {
  const videoMap = new Map<string, string>();
  
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    // Tìm tất cả các video URLs trong HTML content
    const videoUrlMatches = html.match(/https:\/\/video\.twimg\.com\/(?:ext_tw_video|amplify_video)\/[^"'\s]+\.mp4\?tag=\d+/g);
    if (videoUrlMatches) {
      // Tìm tất cả các thumbnails
      const thumbnails: string[] = [];
      $('.ThreadSummary_image__C1Oqn').each((_, img) => {
        const src = $(img).attr('src');
        if (src) thumbnails.push(src);
      });

      // Map thumbnails với video URLs
      videoUrlMatches.forEach((videoUrl, index) => {
        if (thumbnails[index]) {
          videoMap.set(thumbnails[index], videoUrl);
          console.log('Found video:', {
            thumbnail: thumbnails[index],
            videoUrl
          });
        }
      });
    }

    // Backup: Tìm trong các thẻ video
    if (videoMap.size === 0) {
      $('video').each((_, video) => {
        const $video = $(video);
        const videoUrl = $video.attr('src');
        const poster = $video.attr('poster');
        
        if (videoUrl && poster) {
          videoMap.set(poster, videoUrl);
          console.log('Found video from video tag:', {
            thumbnail: poster,
            videoUrl
          });
        }
      });
    }

    // Backup 2: Tìm trong Lightbox
    if (videoMap.size === 0) {
      const lightboxContent = html.match(/class="Lightbox_media__1JER5"[^>]*src="([^"]+)"/);
      if (lightboxContent && lightboxContent[1]) {
        const videoUrl = lightboxContent[1];
        // Tìm thumbnail tương ứng
        const $img = $('.ThreadSummary_image__C1Oqn').first();
        const thumbnail = $img.attr('src');
        
        if (thumbnail) {
          videoMap.set(thumbnail, videoUrl);
          console.log('Found video from Lightbox:', {
            thumbnail,
            videoUrl
          });
        }
      }
    }

    return videoMap;
  } catch (error) {
    console.error('Error getting video URLs:', error);
    return videoMap;
  }
}

async function processContent(
  $detail: cheerio.CheerioAPI,
  videoMap: Map<string, string>
): Promise<{ content: string; media: Post["media"] }> {
  const media: Post["media"] = [];

  // Xử lý từng paragraph
  $detail(".ThreadSummary_paragraph__Dc48l").each((_, paragraph) => {
    const $paragraph = $detail(paragraph);

    // Tìm các wrapper media
    $paragraph.find(".ThreadSummary_imageWrapper__bW8PL").each((_, wrapper) => {
      const $wrapper = $detail(wrapper);
      const $img = $wrapper.find(".ThreadSummary_image__C1Oqn");
      const $videoOverlay = $wrapper.find(".ThreadSummary_videoOverlay__iQdee");

      if ($videoOverlay.length > 0 && $img.length > 0) {
        // Đây là video
        const thumbnailSrc = $img.attr("src");
        if (thumbnailSrc && videoMap.has(thumbnailSrc)) {
          const videoSrc = videoMap.get(thumbnailSrc);
          // Thêm vào danh sách media
          media.push({
            type: "video",
            url: videoSrc!,
            thumbnail: thumbnailSrc,
          });
          // Thay thế wrapper bằng thẻ video với button play
          $wrapper.replaceWith(`
            <div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin-bottom: 1rem;">
              <div class="video-wrapper" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                <video 
                  poster="${thumbnailSrc}" 
                  style="width: 100%; height: 100%; object-fit: cover;"
                  preload="none"
                >
                  <source src="${videoSrc}" type="video/mp4">
                  Your browser does not support the video tag.
                </video>
                <button 
                  class="play-button" 
                  style="
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%);
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.7);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s ease;
                  "
                  onclick="
                    const video = this.previousElementSibling;
                    if (video.paused) {
                      video.play();
                      this.style.opacity = '0';
                    } else {
                      video.pause();
                      this.style.opacity = '1';
                    }
                    video.addEventListener('pause', () => this.style.opacity = '1');
                    video.addEventListener('play', () => this.style.opacity = '0');
                  "
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          `);
        }
      } else if ($img.length > 0) {
        // Đây là hình ảnh
        const imgSrc = $img.attr("src");
        if (imgSrc) {
          media.push({
            type: "image",
            url: imgSrc,
          });
        }
      }
    });
  });

  return {
    content: $detail(".ThreadSummary_markdown__doBEe").html() || "",
    media,
  };
}

async function crawlPage(pageNumber: number, db: any) {
  console.log(`Crawling page ${pageNumber}...`);
  try {
    const pageHtml = await fetchWithRetry(`${BASE_URL}/page/${pageNumber}`);
    const $ = cheerio.load(pageHtml);

    // Tìm danh sách các bài viết
    const threads = $(".ThreadList_list__VWaou .ThreadCard_card__soPKq");
    console.log(`Found ${threads.length} threads on page ${pageNumber}`);

    for (const element of threads) {
      try {
        const $element = $(element);

        // Lấy thông tin từ trang danh sách
        const author = $element
          .find(".AuthorInfo_username__QJV8a")
          .text()
          .trim();
        const authorLink =
          $element.find(".AuthorInfo_username__QJV8a").attr("href") || "";
        const title = $element
          .find(".ThreadSummary_markdown__sBz2K h1")
          .text()
          .trim();
        const threadLink = $element
          .find(".ThreadSummary_link__4zWOr")
          .attr("href");

        if (!threadLink) {
          console.log("Skipping thread - no link found");
          continue;
        }

        // Truy cập vào trang chi tiết
        const detailUrl = threadLink.startsWith("http")
          ? threadLink
          : `${BASE_URL}${threadLink}`;
        console.log("Crawling detail page:", detailUrl);

        const detailHtml = await fetchWithRetry(detailUrl);
        const $detail = cheerio.load(detailHtml);

        // Lấy tất cả video URLs
        const videoMap = await getVideoUrlsFromPage(detailUrl);
        console.log("Found videos:", videoMap.size);

        // Xử lý nội dung và nhúng video
        const { content, media } = await processContent($detail, videoMap);

        // Log để debug
        console.log("Crawled data:", {
          title,
          author,
          authorLink,
          videosCount: videoMap.size,
          imagesCount: media.length,
          hasContent: !!content,
        });

        if (title && content) {
          const collection = db.collection("posts");
          await collection.findOneAndUpdate(
            { threadLink },
            {
              $set: {
                title,
                content,
                author,
                authorLink,
                threadLink,
                media,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
          console.log(`Saved: ${title}`);
        } else {
          console.log("Skipping thread - missing required fields");
        }

        // Random delay between 2-4 seconds
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 + Math.random() * 2000)
        );
      } catch (error) {
        console.error("Error processing thread:", error);
        continue;
      }
    }
  } catch (error) {
    console.error(`Error crawling page ${pageNumber}:`, error);
    throw error;
  }
}

// Get all blogs with pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const skip: number = (page - 1) * limit;

    const db = await connectToDatabase();
    const collection = db.collection<Post>("posts");

    const total = await collection.countDocuments();
    const posts = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.json({
      threads: posts,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error in /api/blog:", error);
    return res.status(500).json({
      message: "Error fetching blogs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get single blog
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection<Post>("posts");
    const post = await collection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!post) {
      return res.status(404).json({ message: "Blog not found" });
    }

    return res.json(post);
  } catch (error) {
    console.error("Error fetching blog:", error);
    return res.status(500).json({
      message: "Error fetching blog",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Trigger crawl data
router.post("/crawl", async (req: Request, res: Response) => {
  try {
    console.log("Starting crawl process...");
    const db = await connectToDatabase();

    // Crawl 5 trang đầu tiên
    for (let page = 1; page <= 2; page++) {
      try {
        await crawlPage(page, db);
        console.log(`Completed page ${page}/2`);
        // Delay between pages (3-5 seconds)
        await new Promise((resolve) =>
          setTimeout(resolve, 3000 + Math.random() * 2000)
        );
      } catch (error) {
        console.error(`Failed to crawl page ${page}, continuing to next page`);
        continue;
      }
    }

    console.log("Crawl completed successfully");
    return res.status(200).json({
      message: "Crawl completed successfully",
    });
  } catch (error) {
    console.error("Error triggering crawl:", error);
    return res.status(500).json({
      error: "Failed to start crawl process",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
