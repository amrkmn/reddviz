# ReddViz

A serverless application deployed on Cloudflare Workers to fetch and display posts from Reddit.

> **Disclaimer:** This project was inspired by [D3vd/Meme_Api](https://github.com/D3vd/Meme_Api) but is written from scratch for Cloudflare Workers.

## Tech stack

Written in TypeScript with the Hono framework, deployed on Cloudflare Workers, and managed with [nub](https://nubjs.com/).

## Getting started

1.  Install dependencies:

    ```bash
    nub install
    ```

2.  Add the required secrets to a `.dev.vars` file for local development:

    ```bash
    REDDIT_CLIENT_ID=your_client_id
    REDDIT_CLIENT_SECRET=your_client_secret
    ```

    For production, set the same keys as Worker secrets:

    ```bash
    wrangler secret put REDDIT_CLIENT_ID
    wrangler secret put REDDIT_CLIENT_SECRET
    ```

    Make sure your `wrangler.jsonc` has the correct `kv_namespaces` id.

3.  Start the dev server:

    ```bash
    nub run dev
    ```

## API usage

Base URL: your deployed Workers URL (or `http://localhost:8787` in dev).

### `GET /health`

Returns `200` with the deployed version. Makes no Reddit call, so an uptime
check can tell a broken Worker apart from a broken Reddit.

```json
{ "status": "ok", "version": "1.0.0" }
```

### `GET /gimme/:subreddit?`

Returns a random post with an image from a subreddit. If `subreddit` is omitted, a random default subreddit is used.

Query parameters:

| Param         | Description                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `c` / `count` | Number of posts to return (1-50). Returns an array instead of a single post.                          |
| `t`           | Only draw from this top window: `day`, `week`, `month`, `year` or `all`. Defaults to a random window. |
| `nsfw`        | `true` (default, include), `false` (exclude) or `only` (NSFW posts only).                             |
| `nonsfw`      | Shorthand for `nsfw=false`.                                                                           |

A request for a single post:

```bash
curl https://<worker-url>/gimme/memes
```

```json
{
    "id": "abc123",
    "title": "Some meme",
    "subreddit": "memes",
    "author": "someone",
    "postLink": "https://www.reddit.com/r/memes/comments/abc123/some_meme/",
    "thumbnail": "https://preview.redd.it/...",
    "image": "https://i.redd.it/....jpg",
    "nsfw": false,
    "spoiler": false,
    "upvotes": 1234,
    "comments": 56,
    "createdUtc": 1735689600,
    "upvoteRatio": 0.95,
    "preview": {
        "images": ["https://preview.redd.it/..."],
        "gifs": []
    }
}
```

A request for multiple posts:

```bash
curl "https://<worker-url>/gimme/memes?c=5&nonsfw"
```

The last day's top posts only:

```bash
curl "https://<worker-url>/gimme/memes?t=day"
```

```json
{
    "count": 5,
    "posts": [{ "id": "abc123", "...": "..." }]
}
```

Errors return `"success": false` with a message:

```json
{ "success": false, "message": "r/memes does not exist" }
```

| Status | Cause                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------- |
| 400    | Invalid `count`, `nsfw` or `t` value, `nsfw` contradicting `nonsfw`, or subreddit is private/locked |
| 404    | Subreddit doesn't exist, has no image posts, or the NSFW filter matched no posts                    |
| 500    | Unexpected error from Reddit                                                                        |
| 503    | Reddit is unreachable, rate limiting us, or rejected our credentials                                |

### Caching

Posts are cached per subreddit and `t` window for 4 hours (`SUB_EXPIRE`), under keys
like `subreddit;memes;day`, so most requests cost no Reddit call and one window's
posts are never served for another. An entry in its final 15 minutes
(`SUB_REFRESH_WINDOW`) is served from cache while it is refreshed in the
background, so a cache hit near the TTL never waits on Reddit. A subreddit and
window that come back with nothing usable — missing, private, or with no image
posts — are remembered for 60 seconds only (`MISS_EXPIRE`) under `miss;memes;day`,
so a fixed typo or a newly created subreddit is picked up quickly.

## Available scripts

- `nub run dev`: Start the development server.
- `nub run deploy`: Deploy the application to Cloudflare Workers.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
