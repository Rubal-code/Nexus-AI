import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

const services = [
  {
    name: "AUTH",
    color: colors.yellow,
    cwd: path.join(__dirname, "backend", "services", "auth"),
    cmd: "node",
    args: ["index.js"],
    port: 8001,
  },
  {
    name: "CHAT",
    color: colors.blue,
    cwd: path.join(__dirname, "backend", "services", "chat"),
    cmd: "node",
    args: ["index.js"],
    port: 8002,
  },
  {
    name: "AGENT",
    color: colors.magenta,
    cwd: path.join(__dirname, "backend", "services", "agent"),
    cmd: "node",
    args: ["index.js"],
    port: 8003,
  },
  {
    name: "GATEWAY",
    color: colors.cyan,
    cwd: path.join(__dirname, "backend", "gateway"),
    cmd: "node",
    args: ["index.js"],
    port: 8000,
  },
  {
    name: "FRONTEND",
    color: colors.green,
    cwd: path.join(__dirname, "frontend"),
    cmd: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    port: 5173,
  },
];

console.log(`${colors.bright}${colors.cyan}
====================================================================
               ✨ NEXUS AI - FULL STACK RUNNER ✨
====================================================================${colors.reset}
`);
console.log(`${colors.gray}Starting all 5 microservices concurrently...${colors.reset}\n`);

const runningProcesses = [];

function startService(service) {
  const isWindows = process.platform === "win32";
  const cmd = isWindows && service.cmd === "node" ? "node.exe" : service.cmd;

  const child = spawn(cmd, service.args, {
    cwd: service.cwd,
    stdio: ["pipe", "pipe", "pipe"],
    shell: isWindows,
    env: { ...process.env, FORCE_COLOR: "true" },
  });

  const prefix = `${service.color}[${service.name}]${colors.reset} `;

  child.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${prefix}${line}`);
      }
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${prefix}${colors.red}${line}${colors.reset}`);
      }
    }
  });

  child.on("error", (err) => {
    console.error(`${prefix}${colors.red}Failed to start: ${err.message}${colors.reset}`);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${prefix}${colors.dim}Exited with code ${code}${colors.reset}`);
    }
  });

  runningProcesses.push({ name: service.name, process: child });
}

// Start all services
services.forEach(startService);

// Print Dashboard Info after short delay
setTimeout(() => {
  console.log(`
${colors.bright}${colors.green}====================================================================
  🚀 ALL SERVICES STARTED SUCCESSFULLY!
====================================================================${colors.reset}
  ${colors.bright}👉 Web Application:${colors.reset}   ${colors.cyan}http://localhost:5173${colors.reset}
  ${colors.bright}👉 API Gateway:${colors.reset}       ${colors.cyan}http://localhost:8000${colors.reset}
  ${colors.bright}👉 Auth Service:${colors.reset}      ${colors.yellow}http://localhost:8001${colors.reset}
  ${colors.bright}👉 Chat Service:${colors.reset}      ${colors.blue}http://localhost:8002${colors.reset}
  ${colors.bright}👉 Agent Service:${colors.reset}     ${colors.magenta}http://localhost:8003${colors.reset}
${colors.gray}--------------------------------------------------------------------
  Press ${colors.bright}Ctrl + C${colors.reset}${colors.gray} to stop all services simultaneously.
====================================================================${colors.reset}
`);
}, 3000);

// Graceful cleanup on shutdown
function cleanup() {
  console.log(`\n${colors.yellow}Stopping all Nexus AI services...${colors.reset}`);
  for (const { name, process: child } of runningProcesses) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", child.pid, "/f", "/t"]);
      } else {
        child.kill("SIGTERM");
      }
    } catch (e) {
      // ignore kill errors
    }
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
