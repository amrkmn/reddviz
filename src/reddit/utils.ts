import { Nullish, isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { decode } from "html-entities";
import { Reddit } from "../types";
import { isObjectEmpty } from "../utils/functions";

export function getClearPreviewGifs(post: Reddit.PostDataElement) {
    let links: string[] = [];
    const preview = post.preview;

    if (isNullish(preview)) return links;
    else if (isNullishOrEmpty(preview.images)) return links;
    else if (isObjectEmpty(preview.images[0].variants)) return links;

    const gif = Reflect.get(preview.images[0].variants, "gif") as Omit<Reddit.Image, "id" | "variants"> | Nullish;

    if (isNullish(gif)) return links;

    for (let { url } of gif.resolutions) links.push(decode(url));
    links.push(decode(gif.source.url));

    return links;
}

export function getCleanPreviewImages(post: Reddit.PostDataElement): string[] {
    let links: string[] = [];
    const preview = post.preview;

    if (isNullish(preview)) return links;
    else if (isNullishOrEmpty(preview.images)) return links;
    else if (isNullishOrEmpty(preview.images[0].resolutions)) return links;

    let images = preview.images[0];

    for (let image of images.resolutions) links.push(decode(image.url));
    links.push(decode(images.source.url));

    return links;
}
