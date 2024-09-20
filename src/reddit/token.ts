import { Context } from "hono";
import { AccessTokenBody, Bindings } from "../types";
import { ACCESS_TOKEN_KEY, FETCH_HEADERS } from "../utils/constants";

export async function getToken(c: Context<{ Bindings: Bindings }>) {
    const kv = c.get("kv");
    const encodedCredential = btoa(`${c.env.REDDIT_CLIENT_ID}:${c.env.REDDIT_CLIENT_SECRET}`);

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
        headers: {
            ...FETCH_HEADERS,
            "content-type": "application/x-www-form-urlencoded",
            authorization: `Basic ${encodedCredential}`,
        },
    });

    if (res.status >= 400) return "";

    const data = (await res.json()) as AccessTokenBody;
    await kv.put(ACCESS_TOKEN_KEY, data.access_token, { expirationTtl: data.expires_in });

    return data.access_token;
}
