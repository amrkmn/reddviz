import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HTTPError extends Error {
    constructor(
        public readonly code: ContentfulStatusCode,
        message: string,
    ) {
        super(message);
    }
}
