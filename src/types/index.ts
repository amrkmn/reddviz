declare module "hono" {
    interface ContextVariableMap {
        kv: KVNamespace;
    }
}

export type Bindings = {
    REDDIT_CLIENT_ID: string;
    REDDIT_CLIENT_SECRET: string;
    REDDVIZ_KV: KVNamespace;
};


export * from "./gimme";
export * from "./reddit";
export * from "./status-code";
