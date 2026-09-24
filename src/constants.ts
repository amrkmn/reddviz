import { version } from "../package.json";

export const SUBREDDITS = [
    "memes",
    "me_irl",
    "dankmemes",
    "funny",
    "wholesomememes",
    "meirl",
    "holup",
    "memes_of_the_dank",
    "animemes",
];

// the window is a client-visible parameter and part of the cache key, so the
// values are a closed set rather than free text
export type TimeWindow = "day" | "week" | "month" | "year" | "all";

export const TIMES: TimeWindow[] = ["day", "week", "month", "year", "all"];

export const SUB_EXPIRE = 14400;

export const SUB_PREFIX_KEY = "subreddit;";

// an empty result is remembered only briefly: long enough to stop a typo or a
// probe from costing a reddit call on every request, short enough that a
// subreddit which just got its first posts shows up promptly
export const MISS_EXPIRE = 60;

export const MISS_PREFIX_KEY = "miss;";

// a cached listing this close to its TTL is refreshed in the background instead
// of making the next caller wait on reddit
export const SUB_REFRESH_WINDOW = 900;

export const ACCESS_TOKEN_KEY = "accessToken";

export const FETCH_HEADERS = {
    // reddit's API rules ask for a unique, descriptive UA with a contact point
    "User-Agent": `reddviz/${version} (+https://noz.one/ujol/reddviz)`,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.5",
};
