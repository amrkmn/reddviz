import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { trimTrailingSlash } from "hono/trailing-slash";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPError } from "./error";
import { gimme, home } from "./handler";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const kv = createMiddleware<{ Bindings: CloudflareBindings }>(
    async (c, next) => {
        c.set("kv", c.env.REDDVIZ_KV);
        await next();
    },
);

app.use(trimTrailingSlash());
app.use(kv);

app.onError((err, c) => {
    if (!(err instanceof HTTPError)) {
        return c.json(
            {
                success: false,
                message: "internal server error, please try again later",
            },
            500,
        );
    }
    return c.json(
        { success: false, message: err.message },
        err.code as ContentfulStatusCode,
    );
});

app.route("/", home);
app.route("/gimme", gimme);

export default app;
