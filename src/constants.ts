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

// a miss is remembered only briefly: long enough to stop a typo or a probe
// from costing a reddit call on every request, short enough that a subreddit
// which just got its first posts shows up promptly. Deterministic failures
// (no such subreddit, private, locked) stay longer than an empty listing.
export const EMPTY_EXPIRE = 60;

export const NOTFOUND_EXPIRE = 300;

// a cached listing this close to its TTL is refreshed in the background instead
// of making the next caller wait on reddit. Kept small so only a few requests
// per TTL window can trigger a refresh.
export const SUB_REFRESH_WINDOW = 120;

// minimum gap between background refreshes of the same key, so a burst near
// expiry costs one reddit call rather than one per request
export const REFRESH_COOLDOWN = 60;

export const ACCESS_TOKEN_KEY = "accessToken";

export const FETCH_HEADERS = {
    // reddit's API rules ask for a unique, descriptive UA with a contact point
    "User-Agent": `reddviz/${version} (+https://noz.one/ujol/reddviz)`,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.5",
};
