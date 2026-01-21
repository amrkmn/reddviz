# ReddViz

A serverless application deployed on Cloudflare Workers to fetch and display posts from Reddit.

## Tech Stack

-   **Language:** TypeScript
-   **Framework:** Hono
-   **Environment:** Cloudflare Workers
-   **Package Manager:** Bun

## Getting Started

1.  **Install dependencies:**

    ```bash
    bun install
    ```

2.  **Configure secrets:**

    Set the required secrets using `wrangler secret put`:

    ```bash
    wrangler secret put REDDIT_CLIENT_ID
    wrangler secret put REDDIT_CLIENT_SECRET
    ```

    Ensure your `wrangler.jsonc` is configured with the correct `kv_namespaces` id.

3.  **Run the development server:**

    ```bash
    bun run dev
    ```

## Available Scripts

-   `bun run dev`: Start the development server.
-   `bun run deploy`: Deploy the application to Cloudflare Workers.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
