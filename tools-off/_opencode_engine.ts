import fs from "fs/promises";
import { randomUUID } from "crypto";
import os from "os";
import path from "path";

type JsonObject = Record<string, any>;
type HandoffMode = "tracked" | "lite";
type BranchSyncState = "up_to_date" | "behind" | "ahead" | "diverged" | "no_upstream" | "unknown";
type CommitSourceHint = "none" | "upstream_reachable" | "local_unpushed" | "mixed" | "unknown";
type HelperRole = "log" | "review" | "merge_request" | "phases" | "notes" | "unknown";
type HelperStatus =
  | "tracked_present"
  | "tracked_missing"
  | "untracked_present"
  | "unsupported_present"
  | "unsupported_missing"
  | "invalid_path"
  | "available"
  | "removed";

type BranchHelperDefinition = {
  id: string;
  role: HelperRole;
  filename: string;
  templateFilename?: string;
  bootstrap?: string;
  branchPlaceholder?: string;
  description?: string;
  legacyImplicit?: boolean;
};

type BranchHelperManifestEntry = {
  path: string;
  state?: "present" | "missing" | "removed";
  updatedAt?: string;
  lastSeenAt?: string;
};

type BranchHelperManifestRead = {
  helpers: Record<string, BranchHelperManifestEntry>;
  error: string | null;
};

type BranchHelperStateEntry = {
  id: string;
  role: HelperRole;
  path: string;
  relativePath: string;
  status: HelperStatus;
  tracked: boolean;
  exists: boolean;
  description?: string;
};

type BranchHelperState = {
  manifestPath: string;
  manifest_error: string | null;
  supported: BranchHelperDefinition[];
  entries: BranchHelperStateEntry[];
  supported_helpers: string[];
  tracked_helpers: string[];
  existing_helpers: string[];
  missing_helpers: string[];
  untracked_helpers: string[];
  unsupported_helpers: string[];
  available_helpers: string[];
  removed_helpers: string[];
  helper_drift: Array<{ helper: string; status: HelperStatus; path: string; action: string }>;
};

const DEFAULT_HELPER_MANIFEST = "HELPERS.json";
const SUPPORTED_DESCRIPTOR_SCHEMA_VERSIONS = new Set([1, 2, 3]);

function opencodeHome(): string {
  return homePath(process.env.OPENCODE_HOME || "~/.config/opencode");
}

function isSafeProjectKey(projectKey: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(projectKey) &&
    projectKey !== "." &&
    projectKey !== ".." &&
    !projectKey.includes("..")
  );
}

function isSafeBranchName(branchName: string): boolean {
  return (
    branchName.length > 0 &&
    branchName.length <= 240 &&
    !branchName.startsWith("/") &&
    !branchName.endsWith("/") &&
    !branchName.endsWith(".") &&
    !branchName.includes("..") &&
    !branchName.includes("@{") &&
    !branchName.includes("\\") &&
    !/[\u0000-\u001f\u007f ~^:?*\[]/.test(branchName)
  );
}

function isSafeRelativePath(candidate: string): boolean {
  if (
    !candidate ||
    candidate.includes("\0") ||
    candidate.includes("\\") ||
    /^[A-Za-z]:/.test(candidate) ||
    path.isAbsolute(candidate)
  ) {
    return false;
  }
  const normalized = normalizeSlashes(path.normalize(candidate));
  return normalized !== ".." && !normalized.startsWith("../") && normalized !== ".";
}

function isSafeFilename(candidate: string): boolean {
  return isSafeRelativePath(candidate) && !candidate.includes("/");
}

function isAbsoluteNonRootPath(candidate: string): boolean {
  const expanded = homePath(candidate);
  if (!path.isAbsolute(expanded)) return false;
  const resolved = path.resolve(expanded);
  return resolved !== path.parse(resolved).root;
}

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

function descriptorValidationErrors(descriptor: JsonObject, schemaVersion: number): string[] {
  const errors: string[] = [];
  const handoff = descriptor.branchHandoff;
  if (
    typeof descriptor.projectRootPath !== "string" ||
    !isAbsoluteNonRootPath(descriptor.projectRootPath)
  ) {
    errors.push("projectRootPath must be absolute");
  }
  if (
    typeof descriptor.opencodeProjectRootPath !== "string" ||
    !isAbsoluteNonRootPath(descriptor.opencodeProjectRootPath)
  ) {
    errors.push("opencodeProjectRootPath must be absolute");
  }
  if (
    descriptor.projectAgentsPath !== undefined &&
    (typeof descriptor.projectAgentsPath !== "string" || !isAbsoluteNonRootPath(descriptor.projectAgentsPath))
  ) {
    errors.push("projectAgentsPath must be absolute");
  }
  if (
    descriptor.localStateDirname !== undefined &&
    (typeof descriptor.localStateDirname !== "string" || !isSafeFilename(descriptor.localStateDirname))
  ) {
    errors.push("localStateDirname must be a safe directory name");
  }
  if (
    descriptor.handoffModeDefault !== undefined &&
    !["tracked", "lite"].includes(String(descriptor.handoffModeDefault))
  ) {
    errors.push("handoffModeDefault must be tracked or lite");
  }
  if (descriptor.areas !== undefined && (!descriptor.areas || typeof descriptor.areas !== "object" || Array.isArray(descriptor.areas))) {
    errors.push("areas must be an object");
  } else {
    for (const [areaId, area] of Object.entries<any>(descriptor.areas ?? {})) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(areaId)) {
        errors.push(`invalid area id: ${areaId}`);
      }
      if (!area || typeof area !== "object" || Array.isArray(area)) {
        errors.push(`area must be an object: ${areaId}`);
        continue;
      }
      const areaPrefix = area.pathPrefix ?? area.path;
      if (
        (schemaVersion === 3 && typeof areaPrefix !== "string") ||
        (areaPrefix !== undefined && (typeof areaPrefix !== "string" || !isSafeRelativePath(areaPrefix)))
      ) {
        errors.push(`unsafe area pathPrefix: ${areaId}`);
      }
      if (
        area.areaAgentsPath !== undefined &&
        (typeof area.areaAgentsPath !== "string" || !isAbsoluteNonRootPath(area.areaAgentsPath))
      ) {
        errors.push(`areaAgentsPath must be absolute: ${areaId}`);
      }
    }
  }
  const rawPackageRules = descriptor.pseudoPackageDetection;
  const packageRules =
    rawPackageRules === undefined ? [] : Array.isArray(rawPackageRules) ? rawPackageRules : [rawPackageRules];
  if (schemaVersion >= 2 && rawPackageRules !== undefined && !Array.isArray(rawPackageRules)) {
    errors.push("schema v2/v3 pseudoPackageDetection must be an array");
  }
  for (const [index, rule] of packageRules.entries()) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      errors.push(`pseudoPackageDetection rule must be an object: ${index}`);
      continue;
    }
    const areaKeys = Object.keys(descriptor.areas ?? {});
    const schema1ImplicitArea = schemaVersion === 1 && rule.area === undefined && areaKeys.length === 1;
    if (!schema1ImplicitArea && (typeof rule.area !== "string" || !(rule.area in (descriptor.areas ?? {})))) {
      errors.push(`pseudoPackageDetection rule has unknown area: ${index}`);
    }
    if (!["pathAndAlias", "pathPrefix"].includes(String(rule.kind))) {
      errors.push(`pseudoPackageDetection rule has unknown kind: ${index}`);
    }
    if (typeof rule.pathPattern !== "string" || !isSafeRelativePath(rule.pathPattern)) {
      errors.push(`pseudoPackageDetection rule has unsafe pathPattern: ${index}`);
    } else if ((rule.pathPattern.match(/\{packageName\}/g) ?? []).length > 1) {
      errors.push(`pseudoPackageDetection rule repeats {packageName}: ${index}`);
    }
    for (const field of ["aliases", "namePrefixes", "namedExtras"]) {
      if (
        rule[field] !== undefined &&
        (!Array.isArray(rule[field]) || rule[field].some((value: unknown) => typeof value !== "string"))
      ) {
        errors.push(`pseudoPackageDetection ${field} must contain strings: ${index}`);
      }
    }
  }
  if (handoff !== undefined && (!handoff || typeof handoff !== "object" || Array.isArray(handoff))) {
    errors.push("branchHandoff must be an object");
    return errors;
  }
  if (handoff?.contextDirTemplate !== undefined) {
    const contextTemplate = String(handoff.contextDirTemplate);
    if (
      typeof handoff.contextDirTemplate !== "string" ||
      !isAbsoluteNonRootPath(contextTemplate) ||
      contextTemplate.split("{branchName}").length !== 2
    ) {
      errors.push("contextDirTemplate must be absolute and contain {branchName} exactly once");
    }
  }
  if (
    handoff?.templatesDir !== undefined &&
    (typeof handoff.templatesDir !== "string" || !isAbsoluteNonRootPath(handoff.templatesDir))
  ) {
    errors.push("templatesDir must be absolute");
  }
  if (
    handoff?.checkpointField !== undefined &&
    (typeof handoff.checkpointField !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(handoff.checkpointField))
  ) {
    errors.push("checkpointField must be a safe field name");
  }
  if (schemaVersion === 3) {
    const rawHelpers = handoff?.helpers;
    if (!rawHelpers || typeof rawHelpers !== "object" || Array.isArray(rawHelpers)) {
      errors.push("schema v3 requires branchHandoff.helpers object");
    } else if (Object.keys(rawHelpers).length === 0) {
      errors.push("branchHandoff.helpers must not be empty");
    } else {
      for (const [helperId, value] of Object.entries<any>(rawHelpers)) {
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(helperId)) {
          errors.push(`invalid helper id: ${helperId}`);
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          errors.push(`helper must be an object: ${helperId}`);
          continue;
        }
        if (typeof value.filename !== "string" || !isSafeFilename(value.filename)) {
          errors.push(`unsafe helper filename: ${helperId}`);
        }
        if (
          value.templateFilename !== undefined &&
          (typeof value.templateFilename !== "string" || !isSafeFilename(value.templateFilename))
        ) {
          errors.push(`unsafe helper template filename: ${helperId}`);
        }
        if (normalizeHelperRole(value.role) === "unknown") {
          errors.push(`unknown helper role: ${helperId}`);
        }
        if (typeof value.description !== "string" || !value.description.trim()) {
          errors.push(`helper description is required: ${helperId}`);
        }
        if (typeof value.bootstrap !== "string" || !["always", "ask", "never"].includes(value.bootstrap)) {
          errors.push(`invalid helper bootstrap policy: ${helperId}`);
        }
      }
    }
  }

  const helpers = getHelperDefinitions(handoff ?? {});
  const filenames = new Set<string>();
  const singularRoles = new Set<HelperRole>();
  for (const helper of helpers) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(helper.id)) {
      errors.push(`invalid helper id: ${helper.id}`);
    }
    if (!isSafeRelativePath(helper.filename)) {
      errors.push(`unsafe helper filename: ${helper.filename}`);
    }
    const portableFilename = helper.filename.toLowerCase();
    if (filenames.has(portableFilename)) errors.push(`duplicate helper filename: ${helper.filename}`);
    filenames.add(portableFilename);
    if (helper.role === "unknown") errors.push(`unknown helper role: ${helper.id}`);
    if (helper.role !== "merge_request" && helper.role !== "notes" && helper.role !== "unknown") {
      if (singularRoles.has(helper.role)) errors.push(`duplicate helper role: ${helper.role}`);
      singularRoles.add(helper.role);
    }
    if (helper.templateFilename && !isSafeRelativePath(helper.templateFilename)) {
      errors.push(`unsafe helper template filename: ${helper.templateFilename}`);
    }
  }
  if (
    handoff?.helperManifestFilename !== undefined &&
    (typeof handoff.helperManifestFilename !== "string" || !isSafeFilename(handoff.helperManifestFilename))
  ) {
    errors.push("unsafe helper manifest filename");
  } else if (
    typeof handoff?.helperManifestFilename === "string" &&
    filenames.has(handoff.helperManifestFilename.toLowerCase())
  ) {
    errors.push("helper manifest filename conflicts with a helper filename");
  }
  if (
    descriptor.reviewIgnoredPathGlobs !== undefined &&
    (!Array.isArray(descriptor.reviewIgnoredPathGlobs) ||
      descriptor.reviewIgnoredPathGlobs.some((value: unknown) => typeof value !== "string" || !globToRegExp(value)))
  ) {
    errors.push("reviewIgnoredPathGlobs must contain safe relative glob strings");
  }
  if (
    descriptor.branchSyncStaleAfterMinutes !== undefined &&
    (typeof descriptor.branchSyncStaleAfterMinutes !== "number" ||
      !Number.isInteger(descriptor.branchSyncStaleAfterMinutes) ||
      descriptor.branchSyncStaleAfterMinutes < 1 ||
      descriptor.branchSyncStaleAfterMinutes > 10_080)
  ) {
    errors.push("branchSyncStaleAfterMinutes must be between 1 and 10080");
  }
  if (
    descriptor.baselineBranchForMaterialChanges !== undefined &&
    (typeof descriptor.baselineBranchForMaterialChanges !== "string" ||
      !isSafeGitRef(descriptor.baselineBranchForMaterialChanges))
  ) {
    errors.push("baselineBranchForMaterialChanges must be a safe git ref");
  }
  return errors;
}

