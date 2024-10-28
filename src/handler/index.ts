import { Hono } from "hono";
import { Bindings } from "../types";
import { gimme } from "./gimme";

const home = new Hono<{ Bindings: Bindings }>();

home.get("/", async (c) => {
    return c.text(
        "Welcome to ReddViz! For documentation and info go to https://github.com/AyTea14/ReddViz and if you want to use it, just add /gimme at the end of the url"
    );
});

export { gimme, home };
