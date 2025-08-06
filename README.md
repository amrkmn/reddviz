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

2.  **Configure environment variables:**

    Rename `wrangler.toml.example` to `wrangler.toml` and fill in the required values for `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and the `kv_namespaces` id.

3.  **Run the development server:**

    ```bash
    bun run dev
    ```

## Available Scripts

-   `bun run dev`: Start the development server.
-   `bun run deploy`: Deploy the application to Cloudflare Workers.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
