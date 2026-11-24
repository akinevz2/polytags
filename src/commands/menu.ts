// src/commands/menu.ts — the TAG MENU: the right-click surface on the
// polybar tagspace labels (the A3 binding in render.ts). A themed rofi
// list over the clicked tagspace:
//
//   polytags menu <tag>
//
//   focus this tagspace      herbstclient use <tag>
//   add tagspace             the smallest free numeric, then enter it
//   close this tagspace      the clients move to the first occupied one
//                            (the last tagspace never dies; hlwm moves
//                            the view itself when the focused one goes)
//   app launcher             polyframes launch (the rofi drun/run)
//
// The entries are ACTIONS, not arguments — each one executes and the
// menu closes. Escape cancels (nothing runs).
import { defineCommand } from "@bunli/core";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

interface MenuResult {
    rc: number;
    selection: string;
}

function spawnEnv(): Record<string, string> {
    const { WAYLAND_DISPLAY: _strip, ...rest } = process.env;
    return { ...rest, DISPLAY: process.env.DISPLAY || "localhost:0.0" };
}

function themePath(): string | null {
    const input = `${process.env.HOME}/.config/rofi/input.rasi`;
    if (existsSync(input)) return input;
    const palette = `${process.env.HOME}/.config/rofi/command.rasi`;
    return existsSync(palette) ? palette : null;
}

function menu(prompt: string, entries: readonly string[]): MenuResult {
    const theme = themePath();
    const argv = [
        "rofi", "-dmenu", "-i", "-p", prompt,
        ...(theme ? ["-theme", theme] : []),
        "-no-auto-select",
    ];
    try {
        const res = Bun.spawnSync(argv, {
            input: `${entries.join("\n")}\n`,
            env: spawnEnv(),
        });
        return {
            rc: res.status ?? 1,
            selection: res.stdout.toString().trim(),
        };
    } catch {
        return { rc: 1, selection: "" };
    }
}

/** the smallest free numeric tagspace name (the tags from tag_status). */
function freeNumeric(tags: readonly string[]): string {
    const taken = new Set(tags);
    for (let i = 1; ; i += 1) {
        if (!taken.has(String(i))) return String(i);
    }
}

function tagStatusTags(): string[] {
    const r = Bun.spawnSync(["herbstclient", "tag_status"], { env: spawnEnv() });
    return r.stdout.toString()
        .split("\t")
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
        .map((s) => s.slice(1));
}

function shq(s: string): string {
    return `'${s.replaceAll("'", `'\\''`)}'`;
}

export default defineCommand({
    name: "menu" as never,
    description: "the tag menu: focus / add / close / the app launcher",
    handler: async ({ positional }) => {
        const tag = positional[0] ?? "";
        if (tag === "") {
            process.stderr.write("polytags menu: a tag name is required\n");
            process.exit(2);
        }
        const tags = tagStatusTags();
        const numeric = freeNumeric(tags);
        const entries = [
            `focus ${tag}`,
            `add tagspace (${numeric})`,
            `close this tagspace (${tag})`,
            "app launcher",
        ];
        const { rc, selection } = menu(`tagspace: ${tag}`, entries);
        if (rc !== 0 || selection === "") process.exit(0); // Escape: nothing runs
        if (selection.startsWith("focus ")) {
            Bun.spawnSync(["herbstclient", "use", tag], { env: spawnEnv() });
        } else if (selection.startsWith("add ")) {
            Bun.spawnSync(["herbstclient", "add", numeric], { env: spawnEnv() });
            Bun.spawnSync(["herbstclient", "use", numeric], { env: spawnEnv() });
        } else if (selection.startsWith("close this")) {
            // the clients move to the first other tagspace; the last
            // tagspace never dies
            const others = tags.filter((t) => t !== tag);
            if (others.length === 0) {
                Bun.spawnSync(["dunstify", "polytags", `the last tagspace (${tag}) never dies`], {
                    env: spawnEnv(),
                });
                process.exit(0);
            }
            Bun.spawnSync(["herbstclient", "merge_tag", tag, others[0]], { env: spawnEnv() });
        } else if (selection === "app launcher") {
            Bun.spawnSync(["herbctl", "launch"], { env: spawnEnv(), stdio: "ignore" });
        }
        process.exit(0);
    },
});
