#!/usr/bin/env bun
// src/index.ts — polytags CLI (bunli 0.8.x + Bun 1.4+).
//
// Bare invocation is polybar's contract: `exec = ~/.local/bin/polytags`
// gets NO arguments and must start the label daemon (one render + a
// re-render per hlwm hook). That branch is handled BEFORE bunli's arg
// parsing, which would otherwise show help on empty argv.
//
// Everything else goes through the bunli command tree; run
// `polytags --help` for the full surface.

import { createCLI } from "@bunli/core";
import pkg from "../package.json";

import { runDaemon, printTags } from "./lib/daemon";
import { default as renderCommand } from "./commands/render";

async function main(): Promise<void> {
    const argv = process.argv.slice(2);

    // Polybar invokes the binary with no args. `--once` is the
    // shell-era one-shot flag.
    if (argv.length === 0) {
        runDaemon();
        return;
    }
    if (argv[0] === "--once") {
        await printTags();
        return;
    }

    // bunli's createCLI() always auto-imports bunli.config.ts from the
    // current directory. A compiled binary cannot runtime-resolve the
    // config's @bunli/core import (node_modules are not carried in the
    // executable), so move out of the cwd for it and rely on the inline
    // override. The generated-types import inside createCLI() is
    // non-fatal, so skipping discovery is safe.
    if (!/(^|\/)bun(\.[a-z0-9]+)?$/.test(process.execPath ?? "")) {
        process.chdir("/");
    }

    const cli = await createCLI({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
    });

    cli.command(renderCommand);

    await cli.run();
}

main().catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
    process.exitCode = 1;
});
