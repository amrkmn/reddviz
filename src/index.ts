import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { trimTrailingSlash } from "hono/trailing-slash";
import { version } from "../package.json";
import { HTTPError } from "./error";
import { gimme } from "./gimme";
import { home } from "./home";

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
        console.error(err);
        return c.json(
            {
                success: false,
                message: "internal server error, please try again later",
            },
            500,
        );
    }
    return c.json({ success: false, message: err.message }, err.code);
});

app.route("/", home);
app.route("/gimme", gimme);

// deliberately makes no reddit call: an uptime check should be able to tell a
// broken worker apart from a broken reddit
app.get("/health", (c) => c.json({ status: "ok", version }));

export default app;
