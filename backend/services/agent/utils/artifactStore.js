/**
 * artifactStore.js
 * Artifact file storage + unified artifact response builder.
 *
 * Storage is configured through environment variables:
 *   ARTIFACT_STORAGE_PATH     - directory where artifact files are written
 *                                (defaults to <agent cwd>/artifacts)
 *   ARTIFACT_PUBLIC_BASE_URL  - public URL prefix used in API responses
 *                                (defaults to http://localhost:8000/api/artifacts)
 *
 * Artifacts are served publicly by the Gateway and Agent service at
 * `/api/artifacts/<filename>` so that <img>, <iframe> and downloads work
 * without credentials.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_STORAGE_PATH = path.resolve(process.cwd(), "artifacts");

/** Resolve the absolute storage directory from env (or default). */
export function getStorageDir() {
  return path.resolve(process.env.ARTIFACT_STORAGE_PATH || DEFAULT_STORAGE_PATH);
}

/** Ensure the artifact storage directory exists. */
export function ensureArtifactStorage() {
  const dir = getStorageDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Public base URL used to build artifact URLs for the frontend. */
export function getArtifactPublicBaseUrl() {
  const url =
    process.env.ARTIFACT_PUBLIC_BASE_URL || "http://localhost:8000/api/artifacts";
  return url.replace(/\/+$/, "");
}

/** Sanitize a filename into safe [a-zA-Z0-9._-] characters. */
export function sanitizeFilename(name) {
  const base = String(name || "artifact")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "artifact";
}

/**
 * Save an artifact file (Buffer/Uint8Array) to storage.
 * Returns { name, mimeType, url, filePath }.
 */
export async function saveArtifact({ data, filename, mimeType }) {
  ensureArtifactStorage();

  // Guarantee a unique filename so regenerations never collide.
  const safe = sanitizeFilename(filename);
  const ext = path.extname(safe);
  const base = path.basename(safe, ext);
  const unique = `${base}-${crypto.randomBytes(4).toString("hex")}${ext || ".bin"}`;

  const filePath = path.join(getStorageDir(), unique);
  await fsp.writeFile(filePath, Buffer.from(data));

  return {
    name: unique,
    mimeType: mimeType || "application/octet-stream",
    url: `${getArtifactPublicBaseUrl()}/${unique}`,
    filePath,
  };
}

/**
 * Build the unified artifact response object described in the project spec:
 *
 * {
 *   type: "artifact",
 *   artifactType: "image | pdf | pptx | code | html | other",
 *   name: "example.ext",
 *   mimeType: "...",
 *   url: "...",
 *   preview: { type: "image | pdf | slides | iframe | code | text" },
 *   metadata: {}
 * }
 */
export function createArtifact({
  artifactType,
  name,
  mimeType,
  url,
  previewType,
  metadata = {},
}) {
  return {
    type: "artifact",
    artifactType,
    name,
    mimeType,
    url, // null when no file is stored (e.g. plain code artifacts)
    preview: { type: previewType || "text" },
    metadata,
  };
}