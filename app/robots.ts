import type { MetadataRoute } from "next";
import { absolute } from "lib/site";

/** Search engines and AI assistants are welcome on public pages; admin, APIs and personal pages are not. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/api/", "/saved", "/messages", "/s/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"].map(
        (userAgent) => ({ userAgent, allow: "/", disallow }),
      ),
    ],
    sitemap: absolute("/sitemap.xml"),
    host: absolute("/"),
  };
}
