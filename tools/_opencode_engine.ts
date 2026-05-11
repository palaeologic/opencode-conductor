import fs from "fs/promises";
import os from "os";
import path from "path";

type JsonObject = Record<string, any>;
type HandoffMode = "tracked" | "lite";

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

type LoadDescriptorResult =
  | { ok: true; descriptor: JsonObject }
  | { ok: false; error: JsonObject };

async function loadDescriptor(projectKey: string): Promise<LoadDescriptorResult> {
  const descriptorPath = path.join(os.homedir(), ".config", "opencode", "projects", projectKey, "descriptor.json");
  let text: string;
  try {
    text = await fs.readFile(descriptorPath, "utf8");
  } catch {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "descriptor_not_found",
        recommended_next_step: "project_init",
        projectKey,
        descriptor_path: descriptorPath,
        hint: `Run /project-init ${projectKey} to create a descriptor, or create one manually from the template.`,
      },
    };
  }
  const parsed = JSON.parse(text) as JsonObject;
  if (typeof parsed.projectRootPath === "string") parsed.projectRootPath = homePath(parsed.projectRootPath);
  if (typeof parsed.opencodeProjectRootPath === "string") {
    parsed.opencodeProjectRootPath = homePath(parsed.opencodeProjectRootPath);
  }
  return { ok: true, descriptor: parsed };
}

function getMrFilenames(handoff: JsonObject): string[] {
  if (Array.isArray(handoff.mrFilenames) && handoff.mrFilenames.length) {
    return handoff.mrFilenames.map((x: unknown) => String(x));
  }
  if (typeof handoff.mrFilename === "string" && handoff.mrFilename) {
    return [handoff.mrFilename];
  }
  return ["MERGE_REQUEST.md"];
}

