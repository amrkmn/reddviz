import type { Context } from "hono";
import { Hono } from "hono";
import { SUBREDDITS, SUB_EXPIRE, SUB_PREFIX_KEY } from "./constants";
import { HTTPError } from "./error";
import { getPosts } from "./reddit";
import type { Post } from "./types";

const MAX_COUNT = 50;
const IMAGE_EXT = /\.(jpe?g|png|gif)$/i;
// 2 characters minimum: 1-char names can't exist, but r/de and r/me are real
const SUBREDDIT_NAME = /^[a-z0-9_]{2,21}$/;

const gimme = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * Get random posts from a subreddit
 * @route GET /gimme/:subreddit?
 * @query c | count - Number of posts to return (max 50)
 * @query nonsfw - Filter out NSFW content
 */
gimme.get("/:subreddit?", async (c) => {
    const param = c.req.param("subreddit")?.toLowerCase();
    // unvalidated, an encoded slash escapes the r/ prefix and picks an arbitrary
    // path on oauth.reddit.com while carrying the app's bearer token
    if (param !== undefined && !SUBREDDIT_NAME.test(param))
        throw new HTTPError(
            400,
            `invalid subreddit name "${param}": only letters, numbers and underscores (2-21 characters)`,
        );

    const subreddit =
        param ?? SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
    const nonsfw = c.req.query("nonsfw") !== undefined;
    const count = parseCount(c.req.query("c") ?? c.req.query("count"));

    const posts = await getCachedPosts(c, subreddit);
    if (posts.length === 0) {
        throw new HTTPError(
            404,
            param
                ? `no image posts found in r/${subreddit}`
                : "no image posts found, please try again",
        );
    }

    const visible = nonsfw ? posts.filter((p) => !p.nsfw) : posts;
    if (nonsfw && visible.length === 0)
        throw new HTTPError(
            404,
            `all posts in r/${subreddit} are nsfw, remove the nonsfw filter to see them`,
        );

    if (count !== null) {
        const picked = pickRandom(visible, Math.min(count, visible.length));
        return c.json({ count: picked.length, posts: picked });
    }

    return c.json(visible[Math.floor(Math.random() * visible.length)]);
});

// omitting the count selects single-post mode; anything present must be whole
// digits in range, so a typo can't silently fall back to one post
function parseCount(raw: string | undefined): number | null {
    if (raw === undefined) return null;
    // strict digits: rejects 5.5, 0x10, 1e3, negatives and blanks
    if (!/^\d+$/.test(raw) || Number(raw) < 1)
        throw new HTTPError(
            400,
            `invalid count value "${raw}": must be a whole number between 1 and ${MAX_COUNT}`,
        );
    return Math.min(Number(raw), MAX_COUNT);
}

// returns cached image posts for a subreddit, fetching and caching them on a miss
async function getCachedPosts(
    c: Context<{ Bindings: CloudflareBindings }>,
    subreddit: string,
): Promise<Post[]> {
    const kv = c.get("kv");
    const cached = await kv.get<Post[]>(`${SUB_PREFIX_KEY}${subreddit}`, {
        type: "json",
    });
    // ponytail: Array.isArray guards against stale/garbage cache entries (a non-array parses to a string; indexing it yields single letters)
    if (Array.isArray(cached) && cached.length > 0) return cached;

    const images = (await getPosts(c, subreddit)).filter(hasImage);

    // ponytail: skips caching empty results so a bad reddit response can't poison the cache for 4h
    if (images.length > 0) {
        await kv.put(`${SUB_PREFIX_KEY}${subreddit}`, JSON.stringify(images), {
            expirationTtl: SUB_EXPIRE,
        });
    }
    return images;
}

function hasImage(post: Post): boolean {
    if (!post.image || post.image.endsWith(".gifv")) return false;
    try {
        return IMAGE_EXT.test(new URL(post.image).pathname);
    } catch {
        // a relative or malformed url has no host to parse and would otherwise
        // fail the whole request
        return false;
    }
}

// partial Fisher-Yates: only the first n positions are ever touched
function pickRandom<T>(arr: T[], n: number): T[] {
    const pool = arr.slice();
    const size = Math.min(n, pool.length);
    for (let i = 0; i < size; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, size);
}

export { gimme };
