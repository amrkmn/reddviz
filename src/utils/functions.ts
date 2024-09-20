import { isNullish } from "@sapphire/utilities";
import { extname } from "node:path";
import { Post } from "../types";

export function isObjectEmpty(obj: Record<string, any>) {
    return Object.keys(obj).length === 0;
}
export function onlyImagePosts(posts: Post[] | null) {
    let imagePosts: Post[] = [];
    if (isNullish(posts)) return imagePosts;

    for (let post of posts) {
        let url = post.image;
        let ext = extname(new URL(url).pathname);
        if (
            ![".gifv"].includes(ext) &&
            [".jpg", ".png", ".gif", ".jpeg"].includes(ext) //
        )
            imagePosts.push(post);
    }

    return imagePosts;
}

export function getNPosts<T>(arr: Array<T>, picks: number): Array<T> {
    if (!Array.isArray(arr)) throw new Error("getNPosts() expect an array as parameter.");

    let rng = Math.random;
    if (typeof picks === "number" && picks > 1) {
        let len: number = arr.length,
            collection = arr.slice(),
            random: Array<T> = [],
            index = 0;

        while (picks && len) {
            index = Math.floor(rng() * len);
            random.push(collection[index]);
            collection.splice(index, 1);
            len -= 1;
            picks -= 1;
        }

        return random;
    }

    return [arr[Math.floor(rng() * arr.length)]];
}
