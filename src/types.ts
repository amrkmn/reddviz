declare module "hono" {
    interface ContextVariableMap {
        kv: KVNamespace;
    }
}

export interface Post {
    id: string;
    title: string;
    subreddit: string;
    author: string;
    postLink: string;
    thumbnail: string;
    image: string;
    nsfw: boolean;
    spoiler: boolean;
    createdUtc: number;
    upvotes: number;
    comments: number;
    upvoteRatio: number;
    preview: {
        images: string[];
        gifs: string[];
    };
}

export interface RedditListing {
    data?: {
        children?: {
            data: RedditPostData;
        }[];
    };
}

interface RedditImage {
    source?: { url: string };
    resolutions?: { url: string }[];
    variants?: { gif?: RedditImage };
}

export interface RedditPostData {
    id: string;
    title: string;
    subreddit: string;
    author: string;
    permalink: string;
    thumbnail: string;
    url: string;
    over_18: boolean;
    spoiler: boolean;
    ups: number;
    num_comments: number;
    created_utc: number;
    upvote_ratio: number;
    preview?: { images?: RedditImage[] };
}
