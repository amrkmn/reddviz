import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import destr from "destr";
import { Hono } from "hono";
import { randomInt } from "node:crypto";
import { getPosts } from "../reddit";
import { Bindings, Post } from "../types";
import { StatusCode } from "../types/status-code";
import { SUBREDDITS, SUB_EXPIRE, SUB_PREFIX_KEY } from "../utils/constants";
import { getNPosts, onlyImagePosts } from "../utils/functions";

const gimme = new Hono<{ Bindings: Bindings }>();

gimme.get("/:subreddit?", async (c) => {
    const kv = c.get("kv");
    let param = c.req.param();
    let query = c.req.query();

    let subreddit = isNullish(param.subreddit) ? SUBREDDITS[randomInt(SUBREDDITS.length)] : param.subreddit.toLowerCase();
    let count = Number(query.c || query.count);
    let nonsfw = Reflect.has(query, "nonsfw");

    if (!isNullish(query.c) || !isNullish(query.count)) {
        if (isNaN(count) || count <= 0)
            return c.json({ code: StatusCode.BadRequest, message: "invalid count value" }, StatusCode.BadRequest);
        if (count > 50) count = 50;
    }

    try {
        let cached = await kv.get(`${SUB_PREFIX_KEY}${subreddit}`);
        let posts = isNullish(cached) ? null : destr<Post[]>(cached);

        if (isNullishOrEmpty(posts)) {
            let { posts: freshPosts, response } = await getPosts(c, subreddit, 100);

            if (isNullishOrEmpty(freshPosts)) {
                c.status(response.code);
                return c.json(response);
            }

            freshPosts = onlyImagePosts(freshPosts);
            await kv.put(`${SUB_PREFIX_KEY}${subreddit}`, JSON.stringify(freshPosts), { expirationTtl: SUB_EXPIRE });
            posts = freshPosts;
        }
        posts = nonsfw ? posts.filter((x) => !x.nsfw) : posts;

        if (nonsfw && isNullishOrEmpty(posts) && posts.every((x) => x.nsfw)) {
            c.status(StatusCode.NotFound);
            return c.json({
                code: StatusCode.NotFound,
                message: `r/${subreddit} only has nsfw posts`,
            });
        }
        if (isNullishOrEmpty(posts)) {
            c.status(StatusCode.NotFound);
            return c.json({
                code: StatusCode.NotFound,
                message: isNullish(param.subreddit) ? "error while getting posts" : `r/${subreddit} has no posts with images`,
            });
        }

        if (!isNaN(count)) {
            if (posts.length < count) count = posts.length;
            posts = getNPosts(posts, count);
            c.status(StatusCode.Ok);
            return c.json({ count, posts });
        }

        let post = posts[randomInt(posts.length)];

        c.status(StatusCode.Ok);
        return c.json(post);
    } catch (error: any) {
        c.status(error.code ?? StatusCode.ServiceUnavailable);
        return c.json({ code: error.code ?? StatusCode.ServiceUnavailable, message: error.message });
    }
});

export { gimme };

