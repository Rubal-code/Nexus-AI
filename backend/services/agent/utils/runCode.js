/**
 * runCode.js
 * Optional, opt-in server-side code execution for non-browser languages
 * (Python / JavaScript). Enabled only when CODE_EXEC_ENABLED=true AND the
 * corresponding runtime is available. Everything is executed with a hard
 * timeout and output is capped — nothing is ever auto-executed otherwise.
 */
import { spawn } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const MAX_STDOUT = 8000;

function execWithTimeout({ cmd, args, env, timeoutMs, input }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, timeoutMs);

    child.stdout.on("data", (c) => {
      stdout += c.toString().slice(0, MAX_STDOUT - stdout.length);
    });
    child.stderr.on("data", (c) => {
      stderr += c.toString().slice(0, MAX_STDOUT - stderr.length);
    });

    if (input !== undefined) child.stdin.write(input);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ executed: false, reason: `Failed to start process: ${err.message}` });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ executed: false, reason: `Execution timed out after ${timeoutMs}ms` });
      } else {
        resolve({ executed: true, exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
}

/**
 * Optional code execution.
 * Returns:
 *   { executed: false, reason: "..." } when disabled/unsupported
 *   { executed: true, exitCode, stdout, stderr } on success
 */
export async function runCode({ language, code, timeoutMs = 6000 }) {
  if (process.env.CODE_EXEC_ENABLED !== "true") {
    return { executed: false, reason: "Server-side code execution is disabled (CODE_EXEC_ENABLED=true to enable)." };
  }

  const lang = (language || "").toLowerCase();

  if (lang === "python" || lang === "py") {
    const python = process.env.PYTHON_PATH || "python";
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-py-"));
    try {
      const scriptPath = path.join(tmpDir, "main.py");
      await fsp.writeFile(scriptPath, code);
      return await execWithTimeout({
        cmd: python,
        args: [scriptPath],
        timeoutMs,
        env: { PYTHONUNBUFFERED: "1" },
      });
    } catch (error) {
      return { executed: false, reason: error.message };
    } finally {
      fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  if (lang === "javascript" || lang === "js" || lang === "typescript" || lang === "ts" || lang === "node") {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-js-"));
    try {
      const scriptPath = path.join(tmpDir, "main.mjs");
      await fsp.writeFile(scriptPath, code);
      return await execWithTimeout({
        cmd: process.execPath,
        args: [scriptPath],
        timeoutMs,
      });
    } catch (error) {
      return { executed: false, reason: error.message };
    } finally {
      fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  return { executed: false, reason: `Execution not supported for language: ${language || "unknown"}` };
}