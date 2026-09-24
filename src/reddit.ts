import type { Context } from "hono";
import { ACCESS_TOKEN_KEY, FETCH_HEADERS } from "./constants";
import type { TimeWindow } from "./constants";
import { HTTPError } from "./error";
import type { Post, RedditListing, RedditPostData } from "./types";

// ponytail: only decodes the 5 HTML entities reddit emits; swap in a full decoder if titles ever show stray entities
const decode = (s: string) =>
    s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

async function fetchToken(
    c: Context<{ Bindings: CloudflareBindings }>,
): Promise<string> {
    const auth = btoa(
        `${c.env.REDDIT_CLIENT_ID}:${c.env.REDDIT_CLIENT_SECRET}`,
    );

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        headers: { ...FETCH_HEADERS, authorization: `Basic ${auth}` },
    });

    // a token we failed to obtain must not be carried forward as an empty bearer:
    // reddit answers that with a 401, which then reads as a listing error
    if (res.status === 429)
        throw new HTTPError(
            503,
            "reddit is rate limiting requests, please try again later",
        );

    if (!res.ok)
        throw new HTTPError(
            503,
            `could not authenticate with reddit (status ${res.status}), please try again later`,
        );

    // SAFETY: reddit's client-credentials endpoint returns { access_token, expires_in } on 2xx
    const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
    };

    await c.get("kv").put(ACCESS_TOKEN_KEY, data.access_token, {
        expirationTtl: data.expires_in,
    });

    return data.access_token;
}

function apiError(status: number, subreddit: string): HTTPError {
    switch (status) {
        case 401:
            return new HTTPError(
                503,
                "reddit rejected our credentials, please try again later",
            );
        case 403:
            return new HTTPError(
                400,
                `r/${subreddit} is private or locked and can't be accessed`,
            );
        case 404:
            return new HTTPError(404, `r/${subreddit} does not exist`);
        case 429:
            return new HTTPError(
                503,
                "reddit is rate limiting requests, please try again later",
            );
        case 500:
            return new HTTPError(
                503,
                "reddit is temporarily unreachable, please try again later",
            );
        default:
            return new HTTPError(
                500,
                `unexpected error from reddit (status ${status}) while fetching r/${subreddit}`,
            );
    }
}

export async function getPosts(
    c: Context<{ Bindings: CloudflareBindings }>,
    subreddit: string,
    time: TimeWindow,
): Promise<Post[]> {
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

    if (res.status !== 200) throw apiError(res.status, subreddit);

    // SAFETY: a 200 from oauth.reddit.com is a listing JSON; parse failures fall back to null
    const listing = (await res
        .json()
        .catch(() => null)) as RedditListing | null;

    const children = listing?.data?.children ?? [];

    if (children.length === 0)
        throw new HTTPError(
            404,
            `r/${subreddit} has no posts or doesn't exist`,
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
