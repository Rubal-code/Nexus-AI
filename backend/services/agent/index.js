import "./loadEnv.js"
import express from "express"
import cookieParser from "cookie-parser"
import connectDB from "./config/db.js"
import agentRouter from "./routes/agent.routes.js"
import { ensureArtifactStorage } from "./utils/artifactStore.js"

const port = process.env.PORT || 8003

const app = express()

app.use(express.json())
app.use(cookieParser())

// Public artifact storage: generated files (images, PDFs, PPTX, preview HTML)
// are served without auth so <img>/<iframe> previews work in the browser.
const artifactStorage = ensureArtifactStorage()
app.use("/api/artifacts", express.static(artifactStorage, {
    index: false,
    fallthrough: true,
    maxAge: "1h",
}))

app.use("/", agentRouter)

app.get("/health", (req, res) => {
    res.json({ message: "Agent service is running", status: "ok" })
})

app.listen(port, () => {
    console.log(`Agent service is running at port ${port}`)
    connectDB()
})