function resolveHandoffMode(descriptor: JsonObject, override?: HandoffMode): HandoffMode {
  if (override === "tracked" || override === "lite") return override;
  const d = descriptor.handoffModeDefault ?? descriptor.handoffMode;
  if (d === "lite") return "lite";
  return "tracked";
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

function inferAreaFromRepoRelativePath(descriptor: JsonObject, repoRoot: string, relPath: string): string {
  const joined = normalizeSlashes(path.join(repoRoot, relPath));
  return inferArea(descriptor, joined);
}

function extractCheckpoint(logText: string, field: string): string | null {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escapedField}:\\s*([0-9a-f]{7,40})`, "gi");
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(logText))) {
    if (m[1]) last = m[1];
  }
  return last;
}

function uniqueAreas(areas: string[]): string[] {
  return [...new Set(areas.filter((a) => a && a !== "unknown"))];
}

function heuristicsHit(changed: string[], heuristics: JsonObject | undefined): boolean {
  if (!heuristics) return false;
  const subs: string[] = Array.isArray(heuristics.highSignalChangedSubstrings)
    ? heuristics.highSignalChangedSubstrings.map(String)
    : [];
  for (const c of changed) {
    const lower = c.toLowerCase();
    for (const s of subs) {
      if (lower.includes(s.toLowerCase())) return true;
    }
  }
  return false;
}

async function resolveExistingMrPaths(branchDir: string, handoff: JsonObject): Promise<string[]> {
  const found: string[] = [];
  for (const name of getMrFilenames(handoff)) {
    const p = path.join(branchDir, name);
    try {
      await fs.access(p);
      found.push(p);
    } catch {
      /* skip */
    }
  }
  return found;
}

async function fileMtimeMinutes(filePath: string): Promise<number | null> {
  try {
    const st = await fs.stat(filePath);
    return Math.round((Date.now() - st.mtimeMs) / 60_000);
  } catch {
    return null;
  }
}

const AGENTS_STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour buffer to reduce false positives

export async function bootstrapBranchEngine(
  projectKey: string,
  params: { branchName?: string; includePhases?: boolean } = {},
  context: any,
) {
  const loaded = await loadDescriptor(projectKey);
  if (!loaded.ok) return loaded.error;
  const descriptor = loaded.descriptor;

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
  const mrNames = getMrFilenames(handoff);
  const logFile = path.join(branchDir, handoff.logFilename ?? "LOG.md");
  const phasesFile = path.join(branchDir, handoff.phasesFilename ?? "PHASES.md");

  const templatesDir = homePath(
    expandTemplate(handoff.templatesDir ?? `~/.config/opencode/projects/${projectKey}/_templates/mr`, {
      projectKey,
      branchName,
    }),
  );

  await fs.mkdir(branchDir, { recursive: true });

  const createdMr: string[] = [];
  let createdLog = false;
  let createdPhases = false;

  for (let i = 0; i < mrNames.length; i++) {
    const mrName = mrNames[i];
    const mrFile = path.join(branchDir, mrName);
    try {
      await fs.access(mrFile);
    } catch {
      const tplName = i === 0 ? (handoff.mrTemplateFilename ?? "MERGE_REQUEST.md") : mrName;
      try {
        const tpl = await fs.readFile(path.join(templatesDir, tplName), "utf8");
        await fs.writeFile(mrFile, tpl.replaceAll(handoff.mrBranchPlaceholder ?? "<branch-name>", branchName), "utf8");
        createdMr.push(mrFile);
      } catch (e) {
        if (i === 0) {
          return {
            applicable: false,
            reason: "missing_mr_template",
            template_path: path.join(templatesDir, tplName),
            detail: String(e),
          };
        }
      }
    }
  }

  const primaryMr = path.join(branchDir, mrNames[0]);

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

  const mrPaths = await resolveExistingMrPaths(branchDir, handoff);

  return {
    applicable: true,
    projectKey,
    branch: branchName,
    headCommit: headSha,
    mr_context_path: primaryMr,
    mr_context_paths: mrPaths.length ? mrPaths : [primaryMr],
    log_context_path: logFile,
    phases_context_path: phasesFile,
    created: {
      mergeRequestFile: createdMr.length > 0,
      mergeRequestPaths: createdMr,
      logFile: createdLog,
      phasesFile: createdPhases,
    },
  };
}

export async function refreshContextEngine(
  projectKey: string,
  args: {
    refreshMode?: "fast" | "full";
    maxCommits?: number;
    checkpointCommit?: string;
    writeLog?: boolean;
    handoffMode?: HandoffMode;
  } = {},
  context: any,
) {
  const loaded = await loadDescriptor(projectKey);
  if (!loaded.ok) return loaded.error;
  const descriptor = loaded.descriptor;

  const mode = resolveHandoffMode(descriptor, args.handoffMode);

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
  const logPath = path.join(dir, handoff.logFilename ?? "LOG.md");
  const phases = path.join(dir, handoff.phasesFilename ?? "PHASES.md");

  const mrPathsResolved = await resolveExistingMrPaths(dir, handoff);
  let mrText: string | null = null;
  let primaryMr: string | null = mrPathsResolved[0] ?? null;
  if (primaryMr) {
    try {
      mrText = await fs.readFile(primaryMr, "utf8");
    } catch {
      primaryMr = null;
      mrText = null;
    }
  }

  let logText: string | null = null;
  try {
    logText = await fs.readFile(logPath, "utf8");
  } catch {
    logText = null;
  }

  const hasTrackedContext = Boolean(mrText && logText);

  let phasesPresent = false;
  try {
    await fs.access(phases);
    phasesPresent = true;
  } catch {
    phasesPresent = false;
  }

  if (!hasTrackedContext && mode === "tracked") {
    return {
      applicable: false,
      reason: "missing_branch_context",
      missing_branch_context: true,
      recommended_next_step: "opencode_bootstrap_branch",
      handoff_mode: mode,
      mr_context_path: path.join(dir, getMrFilenames(handoff)[0]),
      mr_context_paths: mrPathsResolved,
      log_context_path: logPath,
      phases_context_path: phases,
      branch_context_readable: {
        merge_request_readable: Boolean(mrText),
        log_readable: Boolean(logText),
        phases_file_present: phasesPresent,
      },
    };
  }

  // Fix B: cache extractCheckpoint result
  const field = handoff.checkpointField ?? "reviewed_through";
  const maxCommits = args.maxCommits ?? 10;
  const cachedCheckpoint = (hasTrackedContext && logText) ? extractCheckpoint(logText, field) : null;
  let baseline: string;
  let checkpointSource: string;

  if (hasTrackedContext && logText) {
    baseline = args.checkpointCommit ?? cachedCheckpoint ?? "";
    checkpointSource = args.checkpointCommit ? "arg" : cachedCheckpoint ? "log" : "fallback";
    if (!baseline) {
      baseline = (await Bun.$`git rev-parse HEAD~${maxCommits}`.text()).trim();
      checkpointSource = "fallback";
    }
  } else {
    baseline = (await Bun.$`git rev-parse HEAD~${maxCommits}`.text()).trim();
    checkpointSource = "lite_window";
  }

  const diffRange = `${baseline}..HEAD`;
  let changed: string[] = [];
  try {
    changed = (await Bun.$`git diff --name-only ${diffRange}`.text())
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    changed = [];
  }

  const areaHits = changed.map((rel) => inferAreaFromRepoRelativePath(descriptor, repoRoot, rel));
  const changed_areas = uniqueAreas(areaHits);

  const opencodeRoot = descriptor.opencodeProjectRootPath as string;
  const activeArea = inferArea(descriptor, context.directory ?? repoRoot);

  // Fix E: only include active area package knowledge (KNOWLEDGE.md preferred, AGENTS.md fallback), not all areas
  const reread: string[] = [path.join(opencodeRoot, "AGENTS.md")];
  const rootKnowledge = path.join(opencodeRoot, "KNOWLEDGE.md");
  try {
    await fs.access(rootKnowledge);
    reread.push(rootKnowledge);
  } catch {
    /* optional project-wide durable facts beside rules AGENTS.md */
  }
  const activeAreaDef = descriptor.areas?.[activeArea] as JsonObject | undefined;
  if (activeAreaDef) {
    let areaDoc: string | null = null;
    if (activeAreaDef.areaKnowledgePath) {
      const kp = homePath(String(activeAreaDef.areaKnowledgePath));
      try {
        await fs.access(kp);
        areaDoc = kp;
      } catch {
        /* missing */
      }
    }
    if (!areaDoc && activeAreaDef.areaAgentsPath) {
      const agents = homePath(String(activeAreaDef.areaAgentsPath));
      const knowledge = path.join(path.dirname(agents), "KNOWLEDGE.md");
      try {
        await fs.access(knowledge);
        areaDoc = knowledge;
      } catch {
        try {
          await fs.access(agents);
          areaDoc = agents;
        } catch {
          /* area knowledge file doesn't exist yet */
        }
      }
    }
    if (areaDoc) reread.push(areaDoc);
  }

  for (const mp of mrPathsResolved) {
    if (!reread.includes(mp)) reread.push(mp);
  }
  if (hasTrackedContext) {
    reread.push(logPath);
    try {
      await fs.access(phases);
      reread.push(phases);
    } catch {
      /* optional */
    }
  }

  const last_log_age_minutes = hasTrackedContext ? await fileMtimeMinutes(logPath) : null;
  const needs_checkpoint =
    changed.length > 8 || (last_log_age_minutes !== null && last_log_age_minutes > 180 && changed.length > 0);
  const log_append_recommended = changed.length > 0 || needs_checkpoint;
  const mr_update_recommended = heuristicsHit(changed, descriptor.refreshToolHeuristics);

  let context_staleness: "fresh" | "aging" | "unknown" = "unknown";
  if (last_log_age_minutes !== null) {
    if (last_log_age_minutes < 120) context_staleness = "fresh";
    else context_staleness = "aging";
  }

  // Fix C: agents_stale_vs_branch with threshold to reduce false positives
  // AGENTS.md lives outside the git repo (~/.config/opencode/) so we use fs mtime.
  // Only flag as stale if the file was modified >1 hour after the merge-base commit.
  const agentsPath = path.join(opencodeRoot, "AGENTS.md");
  let agents_stale_vs_branch: boolean | null = null;
  try {
    const baselineBranch = String(descriptor.baselineBranchForMaterialChanges ?? "main");
    const mergeBase = (await Bun.$`git merge-base HEAD ${baselineBranch}`.text()).trim();
    const agentsMtime = (await fs.stat(agentsPath)).mtimeMs;
    const mbTime = (await Bun.$`git show -s --format=%ct ${mergeBase}`.text()).trim();
    const mbMs = Number(mbTime) * 1000;
    if (!Number.isNaN(mbMs)) {
      agents_stale_vs_branch = (agentsMtime - mbMs) > AGENTS_STALE_THRESHOLD_MS;
    }
  } catch {
    agents_stale_vs_branch = null;
  }

  return {
    applicable: true,
    missing_branch_context: false,
    branch_context_readable: {
      merge_request_readable: true,
      log_readable: true,
      phases_file_present: phasesPresent,
    },
    projectKey,
    branch,
    handoff_mode: mode,
    area: activeArea,
    checkpoint_commit: baseline,
    checkpoint_source: checkpointSource,
    head_commit: head,
    changed_files_preview: changed.slice(0, args.refreshMode === "full" ? 150 : 40),
    changed_areas,
    reread_files: reread,
    mr_context_path: primaryMr ?? path.join(dir, getMrFilenames(handoff)[0]),
    mr_context_paths: mrPathsResolved,
    log_context_path: logPath,
    phases_context_path: phases,
    last_log_age_minutes,
    needs_checkpoint,
    context_staleness,
    log_append_recommended,
    mr_update_recommended,
    agents_stale_vs_branch,
    subtaskModels: descriptor.subtaskModels ?? {},
  };
}
