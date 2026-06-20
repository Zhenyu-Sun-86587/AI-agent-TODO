# Frontend Style Structure

`demo.css` is kept as the compatibility shim imported by `main.tsx`. It should only import `index.css`.

`index.css` is the only formal global style entry. Root-level CSS files should stay limited to `index.css` and the `demo.css` compatibility shim.

Keep the `index.css` import order stable:

1. `core/tokens.css`
2. `core/base.css`
3. `layout/index.css`
4. `core/utilities.css`
5. `shared/index.css`
6. `dashboard/index.css`
7. `auth/index.css`
8. `tasks/index.css`
9. `calendar/index.css`
10. `ai/index.css`
11. `settings/index.css`
12. `overlays/index.css`

Domain `index.css` files such as `tasks/index.css`, `calendar/index.css`, `layout/index.css`, `shared/index.css`, `ai/index.css`, and `overlays/index.css` should stay as import lists. Put new rules in the closest leaf file instead of growing the entry.

Use `core/` for global tokens, base reset, and broad utilities.

Use `shared/` only for cross-page primitives: buttons, page headings, empty states, status badges, chart primitives, and global motion/reset rules.

`shared/surfaces.css`, `shared/controls.css`, and `shared/forms.css` are the source of truth for reusable panel, toolbar, button, search, select, empty-state, and form-control styling. Page/domain styles may compose these classes, but should not redefine their base borders, radii, shadows, heights, or focus states.

Use `layout/` for the app shell, sidebar, header, mobile navigation, workspace theme refinements, and shell-only responsive rules.

Use `overlays/` only for drawers, modals, toast, backdrop, and overlay-specific form controls.

Do not add `*overrides.css`, `theme-legacy.css`, or a final cascade layer. Move rules into the nearest owning leaf stylesheet and adjust import order only when ownership is clear.

`src/components/ai-chat/FloatingChat.css` is the one approved component-local stylesheet because the floating chat is an isolated, resizable overlay. Keep its selectors scoped under `.ai-chat-floating`; do not use it as a precedent for new global style entries.

Do not add new legacy catch-all files. If a style does not have a clear home, create a narrowly named leaf file under the relevant domain entry.
