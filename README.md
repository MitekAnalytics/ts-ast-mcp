# ts-ast-mcp

MCP server for surgical TypeScript/JavaScript AST analysis. Provides 20 tools that extract exactly what you need from source files - a single function body, type definition, or call graph - without reading entire files.

Built as the TypeScript counterpart to [go-ast-mcp](https://github.com/aspect-build/go-ast-mcp).

## Why

LLMs waste tokens reading 200-800 line files when they only need one function or type. This server gives Claude (or any MCP client) precise extraction tools that return only what's needed.

## Setup

### Claude Code (recommended)

Add to your project's `.mcp.json` - no local clone needed:

```json
{
  "mcpServers": {
    "ts-ast": {
      "command": "npx",
      "args": ["-y", "github:MitekAnalytics/ts-ast-mcp"]
    }
  }
}
```

Restart Claude Code. The 20 tools appear automatically.

`npx` fetches the repo, runs `prepare` (which builds), and starts the server. First run takes a few seconds; subsequent runs use the npx cache.

### Local install (for development)

```bash
git clone https://github.com/MitekAnalytics/ts-ast-mcp.git
cd ts-ast-mcp
npm install    # prepare script builds automatically
```

Then reference the local build in `.mcp.json`:

```json
{
  "mcpServers": {
    "ts-ast": {
      "command": "node",
      "args": ["/path/to/ts-ast-mcp/dist/index.js"]
    }
  }
}
```

### Any MCP client

The server uses stdio transport. Send JSON-RPC over stdin:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | npx -y github:MitekAnalytics/ts-ast-mcp
```

## Tools

### Structure

| Tool | What it does |
|---|---|
| `analyze_file` | File summary - all classes, interfaces, types, enums, functions |
| `analyze_package` | Directory-level aggregation of all TS/JS files |
| `list_functions` | All functions/methods with signatures and `[Lines N-M]` |
| `get_function_body` | Extract one function by name (supports `Class.method`) |
| `list_methods` | Methods of a specific class |

### Types & Declarations

| Tool | What it does |
|---|---|
| `get_type_definition` | Full source of an interface, type alias, class, or enum |
| `list_declarations` | Module-level const/let/var with types |
| `list_exports` | All exported symbols with kind (function, class, type, re-export) |
| `list_imports` | All import statements with bindings and module paths |

### Navigation

| Tool | What it does |
|---|---|
| `find_usages` | All occurrences of an identifier in a file with context |
| `find_node_at_position` | AST node at a specific line:column |
| `get_doc` | JSDoc/TSDoc comments for a symbol |

### Analysis

| Tool | What it does |
|---|---|
| `call_graph` | Mermaid flowchart of function calls (file or package scope) |
| `get_callers` | Reverse call graph - who calls this function? |
| `code_complexity` | Cyclomatic complexity per function |
| `diff_ast` | Structural diff between two file versions |

### Quality

| Tool | What it does |
|---|---|
| `code_smells` | Long functions, deep nesting, god classes, `any` casts, `!` assertions |
| `find_errors` | Floating promises, empty catches, double type assertions |
| `dead_code` | Unreferenced unexported symbols across a directory |
| `find_implementations` | Classes implementing an interface (explicit or structural) |

## How It Works

Two-tier parsing keeps things fast:

- **Syntactic tier** - `ts.createSourceFile()` parses a single file in <5ms. Used by most tools.
- **Semantic tier** - `ts.createProgram()` loads from the nearest tsconfig for cross-file analysis. Cached by tsconfig path + mtime. Used by `dead_code`, `find_implementations`, and package-scope call graphs.

Arrow functions (`const foo = () => {}`) are treated as first-class functions throughout - they appear in `list_functions`, `get_function_body`, `code_complexity`, etc.

All output is plain text, not JSON. Matches the go-ast-mcp convention.

## Examples

```
> analyze_file { path: "/src/components/Dashboard.tsx" }

File: /src/components/Dashboard.tsx

Classes:
Functions:
  Dashboard (exported) [Lines 15-89] - (): JSX.Element
  useDashboardData (exported) [Lines 91-120] - (): DashboardState
Interfaces:
  DashboardProps (exported) [Lines 5-9]
Types:
  DashboardState (exported) [Lines 11-13]
```

```
> get_function_body { path: "/src/hooks/useApiQuery.ts", name: "useApiQuery" }

useApiQuery [Lines 25-67]:

export function useApiQuery<T>(fetcher: ...): UseApiQueryResult<T> {
  ...
}
```

```
> code_smells { path: "/src/components/BigComponent.tsx" }

Code smells in /src/components/BigComponent.tsx:

[long_function] renderTable (line 45): 78 lines exceeds threshold of 50
[any_cast] line 102: "as any" cast: data as any
[non_null_assertion] line 156: Non-null assertion: user!.email
```
