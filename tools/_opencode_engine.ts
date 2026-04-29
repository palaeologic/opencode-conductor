import fs from "fs/promises";
import os from "os";
import path from "path";

type JsonObject = Record<string, any>;

function homePath(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function normalizeSlashes(p: string): string {
  return p.replaceAll("\\", "/");
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function expandTemplate(template: string, vars: { projectKey?: string; branchName?: string }): string {
  let out = template;
  if (vars.projectKey) out = out.replaceAll("{projectKey}", vars.projectKey);
  if (vars.branchName) out = out.replaceAll("{branchName}", vars.branchName);
  return out;
}

async function loadDescriptor(projectKey: string): Promise<JsonObject> {
  const descriptorPath = path.join(os.homedir(), ".config", "opencode", "projects", projectKey, "descriptor.json");
  const text = await fs.readFile(descriptorPath, "utf8");
  const parsed = JSON.parse(text) as JsonObject;
  if (typeof parsed.projectRootPath === "string") parsed.projectRootPath = homePath(parsed.projectRootPath);
  if (typeof parsed.opencodeProjectRootPath === "string") {
    parsed.opencodeProjectRootPath = homePath(parsed.opencodeProjectRootPath);
  }
  return parsed;
}

function inferArea(descriptor: JsonObject, absPath: string): string {
  const p = normalizeSlashes(absPath);
  const areas = descriptor.areas ?? {};
  let best = "unknown";
  let bestLen = -1;
  for (const [name, def] of Object.entries<any>(areas)) {
    const prefix = normalizeSlashes(def.pathPrefix ?? "");
    if (!prefix) continue;
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|/)${escaped}($|/)`);
    if (re.test(p) && prefix.length > bestLen) {
      best = name;
      bestLen = prefix.length;
    }
  }
  return best;
}

function extractCheckpoint(logText: string, field: string): string | null {
  const re = new RegExp(`${field}:\\s*([0-9a-f]{7,40})`, "gi");
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(logText))) {
    // last match wins
  }
  return m?.[1] ?? null;
}

export async function bootstrapBranchEngine(
  projectKey: string,
  params: { branchName?: string; includePhases?: boolean } = {},
  context: any,
) {
  const descriptor = await loadDescriptor(projectKey);

  const repoRoot = normalizeSlashes((await Bun.$`git rev-parse --show-toplevel`.text()).trim());
  const projectRoot = normalizeSlashes(descriptor.projectRootPath ?? "");
  if (!repoRoot.endsWith(projectRoot) && repoRoot !== projectRoot) {
    return { applicable: false, reason: "workspace_not_in_project", repoRoot, expectedProjectRoot: projectRoot };
  }

  const branchName = params.branchName ?? (await Bun.$`git rev-parse --abbrev-ref HEAD`.text()).trim();
  if (!branchName || branchName === "HEAD") return { applicable: false, reason: "detached_head" };

  const headSha = (await Bun.$`git rev-parse HEAD`.text()).trim();
  const area = inferArea(descriptor, context.directory ?? repoRoot);

  const handoff = descriptor.branchHandoff ?? {};
  const branchDir = homePath(
    expandTemplate(handoff.contextDirTemplate ?? `~/.config/opencode/projects/${projectKey}/{branchName}`, {
      projectKey,
      branchName,
    }),
  );
  const mrFile = path.join(branchDir, handoff.mrFilename ?? "MERGE_REQUEST.md");
  const logFile = path.join(branchDir, handoff.logFilename ?? "LOG.md");
  const phasesFile = path.join(branchDir, handoff.phasesFilename ?? "PHASES.md");

  const templatesDir = homePath(
    expandTemplate(handoff.templatesDir ?? `~/.config/opencode/projects/${projectKey}/_templates/mr`, {
      projectKey,
      branchName,
    }),
  );

  await fs.mkdir(branchDir, { recursive: true });

  let createdMr = false;
  let createdLog = false;
  let createdPhases = false;

  try {
    await fs.access(mrFile);
  } catch {
    const tpl = await fs.readFile(path.join(templatesDir, handoff.mrTemplateFilename ?? "MERGE_REQUEST.md"), "utf8");
    await fs.writeFile(mrFile, tpl.replaceAll(handoff.mrBranchPlaceholder ?? "<branch-name>", branchName), "utf8");
    createdMr = true;
  }

  try {
    await fs.access(logFile);
  } catch {
    let tpl = await fs.readFile(path.join(templatesDir, handoff.logTemplateFilename ?? "LOG.md"), "utf8");
    tpl = tpl.replaceAll("<commit-sha>", headSha);
    tpl = tpl.replace(/##\s+\d{4}-\d{2}-\d{2}.*\n/, `## ${formatTimestamp(new Date())}\n`);
    tpl = tpl.replace(/^area:\s*.*$/m, `area: ${area === "unknown" ? "unknown" : area}`);
    await fs.writeFile(logFile, tpl, "utf8");
    createdLog = true;
  }

  if (params.includePhases) {
    try {
      await fs.access(phasesFile);
    } catch {
      try {
        const tpl = await fs.readFile(
          path.join(templatesDir, handoff.phasesTemplateFilename ?? "PHASES.md"),
          "utf8",
        );
        await fs.writeFile(phasesFile, tpl, "utf8");
        createdPhases = true;
      } catch {
        // Ignore missing phase template.
      }
    }
  }

  return {
    applicable: true,
    projectKey,
    branch: branchName,
    headCommit: headSha,
    mr_context_path: mrFile,
    log_context_path: logFile,
    phases_context_path: phasesFile,
    created: { mergeRequestFile: createdMr, logFile: createdLog, phasesFile: createdPhases },
  };
}

export async function refreshContextEngine(
  projectKey: string,
  args: { refreshMode?: "fast" | "full"; maxCommits?: number; checkpointCommit?: string; writeLog?: boolean } = {},
  context: any,
) {
  const descriptor = await loadDescriptor(projectKey);
  const repoRoot = normalizeSlashes((await Bun.$`git rev-parse --show-toplevel`.text()).trim());
  const projectRoot = normalizeSlashes(descriptor.projectRootPath ?? "");
  if (!repoRoot.endsWith(projectRoot) && repoRoot !== projectRoot) {
    return { applicable: false, reason: "workspace_not_in_project", repoRoot, expectedProjectRoot: projectRoot };
  }

  const branch = (await Bun.$`git rev-parse --abbrev-ref HEAD`.text()).trim();
  if (!branch || branch === "HEAD") return { applicable: false, reason: "detached_head" };
  const head = (await Bun.$`git rev-parse HEAD`.text()).trim();

  const handoff = descriptor.branchHandoff ?? {};
  const dir = homePath(expandTemplate(handoff.contextDirTemplate, { projectKey, branchName: branch }));
  const mr = path.join(dir, handoff.mrFilename ?? "MERGE_REQUEST.md");
  const log = path.join(dir, handoff.logFilename ?? "LOG.md");
  const phases = path.join(dir, handoff.phasesFilename ?? "PHASES.md");

  let mrText: string | null = null;
  let logText: string | null = null;
  try { mrText = await fs.readFile(mr, "utf8"); } catch {}
  try { logText = await fs.readFile(log, "utf8"); } catch {}
  if (!mrText || !logText) {
    return {
      applicable: false,
      reason: "missing_branch_context",
      recommended_next_step: "opencode_bootstrap_branch",
      mr_context_path: mr,
      log_context_path: log,
      phases_context_path: phases
    };
  }

  const field = handoff.checkpointField ?? "reviewed_through";
  let baseline = args.checkpointCommit ?? extractCheckpoint(logText, field);
  if (!baseline) baseline = ((await Bun.$`git rev-parse HEAD~${args.maxCommits ?? 10}`.text()).trim());

  const diffRange = `${baseline}..HEAD`;
  const changed = (await Bun.$`git diff --name-only ${diffRange}`.text())
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  const reread = [
    path.join(descriptor.opencodeProjectRootPath, "AGENTS.md"),
    mr,
    log
  ];
  try { await fs.access(phases); reread.push(phases); } catch {}

  return {
    applicable: true,
    projectKey,
    branch,
    area: inferArea(descriptor, context.directory ?? repoRoot),
    checkpoint_commit: baseline,
    head_commit: head,
    changed_files_preview: changed.slice(0, args.refreshMode === "full" ? 150 : 40),
    reread_files: reread,
    mr_context_path: mr,
    log_context_path: log,
    phases_context_path: phases
  };
}

