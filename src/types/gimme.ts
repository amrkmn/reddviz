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
