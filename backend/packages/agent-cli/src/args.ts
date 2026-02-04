export type ParsedArgs = {
  command?: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { positionals: [], flags: {} };
  if (argv.length > 0) out.command = argv[0];

  for (let i = 1; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok === "--") {
      out.positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!tok.startsWith("--")) {
      out.positionals.push(tok);
      continue;
    }

    const eq = tok.indexOf("=");
    if (eq !== -1) {
      const k = tok.slice(2, eq);
      const v = tok.slice(eq + 1);
      out.flags[k] = v;
      continue;
    }

    const k = tok.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out.flags[k] = next;
      i++;
    } else {
      out.flags[k] = true;
    }
  }

  return out;
}

export function getFlagString(flags: Record<string, string | boolean>, name: string) {
  const v = flags[name];
  if (typeof v === "string") return v;
  return undefined;
}

export function getFlagBoolean(flags: Record<string, string | boolean>, name: string) {
  const v = flags[name];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return false;
}

export function getFlagNumber(flags: Record<string, string | boolean>, name: string) {
  const v = getFlagString(flags, name);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

