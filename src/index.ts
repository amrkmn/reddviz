import { Hono } from "hono";
import { HTTPError } from "./middleware/error";
import { createMiddleware } from "hono/factory";
import { trimTrailingSlash } from "hono/trailing-slash";
import { gimme, home } from "./handler";
import { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

const kv = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const kv = c.env.REDDVIZ_KV;
    c.set("kv", kv);
    await next();
});

app.use(trimTrailingSlash());
app.use(kv);

app.onError((err, c) => {
    if (err instanceof HTTPError) {
        c.status(err.code);
        return c.json({
            success: false,
            message: err.message,
        });
    }

    c.status(500);
    return c.json({
        success: false,
        message: "Internal Server Error",
    });
});

app.route("/", home);
app.route("/gimme", gimme);

export default app;