async function loadDescriptor(projectKey: string): Promise<LoadDescriptorResult> {
  if (!isSafeProjectKey(projectKey)) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "invalid_project_key",
        recommended_next_step: "use_a_simple_project_key",
        projectKey,
      },
    };
  }

  const configRoot = opencodeHome();
  if (!isAbsoluteNonRootPath(configRoot)) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "invalid_opencode_home",
        recommended_next_step: "set_an_absolute_non_root_opencode_home",
      },
    };
  }
  const descriptorPath = path.join(configRoot, "projects", projectKey, "descriptor.json");
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
  let parsed: JsonObject;
  try {
    parsed = JSON.parse(text) as JsonObject;
  } catch (error) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "invalid_descriptor_json",
        recommended_next_step: "repair_descriptor",
        projectKey,
        descriptor_path: descriptorPath,
        detail: String(error),
      },
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "invalid_descriptor_shape",
        recommended_next_step: "repair_descriptor",
        projectKey,
        descriptor_path: descriptorPath,
      },
    };
  }
  const schemaVersion = Number(parsed.descriptorSchemaVersion ?? 1);
  if (!SUPPORTED_DESCRIPTOR_SCHEMA_VERSIONS.has(schemaVersion)) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "unsupported_descriptor_schema",
        recommended_next_step: "upgrade_conductor_or_descriptor",
        projectKey,
        descriptor_path: descriptorPath,
        descriptor_schema_version: parsed.descriptorSchemaVersion,
        supported_descriptor_schema_versions: [...SUPPORTED_DESCRIPTOR_SCHEMA_VERSIONS],
      },
    };
  }
  if (typeof parsed.projectRootPath !== "string" || !parsed.projectRootPath) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "missing_project_root_path",
        recommended_next_step: "repair_descriptor",
        projectKey,
        descriptor_path: descriptorPath,
      },
    };
  }
  if (typeof parsed.projectRootPath === "string") parsed.projectRootPath = homePath(parsed.projectRootPath);
  if (parsed.projectKey !== undefined && parsed.projectKey !== projectKey) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "descriptor_project_key_mismatch",
        recommended_next_step: "repair_descriptor",
        projectKey,
        descriptor_path: descriptorPath,
        descriptor_project_key: parsed.projectKey,
      },
    };
  }
  if (typeof parsed.opencodeProjectRootPath === "string") {
    parsed.opencodeProjectRootPath = homePath(parsed.opencodeProjectRootPath);
  } else {
    parsed.opencodeProjectRootPath = path.join(opencodeHome(), "projects", projectKey);
  }
  const validationErrors = descriptorValidationErrors(parsed, schemaVersion);
  if (validationErrors.length) {
    return {
      ok: false,
      error: {
        applicable: false,
        reason: "invalid_descriptor",
        recommended_next_step: "repair_descriptor",
        projectKey,
        descriptor_path: descriptorPath,
        validation_errors: validationErrors,
      },
    };
  }
  return { ok: true, descriptor: parsed };
}

function helperManifestFilename(handoff: JsonObject): string {
  const filename =
    typeof handoff.helperManifestFilename === "string" && handoff.helperManifestFilename
      ? handoff.helperManifestFilename
      : DEFAULT_HELPER_MANIFEST;
  return isSafeRelativePath(filename) ? filename : DEFAULT_HELPER_MANIFEST;
}

function helperManifestPath(branchDir: string, handoff: JsonObject): string {
  return path.join(branchDir, helperManifestFilename(handoff));
}

function normalizeHelperRole(role: unknown): HelperRole {
  if (role === "log" || role === "review" || role === "merge_request" || role === "phases" || role === "notes") {
    return role;
  }
  return "unknown";
}

