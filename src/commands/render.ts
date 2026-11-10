// src/commands/render.ts — one-shot tag-label print (testing / debugging).
import { defineCommand } from "@bunli/core";
import { printTags } from "../lib/daemon";

export default defineCommand({
    name: "render" as const,
    description: "Render the tag label line once and exit",
    handler: async () => {
        await printTags();
    },
});
