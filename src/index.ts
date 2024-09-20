import { Hono } from "hono";
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

app.route("/", home);
app.route("/gimme", gimme);

export default app;
