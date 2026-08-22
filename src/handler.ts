import type { Context } from "hono";
import { Hono } from "hono";
import { SUBREDDITS, SUB_EXPIRE, SUB_PREFIX_KEY } from "./constants";
import { HTTPError } from "./error";
import { getPosts } from "./reddit";
import type { Post } from "./types";

const home = new Hono<{ Bindings: CloudflareBindings }>();

home.get("/", (c) =>
    c.text(
        "Welcome to ReddViz! For documentation and info go to https://codeberg.org/ujol/reddviz and if you want to use it, just add /gimme at the end of the url",
    ),
);

const IMAGE_EXT = /\.(jpe?g|png|gif)$/i;

const gimme = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * Get random posts from a subreddit
 * @route GET /gimme/:subreddit?
 * @query c | count - Number of posts to return (max 50)
 * @query nonsfw - Filter out NSFW content
 */
gimme.get("/:subreddit?", async (c) => {
    const param = c.req.param("subreddit")?.toLowerCase();
    const subreddit =
        param ?? SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
    const nonsfw = c.req.query("nonsfw") !== undefined;

    // invalid or non-numeric counts fall back to single-post mode; 0/negative is rejected
    const raw = c.req.query("c") ?? c.req.query("count");
    const count =
        raw === undefined || Number.isNaN(Number(raw))
            ? null
            : Math.min(Number(raw), 50);
    if (count !== null && count <= 0)
        throw new HTTPError(400, "invalid count value");

    const posts = await getCachedPosts(c, subreddit);
    if (posts.length === 0) {
        throw new HTTPError(
            404,
            param
                ? `r/${subreddit} has no posts with images`
                : "error while getting posts",
        );
    }

    const visible = nonsfw ? posts.filter((p) => !p.nsfw) : posts;
    if (nonsfw && visible.length === 0)
        throw new HTTPError(404, `r/${subreddit} only has nsfw posts`);

    if (count !== null) {
        const picked = pickRandom(visible, Math.min(count, visible.length));
        return c.json({ count: picked.length, posts: picked });
    }

    return c.json(visible[Math.floor(Math.random() * visible.length)]);
});

async function getCachedPosts(
    c: Context<{ Bindings: CloudflareBindings }>,
    subreddit: string,
): Promise<Post[]> {
    const kv = c.get("kv");
    const cached = await kv.get<Post[]>(`${SUB_PREFIX_KEY}${subreddit}`);
    // ponytail: Array.isArray guards against stale/garbage cache entries (a non-array parses to a string; indexing it yields single letters)
    if (Array.isArray(cached) && cached.length > 0) return cached;

    const images = (await getPosts(c, subreddit)).filter(
        (post) =>
            post.image &&
            !post.image.endsWith(".gifv") &&
            IMAGE_EXT.test(new URL(post.image).pathname),
    );

    // ponytail: skips caching empty results so a bad reddit response can't poison the cache for 4h
    if (images.length > 0) {
        await kv.put(`${SUB_PREFIX_KEY}${subreddit}`, JSON.stringify(images), {
            expirationTtl: SUB_EXPIRE,
        });
    }
    return images;
}

function pickRandom<T>(arr: T[], n: number): T[] {
    const pool = arr.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
}

export { gimme, home };
