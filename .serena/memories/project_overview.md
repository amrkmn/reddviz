# Project Overview

**Purpose:**

`reddviz` is a web application designed to fetch and display posts from Reddit. It appears to be built as a serverless application deployed on Cloudflare Workers.

**Tech Stack:**

-   **Language:** TypeScript
-   **Framework:** Hono (a lightweight web framework for serverless environments)
-   **Environment:** Cloudflare Workers
-   **Package Manager:** bun

**Codebase Structure:**

The codebase is organized into several directories within the `src` folder:

-   `handler`: Contains the request handlers for different routes.
-   `reddit`: Houses the logic for interacting with the Reddit API.
-   `types`: Defines the custom types used throughout the application.
-   `utils`: Includes utility functions and constants.

The main entry point for the application is `src/index.ts`, which sets up the Hono app, registers middleware, and defines the application's routes.
