import type { Context } from "hono";
import { ACCESS_TOKEN_KEY, FETCH_HEADERS, TIMES } from "./constants";
import { HTTPError } from "./error";
import type { Bindings, Post, RedditListing, RedditPostData } from "./types";

// ponytail: only decodes the 5 HTML entities reddit emits; swap in a full decoder if titles ever show stray entities
const decode = (s: string) =>
    s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

async function fetchToken(c: Context<{ Bindings: Bindings }>): Promise<string> {
    const auth = btoa(
        `${c.env.REDDIT_CLIENT_ID}:${c.env.REDDIT_CLIENT_SECRET}`,
    );
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        headers: { ...FETCH_HEADERS, authorization: `Basic ${auth}` },
    });

    if (!res.ok) return "";

    const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
    };
    await c
        .get("kv")
        .put(ACCESS_TOKEN_KEY, data.access_token, {
            expirationTtl: data.expires_in,
        });
    return data.access_token;
}

// Maps reddit API failures to the (status, message) pairs the API has always returned.
function apiError(status: number): HTTPError {
    const messages: Record<number, [number, string]> = {
        403: [
            400,
            "unable to access subreddit. subreddit is locked or private",
        ],
        404: [404, "this subreddit does not exist."],
        500: [503, "reddit is unreachable at the moment"],
    };
    const [code, message] = messages[status] ?? [
        500,
        "unknown error while getting posts. please try again",
    ];
    return new HTTPError(code as 500, message);
}

export async function getPosts(
    c: Context<{ Bindings: Bindings }>,
    subreddit: string,
): Promise<Post[]> {
    const time = TIMES[Math.floor(Math.random() * TIMES.length)];
    const url = `https://oauth.reddit.com/r/${subreddit}/top?limit=100&t=${time}`;

    let token =
        (await c.get("kv").get(ACCESS_TOKEN_KEY)) ?? (await fetchToken(c));
    let res = await fetch(url, {
        headers: { ...FETCH_HEADERS, authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
        token = await fetchToken(c);
        res = await fetch(url, {
            headers: { ...FETCH_HEADERS, authorization: `Bearer ${token}` },
        });
    }

    if (res.status !== 200) throw apiError(res.status);

    const listing = (await res
        .json()
        .catch(() => null)) as RedditListing | null;
    const children = listing?.data?.children ?? [];
    if (children.length === 0)
        throw new HTTPError(
            404,
            "this subreddit has no posts or doesn't exist.",
        );

    return children.map(({ data }) => toPost(data));
}

function toPost(post: RedditPostData): Post {
    const img = post.preview?.images?.[0];
    const gif = img?.variants?.gif;
    const urls = (list?: { url: string }[]) =>
        (list ?? []).map((x) => decode(x.url));

    return {
        id: decode(post.id),
        title: decode(post.title),
        subreddit: decode(post.subreddit),
        author: decode(post.author),
        postLink: decode(
            new URL(post.permalink, "https://www.reddit.com").toString(),
        ),
        thumbnail: decode(post.thumbnail),
        image: decode(post.url),
        nsfw: post.over_18,
        spoiler: post.spoiler,
        upvotes: post.ups,
        comments: post.num_comments,
        createdUtc: post.created_utc,
        upvoteRatio: post.upvote_ratio,
        preview: {
            images: [
                ...urls(img?.resolutions),
                ...(img?.source?.url ? [decode(img.source.url)] : []),
            ],
            gifs: [
                ...urls(gif?.resolutions),
                ...(gif?.source?.url ? [decode(gif.source.url)] : []),
            ],
        },
    };
}
