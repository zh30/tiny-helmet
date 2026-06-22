export interface CliIo {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

export function runCli(argv: string[], io?: CliIo): Promise<number>;
