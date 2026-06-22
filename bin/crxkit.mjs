#!/usr/bin/env node

import { runCli } from '../scripts/lib/cli.mjs';

const exitCode = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
});

process.exitCode = exitCode;
