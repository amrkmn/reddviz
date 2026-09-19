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

export const TIMES = ["day", "week", "month", "year", "all"];
export const SUB_EXPIRE = 14400;
export const SUB_PREFIX_KEY = "subreddit;";
export const ACCESS_TOKEN_KEY = "accessToken";

export const FETCH_HEADERS = {
    // reddit's API rules ask for a unique, descriptive UA with a contact point
    "User-Agent": `reddviz/${version} (+https://noz.one/ujol/reddviz)`,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.5",
};
