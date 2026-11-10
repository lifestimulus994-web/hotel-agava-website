import { createHandler } from './worker.mjs';

Deno.serve(createHandler((name: string) => Deno.env.get(name)));
