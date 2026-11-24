import { describe, it, expect } from "bun:test";
import { parseTagStatus, emitLabel, renderTags } from "../src/lib/render";

describe("parseTagStatus", () => {
    it("parses marker+name tokens", () => {
        const entries = parseTagStatus(":work .web !mail");
        expect(entries).toEqual([
            { marker: ":", name: "work" },
            { marker: ".", name: "web" },
            { marker: "!", name: "mail" },
        ]);
    });

    it("tolerates blank input (fail-soft)", () => {
        expect(parseTagStatus("")).toEqual([]);
        expect(parseTagStatus("\n")).toEqual([]);
    });
});

describe("emitLabel", () => {
    it("dims empty tags, no underline", () => {
        const out = emitLabel("web", ".", "work", "mail");
        expect(out).toContain("%{F#888888}");
        expect(out).not.toContain("%{+u}");
        expect(out).toContain("%{A1:herbstclient use web:}");
    });

    it("underlines the focused tag with gold", () => {
        for (const marker of ["+", "#"]) {
            const out = emitLabel("work", marker, "web", "mail");
            expect(out).toContain("%{+u}%{U#FEEF69}");
            expect(out).toContain("%{-u}");
        }
    });

    it("closes every action it opens", () => {
        const out = emitLabel("work", ":", "web", "mail");
        // A1 focus, A3 the tag menu, A4/A5 scroll
        expect(out.match(/%{A\d+:/g)).toHaveLength(4);
        expect(out).toContain("%{A3:polytags menu ");
        expect(out.match(/%{A}/g)).toHaveLength(3);
    });
});

describe("renderTags", () => {
    it("renders one label per plain tag, adjacent (no separator)", () => {
        const out = renderTags(parseTagStatus(":a .b :c"), 0);
        // focused (a) gets underline, empty (b) dimmed, populated (c) bright
        expect(out).toContain(" a ");
        expect(out).toContain(" b ");
        expect(out).toContain(" c ");
        expect(out).not.toContain("  "); // no double-space joins
        expect(out.endsWith("\n")).toBe(true);
    });

    it("falls back to index 0 on out-of-range focus", () => {
        const focused = renderTags(parseTagStatus(":a :b"), 0);
        const fallback = renderTags(parseTagStatus(":a :b"), 99);
        expect(fallback).toBe(focused);
    });

    it("renders scroll targets as wraparound prev/next", () => {
        const out = renderTags(parseTagStatus(":a :b :c"), 0);
        // every label scrolls to the focused tag's prev (c) and next (b)
        expect(out).toContain("%{A4:herbstclient use c:}");
        expect(out).toContain("%{A5:herbstclient use b:}");
    });

    it("shadows the base tag with its -max twin", () => {
        const out = renderTags(parseTagStatus(":work :work-max .web"), 1);
        // work-max renders in work's slot; the base work is NOT shown
        // (only while the base itself is focused)
        expect(out).toContain(" work-max ");
        expect(out).not.toMatch(/:web/);
        const labels = out.match(/%{A1:herbstclient use [^:]+:}/g);
        expect(labels).toEqual(["%{A1:herbstclient use work-max:}", "%{A1:herbstclient use web:}"]);
    });

    it("shows base beside max while the base is focused", () => {
        const out = renderTags(parseTagStatus(":work :work-max .web"), 0);
        const labels = out.match(/%{A1:herbstclient use [^:]+:}/g);
        expect(labels).toEqual([
            "%{A1:herbstclient use work-max:}",
            "%{A1:herbstclient use work:}",
            "%{A1:herbstclient use web:}",
        ]);
    });

    it("forces the # marker on the max label when it is focused", () => {
        const out = renderTags(parseTagStatus(":work :work-max .web"), 1);
        expect(out).toContain("%{+u}%{U#FEEF69}");
    });

    it("renders an orphan -max tag (base gone) plainly", () => {
        const out = renderTags(parseTagStatus(":work-max .web"), 0);
        const labels = out.match(/%{A1:herbstclient use [^:]+:}/g);
        expect(labels).toEqual(["%{A1:herbstclient use work-max:}", "%{A1:herbstclient use web:}"]);
    });

    it("renders a bare newline for an empty tag list", () => {
        expect(renderTags([], 0)).toBe("\n");
    });
});
