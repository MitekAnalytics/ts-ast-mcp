import ts from "typescript";
import path from "node:path";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseFile, isExported, isArrowOrFunctionExpr, listTsFiles, getLineRange } from "../parse.js";
import { textResult, errorResult } from "../format.js";

interface UnexportedSymbol {
  name: string;
  kind: string;
  file: string;
  line: number;
}

function collectUnexportedSymbols(sourceFile: ts.SourceFile, filePath: string): UnexportedSymbol[] {
  const symbols: UnexportedSymbol[] = [];

  function visit(node: ts.Node) {
    if (isExported(node)) return; // Skip exported symbols

    if (ts.isFunctionDeclaration(node) && node.name) {
      const [line] = getLineRange(sourceFile, node);
      symbols.push({ name: node.name.getText(sourceFile), kind: "function", file: filePath, line });
    }
    if (ts.isClassDeclaration(node) && node.name) {
      const [line] = getLineRange(sourceFile, node);
      symbols.push({ name: node.name.getText(sourceFile), kind: "class", file: filePath, line });
    }
    if (ts.isInterfaceDeclaration(node)) {
      const [line] = getLineRange(sourceFile, node);
      symbols.push({ name: node.name.getText(sourceFile), kind: "interface", file: filePath, line });
    }
    if (ts.isTypeAliasDeclaration(node)) {
      const [line] = getLineRange(sourceFile, node);
      symbols.push({ name: node.name.getText(sourceFile), kind: "type", file: filePath, line });
    }
    if (ts.isEnumDeclaration(node)) {
      const [line] = getLineRange(sourceFile, node);
      symbols.push({ name: node.name.getText(sourceFile), kind: "enum", file: filePath, line });
    }
    if (ts.isVariableStatement(node) && !isExported(node)) {
      for (const decl of node.declarationList.declarations) {
        const name = decl.name.getText(sourceFile);
        const kind = isArrowOrFunctionExpr(decl) ? "function" : "variable";
        const [line] = getLineRange(sourceFile, node);
        symbols.push({ name, kind, file: filePath, line });
      }
    }
  }

  ts.forEachChild(sourceFile, visit);
  return symbols;
}

function collectAllIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const ids = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      ids.add(node.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return ids;
}

export function register(server: McpServer) {
  server.tool(
    "dead_code",
    "Finds unreferenced unexported symbols (functions, types, variables) within a directory",
    {
      path: z.string().describe("Absolute path to the directory"),
      include_tests: z.boolean().optional().default(false).describe("Include test files (default: false)"),
    },
    async ({ path: dirPath, include_tests }) => {
      try {
        let files = listTsFiles(dirPath, true);
        if (!include_tests) {
          files = files.filter(f => !f.includes(".test.") && !f.includes(".spec.") && !f.includes("__tests__"));
        }

        if (files.length === 0) return textResult(`No TypeScript/JavaScript files found in ${dirPath}.`);

        // Collect all unexported symbols and all identifier references
        const allSymbols: UnexportedSymbol[] = [];
        const allIdentifiers = new Set<string>();

        for (const file of files) {
          const sf = parseFile(file);
          allSymbols.push(...collectUnexportedSymbols(sf, file));
          for (const id of collectAllIdentifiers(sf)) {
            allIdentifiers.add(id);
          }
        }

        // A symbol is "dead" if its name only appears once across all files
        // (its own declaration). We count occurrences per file to be more accurate.
        const dead: UnexportedSymbol[] = [];
        for (const sym of allSymbols) {
          let refCount = 0;
          for (const file of files) {
            if (file === sym.file) continue; // Skip the declaring file for cross-file refs
            const sf = parseFile(file);
            const ids = collectAllIdentifiers(sf);
            if (ids.has(sym.name)) refCount++;
          }
          // Also check within the same file for usages beyond declaration
          const sf = parseFile(sym.file);
          let selfRefs = 0;
          function countSelfRefs(node: ts.Node) {
            if (ts.isIdentifier(node) && node.getText(sf) === sym.name) {
              selfRefs++;
            }
            ts.forEachChild(node, countSelfRefs);
          }
          ts.forEachChild(sf, countSelfRefs);

          // If the name appears only once (its declaration) in own file and zero times elsewhere
          if (refCount === 0 && selfRefs <= 1) {
            dead.push(sym);
          }
        }

        if (dead.length === 0) return textResult(`No dead code found in ${dirPath}.`);

        const lines = [`Dead code in ${dirPath} (${dead.length} unreferenced symbols):`, ""];
        for (const d of dead) {
          const rel = path.relative(dirPath, d.file);
          lines.push(`  ${d.kind} ${d.name} [${rel}:${d.line}]`);
        }
        return textResult(lines.join("\n"));
      } catch (e) {
        return errorResult(`Failed to find dead code: ${(e as Error).message}`);
      }
    },
  );
}
