import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    const response = await next();

    // Add COOP/COEP headers for SharedArrayBuffer support (required for OPFS)
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return response;
});
