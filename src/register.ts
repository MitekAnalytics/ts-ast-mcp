import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { register as registerAnalyze } from "./tools/analyze.js";
import { register as registerFunctions } from "./tools/functions.js";
import { register as registerTypes } from "./tools/types.js";
import { register as registerImports } from "./tools/imports.js";
import { register as registerUsages } from "./tools/usages.js";
import { register as registerDoc } from "./tools/doc.js";
import { register as registerCallgraph } from "./tools/callgraph.js";
import { register as registerComplexity } from "./tools/complexity.js";
import { register as registerDiff } from "./tools/diff.js";
import { register as registerSmells } from "./tools/smells.js";
import { register as registerErrors } from "./tools/errors.js";
import { register as registerDeadcode } from "./tools/deadcode.js";
import { register as registerInterface } from "./tools/interface.js";

export function registerTools(server: McpServer) {
  registerAnalyze(server);
  registerFunctions(server);
  registerTypes(server);
  registerImports(server);
  registerUsages(server);
  registerDoc(server);
  registerCallgraph(server);
  registerComplexity(server);
  registerDiff(server);
  registerSmells(server);
  registerErrors(server);
  registerDeadcode(server);
  registerInterface(server);
}
