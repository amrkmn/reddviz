import { Reddit, StatusCode } from "../types";
import { FETCH_HEADERS } from "../utils/constants";

export async function makeRequest(url: string, token: string) {
    const res = await fetch(url, {
        headers: {
            authorization: `Bearer ${token}`,
            accept: "*/*",
            host: "oauth.reddit.com",
            "cache-control": "no-cache",
            ...FETCH_HEADERS,
        },
    });

    if (res.status >= 400)
        return {
            body: null,
            statusCode: res.status ?? StatusCode.InternalServerError,
        };

    const data = (await res.json()) as Reddit.Response;
    return { body: data, statusCode: res.status };
}
