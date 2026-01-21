import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import destr from "destr";
import { Context, Hono } from "hono";
import { randomInt } from "node:crypto";
import { error } from "../middleware/error";
import { getPosts } from "../reddit";
import { Bindings, Post } from "../types";
import { SUBREDDITS, SUB_EXPIRE, SUB_PREFIX_KEY } from "../utils/constants";
import { getNPosts, onlyImagePosts } from "../utils/functions";

const gimme = new Hono<{ Bindings: Bindings }>();

/**
 * Get random posts from a subreddit
 * @route GET /:subreddit?
 * @param {string} subreddit - Optional subreddit name
 * @query {number} c | count - Number of posts to return
 * @query {boolean} nonsfw - Filter out NSFW content
 */
gimme.get("/:subreddit?", async (c) => {
    const kv = c.get("kv");
    const param = c.req.param();
    const query = c.req.query();

    // Handle subreddit parameter
    const subreddit = isNullish(param.subreddit) ? SUBREDDITS[randomInt(SUBREDDITS.length)] : param.subreddit.toLowerCase();

    // Parse query parameters
    const count = parseCountParam(query.c || query.count);
    const nonsfw = Reflect.has(query, "nonsfw");

    // Validate count
    if (count !== null && count <= 0) {
        throw error.BadRequest("invalid count value");
    }

    // Get posts from cache or fetch from Reddit
    const posts = await getPostsData(c, kv, subreddit);

    if (isNullishOrEmpty(posts)) {
        return handleEmptyPosts(subreddit, param.subreddit);
    }

    // Filter NSFW content if requested
    const filteredPosts = nonsfw ? posts.filter((x) => !x.nsfw) : posts;

    if (nonsfw && isNullishOrEmpty(filteredPosts)) {
        throw error.NotFound(`r/${subreddit} only has nsfw posts`);
    }

    if (isNullishOrEmpty(filteredPosts)) {
        return handleEmptyPosts(subreddit, param.subreddit);
    }

    // Return multiple posts if count is specified
    if (count !== null) {
        const actualCount = Math.min(count, filteredPosts.length);
        const selectedPosts = getNPosts(filteredPosts, actualCount);

        return c.json({ count: actualCount, posts: selectedPosts });
    }

    // Return a single random post
    const post = filteredPosts[randomInt(filteredPosts.length)];
    return c.json(post);
});

/**
 * Parse and validate count parameter
 * @param countParam - The count parameter from the query
 * @returns Validated count number or null if not specified
 */
function parseCountParam(countParam: string | undefined): number | null {
    if (isNullish(countParam)) return null;

    const parsedCount = Number(countParam);
    if (isNaN(parsedCount)) return null;

    return Math.min(parsedCount, 50);
}

/**
 * Get posts data from cache or fetch from Reddit
 * @param c - Hono context
 * @param kv - KV store
 * @param subreddit - Subreddit name
 * @returns Array of posts
 */
async function getPostsData(c: Context<{ Bindings: Bindings }>, kv: KVNamespace, subreddit: string): Promise<Post[]> {
    const cached = await kv.get(`${SUB_PREFIX_KEY}${subreddit}`);
    const posts = isNullish(cached) ? null : destr<Post[]>(cached);

    if (!isNullishOrEmpty(posts)) {
        return posts;
    }

    const { posts: freshPosts, response } = await getPosts(c, subreddit, 100);

    if (isNullishOrEmpty(freshPosts)) {
        c.status(response.code);
        throw error.InternalServerError(response.message);
    }

    const imagePosts = onlyImagePosts(freshPosts);
    await kv.put(`${SUB_PREFIX_KEY}${subreddit}`, JSON.stringify(imagePosts), { expirationTtl: SUB_EXPIRE });

    return imagePosts;
}

/**
 * Handle empty posts response
 * @param subreddit - Subreddit name
 * @param paramSubreddit - Original subreddit parameter
 * @returns JSON response
 */
function handleEmptyPosts(subreddit: string, paramSubreddit: string | undefined) {
    throw error.NotFound(isNullish(paramSubreddit) ? "error while getting posts" : `r/${subreddit} has no posts with images`);
}

export { gimme };
