/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/** Per-icon modules (deep imports) ship JS only; default export is Hugeicons' SVG tuple data */
declare module "@hugeicons/core-free-icons/*" {
  const icon: readonly (readonly [
    string,
    Readonly<Record<string, string | number>>,
  ])[];
  export default icon;
}
