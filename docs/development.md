# Product development

## Before implementation

1. Confirm the product owner and behavior in `docs/product.md` and the app's
   local documentation.
2. Inspect the existing implementation and dirty working tree; current tested
   behavior has priority over stale prose.
3. Describe acceptance criteria in the issue/task or update a normative file in
   `spec/` when a shared contract changes.
4. Map input, memory, storage, network, provider, and recipient before designing
   any connected flow.

Do not create a parallel track directory. The task, tests, code, roadmap, and
decision records are enough.

## Reuse and product identity

Start from the existing product layout and `@holi/ui`. `ProductUtilityDock`
provides the shared Configuration → Versions → Privacy shell, including local
theme/language preferences, navigation, donation/support, the visible Shadow
Log, privacy facts, and keyboard behavior. Use its configuration slot only for
product context; keep domain panels, state, adapters, translations, and the
product palette in the app. Define both light and dark palette values through
the shared color tokens: the utility dock and stable glass surfaces inherit
those values. Component styles must not override an explicit Holi theme with an
ungated `prefers-color-scheme` rule.

Bundle public webfonts with the product build or use a local system stack. Do
not load fonts from Google Fonts, jsDelivr, or another third-party font CDN.

Each public tool may pair its palette with one quiet sketch detail. Use
`ProductCreature` for these decorative marks, keep them `aria-hidden`, and keep
their opacity low enough that they never compete with controls or copy. The
animal is a recognition cue, not a navigation label or required status icon.
Main owns the identity catalog and product landings; each tool still owns its
work surface and palette. Editorial categories may have a secondary symbol
(the Papers crane inside Labs) without becoming another product.

Promote a component only after two real consumers exist and domain assumptions
have been removed. Metadata's React inspector is an explicit exception; do not
copy React into a new app without a concrete need.

## Creating a product

1. Define its problem, primary user, data, local workflow, network actions,
   palette, and working surface.
2. Use `pnpm create-app <name>` to create the shell.
3. Implement one complete useful local flow.
4. Add storage and recovery without making remote state authoritative.
5. Complete privacy, languages, accessibility, SEO, empty/error states, and
   support/donation surfaces.
6. Set the package version and add a matching visible Shadow Log entry.
7. Add tests proportional to data-loss, protocol, or rendering risk.
8. Build, inspect desktop/mobile output, and deploy only after verification.

## Updating a product

1. Reproduce current behavior and protect existing local data formats.
2. Change a test or contract first when behavior changes.
3. Keep changes app-local unless sharing is already demonstrated.
4. Update privacy copy whenever storage, network, provider, or retention changes.
5. Synchronize package version, Shadow Log, public metadata, and app docs.
6. Build the app and every affected shared-package consumer.

## Languages

The ecosystem catalog includes English, Spanish, Chinese, Hindi, Arabic,
Bengali, and Portuguese, but an app publishes only fully translated locales.
Routes, menus, canonical URLs, `hreflang`, and sitemap must agree. Review RTL,
overflow, error copy, privacy, and Shadow Log text for every published locale.

As of the 2026-09-02 public-shell release, Main, Typst, QR, Metadata, User, and
the Labs library expose their public flows in all seven locales. Labs owns the
localized Papers collection; legacy QR paper URLs redirect to the corresponding
Labs reading. Their routes, menus, `hreflang`, and sitemaps advertise the same
complete editions.

## Definition of done

A release works in its primary, empty, error, and recovery states; preserves
existing local data; exposes truthful privacy behavior; is keyboard usable;
passes relevant tests/builds; shows the correct version and Shadow Log; and has
been checked on desktop and mobile before deployment.
