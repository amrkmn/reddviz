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
                    <title>ReddViz API</title>
                    <style>
                        body {
                            font-family: system-ui, sans-serif;
                            max-width: 44rem;
                            margin: 2rem auto;
                            padding: 0 1rem;
                            line-height: 1.5;
                        }
                        h1 {
                            margin-bottom: 0.25rem;
                        }
                        h2 {
                            margin-top: 2.5rem;
                            font-size: 1.1rem;
                        }
                        code,
                        pre {
                            font-family: ui-monospace, monospace;
                            font-size: 0.9em;
                        }
                        code {
                            background: #f0f0f0;
                            padding: 0.1rem 0.3rem;
                            border-radius: 3px;
                        }
                        pre {
                            background: #f0f0f0;
                            padding: 0.75rem;
                            border-radius: 4px;
                            overflow-x: auto;
                        }
                        pre code {
                            background: none;
                            padding: 0;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin: 0.5rem 0;
                        }
                        th,
                        td {
                            border-bottom: 1px solid #ddd;
                            padding: 0.35rem 0.5rem;
                            text-align: left;
                            vertical-align: top;
                        }
                        .muted {
                            color: #666;
                            margin-top: 0;
                        }
                        @media (prefers-color-scheme: dark) {
                            body {
                                background: #121212;
                                color: #e0e0e0;
                            }
                            code,
                            pre {
                                background: #2a2a2a;
                            }
                            th,
                            td {
                                border-color: #3a3a3a;
                            }
                            .muted {
                                color: #999;
                            }
                            a {
                                color: #7cb3ff;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>ReddViz</h1>
                    <p class="muted">
                        Random image posts from Reddit, as JSON.
                    </p>

                    <h2>Endpoints</h2>
                    <table>
                        <tr>
                            <th>Endpoint</th>
                            <th>Returns</th>
                        </tr>
                        <tr>
                            <td><code>GET /gimme/:subreddit?</code></td>
                            <td>A random post with an image</td>
                        </tr>
                        <tr>
                            <td><code>GET /health</code></td>
                            <td>Deployed version, no Reddit call</td>
                        </tr>
                    </table>

                    <h2>GET /gimme/:subreddit?</h2>
                    <p>
                        One random post, or several with <code>c</code>. Omit
                        the subreddit to pick one of the defaults.
                    </p>
                    <table>
                        <tr>
                            <th>Param</th>
                            <th>Value</th>
                            <th>Default</th>
                        </tr>
                        <tr>
                            <td><code>c</code>, <code>count</code></td>
                            <td>1 to 50 posts</td>
                            <td>a single post</td>
                        </tr>
                        <tr>
                            <td><code>t</code></td>
                            <td>
                                <code>day</code>, <code>week</code>,
                                <code>month</code>, <code>year</code>,
                                <code>all</code>
                            </td>
                            <td>a random window</td>
                        </tr>
                        <tr>
                            <td><code>nsfw</code></td>
                            <td>
                                <code>true</code>, <code>false</code>,
                                <code>only</code>
                            </td>
                            <td><code>true</code></td>
                        </tr>
                        <tr>
                            <td><code>nonsfw</code></td>
                            <td>Shorthand for <code>nsfw=false</code></td>
                            <td>none</td>
                        </tr>
                    </table>

                    <h2>Examples</h2>
                    <pre><code>GET /gimme/memes
GET /gimme/me_irl?t=day
GET /gimme/memes?c=5&amp;nsfw=false</code></pre>

                    <h2>Responses</h2>
                    <p>One post:</p>
                    <pre><code>{ "id": "abc123", "title": "Some meme", "image": "https://i.redd.it/….jpg", … }</code></pre>
                    <p>Several posts (<code>c</code>):</p>
                    <pre><code>{ "count": 2, "posts": [ … ] }</code></pre>
                    <p>Errors:</p>
                    <pre><code>{ "success": false, "message": "r/memes does not exist" }</code></pre>

                    <h2>Status codes</h2>
                    <table>
                        <tr>
                            <th>Code</th>
                            <th>Meaning</th>
                        </tr>
                        <tr>
                            <td>400</td>
                            <td>
                                Invalid <code>c</code>, <code>nsfw</code> or
                                <code>t</code> value
                            </td>
                        </tr>
                        <tr>
                            <td>404</td>
                            <td>No posts, or the NSFW filter matched none</td>
                        </tr>
                        <tr>
                            <td>500</td>
                            <td>Unexpected error from Reddit</td>
                        </tr>
                        <tr>
                            <td>503</td>
                            <td>
                                Reddit unreachable, rate limiting us, or
                                rejected our credentials
                            </td>
                        </tr>
                    </table>

                    <h2>GET /health</h2>
                    <pre><code>{ "status": "ok", "version": "1.0.0" }</code></pre>

                    <p class="muted">
                        Full details:
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