function getHelperDefinitions(handoff: JsonObject): BranchHelperDefinition[] {
  const raw = handoff.helpers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const mrFilenames =
      Array.isArray(handoff.mrFilenames) && handoff.mrFilenames.length
        ? handoff.mrFilenames.map((value: unknown) => String(value))
        : typeof handoff.mrFilename === "string" && handoff.mrFilename
          ? [handoff.mrFilename]
          : ["MERGE_REQUEST.md"];
    const legacyHelpers: BranchHelperDefinition[] = [];
    mrFilenames.forEach((filename: string, index: number) => {
      if (!isSafeRelativePath(filename)) return;
      legacyHelpers.push({
        id: index === 0 ? "mergeRequest" : `mergeRequest${index + 1}`,
        role: "merge_request",
        filename,
        templateFilename: index === 0 ? (handoff.mrTemplateFilename ?? "MERGE_REQUEST.md") : filename,
        bootstrap: index === 0 ? "always" : "never",
        branchPlaceholder: handoff.mrBranchPlaceholder ?? "<branch-name>",
        description: index === 0 ? "Primary merge request context." : "Alternate merge request context.",
        legacyImplicit: true,
      });
    });
    const legacyFixed: Array<BranchHelperDefinition> = [
      {
        id: "log",
        role: "log",
        filename: handoff.logFilename ?? "LOG.md",
        templateFilename: handoff.logTemplateFilename ?? "LOG.md",
        bootstrap: "always",
        description: "Progress log for checkpoints and handoffs.",
        legacyImplicit: true,
      },
      {
        id: "phasePlan",
        role: "phases",
        filename: handoff.phasesFilename ?? "PHASES.md",
        templateFilename: handoff.phasesTemplateFilename ?? "PHASES.md",
        bootstrap: "never",
        description: "Optional staged phase plan.",
        legacyImplicit: true,
      },
      {
        id: "review",
        role: "review",
        filename: handoff.reviewFilename ?? "REVIEW.md",
        bootstrap: "never",
        description: "Optional structured review notes.",
        legacyImplicit: true,
      },
    ];
    return [...legacyHelpers, ...legacyFixed].filter((helper) => isSafeRelativePath(helper.filename));
  }
  const helpers: BranchHelperDefinition[] = [];
  for (const [id, value] of Object.entries<JsonObject>(raw)) {
    if (!value || typeof value !== "object") continue;
    if (typeof value.filename !== "string" || !isSafeRelativePath(value.filename)) continue;
    helpers.push({
      id,
      role: normalizeHelperRole(value.role),
      filename: value.filename,
      templateFilename: typeof value.templateFilename === "string" ? value.templateFilename : undefined,
      bootstrap: typeof value.bootstrap === "string" ? value.bootstrap : undefined,
      branchPlaceholder: typeof value.branchPlaceholder === "string" ? value.branchPlaceholder : undefined,
      description: typeof value.description === "string" ? value.description : undefined,
    });
  }
  return helpers;
}

function helperDefinitionByRole(helpers: BranchHelperDefinition[], role: HelperRole): BranchHelperDefinition | null {
  return helpers.find((helper) => helper.role === role) ?? null;
}

function helperFilePath(branchDir: string, helper: BranchHelperDefinition): string {
  return path.join(branchDir, helper.filename);
}

function relativeHelperPath(branchDir: string, filePath: string): string {
  const rel = normalizeSlashes(path.relative(branchDir, filePath));
  return rel || path.basename(filePath);
}

function resolveManifestEntryPath(branchDir: string, relPath: string): string | null {
  if (!isSafeRelativePath(relPath)) return null;
  const resolved = path.resolve(branchDir, relPath);
  const relative = path.relative(branchDir, resolved);
  if (relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative))) {
    return resolved;
  }
  return null;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveThroughExistingAncestor(candidate: string): Promise<string> {
  let cursor = path.resolve(candidate);
  const suffix: string[] = [];
  while (true) {
    try {
      return path.join(await fs.realpath(cursor), ...suffix);
    } catch (error: any) {
      if (error?.code !== "ENOENT") return path.resolve(candidate);
      const parent = path.dirname(cursor);
      if (parent === cursor) return path.resolve(candidate);
      suffix.unshift(path.basename(cursor));
      cursor = parent;
    }
  }
}

function pathIsInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function inspectContainedFile(
  root: string,
  candidate: string,
): Promise<{ safe: boolean; exists: boolean; reason?: string }> {
  const lexicalRoot = path.resolve(root);
  const lexicalCandidate = path.resolve(candidate);
  if (!pathIsInside(lexicalRoot, lexicalCandidate)) {
    return { safe: false, exists: false, reason: "path_outside_root" };
  }

  let exists = false;
  try {
    const targetStat = await fs.lstat(candidate);
    exists = true;
    if (targetStat.isSymbolicLink()) return { safe: false, exists: true, reason: "symlink_refused" };
    if (!targetStat.isFile()) return { safe: false, exists: true, reason: "non_file_refused" };
  } catch (error: any) {
    if (error?.code !== "ENOENT") return { safe: false, exists: false, reason: "path_unreadable" };
  }

  const resolvedRoot = await resolveThroughExistingAncestor(root);
  const resolvedCandidate = await resolveThroughExistingAncestor(candidate);
  if (!pathIsInside(resolvedRoot, resolvedCandidate)) {
    return { safe: false, exists, reason: "resolved_path_outside_root" };
  }
  return { safe: true, exists };
}

async function readBranchHelperManifest(branchDir: string, handoff: JsonObject): Promise<BranchHelperManifestRead> {
  const manifestPath = helperManifestPath(branchDir, handoff);
  const inspection = await inspectContainedFile(branchDir, manifestPath);
  if (!inspection.safe) {
    return { helpers: {}, error: `unsafe_manifest_path: ${inspection.reason}` };
  }
  if (!inspection.exists) return { helpers: {}, error: null };
  let text: string;
  try {
    text = await fs.readFile(manifestPath, "utf8");
  } catch (error: any) {
    if (error?.code === "ENOENT") return { helpers: {}, error: null };
    return { helpers: {}, error: `manifest_unreadable: ${String(error)}` };
  }
  try {
    const parsed = JSON.parse(text) as JsonObject;
    if (parsed.schemaVersion !== 1) {
      return { helpers: {}, error: `unsupported_manifest_schema: ${String(parsed.schemaVersion)}` };
    }
    if (!parsed.helpers || typeof parsed.helpers !== "object" || Array.isArray(parsed.helpers)) {
      return { helpers: {}, error: "invalid_manifest_helpers" };
    }
    const helpers: Record<string, BranchHelperManifestEntry> = {};
    for (const [id, entry] of Object.entries<JsonObject>(parsed.helpers)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) {
        return { helpers: {}, error: `invalid_manifest_helper_id: ${id}` };
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return { helpers: {}, error: `invalid_manifest_entry: ${id}` };
      }
      if (typeof entry.path !== "string" || !isSafeRelativePath(entry.path)) {
        return { helpers: {}, error: `invalid_manifest_path: ${id}` };
      }
      if (entry.state !== undefined && !["present", "missing", "removed"].includes(String(entry.state))) {
        return { helpers: {}, error: `invalid_manifest_state: ${id}` };
      }
      if (entry.updatedAt !== undefined && typeof entry.updatedAt !== "string") {
        return { helpers: {}, error: `invalid_manifest_updated_at: ${id}` };
      }
      if (entry.lastSeenAt !== undefined && typeof entry.lastSeenAt !== "string") {
        return { helpers: {}, error: `invalid_manifest_last_seen_at: ${id}` };
      }
      helpers[id] = {
        path: entry.path,
        state: entry.state === "missing" || entry.state === "removed" ? entry.state : "present",
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : undefined,
        lastSeenAt: typeof entry.lastSeenAt === "string" ? entry.lastSeenAt : undefined,
      };
    }
    return { helpers, error: null };
  } catch (error) {
    return { helpers: {}, error: `invalid_manifest_json: ${String(error)}` };
  }
}

async function writeBranchHelperManifest(
  branchDir: string,
  handoff: JsonObject,
  helpers: Record<string, BranchHelperManifestEntry>,
): Promise<string> {
  const manifestPath = helperManifestPath(branchDir, handoff);
  const temporaryPath = `${manifestPath}.tmp-${randomUUID()}`;
  const manifest = {
    schemaVersion: 1,
    helpers,
  };
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await fs.rename(temporaryPath, manifestPath);
  } finally {
    await fs.unlink(temporaryPath).catch(() => undefined);
  }
  return manifestPath;
}

