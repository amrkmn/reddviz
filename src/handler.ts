import type { Context } from "hono";
import { Hono } from "hono";
import { html } from "hono/html";
import { SUBREDDITS, SUB_EXPIRE, SUB_PREFIX_KEY } from "./constants";
import { HTTPError } from "./error";
import { getPosts } from "./reddit";
import type { Post } from "./types";

const home = new Hono<{ Bindings: CloudflareBindings }>();

home.get("/", (c) =>
    c.html(
        html`<!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="color-scheme" content="light dark" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    />
                    <title>ReddViz</title>
                    <style>
                        body {
                            font-family: system-ui, sans-serif;
                            max-width: 40rem;
                            margin: 2rem auto;
                            padding: 0 1rem;
                            line-height: 1.5;
                        }
                        code {
                            background: #f0f0f0;
                            padding: 0.1rem 0.3rem;
                            border-radius: 3px;
                        }
                        table {
                            border-collapse: collapse;
                        }
                        th,
                        td {
                            border: 1px solid #ccc;
                            padding: 0.3rem 0.6rem;
                            text-align: left;
                        }
                        @media (prefers-color-scheme: dark) {
                            body {
                                background: #121212;
                                color: #e0e0e0;
                            }
                            code {
                                background: #2a2a2a;
                            }
                            th,
                            td {
                                border-color: #444;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>ReddViz</h1>
                    <p>
                        A serverless Reddit posts viewer running on Cloudflare
                        Workers. Get random image posts from any subreddit as
                        JSON.
                    </p>

                    <h2>Usage</h2>
                    <p>
                        <code>GET /gimme/:subreddit?</code> returns a random
                        post with an image from a subreddit. Omit the subreddit
                        to pick a random default one.
                    </p>
                    <table>
                        <tr>
                            <th>Query param</th>
                            <th>Description</th>
                        </tr>
                        <tr>
                            <td><code>c</code> / <code>count</code></td>
                            <td>
                                Number of posts to return (1-50). Returns an
                                array instead of a single post.
                            </td>
                        </tr>
                        <tr>
                            <td><code>nonsfw</code></td>
                            <td>If present, filters out NSFW posts.</td>
                        </tr>
                    </table>

                    <h2>Examples</h2>
                    <p>
                        <code>/gimme/memes</code> returns one random post from
                        r/memes<br />
                        <code>/gimme/memes?c=5&nonsfw</code> returns 5 random
                        SFW posts from r/memes
                    </p>

                    <p>
                        Responses are JSON; errors return
                        <code>{"success": false, "message": "..."}</code>.
                    </p>

                    <p>
                        Docs and source:
                        <a
                            href="https://noz.one/ujol/reddviz"
                            target="_blank"
                            rel="noopener"
                            >noz.one/ujol/reddviz</a
                        >
                    </p>
                </body>
            </html>`,
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
        throw new HTTPError(
            400,
            `invalid count value "${raw}": must be a positive number (max 50)`,
        );

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
