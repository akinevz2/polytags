// src/lib/render.ts — the pure tag-label renderer: an exact port of
// ewmh_labels' render_labels() (the polybar package's bash script).
// No I/O here — parse and style are testable against recorded
// tag_status lines.

export const COLORS = {
    visible: "#eeeeee",
    hidden: "#888888",
    focusedUnderline: "#FEEF69",
} as const;

export interface TagEntry {
    name: string;
    marker: string;
}

/**
 * Parse one `herbstclient tag_status` line: whitespace-separated
 * tokens, each `marker + name` ('.' empty, ':' occupied, '!' urgent,
 * '+' / '#' focused). Fail-soft: blank input yields no entries.
 */
export function parseTagStatus(line: string): TagEntry[] {
    const entries: TagEntry[] = [];
    for (const token of line.trim().split(/\s+/)) {
        if (!token) continue;
        entries.push({ marker: token.slice(0, 1), name: token.slice(1) });
    }
    return entries;
}

/**
 * Emit one clickable label — byte-parity with ewmh_labels' emit_label:
 * A1 switches to the tag, A4/A5 scroll prev/next; populated workspaces
 * bright, empty dimmed, focused gets the gold underline.
 */
export function emitLabel(name: string, marker: string, prev: string, next: string): string {
    const color = marker === "." ? COLORS.hidden : COLORS.visible;
    const focused = marker === "+" || marker === "#";
    const uopen = focused ? `%{+u}%{U${COLORS.focusedUnderline}}` : "";
    const uclose = focused ? "%{-u}" : "";
    return (
        `%{A1:herbstclient use ${name}:}` +
        `%{A4:herbstclient use ${prev}:}` +
        `%{A5:herbstclient use ${next}:}` +
        `%{F${color}}${uopen} ${name} ${uclose}%{F-}%{A}%{A}%{A}`
    );
}

/**
 * The full label line — port of render_labels():
 *
 * A "<base>-max" tag shadows its base: it renders in the base's slot,
 * and the base itself is only shown — side by side, right of the max
 * label — while the base is the focused tag. The max tag carries the
 * focused marker in tag_status only when it IS the focused tag; the
 * underline marker is forced in that case. A max tag whose base tag no
 * longer exists renders plain so it never disappears.
 *
 * `pos` is the focused tag index (tags.focus.index); out-of-range
 * falls back to 0 like the bash original.
 */
export function renderTags(entries: TagEntry[], pos: number): string {
    const names = entries.map((e) => e.name);
    const markers = entries.map((e) => e.marker);
    const n = names.length;
    if (n === 0) return "\n";

    if (!Number.isInteger(pos) || pos < 0 || pos >= n) pos = 0;
    const prevName = names[(pos - 1 + n) % n];
    const nextName = names[(pos + 1) % n];

    // First pass: max tags whose base exists render in the base's
    // slot — their own entries are skipped.
    const skip = new Array<boolean>(n).fill(false);
    for (let i = 0; i < n; i++) {
        if (names[i].endsWith("-max")) {
            const base = names[i].slice(0, -4);
            if (names.includes(base)) skip[i] = true;
        }
    }

    let out = "";
    for (let i = 0; i < n; i++) {
        if (skip[i]) continue;
        const name = names[i];

        // Find a max shadow of this base (if any) and render it in
        // the base's slot first.
        let shadowRendered = false;
        for (let j = 0; j < n; j++) {
            if (names[j] === `${name}-max` && skip[j]) {
                let m = markers[j];
                // The max tag carries the focused marker in
                // tag_status only when it is the focused tag;
                // force the underline marker in that case.
                if (pos === j) m = "#";
                out += emitLabel(names[j], m, prevName, nextName);
                // The base itself: only beside the max label while
                // the user has scrolled onto it.
                if (pos === i) out += emitLabel(name, markers[i], prevName, nextName);
                shadowRendered = true;
                break;
            }
        }

        // Plain tag (no max shadow, or a max tag whose base is gone):
        // render normally.
        if (!shadowRendered && !names.includes(`${name}-max`)) {
            out += emitLabel(name, markers[i], prevName, nextName);
        }
    }
    return out + "\n";
}
