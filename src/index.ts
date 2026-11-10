#!/usr/bin/env -S bun run --bun

import { execSync } from "child_process";

// Colors
const VISIBLE_TEXT_COLOR = "#eeeeee";
const HIDDEN_TEXT_COLOR = "#888888";
const FOCUSED_UNDERLINE = "#FEEF69";

// Clickable slots (left, right, middle, scroll up, scroll down)
const SLOTS = {
  LEFT: 1,   // Switch tags
  RIGHT: 2,  // Tag control
  MIDDLE: 3, // Menu
  UP: 4,     // Scroll up
  DOWN: 5    // Scroll down
};

// Emit one clickable label with action codes
function emitLabel(name: string, marker: string, prev: string, next: string): string {
  const color = marker === "." ? HIDDEN_TEXT_COLOR : VISIBLE_TEXT_COLOR;
  let underline = "";
  
  if (marker === "+" || marker === "#") {
    underline = "%{+u}%{U" + FOCUSED_UNDERLINE + "}";
  }
  
  const uclose = marker === "+" || marker === "#" ? "%{-u}" : "";
  
  // Left click: switch to tag
  const leftAction = `%{A${SLOTS.LEFT}:herbstclient use ${name}:}`;
  // Right click: tag control
  const rightAction = `%{A${SLOTS.RIGHT}:herbstclient tag_${marker === "#" ? "toggle_floating" : "toggle"} ${name}:}`;
  // Middle click: menu (optional)
  const middleAction = `%{A${SLOTS.MIDDLE}:herbstclient ${name}:}`;
  // Scroll actions
  const upAction = `%{A${SLOTS.UP}:herbstclient use ${prev}:}`;
  const downAction = `%{A${SLOTS.DOWN}:herbstclient use ${next}:}`;
  
  const closeActions = "%{A}%{A}%{A}%{A}%{A}";
  
  return leftAction + rightAction + middleAction + upAction + downAction + 
         "%{F" + color + "}" + underline + " ${name} " + uclose + "%{F-}" + closeActions;
}

// Render all workspace labels
function renderLabels(): string {
  const line: string = execSync("herbstclient tag_status", { encoding: "utf-8" });
  const lines = line.trim().split(/\s+/);
  
  const names: string[] = [];
  const markers: string[] = [];
  
  // Parse tag status
  for (let i = 0; i < lines.length; i += 3) {
    if (lines[i]) {
      names.push(lines[i].slice(1));
      markers.push(lines[i].charAt(0));
    }
  }
  
  if (names.length === 0) return "";
  
  // Get focused tag position
  let posStr = execSync("herbstclient attr tags.focus.index", { encoding: "utf-8" }).trim();
  let pos = parseInt(posStr);
  
  if (isNaN(pos) || pos >= names.length) {
    pos = 0;
  }
  
  const n = names.length;
  const prevName = names[(pos - 1 + n) % n];
  const nextName = names[(pos + 1) % n];
  
  // Handle maximized tags (shadow base)
  const skip = new Array(names.length).fill(0);
  
  // Mark max shadows as skipped
  for (let i = 0; i < names.length; i++) {
    if (names[i].endsWith("-max")) {
      const base = names[i].slice(0, -4);
      for (let j = 0; j < names.length; j++) {
        if (names[j] === base) {
          skip[i] = 1;
          break;
        }
      }
    }
  }
  
  // Render labels
  const labels: string[] = [];
  
  for (let i = 0; i < names.length; i++) {
    if (skip[i]) continue;
    const name = names[i];
    
    // Find max shadow of this base
    let maxShadow = null;
    for (let j = 0; j < names.length; j++) {
      if (names[j] === name + "-max" && skip[j] === 1) {
        maxShadow = {
          name: names[j],
          marker: (pos === j) ? "#" : markers[j]
        };
        break;
      }
    }
    
    if (maxShadow) {
      // Render max shadow
      const maxMarker = (pos === i) ? "#" : markers[i];
      labels.push(emitLabel(maxShadow.name, maxShadow.marker, prevName, nextName));
      
      // Render base tag if user has scrolled onto it
      if (pos === i) {
        labels.push(emitLabel(name, markers[i], prevName, nextName));
      }
    } else {
      // Plain tag (no max shadow)
      labels.push(emitLabel(name, markers[i], prevName, nextName));
    }
  }
  
  return labels.join("  ") + "\n";
}

// Main render function
function render() {
  const output = renderLabels();
  if (output && output.trim()) {
    process.stdout.write(output);
  }
}

// Check if running as main script
if (process.argv[1].endsWith("/index.ts")) {
  // Single-shot mode for polybar exec
  render();
} else {
  // Long-running mode for polybar tail = true
  const line = execSync("herbstclient --idle", { encoding: "utf-8" });
  render();
  
  while (true) {
    const newLine = execSync("herbstclient --idle", { encoding: "utf-8" });
    if (newLine !== line) {
      render();
    }
  }
}
