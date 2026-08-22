import type { StatusCode } from "hono/utils/http-status";

export class HTTPError extends Error {
    constructor(
        public readonly code: StatusCode,
        message: string,
    ) {
        super(message);
    }
}
