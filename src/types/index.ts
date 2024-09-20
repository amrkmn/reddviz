declare module "hono" {
    interface ContextVariableMap {
        kv: KVNamespace;
    }
}

export type Bindings = {
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    REDDIT_CLIENT_ID: string;
    REDDIT_CLIENT_SECRET: string;
    REDDVIZ_KV: KVNamespace;
};

export * from "./gimme";
export * from "./reddit";
export * from "./status-code";
