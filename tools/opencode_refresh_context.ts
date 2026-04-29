import { tool } from "@opencode-ai/plugin";
import { refreshContextEngine } from "./_opencode_engine";

export default tool({
  description: "Generic: summarize git delta and recommend re-read files.",
  args: {
    projectKey: tool.schema.string().optional(),
    refreshMode: tool.schema.union([tool.schema.literal("fast"), tool.schema.literal("full")]).optional(),
    maxCommits: tool.schema.number().optional(),
    checkpointCommit: tool.schema.string().optional(),
    writeLog: tool.schema.boolean().optional(),
  },
  async execute(args, context) {
    if (!args.projectKey) {
      return JSON.stringify({
        applicable: false,
        reason: "missing_projectKey",
        recommended_next_step: "pass_projectKey",
      });
    }
    const result = await refreshContextEngine(
      args.projectKey,
      {
        refreshMode: args.refreshMode,
        maxCommits: args.maxCommits,
        checkpointCommit: args.checkpointCommit,
        writeLog: args.writeLog,
      },
      context,
    );
    return JSON.stringify(result);
  },
});

