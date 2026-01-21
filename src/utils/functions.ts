import { isNullish } from "@sapphire/utilities";
import { extname } from "node:path";
import { Post } from "../types";

export function isObjectEmpty(obj: Record<string, any>) {
    return Object.keys(obj).length === 0;
}

export function onlyImagePosts(posts: Post[] | null) {
    if (isNullish(posts)) return [];

    return posts.filter(
        (post) =>
            post.image && //
            ![".gifv"].includes(extname(new URL(post.image).pathname)) &&
            [".jpg", ".png", ".gif", ".jpeg"].includes(extname(new URL(post.image).pathname))
    );
}

export function getNPosts<T>(arr: T[], picks: number): T[] {
    if (!Array.isArray(arr)) throw new Error("getNPosts() expects an array as a parameter.");

    if (typeof picks !== "number" || picks <= 0) return [];

    const shuffled = arr.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, picks);
}

