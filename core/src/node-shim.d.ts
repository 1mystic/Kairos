// Minimal typings for the few node APIs used by tests (core has no @types/node).
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function readdirSync(path: string | URL): string[];
}
interface ImportMeta {
  url: string;
}
