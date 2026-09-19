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
                        @media (prefers-color-scheme: dark) {
                            body {
                                background: #121212;
                                color: #e0e0e0;
                            }
                            code {
                                background: #2a2a2a;
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

                    <p>
                        <code>GET /gimme/:subreddit?</code> returns a random
                        post with an image from a subreddit, or several with
                        <code>?c</code>. Omit the subreddit to pick a random
                        default one.
                    </p>

                    <p>
                        Draw only from one time window with
                        <code>?t=day|week|month|year|all</code> (omitted, a
                        window is picked at random), and control NSFW posts with
                        <code>?nsfw=true|false|only</code>.
                        <code>GET /health</code> reports the deployed version
                        without calling Reddit.
                    </p>

                    <p>
                        Query parameters and response shape:
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
