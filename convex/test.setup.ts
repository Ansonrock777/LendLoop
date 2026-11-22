/// <reference types="vite/client" />
// Test-only: the Convex modules convex-test may load (lazily, by function path).
// Convex skips files with more than one dot in the name, so this file is never deployed.
export const modules = import.meta.glob("./**/*.*s");
