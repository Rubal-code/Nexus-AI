import "./loadEnv.js"
import express from "express"
import cookieParser from "cookie-parser"
import connectDB from "./config/db.js"
import router from "./routes/auth.router.js"

const port = process.env.PORT || 8001

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use("/", router)

app.get("/", (req, res) => {
    res.json({ message: "Auth service is running" })
})

app.listen(port, () => {
    console.log(`Auth service is running at port ${port}`)
    connectDB()
})
