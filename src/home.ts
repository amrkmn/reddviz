import { Hono } from "hono";
import { html } from "hono/html";

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

export { home };
