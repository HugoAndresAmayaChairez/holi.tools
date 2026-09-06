# Spec: QR style v1

Status: active (implementation review pending ADR 0003 acceptance)
Owner: QR / Holi Local
Last updated: 2026-09-05

## Portable format

The existing QR saved-style envelope remains `{v: 1, app: "holi-qr", name?,
config, layers, frame?}`. `config` owns body/eye shapes, ECC L/M/Q/H, optional
mask (-1 or 0–7), and logo placement. `layers` uses version 1 and bg, paper,
ink and logo records. `frame` contains enabled, text, bg and fg; absence means
the default disabled frame. Units and defaults are the exported TypeScript
types and `defaultStyle` in `@holi/engine-qr`. Angles for ink gradients are
radians; image rotations are degrees. Unknown optional fields are preserved.

No encoded content, image values or card layer belongs in a portable snapshot.
Serializers recursively remove `image`; merges skip `image`, `__proto__`,
`constructor` and `prototype`. Validation rejects dangerous object keys, invalid
required records, invalid ECC/mask and non-finite numbers. A missing optional
field gets the existing browser default, not a new style version.

Browser saved styles keep the `holi-qr:styles:v1` key. Style links remain
`#s=<unpadded base64url of UTF-8 JSON>`; fragments are not sent in HTTP requests.
This is encoding, not encryption. A person or assistant with the link can read
the style.

## Rendering

Both consumers use `render_official_svg` through `@holi/engine-qr`. Local v1
supports solid colors, linear/radial gradients, Rust shapes, liquid effects,
ECC and mask, SVG and 128–4096 pixel PNG. It rejects enabled text frames,
noise, unsupported gradients or blending and non-default color opacity rather
than silently dropping browser effects. Images are not MCP inputs in v1.
No external image references or unvalidated colors reach the SVG renderer.
Content is at most 2,953 UTF-8 bytes; actual capacity depends on ECC. Rendering
does not guarantee scannability; users must scan the final image at intended
size and contrast before distribution.

## Test vectors

`vectors/qr-style-v1.json` protects default/Unicode style links, compatibility,
rejections and saved-style image stripping. Node WASM integration tests render
and decode SVG/PNG from the same QR core used by the web app.
