import { StatusCode } from "hono/utils/http-status";

export class HTTPError extends Error {
    constructor(
        public readonly code: StatusCode,
        message?: string,
    ) {
        super(message);
    }
}

export const error = {
    InternalServerError: (message: string = "Internal Server Error"): HTTPError => new HTTPError(500, message),
    RateLimitExceeded: (message: string = "Rate Limit Exceeded"): HTTPError => new HTTPError(429, message),
    NotFound: (message: string = "Not Found"): HTTPError => new HTTPError(404, message),
    BadRequest: (message: string = "Bad Request"): HTTPError => new HTTPError(400, message),
};
