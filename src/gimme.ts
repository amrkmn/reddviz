import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
    SUBREDDITS,
    TIMES,
    SUB_EXPIRE,
    SUB_PREFIX_KEY,
    MISS_EXPIRE,
    MISS_PREFIX_KEY,
    SUB_REFRESH_WINDOW,
} from "./constants";
import type { TimeWindow } from "./constants";
import { HTTPError } from "./error";
import { getPosts } from "./reddit";
import type { Post } from "./types";

const MAX_COUNT = 50;

const IMAGE_EXT = /\.(jpe?g|png|gif)$/i;

// 2 characters minimum: 1-char names can't exist, but r/de and r/me are real
const SUBREDDIT_NAME = /^[a-z0-9_]{2,21}$/;

const NSFW_VALUES = "true, false or only";

type NsfwFilter = "include" | "exclude" | "only";

// what a short-lived miss marker holds: nothing for "fetched, but no usable
// posts", or the deterministic reddit failure that caused the miss, so a replay
// answers with the same status and message as the original request
interface CacheMiss {
    status?: ContentfulStatusCode;
    message?: string;
}

// written alongside a cached listing so a hit can tell how old it is
interface CacheMeta {
    storedAt: number;
}

const gimme = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * Get random posts from a subreddit
 * @route GET /gimme/:subreddit?
 * @query c | count - Number of posts to return (max 50)
 * @query t | time - Only draw from this top window: day, week, month, year or all
 * @query nsfw - Include or exclude NSFW posts: true (default), false, or only
 * @query nonsfw - Shorthand for nsfw=false, kept for existing callers
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

    // no ?t= has always meant "pick a window at random per request"; an explicit
    // window is one of the five, and anything else is a 400 rather than a guess
    const time =
        parseTime(c.req.query("t") ?? c.req.query("time")) ?? randomTime();

    const nsfw = parseNsfw(
        c.req.query("nsfw"),
        c.req.query("nonsfw") !== undefined,
    );

    const count = parseCount(c.req.query("c") ?? c.req.query("count"));

    const posts = await getCachedPosts(c, subreddit, time);

    if (posts.length === 0) {
        throw new HTTPError(
            404,
            param
                ? `no image posts found in r/${subreddit}`
                : "no image posts found, please try again",
        );
    }

    const visible = filterNsfw(posts, nsfw);

    if (visible.length === 0)
        throw new HTTPError(
            404,
            nsfw === "only"
                ? `no nsfw posts found in r/${subreddit}`
                : `all posts in r/${subreddit} are nsfw, use nsfw=true to see them`,
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

// absent means include, and nonsfw is the older shorthand for exclude
function parseNsfw(raw: string | undefined, nonsfw: boolean): NsfwFilter {
    if (raw === undefined) return nonsfw ? "exclude" : "include";
    const value = raw.toLowerCase();

    // a bare ?nsfw lands here too: an empty value names no state, and guessing one
    // is how a caller silently gets the opposite of what they asked for
    if (value !== "true" && value !== "false" && value !== "only")
        throw new HTTPError(
            400,
            `invalid nsfw value "${raw}": must be ${NSFW_VALUES}`,
        );

    if (nonsfw && value !== "false")
        throw new HTTPError(
            400,
            `nsfw=${raw} contradicts nonsfw: nonsfw hides NSFW posts, use one or the other`,
        );

    return value === "false"
        ? "exclude"
        : value === "true"
          ? "include"
          : "only";
}

function filterNsfw(posts: Post[], filter: NsfwFilter): Post[] {
    if (filter === "include") return posts;

    return posts.filter((p) => (filter === "only" ? p.nsfw : !p.nsfw));
}

// absent means the caller has no preference, so the window is drawn at random as
// it always was; an unknown or empty one is rejected rather than silently swapped
// for a different pool than the caller asked for
function parseTime(raw: string | undefined): TimeWindow | undefined {
    if (raw === undefined) return undefined;
    const value = raw.toLowerCase();

    switch (value) {
        case "day":
        case "week":
        case "month":
        case "year":
        case "all":
            return value;
        default:
            throw new HTTPError(
                400,
                `invalid time value "${raw}": must be one of ${TIMES.join(", ")}`,
            );
    }
}

const randomTime = () => TIMES[Math.floor(Math.random() * TIMES.length)];

// the window is part of both keys: a 404 for an empty window must not be replayed
// for a different one, and one window's posts must not be served for another
const subredditKey = (subreddit: string, time: TimeWindow) =>
    `${SUB_PREFIX_KEY}${subreddit};${time}`;

const missKey = (subreddit: string, time: TimeWindow) =>
    `${MISS_PREFIX_KEY}${subreddit};${time}`;

// returns cached image posts for a subreddit, fetching and caching them on a miss
async function getCachedPosts(
    c: Context<{ Bindings: CloudflareBindings }>,
    subreddit: string,
    time: TimeWindow,
): Promise<Post[]> {
    const kv = c.get("kv");

    const { value: cached, metadata } = await kv.getWithMetadata<
        Post[],
        CacheMeta
    >(subredditKey(subreddit, time), { type: "json" });

    // ponytail: Array.isArray guards against stale/garbage cache entries (a non-array parses to a string; indexing it yields single letters)
    if (Array.isArray(cached) && cached.length > 0) {
        // too close to expiry to be worth a round trip for this caller: hand back
        // the stale copy and let the refresh land for whoever asks next
        if (isNearExpiry(metadata?.storedAt))
            c.executionCtx.waitUntil(refreshPosts(c, subreddit, time));

        return cached;
    }

    const marker = missKey(subreddit, time);
    const miss = await kv.get<CacheMiss>(marker, { type: "json" });

    if (miss) {
        // a marker either replays a deterministic failure or just means "nothing
        // usable"; anything else must fall through to the fetch rather than become
        // a bogus status code
        const { status, message } = miss;

        if (
            status !== undefined &&
            Number.isFinite(status) &&
            message !== undefined
        )
            throw new HTTPError(status, message);

        return [];
    }

    let images: Post[];

    try {
        images = (await getPosts(c, subreddit, time)).filter(hasImage);
    } catch (err) {
        // a 4xx is reddit answering deterministically (no such subreddit, private,
        // locked) so it is worth remembering for a minute. A 5xx or a rate limit
        // is transient: caching it would only postpone recovery.
        if (err instanceof HTTPError && err.code < 500)
            await kv.put(
                marker,
                JSON.stringify({ status: err.code, message: err.message }),
                { expirationTtl: MISS_EXPIRE },
            );
        throw err;
    }

    if (images.length === 0) {
        // only the short-lived marker is written here, so a bad reddit response
        // still can't occupy the 4h key
        await kv.put(marker, JSON.stringify({}), {
            expirationTtl: MISS_EXPIRE,
        });

        return images;
    }

    await putPosts(c, subreddit, time, images);

    return images;
}

// a listing past most of its TTL is due for a refresh; entries written before
// this metadata existed can't be aged, so they expire as they did before
function isNearExpiry(storedAt: number | undefined): boolean {
    if (storedAt === undefined) return false;

    return Date.now() - storedAt > (SUB_EXPIRE - SUB_REFRESH_WINDOW) * 1000;
}

async function putPosts(
    c: Context<{ Bindings: CloudflareBindings }>,
    subreddit: string,
    time: TimeWindow,
    images: Post[],
): Promise<void> {
    await c
        .get("kv")
        .put(subredditKey(subreddit, time), JSON.stringify(images), {
            expirationTtl: SUB_EXPIRE,
            metadata: { storedAt: Date.now() },
        });
}

// refreshes without making anyone wait; the stale copy is still servable, so a
// failure is logged rather than raised
async function refreshPosts(
    c: Context<{ Bindings: CloudflareBindings }>,
    subreddit: string,
    time: TimeWindow,
): Promise<void> {
    try {
        const images = (await getPosts(c, subreddit, time)).filter(hasImage);

        // an empty refresh leaves the stale entry to expire on its own instead of
        // dropping a subreddit that still has servable posts
        if (images.length === 0) return;
        await putPosts(c, subreddit, time, images);
    } catch (err) {
        console.error(err);
    }
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
