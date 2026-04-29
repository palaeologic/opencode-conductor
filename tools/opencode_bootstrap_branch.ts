import { tool } from "@opencode-ai/plugin";
import { bootstrapBranchEngine } from "./_opencode_engine";

export default tool({
  description: "Generic: create per-branch handoff context if missing.",
  args: {
    projectKey: tool.schema.string().optional(),
    branchName: tool.schema.string().optional(),
    includePhases: tool.schema.boolean().optional(),
  },
  async execute(args, context) {
    if (!args.projectKey) {
      return JSON.stringify({
        applicable: false,
        reason: "missing_projectKey",
        recommended_next_step: "pass_projectKey",
      });
    }
    const result = await bootstrapBranchEngine(
      args.projectKey,
      { branchName: args.branchName, includePhases: args.includePhases },
      context,
    );
    return JSON.stringify(result);
  },
});

