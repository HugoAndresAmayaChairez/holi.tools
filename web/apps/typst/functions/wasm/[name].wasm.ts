export interface Env {
  HOLI_WASM: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const base = String((params as any).name || "").replace(/^\/+/, "");
  if (!base) return new Response("Not found", { status: 404 });

  const key = `${base}.wasm`;
  const object = await env.HOLI_WASM.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-type", headers.get("content-type") || "application/wasm");

  // Cache for a week; if you update the object bytes under the same key, clients will refresh after expiry.
  headers.set("cache-control", "public, max-age=604800");

  return new Response(object.body, { headers });
};

export const onRequestHead: PagesFunction<Env> = async (ctx) => {
  const res = await onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
};
