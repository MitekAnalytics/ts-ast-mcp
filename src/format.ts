// ── Shared types ────────────────────────────────────────────────────────

export interface FileSymbol {
  name: string;
  kind: string;
  exported: boolean;
  line: number;
  endLine: number;
  signature?: string;
}

export interface Smell {
  kind: string;
  location: string;
  message: string;
}

export interface ErrorFinding {
  kind: string;
  location: string;
  message: string;
}

export interface ComplexityResult {
  name: string;
  complexity: number;
  line: number;
}

export interface DiffEntry {
  kind: "added" | "removed" | "modified";
  symbol: string;
  detail?: string;
}

// ── MCP response helpers ────────────────────────────────────────────────

export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

// ── Formatters ──────────────────────────────────────────────────────────

export function formatSymbols(symbols: FileSymbol[], filePath?: string): string {
  const header = filePath ? `File: ${filePath}\n` : "";
  if (symbols.length === 0) return header + "No symbols found.";

  const grouped = new Map<string, FileSymbol[]>();
  for (const sym of symbols) {
    const list = grouped.get(sym.kind) ?? [];
    list.push(sym);
    grouped.set(sym.kind, list);
  }

  const sections: string[] = [];
  if (header) sections.push(header);

  for (const [kind, items] of grouped) {
    sections.push(`${kind}:`);
    for (const item of items) {
      const exp = item.exported ? " (exported)" : "";
      const sig = item.signature ? ` - ${item.signature}` : "";
      sections.push(`  ${item.name}${exp} [Lines ${item.line}-${item.endLine}]${sig}`);
    }
  }

  return sections.join("\n");
}

export function formatSmells(smells: Smell[], filePath: string): string {
  if (smells.length === 0) return `No code smells found in ${filePath}.`;
  const lines = [`Code smells in ${filePath}:`, ""];
  for (const s of smells) {
    lines.push(`[${s.kind}] ${s.location}: ${s.message}`);
  }
  return lines.join("\n");
}

export function formatErrors(errors: ErrorFinding[], filePath: string): string {
  if (errors.length === 0) return `No error patterns found in ${filePath}.`;
  const lines = [`Error patterns in ${filePath}:`, ""];
  for (const e of errors) {
    lines.push(`[${e.kind}] ${e.location}: ${e.message}`);
  }
  return lines.join("\n");
}

export function formatComplexity(results: ComplexityResult[], filePath: string): string {
  if (results.length === 0) return `No functions found in ${filePath}.`;
  const lines = [`Cyclomatic complexity for ${filePath}:`, ""];
  for (const r of results) {
    lines.push(`  ${r.name} (line ${r.line}): ${r.complexity}`);
  }
  return lines.join("\n");
}

export function formatDiff(entries: DiffEntry[], oldPath: string, newPath: string): string {
  if (entries.length === 0) return `No structural differences between ${oldPath} and ${newPath}.`;
  const lines = [`Structural diff: ${oldPath} -> ${newPath}`, ""];
  for (const e of entries) {
    const prefix = e.kind === "added" ? "+" : e.kind === "removed" ? "-" : "~";
    const detail = e.detail ? ` (${e.detail})` : "";
    lines.push(`${prefix} ${e.symbol}${detail}`);
  }
  return lines.join("\n");
}
