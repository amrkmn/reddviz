import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { Context } from "hono";
import { decode } from "html-entities";
import { Bindings, Post, StatusCode } from "../types";
import { ACCESS_TOKEN_KEY, TIMES } from "../utils/constants";
import { makeRequest } from "./request";
import { getToken } from "./token";
import { getCleanPreviewImages, getClearPreviewGifs } from "./utils";
import { randomInt } from "node:crypto";

export async function getPosts(c: Context<{ Bindings: Bindings }>, subreddit: string, count: number) {
    const kv = c.get("kv");
    const url = getApiURL(subreddit, count);

    let cachedToken = await kv.get(ACCESS_TOKEN_KEY);
    let token = isNullish(cachedToken) ? await getToken(c) : cachedToken;

    let { body, statusCode } = await makeRequest(url, token);

    if (statusCode === StatusCode.Unauthorized) {
        token = await getToken(c);
        const req = await makeRequest(url, token);
        body = req.body;
        statusCode = req.statusCode;
    }

    if (statusCode === StatusCode.InternalServerError)
        return {
            posts: null,
            response: {
                code: StatusCode.ServiceUnavailable,
                message: "reddit is unreachable at the moment",
            },
        };

    if (statusCode === StatusCode.Forbidden)
        return {
            posts: null,
            response: {
                code: StatusCode.Forbidden,
                message: "unable to access subreddit. subreddit is locked or private",
            },
        };

    if (statusCode === StatusCode.NotFound)
        return {
            posts: null,
            response: {
                code: StatusCode.NotFound,
                message: "this subreddit does not exist.",
            },
        };

    if (statusCode !== StatusCode.Ok)
        return {
            posts: null,
            response: {
                code: StatusCode.InternalServerError,
                message: "unknown error while getting posts. please try again",
            },
        };

    if (body === null)
        return {
            posts: null,
            response: {
                code: StatusCode.InternalServerError,
                message: "error while getting posts from subreddit. please try again",
            },
        };

    if (Array.isArray(body.data.children) && isNullishOrEmpty(body.data.children))
        return {
            posts: null,
            response: {
                code: StatusCode.NotFound,
                message: "this subreddit has no posts or doesn't exist.",
            },
        };

    let posts: Post[] = [];
    for (let { data: post } of body.data.children) {
        posts.push({
            id: decode(post.id),
            title: decode(post.title),
            subreddit: decode(post.subreddit),
            author: decode(post.author),
            postLink: decode(new URL(`${post.permalink}`, "https://www.reddit.com").toString()),
            thumbnail: decode(post.thumbnail),
            image: decode(post.url),
            nsfw: post.over_18,
            spoiler: post.spoiler,
            upvotes: post.ups,
            comments: post.num_comments,
            createdUtc: post.created_utc,
            upvoteRatio: post.upvote_ratio,
            preview: {
                images: getCleanPreviewImages(post),
                gifs: getClearPreviewGifs(post),
            },
        });
    }

    return { posts, response: { code: StatusCode.Ok, message: "OK" } };
}

export function getApiURL(subreddit: string, limit: number): string {
    let url = new URL(`r/${subreddit}/top`, `https://oauth.reddit.com/`);
    url.search = new URLSearchParams({ limit: `${limit}`, t: TIMES[randomInt(TIMES.length)] }).toString();

    return url.toString();
}
