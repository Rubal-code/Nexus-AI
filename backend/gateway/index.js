import "./loadEnv.js"
import express from "express"
import proxy from "express-http-proxy"
import cors from "cors"
import cookieParser from "cookie-parser"

import { getCurrentUser } from "./controllers/user.controller.js"
import { optionalAuth } from "./middleware/auth.middleware.js"

const port = process.env.PORT || 8000
const authService = process.env.AUTH_SERVICE || "http://localhost:8001"
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"

const app = express()

app.use(cors({
    origin: frontendUrl,
    credentials: true
}))

app.use(cookieParser())

app.use("/api/auth", proxy(authService, {
    parseReqBody: false,
    proxyReqPathResolver: (req) => req.url
}))

app.use("/api/chat",protect,proxyWithHeader(process.env.CHAT_SERVICE))

app.get("/api/me", optionalAuth, getCurrentUser)

app.get("/", (req, res) => {
    res.json({ message: "Gateway is running" })
})

app.listen(port, () => {
    console.log(`Gateway is running at port ${port}`)
})