function manifestEntryFor(filePath: string, branchDir: string): BranchHelperManifestEntry {
  const now = new Date().toISOString();
  return {
    path: relativeHelperPath(branchDir, filePath),
    state: "present",
    updatedAt: now,
    lastSeenAt: now,
  };
}

async function reconcileBranchHelpers(branchDir: string, handoff: JsonObject): Promise<BranchHelperState> {
  const supported = getHelperDefinitions(handoff);
  const manifestRead = await readBranchHelperManifest(branchDir, handoff);
  const manifest = manifestRead.helpers;
  const manifestPresent = manifestRead.error ? true : await pathExists(helperManifestPath(branchDir, handoff));
  const entries: BranchHelperStateEntry[] = [];
  const supportedIds = new Set(supported.map((helper) => helper.id));
  const manifestIds = new Set(Object.keys(manifest));
  const expectedFilenames = new Set(supported.map((helper) => helper.filename));
  const commonHelperFilenames = ["MERGE_REQUEST.md", "MR.md", "LOG.md", "PHASES.md", "REVIEW.md"];

  for (const helper of supported) {
    const manifestEntry = manifest[helper.id];
    const resolvedManifestPath = manifestEntry
      ? resolveManifestEntryPath(branchDir, manifestEntry.path)
      : null;
    const filePath = resolvedManifestPath ?? helperFilePath(branchDir, helper);
    const fileInspection = await inspectContainedFile(branchDir, filePath);
    const invalidPath = Boolean((manifestEntry && !resolvedManifestPath) || !fileInspection.safe);
    const removed = manifestEntry?.state === "removed";
    const exists = fileInspection.safe && fileInspection.exists;
    const implicitTracked =
      Boolean(helper.legacyImplicit) && !manifestPresent && (helper.bootstrap === "always" || exists);
    const tracked = Boolean((manifestEntry && manifestEntry.state !== "removed") || implicitTracked);
    const status: HelperStatus = invalidPath
      ? "invalid_path"
      : removed
        ? "removed"
        : tracked
        ? exists
          ? "tracked_present"
          : "tracked_missing"
        : exists
          ? "untracked_present"
          : "available";
    entries.push({
      id: helper.id,
      role: helper.role,
      path: filePath,
      relativePath: relativeHelperPath(branchDir, filePath),
      status,
      tracked,
      exists,
      description: helper.description,
    });
  }

  for (const [id, manifestEntry] of Object.entries(manifest)) {
    if (supportedIds.has(id)) continue;
    const resolvedPath = resolveManifestEntryPath(branchDir, manifestEntry.path);
    const filePath = resolvedPath ?? path.join(branchDir, "__invalid_helper_path__");
    const fileInspection = resolvedPath
      ? await inspectContainedFile(branchDir, filePath)
      : { safe: false, exists: false };
    const exists = fileInspection.safe && fileInspection.exists;
    entries.push({
      id,
      role: "unknown",
      path: filePath,
      relativePath: resolvedPath ? relativeHelperPath(branchDir, filePath) : manifestEntry.path,
      status: resolvedPath && fileInspection.safe ? (exists ? "unsupported_present" : "unsupported_missing") : "invalid_path",
      tracked: manifestEntry.state !== "removed",
      exists,
    });
  }

  try {
    const files = await fs.readdir(branchDir);
    for (const filename of commonHelperFilenames) {
      if (!files.includes(filename)) continue;
      if (expectedFilenames.has(filename)) continue;
      if (entries.some((entry) => entry.relativePath === filename)) continue;
      const id = filename.replace(/\.[^.]+$/, "").toLowerCase();
      if (manifestIds.has(id)) continue;
      const commonPath = path.join(branchDir, filename);
      const commonInspection = await inspectContainedFile(branchDir, commonPath);
      entries.push({
        id,
        role: "unknown",
        path: commonPath,
        relativePath: filename,
        status: commonInspection.safe ? "unsupported_present" : "invalid_path",
        tracked: false,
        exists: commonInspection.safe && commonInspection.exists,
      });
    }
  } catch {
    /* branch folder does not exist yet */
  }

  const drift = entries
    .filter((entry) =>
      ["tracked_missing", "untracked_present", "unsupported_present", "unsupported_missing", "invalid_path"].includes(
        entry.status,
      ),
    )
    .map((entry) => ({
      helper: entry.id,
      status: entry.status,
      path: entry.path,
      action:
        entry.status === "tracked_missing"
          ? "recreate, relink, mark removed, or skip"
          : entry.status === "untracked_present"
            ? "track, ignore, or remove manually"
            : entry.status === "invalid_path"
              ? "replace with a safe path inside the branch context"
            : "update descriptor, relink, mark removed, or ignore",
    }));

  return {
    manifestPath: helperManifestPath(branchDir, handoff),
    manifest_error: manifestRead.error,
    supported,
    entries,
    supported_helpers: supported.map((helper) => helper.id),
    tracked_helpers: entries.filter((entry) => entry.tracked).map((entry) => entry.id),
    existing_helpers: entries.filter((entry) => entry.exists).map((entry) => entry.id),
    missing_helpers: entries.filter((entry) => entry.status === "tracked_missing").map((entry) => entry.id),
    untracked_helpers: entries.filter((entry) => entry.status === "untracked_present").map((entry) => entry.id),
    unsupported_helpers: entries
      .filter((entry) => entry.status === "unsupported_present" || entry.status === "unsupported_missing")
      .map((entry) => entry.id),
    available_helpers: entries.filter((entry) => entry.status === "available").map((entry) => entry.id),
    removed_helpers: entries.filter((entry) => entry.status === "removed").map((entry) => entry.id),
    helper_drift: drift,
  };
}

function firstExistingHelperByRole(helperState: BranchHelperState, role: HelperRole): BranchHelperStateEntry | null {
  return helperState.entries.find((entry) => entry.role === role && entry.exists) ?? null;
}

function existingHelpersByRole(helperState: BranchHelperState, role: HelperRole): BranchHelperStateEntry[] {
  return helperState.entries.filter((entry) => entry.role === role && entry.exists);
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
    const prefix = normalizeSlashes(def.pathPrefix ?? def.path ?? "");
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

function parseReviewMetadata(reviewText: string): Record<string, string> {
  const match = reviewText.match(/<!--\s*OpenCode:\s*review metadata\s*([\s\S]*?)-->/i);
  if (!match) return {};

  const metadata: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(":")) continue;
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey.trim();
    const value = rest.join(":").trim();
    if (key && value) metadata[key] = value;
  }
  return metadata;
}

function summarizeOpenReviewFindings(reviewText: string): string[] {
  const openIds: string[] = [];
  const checklistRe = /^-\s*\[\s*\]\s*((?:[FRM]\d{3})|(?:F-\d{2,3}))\s*(?:-|—)\s*open\b/gim;
  let checklistMatch: RegExpExecArray | null;
  while ((checklistMatch = checklistRe.exec(reviewText))) {
    openIds.push(checklistMatch[1]);
  }
  if (openIds.length) return [...new Set(openIds)];

  for (const line of reviewText.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 3) continue;
    const id = cells[0];
    const triage = cells[2]?.toLowerCase();
    if (/^(?:[FRM]\d{3}|F-\d{2,3})$/.test(id) && triage === "open") openIds.push(id);
  }
  return [...new Set(openIds)];
}

function uniqueAreas(areas: string[]): string[] {
  return [...new Set(areas.filter((a) => a && a !== "unknown"))];
}

