import axios from "axios";
import cheerio from "cheerio";
import { Blog } from "../models/Blog.js";
class CrawlerService {
    BASE_URL = "https://www.x-stalk.com";
    MAX_RETRIES = 3;
    DELAY_BETWEEN_RETRIES = 5000;
    async startCrawling(maxPages) {
        try {
            for (let page = 1; page <= maxPages; page++) {
                await this.crawlPage(page);
                console.log(`Completed page ${page}/${maxPages}`);
                await this.delay(3000 + Math.random() * 2000);
            }
            console.log("Crawling completed");
        }
        catch (error) {
            console.error("Error during crawling:", error);
            throw error;
        }
    }
    async crawlPage(pageNumber) {
        console.log(`Crawling page ${pageNumber}...`);
        const pageHtml = await this.fetchWithRetry(`${this.BASE_URL}/page/${pageNumber}`);
        const $ = cheerio.load(pageHtml);
        const threads = $("article.thread-card");
        for (let i = 0; i < threads.length; i++) {
            try {
                const element = threads[i];
                const $element = $(element);
                const title = $element.find("h2.thread-title").text().trim();
                const summary = $element.find("div.thread-summary").text().trim();
                const author = $element.find("span.author-name").text().trim();
                const authorLink = $element.find("a.author-link").attr("href") || "";
                const threadLink = $element.find("a.thread-link").attr("href") || "";
                if (!threadLink) {
                    console.log("Skipping thread - no link found");
                    continue;
                }
                const detailUrl = threadLink.startsWith("http")
                    ? threadLink
                    : `${this.BASE_URL}${threadLink}`;
                const detailHtml = await this.fetchWithRetry(detailUrl);
                const $detail = cheerio.load(detailHtml);
                const content = $detail("div.thread-content").html() || "";
                if (title && summary && content) {
                    await Blog.findOneAndUpdate({ threadLink }, {
                        title,
                        summary,
                        content,
                        author,
                        authorLink,
                        openInXLink: threadLink,
                        threadLink,
                        createdAt: new Date(),
                    }, { upsert: true, new: true });
                    console.log(`Saved: ${title}`);
                }
                else {
                    console.log("Skipping thread - missing required fields");
                }
                await this.delay(1000 + Math.random() * 2000);
            }
            catch (error) {
                console.error("Error processing thread:", error);
            }
        }
    }
    async fetchWithRetry(url, retries = this.MAX_RETRIES) {
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                },
                timeout: 10000,
            });
            return response.data;
        }
        catch (error) {
            if (retries > 0) {
                console.log(`Retrying ${url}, ${retries} attempts left`);
                await this.delay(this.DELAY_BETWEEN_RETRIES);
                return this.fetchWithRetry(url, retries - 1);
            }
            throw error;
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
export default new CrawlerService();
