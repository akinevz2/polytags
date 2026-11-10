// src/lib/daemon.ts — the bar-line heart: one print + the hook loop.
// Shared by the bare-daemon entry, `--once`, and the `render` command.
//
// Long-running (polybar `tail = true`): renders once, then re-renders
// on every hlwm hook. Single writer, no polling — byte-for-byte the
// ewmh_labels lifecycle.

import { spawn, execFile } from "node:child_process";
import { parseTagStatus, renderTags } from "./render";

const HC_ENV = (): NodeJS.ProcessEnv => ({
    ...process.env,
    DISPLAY: process.env.DISPLAY || "localhost:0.0",
});

/** Fail-soft herbstclient: empty stdout / NaN on any failure. */
async function hc(...args: string[]): Promise<string> {
    try {
        return await new Promise<string>((resolve, reject) => {
            execFile("herbstclient", args, { env: HC_ENV() }, (err, stdout) => {
                if (err) reject(err);
                else resolve(stdout);
            });
        });
    } catch {
        return "";
    }
}

export async function printTags(): Promise<void> {
    const entries = parseTagStatus(await hc("tag_status"));
    let pos = Number.parseInt((await hc("attr", "tags.focus.index")).trim(), 10);
    if (Number.isNaN(pos)) pos = 0;
    process.stdout.write(renderTags(entries, pos));
}

/**
 * The polybar contract: render the label line, then re-render on every
 * hook from `herbstclient --idle`. quit_panel/reload terminate us; the
 * stream ending (hlwm gone) exits too — the bash while-loop EOF path.
 */
export function runDaemon(): void {
    void printTags();
    const child = spawn("herbstclient", ["--idle"], {
        env: HC_ENV(),
        stdio: ["ignore", "pipe", "ignore"],
    });
    let buf = "";
    child.stdout.on("data", (chunk) => {
        buf += chunk.toString();
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
            const hook = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!hook) continue;
            if (hook === "quit_panel" || hook === "reload") {
                child.kill();
                process.exit(0);
            }
            void printTags();
        }
    });
    child.on("error", () => process.exit(1)); // herbstclient missing/unreachable
    child.on("exit", () => process.exit(0));
}