function globToRegExp(glob: string): RegExp | null {
  if (!glob || glob.includes("\0") || glob.startsWith("/") || glob.includes("..")) return null;
  const normalized = normalizeSlashes(glob);
  let source = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "*") {
      const isDouble = normalized[index + 1] === "*";
      if (isDouble) {
        const followedBySlash = normalized[index + 2] === "/";
        source += followedBySlash ? "(?:.*/)?" : ".*";
        index += followedBySlash ? 2 : 1;
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  try {
    return new RegExp(`${source}$`);
  } catch {
    return null;
  }
}

function partitionReviewFiles(
  changedFiles: string[],
  rawGlobs: unknown,
): { reviewable: string[]; ignored: string[]; validGlobs: string[] } {
  const validGlobs = Array.isArray(rawGlobs)
    ? rawGlobs.filter((value): value is string => typeof value === "string" && Boolean(globToRegExp(value)))
    : [];
  const matchers = validGlobs.map((glob) => globToRegExp(glob)).filter((matcher): matcher is RegExp => Boolean(matcher));
  const reviewable: string[] = [];
  const ignored: string[] = [];
  for (const changedFile of changedFiles) {
    if (matchers.some((matcher) => matcher.test(normalizeSlashes(changedFile)))) ignored.push(changedFile);
    else reviewable.push(changedFile);
  }
  return { reviewable, ignored, validGlobs };
}

/**
 * MR machine-block refresh is recommended only when there is reviewable state
 * to mirror into `## OpenCode:` blocks — i.e. a `REVIEW.md` exists AND it has
 * open findings or is stale vs HEAD. This intentionally does NOT trigger on
 * ordinary file changes (that is what LOG.md is for) and does NOT touch the
 * human-authored MR narrative. Keep this in lockstep with `commands/manual-refresh.md`.
 */
function mrUpdateRecommendedFromReview(params: {
  reviewPresent: boolean;
  openFindingsCount: number;
  reviewState: string;
}): boolean {
  if (!params.reviewPresent) return false;
  return (
    params.openFindingsCount > 0 ||
    params.reviewState === "existing_head_moved" ||
    params.reviewState === "existing_unknown_head"
  );
}

/**
 * Advisory-only signal that the branch may have grown beyond the scope described
 * in the MR's human-authored narrative (e.g. a new PHASES feature not listed in
 * `## In scope`). Conservative / false-negative-biased to avoid noise: it fires
 * only when PHASES is in play, work landed since checkpoint, and the checkpoint
 * range recorded in the MR `## OpenCode: review status` block is behind HEAD.
 * Never mutates the narrative; callers surface it as a heads-up for the human.
 * Keep this in lockstep with `commands/manual-refresh.md`.
 */
function narrativeDriftSuspected(params: {
  phasesPresent: boolean;
  changedFilesCount: number;
  mrText: string | null;
  head: string;
}): boolean {
  if (!params.phasesPresent || params.changedFilesCount <= 0 || !params.mrText) return false;
  // Grab the recorded range's right-hand commit (the block's head), tolerating a
  // branch name or sha on the left of the `..` / `→` / `->` separator.
  const rangeMatch = params.mrText.match(/checkpoint range:[^\n]*?(?:\.\.|→|->)\s*`?([0-9a-f]{7,40})`?/i);
  if (!rangeMatch) return false;
  const recordedHead = rangeMatch[1].toLowerCase();
  const currentHead = params.head.toLowerCase();
  // Stale when the recorded block head is not a prefix-match of the current HEAD.
  return !currentHead.startsWith(recordedHead) && !recordedHead.startsWith(currentHead);
}

async function fileMtimeMinutes(filePath: string): Promise<number | null> {
  try {
    const st = await fs.stat(filePath);
    return Math.round((Date.now() - st.mtimeMs) / 60_000);
  } catch {
    return null;
  }
}

async function resolveBranchSyncStatus(staleAfterMinutes: number): Promise<{
  upstream_ref: string | null;
  upstream_head: string | null;
  branch_sync_state: BranchSyncState;
  commits_ahead_upstream: number | null;
  commits_behind_upstream: number | null;
  last_fetch_age_minutes: number | null;
  remote_ref_may_be_stale: boolean | null;
}> {
  let upstreamRef: string | null = null;
  try {
    upstreamRef = (await Bun.$`git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`.text()).trim();
  } catch {
    upstreamRef = null;
  }

  let lastFetchAge: number | null = null;
  try {
    const fetchHead = (await Bun.$`git rev-parse --git-path FETCH_HEAD`.text()).trim();
    lastFetchAge = await fileMtimeMinutes(fetchHead);
  } catch {
    lastFetchAge = null;
  }
  const remoteRefMayBeStale = lastFetchAge === null ? null : lastFetchAge > staleAfterMinutes;

  if (!upstreamRef) {
    return {
      upstream_ref: null,
      upstream_head: null,
      branch_sync_state: "no_upstream",
      commits_ahead_upstream: null,
      commits_behind_upstream: null,
      last_fetch_age_minutes: lastFetchAge,
      remote_ref_may_be_stale: remoteRefMayBeStale,
    };
  }

  try {
    const upstreamHead = (await Bun.$`git rev-parse ${upstreamRef}`.text()).trim();
    const countsText = (await Bun.$`git rev-list --left-right --count HEAD...${upstreamRef}`.text()).trim();
    const [aheadRaw, behindRaw] = countsText.split(/\s+/);
    const ahead = Number(aheadRaw);
    const behind = Number(behindRaw);
    const branch_sync_state: BranchSyncState =
      ahead === 0 && behind === 0
        ? "up_to_date"
        : ahead === 0 && behind > 0
          ? "behind"
          : ahead > 0 && behind === 0
            ? "ahead"
            : "diverged";

    return {
      upstream_ref: upstreamRef,
      upstream_head: upstreamHead,
      branch_sync_state,
      commits_ahead_upstream: Number.isNaN(ahead) ? null : ahead,
      commits_behind_upstream: Number.isNaN(behind) ? null : behind,
      last_fetch_age_minutes: lastFetchAge,
      remote_ref_may_be_stale: remoteRefMayBeStale,
    };
  } catch {
    return {
      upstream_ref: upstreamRef,
      upstream_head: null,
      branch_sync_state: "unknown",
      commits_ahead_upstream: null,
      commits_behind_upstream: null,
      last_fetch_age_minutes: lastFetchAge,
      remote_ref_may_be_stale: remoteRefMayBeStale,
    };
  }
}

async function commitSourceHint(baseline: string, upstreamRef: string | null): Promise<CommitSourceHint> {
  let commits: string[] = [];
  try {
    commits = (await Bun.$`git rev-list ${baseline}..HEAD`.text())
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return "unknown";
  }
  if (commits.length === 0) return "none";
  if (!upstreamRef) return "unknown";

  let upstreamReachable = 0;
  let localOnly = 0;
  for (const commit of commits) {
    try {
      await Bun.$`git merge-base --is-ancestor ${commit} ${upstreamRef}`.quiet();
      upstreamReachable += 1;
    } catch {
      localOnly += 1;
    }
  }
  if (upstreamReachable > 0 && localOnly > 0) return "mixed";
  if (upstreamReachable > 0) return "upstream_reachable";
  if (localOnly > 0) return "local_unpushed";
  return "unknown";
}

function configuredLocalStateDirname(descriptor: JsonObject): string {
  const value = descriptor.localStateDirname;
  return typeof value === "string" && /^[A-Za-z0-9._-]+$/.test(value) && value !== "." && value !== ".."
    ? value
    : ".opencode-conductor";
}

function classifyBranchContext(
  projectKey: string,
  projectRoot: string,
  branchDir: string,
  localStateDirname: string,
): string {
  const normalizedDir = normalizeSlashes(branchDir);
  const privateRoot = normalizeSlashes(path.join(opencodeHome(), "projects", projectKey, "branches"));
  const sharedRoot = normalizeSlashes(path.join(projectRoot, localStateDirname, "branches"));
  if (normalizedDir === privateRoot || normalizedDir.startsWith(`${privateRoot}/`)) return "private";
  if (normalizedDir === sharedRoot || normalizedDir.startsWith(`${sharedRoot}/`)) return "shared-git";
  return "custom";
}

async function branchContextHasArtifacts(branchDir: string, handoff: JsonObject): Promise<boolean> {
  try {
    const entries = await fs.readdir(branchDir);
    const expected = new Set([
      helperManifestFilename(handoff),
      ...getHelperDefinitions(handoff).map((helper) => helper.filename),
    ]);
    return entries.some((entry) => expected.has(entry));
  } catch {
    return false;
  }
}

async function detectAlternateBranchContext(
  projectKey: string,
  projectRoot: string,
  branchName: string,
  activeDir: string,
  handoff: JsonObject,
  localStateDirname: string,
): Promise<string> {
  const candidates: Array<[string, string]> = [
    ["private", path.join(opencodeHome(), "projects", projectKey, "branches", branchName)],
    ["shared-git", path.join(projectRoot, localStateDirname, "branches", branchName)],
  ];
  const activeReal = normalizeSlashes(path.resolve(activeDir));
  const found: string[] = [];
  for (const [kind, dir] of candidates) {
    const candidateReal = normalizeSlashes(path.resolve(dir));
    if (candidateReal === activeReal) continue;
    if (await branchContextHasArtifacts(dir, handoff)) found.push(kind);
  }
  if (found.length === 0) return "none";
  return found.join(",");
}

function reconciliationRecommendations(params: {
  changedFilesCount: number;
  logPresent: boolean;
  phasesPresent: boolean;
  reviewState: string;
  mrUpdateRecommended: boolean;
}): string[] {
  const recommendations: string[] = [];
  if (params.changedFilesCount > 0 && params.logPresent) recommendations.push("log");
  if (params.changedFilesCount > 0 && params.phasesPresent) recommendations.push("phases");
  if (params.reviewState === "existing_head_moved" || params.reviewState === "existing_unknown_head") {
    recommendations.push("review");
  }
  if (params.mrUpdateRecommended) recommendations.push("merge_request");
  return recommendations.length ? recommendations : ["none"];
}

const AGENTS_STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour buffer to reduce false positives

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

function defaultContextDirTemplate(projectKey: string): string {
  return path.join(opencodeHome(), "projects", projectKey, "branches", "{branchName}");
}

function resolveContextDir(projectKey: string, handoff: JsonObject, branchName: string): string {
  return homePath(
    expandTemplate(handoff.contextDirTemplate ?? defaultContextDirTemplate(projectKey), {
      projectKey,
      branchName,
    }),
  );
}

function projectAgentsCandidates(descriptor: JsonObject): string[] {
  const candidates: string[] = [];
  if (typeof descriptor.projectAgentsPath === "string" && descriptor.projectAgentsPath) {
    candidates.push(homePath(descriptor.projectAgentsPath));
  }
  if (typeof descriptor.projectRootPath === "string" && descriptor.projectRootPath) {
    candidates.push(path.join(homePath(descriptor.projectRootPath), "AGENTS.md"));
  }
  if (typeof descriptor.opencodeProjectRootPath === "string" && descriptor.opencodeProjectRootPath) {
    candidates.push(path.join(homePath(descriptor.opencodeProjectRootPath), "AGENTS.md"));
  }
  return uniquePaths(candidates);
}

async function firstAccessiblePath(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function realpathOrResolve(p: string): Promise<string> {
  try {
    return normalizeSlashes(await fs.realpath(p));
  } catch {
    return normalizeSlashes(path.resolve(p));
  }
}

async function repoMatchesProjectRoot(repoRoot: string, projectRoot: string): Promise<boolean> {
  if (!repoRoot || !projectRoot) return false;
  const repoReal = await realpathOrResolve(repoRoot);
  const projectReal = await realpathOrResolve(projectRoot);
  const relative = path.relative(projectReal, repoReal);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function isSafeGitRef(ref: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._/@:-]{0,200}$/.test(ref) && !ref.includes("..") && !ref.endsWith(".lock");
}

async function resolveBaselineRef(descriptor: JsonObject): Promise<string | null> {
  const candidates: string[] = [];
  try {
    const originHead = (await Bun.$`git symbolic-ref refs/remotes/origin/HEAD`.text()).trim();
    const branch = originHead.replace(/^refs\/remotes\/origin\//, "");
    if (branch) candidates.push(`origin/${branch}`, branch);
  } catch {
    /* origin/HEAD not configured */
  }
  if (typeof descriptor.baselineBranchForMaterialChanges === "string" && descriptor.baselineBranchForMaterialChanges) {
    const configured = descriptor.baselineBranchForMaterialChanges;
    candidates.push(configured.startsWith("origin/") ? configured : `origin/${configured}`, configured);
  }
  candidates.push("origin/main", "main", "origin/master", "master");

  for (const candidate of uniquePaths(candidates)) {
    if (!isSafeGitRef(candidate)) continue;
    try {
      await Bun.$`git rev-parse --verify ${candidate}`.quiet();
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function resolveMergeBaseBaseline(descriptor: JsonObject): Promise<string | null> {
  const baselineRef = await resolveBaselineRef(descriptor);
  if (!baselineRef) return null;
  try {
    return (await Bun.$`git merge-base HEAD ${baselineRef}`.text()).trim();
  } catch {
    return null;
  }
}

async function resolveWindowBaseline(maxCommits: number): Promise<string> {
  try {
    return (await Bun.$`git rev-parse --verify HEAD~${maxCommits}`.text()).trim();
  } catch {
    try {
      return (await Bun.$`git rev-list --max-parents=0 HEAD`.text()).trim().split(/\r?\n/)[0];
    } catch {
      return (await Bun.$`git rev-parse HEAD`.text()).trim();
    }
  }
}

async function verifyGitRef(ref: string): Promise<boolean> {
  if (!isSafeGitRef(ref)) return false;
  try {
    await Bun.$`git rev-parse --verify ${ref}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function bootstrapBranchEngine(
  projectKey: string,
  params: { branchName?: string; helperIds?: string[]; includePhases?: boolean } = {},
  context: any,
) {
  const loaded = await loadDescriptor(projectKey);
  if (!loaded.ok) return loaded.error;
  const descriptor = loaded.descriptor;

  const repoRoot = normalizeSlashes((await Bun.$`git rev-parse --show-toplevel`.text()).trim());
  const projectRoot = normalizeSlashes(descriptor.projectRootPath ?? "");
  if (!(await repoMatchesProjectRoot(repoRoot, projectRoot))) {
    return { applicable: false, reason: "workspace_not_in_project", repoRoot, expectedProjectRoot: projectRoot };
  }

  const branchName = params.branchName ?? (await Bun.$`git rev-parse --abbrev-ref HEAD`.text()).trim();
  if (!branchName || branchName === "HEAD") return { applicable: false, reason: "detached_head" };
  if (!isSafeBranchName(branchName)) {
    return {
      applicable: false,
      reason: "invalid_branch_name",
      branch: branchName,
      recommended_next_step: "use_a_valid_git_branch_name",
    };
  }

  const headSha = (await Bun.$`git rev-parse HEAD`.text()).trim();
  const area = inferArea(descriptor, context.directory ?? repoRoot);

  const handoff = descriptor.branchHandoff ?? {};
  const branchDir = resolveContextDir(projectKey, handoff, branchName);
  const helpers = getHelperDefinitions(handoff);
  const defaultHelperIds = helpers.filter((helper) => helper.bootstrap === "always").map((helper) => helper.id);
  if (params.includePhases) {
    const phasesHelper = helperDefinitionByRole(helpers, "phases");
    if (phasesHelper) defaultHelperIds.push(phasesHelper.id);
  }
  const selectedIds = new Set(params.helperIds ?? defaultHelperIds);
  const unknownHelperIds = [...selectedIds].filter((id) => !helpers.some((helper) => helper.id === id));
  if (unknownHelperIds.length) {
    return {
      applicable: false,
      reason: "unknown_helper_ids",
      unknown_helper_ids: unknownHelperIds,
      supported_helpers: helpers.map((helper) => helper.id),
      recommended_next_step: "choose_supported_helpers",
    };
  }
  const selectedHelpers = helpers.filter((helper) => selectedIds.has(helper.id));
  if (!selectedHelpers.length) {
    return {
      applicable: false,
      reason: "helper_selection_required",
      supported_helpers: helpers.map((helper) => helper.id),
      recommended_next_step: "select_branch_helpers",
    };
  }
  const primaryMergeRequestHelper = helperDefinitionByRole(helpers, "merge_request");
  const logHelper = helperDefinitionByRole(helpers, "log");
  const phasesHelper = helperDefinitionByRole(helpers, "phases");
  const reviewHelper = helperDefinitionByRole(helpers, "review");
  const primaryMr = primaryMergeRequestHelper ? helperFilePath(branchDir, primaryMergeRequestHelper) : null;
  const logFile = logHelper ? helperFilePath(branchDir, logHelper) : null;
  const phasesFile = phasesHelper ? helperFilePath(branchDir, phasesHelper) : null;
  const reviewFile = reviewHelper ? helperFilePath(branchDir, reviewHelper) : null;

  const templatesDir = homePath(
    expandTemplate(handoff.templatesDir ?? path.join(opencodeHome(), "projects", projectKey, "_templates", "mr"), {
      projectKey,
      branchName,
    }),
  );

  await fs.mkdir(branchDir, { recursive: true });

  const manifestRead = await readBranchHelperManifest(branchDir, handoff);
  if (manifestRead.error) {
    return {
      applicable: false,
      reason: "invalid_helper_manifest",
      helper_manifest_path: helperManifestPath(branchDir, handoff),
      detail: manifestRead.error,
      recommended_next_step: "repair_or_move_manifest",
    };
  }
  const manifest = manifestRead.helpers;
  const helpersCreated: Record<string, string> = {};
  const helpersTracked: Record<string, string> = {};
  const preparedHelpers = new Map<string, { path: string; content: string; alreadyExists: boolean }>();

  for (const helper of selectedHelpers) {
    const helperPath = helperFilePath(branchDir, helper);
    const helperInspection = await inspectContainedFile(branchDir, helperPath);
    if (!helperInspection.safe) {
      return {
        applicable: false,
        reason: "unsafe_helper_path",
        helper: helper.id,
        helper_path: helperPath,
        detail: helperInspection.reason,
        recommended_next_step: "remove_symlinks_or_repair_helper_path",
      };
    }
    const alreadyExists = helperInspection.exists;
    let content = "";
    if (!alreadyExists) {
      content = `# ${helper.filename}\n`;
      if (helper.templateFilename) {
        const templatePath = path.join(templatesDir, helper.templateFilename);
        const templateInspection = await inspectContainedFile(templatesDir, templatePath);
        if (!templateInspection.safe) {
          return {
            applicable: false,
            reason: "unsafe_helper_template",
            helper: helper.id,
            template_path: templatePath,
            detail: templateInspection.reason,
          };
        }
        if (!templateInspection.exists) {
          return {
            applicable: false,
            reason: "missing_helper_template",
            helper: helper.id,
            template_path: templatePath,
          };
        }
        try {
          content = await fs.readFile(templatePath, "utf8");
        } catch (e) {
          return {
            applicable: false,
            reason: "missing_helper_template",
            helper: helper.id,
            template_path: templatePath,
            detail: String(e),
          };
        }
      }
      content = content.replaceAll(helper.branchPlaceholder ?? "<branch-name>", branchName);
      if (helper.role === "log") {
        content = content.replaceAll("<commit-sha>", headSha);
        content = content.replace(/##\s+\d{4}-\d{2}-\d{2}.*\n/, `## ${formatTimestamp(new Date())}\n`);
        content = content.replace(/^area:\s*.*$/m, `area: ${area === "unknown" ? "unknown" : area}`);
      }
    }
    preparedHelpers.set(helper.id, { path: helperPath, content, alreadyExists });
  }

  const createdPaths: string[] = [];
  let helperManifest: string;
  try {
    for (const helper of selectedHelpers) {
      const prepared = preparedHelpers.get(helper.id)!;
      if (!prepared.alreadyExists) {
        await fs.writeFile(prepared.path, prepared.content, { encoding: "utf8", mode: 0o600, flag: "wx" });
        createdPaths.push(prepared.path);
        helpersCreated[helper.id] = prepared.path;
      }
      manifest[helper.id] = manifestEntryFor(prepared.path, branchDir);
      helpersTracked[helper.id] = prepared.path;
    }
    helperManifest = await writeBranchHelperManifest(branchDir, handoff, manifest);
  } catch (error) {
    await Promise.all(createdPaths.map((createdPath) => fs.unlink(createdPath).catch(() => undefined)));
    return {
      applicable: false,
      reason: "bootstrap_write_failed",
      detail: String(error),
      rolled_back_helpers: Object.keys(helpersCreated),
      recommended_next_step: "check_branch_context_permissions_and_retry",
    };
  }
  const helperState = await reconcileBranchHelpers(branchDir, handoff);
  const mrPaths = existingHelpersByRole(helperState, "merge_request").map((helper) => helper.path);

  return {
    applicable: true,
    refresh_contract_version: 3,
    descriptor_schema_version: Number(descriptor.descriptorSchemaVersion ?? 1),
    projectKey,
    branch: branchName,
    headCommit: headSha,
    helper_manifest_path: helperManifest,
    manifest_error: helperState.manifest_error,
    supported_helpers: helperState.supported_helpers,
    tracked_helpers: helperState.tracked_helpers,
    existing_helpers: helperState.existing_helpers,
    missing_helpers: helperState.missing_helpers,
    untracked_helpers: helperState.untracked_helpers,
    unsupported_helpers: helperState.unsupported_helpers,
    available_helpers: helperState.available_helpers,
    removed_helpers: helperState.removed_helpers,
    helper_drift: helperState.helper_drift,
    mr_context_path: primaryMr ?? "none",
    mr_context_paths: mrPaths,
    log_context_path: logFile,
    phases_context_path: phasesFile,
    review_context_path: reviewFile,
    created: {
      helpers: helpersCreated,
      tracked: helpersTracked,
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
  if (
    args.maxCommits !== undefined &&
    (!Number.isInteger(args.maxCommits) || args.maxCommits < 1 || args.maxCommits > 1000)
  ) {
    return {
      applicable: false,
      reason: "invalid_max_commits",
      recommended_next_step: "use_max_commits_between_1_and_1000",
    };
  }

  const mode = resolveHandoffMode(descriptor, args.handoffMode);

  const repoRoot = normalizeSlashes((await Bun.$`git rev-parse --show-toplevel`.text()).trim());
  const projectRoot = normalizeSlashes(descriptor.projectRootPath ?? "");
  if (!(await repoMatchesProjectRoot(repoRoot, projectRoot))) {
    return { applicable: false, reason: "workspace_not_in_project", repoRoot, expectedProjectRoot: projectRoot };
  }

  const branch = (await Bun.$`git rev-parse --abbrev-ref HEAD`.text()).trim();
  if (!branch || branch === "HEAD") return { applicable: false, reason: "detached_head" };
  if (!isSafeBranchName(branch)) {
    return {
      applicable: false,
      reason: "invalid_branch_name",
      branch,
      recommended_next_step: "use_a_valid_git_branch_name",
    };
  }
  const head = (await Bun.$`git rev-parse HEAD`.text()).trim();
  if (args.checkpointCommit && !(await verifyGitRef(args.checkpointCommit))) {
    return { applicable: false, reason: "invalid_checkpoint_commit", checkpoint_commit: args.checkpointCommit };
  }

  const handoff = descriptor.branchHandoff ?? {};
  const dir = resolveContextDir(projectKey, handoff, branch);
  const helperState = await reconcileBranchHelpers(dir, handoff);
  const mergeRequestHelpers = existingHelpersByRole(helperState, "merge_request");
  const primaryMergeRequestHelper = mergeRequestHelpers[0] ?? null;
  const logHelper = firstExistingHelperByRole(helperState, "log");
  const phasesHelper = firstExistingHelperByRole(helperState, "phases");
  const reviewHelper = firstExistingHelperByRole(helperState, "review");
  const configuredMergeRequest = helperDefinitionByRole(helperState.supported, "merge_request");
  const configuredLog = helperDefinitionByRole(helperState.supported, "log");
  const configuredPhases = helperDefinitionByRole(helperState.supported, "phases");
  const configuredReview = helperDefinitionByRole(helperState.supported, "review");
  const logPath = logHelper?.path ?? (configuredLog ? helperFilePath(dir, configuredLog) : null);
  const phases = phasesHelper?.path ?? (configuredPhases ? helperFilePath(dir, configuredPhases) : null);
  const reviewPath = reviewHelper?.path ?? (configuredReview ? helperFilePath(dir, configuredReview) : null);
  const configuredMrPath = configuredMergeRequest ? helperFilePath(dir, configuredMergeRequest) : null;
  const branchSyncStaleAfterMinutes =
    typeof descriptor.branchSyncStaleAfterMinutes === "number" ? descriptor.branchSyncStaleAfterMinutes : 60;
  const branchSync = await resolveBranchSyncStatus(branchSyncStaleAfterMinutes);
  const localStateDirname = configuredLocalStateDirname(descriptor);
  const activeBranchContext = classifyBranchContext(projectKey, projectRoot, dir, localStateDirname);
  const alternateBranchContextDetected = await detectAlternateBranchContext(
    projectKey,
    projectRoot,
    branch,
    dir,
    handoff,
    localStateDirname,
  );

  const mrPathsResolved = mergeRequestHelpers.map((helper) => helper.path);
  let mrText: string | null = null;
  let primaryMr: string | null = primaryMergeRequestHelper?.path ?? null;
  if (primaryMr) {
    try {
      mrText = await fs.readFile(primaryMr, "utf8");
    } catch {
      primaryMr = null;
      mrText = null;
    }
  }

  let logText: string | null = null;
  if (logHelper) {
    try {
      logText = await fs.readFile(logHelper.path, "utf8");
    } catch {
      logText = null;
    }
  }

  let reviewText: string | null = null;
  if (reviewHelper) {
    try {
      reviewText = await fs.readFile(reviewHelper.path, "utf8");
    } catch {
      reviewText = null;
    }
  }
  const reviewMetadata = reviewText ? parseReviewMetadata(reviewText) : {};
  const reviewedHead = reviewMetadata.reviewed_head ?? null;
  const reviewState = !reviewText
    ? "new_review"
    : reviewedHead
      ? reviewedHead === head
        ? "existing_current"
        : "existing_head_moved"
      : "existing_unknown_head";
  const headHasMovedSinceReview = reviewedHead ? reviewedHead !== head : reviewText ? null : false;
  const openReviewFindings = reviewText ? summarizeOpenReviewFindings(reviewText) : [];

  const phasesPresent = Boolean(phasesHelper);

  // Fix B: cache extractCheckpoint result
  const field = handoff.checkpointField ?? "reviewed_through";
  const maxCommits = args.maxCommits ?? 10;
  const cachedCheckpoint = logText ? extractCheckpoint(logText, field) : null;
  let baseline: string;
  let checkpointSource: string;

  if (mode !== "lite" && logText) {
    baseline = args.checkpointCommit ?? cachedCheckpoint ?? "";
    checkpointSource = args.checkpointCommit ? "arg" : cachedCheckpoint ? "log_field" : "merge_base";
    if (!baseline) {
      const mergeBase = await resolveMergeBaseBaseline(descriptor);
      if (mergeBase) {
        baseline = mergeBase;
        checkpointSource = "merge_base";
      } else {
        baseline = await resolveWindowBaseline(maxCommits);
        checkpointSource = "fallback_window";
      }
    }
  } else if (mode !== "lite") {
    const mergeBase = await resolveMergeBaseBaseline(descriptor);
    if (mergeBase) {
      baseline = mergeBase;
      checkpointSource = "merge_base";
    } else {
      baseline = await resolveWindowBaseline(maxCommits);
      checkpointSource = "fallback_window";
    }
  } else {
    baseline = await resolveWindowBaseline(maxCommits);
    checkpointSource = "lite_window";
  }

  const diffRange = `${baseline}..HEAD`;
  let changed: string[] = [];
  try {
    changed = (await Bun.$`git -c core.quotepath=false diff --name-only -z ${diffRange}`.text())
      .split("\0")
      .map((s) => s)
      .filter(Boolean);
  } catch {
    changed = [];
  }

  const areaHits = changed.map((rel) => inferAreaFromRepoRelativePath(descriptor, repoRoot, rel));
  const changed_areas = uniqueAreas(areaHits);
  const reviewFiles = partitionReviewFiles(changed, descriptor.reviewIgnoredPathGlobs);

  const opencodeRoot = descriptor.opencodeProjectRootPath as string;
  const activeArea = inferArea(descriptor, context.directory ?? repoRoot);

  // Fix E: only include active area package knowledge (KNOWLEDGE.md preferred, AGENTS.md fallback), not all areas
  const reread: string[] = [];
  const projectAgentsPath = await firstAccessiblePath(projectAgentsCandidates(descriptor));
  if (projectAgentsPath) reread.push(projectAgentsPath);

  const rootKnowledgeCandidates = uniquePaths([
    projectAgentsPath ? path.join(path.dirname(projectAgentsPath), "KNOWLEDGE.md") : "",
    path.join(opencodeRoot, "KNOWLEDGE.md"),
  ]);
  const rootKnowledge = await firstAccessiblePath(rootKnowledgeCandidates);
  if (rootKnowledge) reread.push(rootKnowledge);
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
  if (
    !helperState.manifest_error &&
    !reread.includes(helperState.manifestPath) &&
    (await pathExists(helperState.manifestPath))
  ) {
    reread.push(helperState.manifestPath);
  }
  for (const helper of helperState.entries.filter((entry) => entry.exists)) {
    if (!reread.includes(helper.path)) reread.push(helper.path);
  }

  const last_log_age_minutes = logHelper ? await fileMtimeMinutes(logHelper.path) : null;
  const needs_checkpoint =
    changed.length > 8 || (last_log_age_minutes !== null && last_log_age_minutes > 180 && changed.length > 0);
  const log_append_recommended = Boolean(logText) && (changed.length > 0 || needs_checkpoint);
  const mr_update_recommended = mrUpdateRecommendedFromReview({
    reviewPresent: Boolean(reviewText) && Boolean(mrText),
    openFindingsCount: openReviewFindings.length,
    reviewState,
  });
  const narrative_drift_suspected = narrativeDriftSuspected({
    phasesPresent,
    changedFilesCount: changed.length,
    mrText,
    head,
  });
  const unlogged_commit_source_hint = await commitSourceHint(baseline, branchSync.upstream_ref);
  const reconciliation_recommended = reconciliationRecommendations({
    changedFilesCount: changed.length,
    logPresent: Boolean(logText),
    phasesPresent,
    reviewState,
    mrUpdateRecommended: mr_update_recommended,
  });

  let context_staleness: "fresh" | "aging" | "unknown" = "unknown";
  if (last_log_age_minutes !== null) {
    if (last_log_age_minutes < 120) context_staleness = "fresh";
    else context_staleness = "aging";
  }

  // Fix C: agents_stale_vs_branch with threshold to reduce false positives.
  // Project AGENTS.md may live in the project repo or in legacy OpenCode state, so use the
  // descriptor-backed path that was actually reread.
  // Only flag as stale if the file was modified >1 hour after the merge-base commit.
  let agents_stale_vs_branch: boolean | null = null;
  try {
    if (!projectAgentsPath) throw new Error("project AGENTS.md not found");
    const baselineRef = await resolveBaselineRef(descriptor);
    if (!baselineRef) throw new Error("baseline ref not found");
    const mergeBase = (await Bun.$`git merge-base HEAD ${baselineRef}`.text()).trim();
    const agentsMtime = (await fs.stat(projectAgentsPath)).mtimeMs;
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
    refresh_contract_version: 3,
    descriptor_schema_version: Number(descriptor.descriptorSchemaVersion ?? 1),
    helper_manifest_path: helperState.manifestPath,
    manifest_error: helperState.manifest_error,
    supported_helpers: helperState.supported_helpers,
    tracked_helpers: helperState.tracked_helpers,
    existing_helpers: helperState.existing_helpers,
    missing_helpers: helperState.missing_helpers,
    untracked_helpers: helperState.untracked_helpers,
    unsupported_helpers: helperState.unsupported_helpers,
    available_helpers: helperState.available_helpers,
    removed_helpers: helperState.removed_helpers,
    helper_drift: helperState.helper_drift,
    branch_context_readable: {
      merge_request_readable: Boolean(mrText),
      log_readable: Boolean(logText),
      phases_file_present: phasesPresent,
      review_file_present: Boolean(reviewText),
    },
    projectKey,
    branch,
    handoff_mode: mode,
    area: activeArea,
    checkpoint_commit: baseline,
    checkpoint_source: checkpointSource,
    head_commit: head,
    changed_files_preview: changed.slice(0, args.refreshMode === "full" ? 150 : 40),
    changed_files_count: changed.length,
    changed_areas,
    review_ignored_path_globs: reviewFiles.validGlobs,
    reviewable_changed_files_preview: reviewFiles.reviewable.slice(0, args.refreshMode === "full" ? 150 : 40),
    reviewable_changed_files_count: reviewFiles.reviewable.length,
    ignored_changed_files_preview: reviewFiles.ignored.slice(0, args.refreshMode === "full" ? 150 : 40),
    ignored_changed_files_count: reviewFiles.ignored.length,
    reread_files: reread,
    mr_context_path: primaryMr ?? configuredMrPath ?? "none",
    mr_context_paths: mrPathsResolved,
    log_context_path: logPath,
    phases_context_path: phases,
    review_context_path: reviewPath,
    review_path: reviewText ? reviewPath : "none",
    review_present: Boolean(reviewText),
    review_state: reviewState,
    review_metadata: reviewMetadata,
    reviewed_head: reviewedHead,
    head_has_moved_since_review: headHasMovedSinceReview,
    open_review_findings: openReviewFindings,
    ...branchSync,
    branch_sync_stale_after_minutes: branchSyncStaleAfterMinutes,
    active_branch_context: activeBranchContext,
    alternate_branch_context_detected: alternateBranchContextDetected,
    unlogged_commit_source_hint,
    reconciliation_recommended,
    last_log_age_minutes,
    needs_checkpoint,
    context_staleness,
    log_append_recommended,
    mr_update_recommended,
    narrative_drift_suspected,
    agents_stale_vs_branch,
    subtaskModels: descriptor.subtaskModels ?? {},
  };
}
