import "./loadEnv.js"
import express from "express"
import proxy from "express-http-proxy"
import cors from "cors"
import cookieParser from "cookie-parser"
import net from "node:net"

import { getCurrentUser } from "./controllers/user.controller.js"
import protect, { optionalAuth } from "./middleware/auth.middleware.js"

const port = process.env.PORT || 8000
const authService = process.env.AUTH_SERVICE || "http://127.0.0.1:8001"
const chatService = process.env.CHAT_SERVICE || "http://127.0.0.1:8002"
const agentService = process.env.AGENT_SERVICE || "http://127.0.0.1:8003"
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"

// ---------------------------------------------------------------------------
// Service readiness handling.
//
// The backend services take several seconds to boot (MongoDB/Redis
// connections, etc.) while the gateway itself starts almost instantly. If the
// very first request arrives while a target service is still starting, the
// proxy would get ECONNREFUSED and fail with a 502.
//
// To remove that startup race, every proxy request first waits (up to
// SERVICE_WAIT_TIMEOUT ms) for the target service's TCP port to accept
// connections, then forwards as usual. Once a service is known to be ready,
// requests pass through immediately with no extra latency.
// ---------------------------------------------------------------------------
const SERVICE_WAIT_TIMEOUT = Number(process.env.SERVICE_WAIT_TIMEOUT || 15000)
const SERVICE_POLL_INTERVAL = 300
const serviceReady = new Map()

function isPortOpen(host, portNumber, timeout = 500) {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port: portNumber, timeout })
        const done = (ok) => {
            socket.destroy()
            resolve(ok)
        }
        socket.on("connect", () => done(true))
        socket.on("timeout", () => done(false))
        socket.on("error", () => done(false))
    })
}

async function waitForService(serviceUrl) {
    if (serviceReady.get(serviceUrl)) return true

    let hostname, portNumber
    try {
        const url = new URL(serviceUrl)
        hostname = url.hostname.replace(/^\[|\]$/g, "")
        portNumber = Number(url.port || (url.protocol === "https:" ? 443 : 80))
    } catch {
        return false
    }

    const deadline = Date.now() + SERVICE_WAIT_TIMEOUT
    while (Date.now() < deadline) {
        if (await isPortOpen(hostname, portNumber)) {
            serviceReady.set(serviceUrl, true)
            console.log(`[Gateway] Service is ready -> ${serviceUrl}`)
            return true
        }
        await new Promise((r) => setTimeout(r, SERVICE_POLL_INTERVAL))
    }
    return false
}

const app = express()

// CORS: allow the configured frontend origin(s). FRONTEND_URL may be a
// comma-separated list. In development any localhost/127.0.0.1 origin is
// accepted so Vite's automatic port-bumping (5173 -> 5174 -> ...) and other
// local dev servers keep working. In production only listed origins pass.
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean)

const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        // Non-browser requests (curl, same-origin) have no Origin header
        if (!origin) return callback(null, true)

        let hostname = ""
        try {
            hostname = new URL(origin).hostname
        } catch {
            return callback(new Error(`Invalid Origin header: ${origin}`))
        }

        const isLocalhost = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname)

        if (allowedOrigins.includes(origin.replace(/\/$/, ""))) {
            return callback(null, true)
        }
        if (process.env.NODE_ENV !== "production" && isLocalhost) {
            return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
}

app.use(cors(corsOptions))

app.use(cookieParser())

// Helper: proxy with custom headers, service readiness wait, and error handling
const createServiceProxy = (serviceUrl, withAuth = false) => async (req, res, next) => {
    // Wait until the target service is actually listening (no-op once ready).
    // The request is paused while waiting so no body bytes are lost, then
    // resumed before the proxy streams it to the service.
    req.pause()
    const ready = await waitForService(serviceUrl)
    if (!ready) {
        console.error(`[Gateway] Service did not become ready in time -> ${serviceUrl}`)
        return res.status(502).json({
            message: `Service at ${serviceUrl} is unreachable. Please ensure all backend services are running.`,
            error: `Service at ${serviceUrl} did not become ready within ${SERVICE_WAIT_TIMEOUT}ms`
        })
    }
    req.resume()

    return proxy(serviceUrl, {
        parseReqBody: false,
        proxyReqOptDecorator: (proxyReqOpts) => {
            if (withAuth && req.user?.userId) {
                proxyReqOpts.headers["x-user-id"] = req.user.userId
            }
            return proxyReqOpts
        },
        proxyReqPathResolver: (req) => req.url,
        proxyErrorHandler: (err, res, next) => {
            console.error(`[Gateway Proxy Error -> ${serviceUrl}]:`, err.message)
            // Service may have restarted or gone down - re-check readiness on
            // the next request instead of assuming it is still up.
            serviceReady.delete(serviceUrl)
            return res.status(502).json({
                message: `Service at ${serviceUrl} is unreachable. Please ensure all backend services are running.`,
                error: err.message
            })
        }
    })(req, res, next)
}

// Public auth routes (raw streaming proxy, no global express.json before proxy)
app.use("/api/auth", createServiceProxy(authService, false))

// Public artifact files (generated images, PDFs, PPTX, preview HTML).
// These are served WITHOUT auth so <img>, <iframe> and download links work
// in the browser (cross-origin subresources cannot carry the httpOnly
// session cookie). Filenames are short random tokens.
app.use("/api/artifacts", async (req, res, next) => {
    const ready = await waitForService(agentService)
    if (!ready) {
        console.error("[Gateway Artifact Proxy Error]: agent service not ready")
        return res.status(404).json({ message: "Artifact not found" })
    }
    return proxy(agentService, {
        parseReqBody: false,
        proxyReqPathResolver: (r) => `/api/artifacts${r.url}`,
        proxyErrorHandler: (err, res, next) => {
            console.error("[Gateway Artifact Proxy Error]:", err.message)
            serviceReady.delete(agentService)
            return res.status(404).json({ message: "Artifact not found" })
        },
    })(req, res, next)
})

// Protected routes — require valid Redis session
app.use("/api/chat", protect, createServiceProxy(chatService, true))
app.use("/api/agent", protect, createServiceProxy(agentService, true))

// Current user from session (GET endpoint)
app.get("/api/me", optionalAuth, getCurrentUser)

app.get("/", (req, res) => {
    res.json({ message: "Gateway is running", status: "ok" })
})

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("[Gateway Error]:", err)
    res.status(500).json({ message: "Internal Gateway Error", error: err.message })
})

app.listen(port, () => {
    console.log(`Gateway is running at port ${port}`)
})
