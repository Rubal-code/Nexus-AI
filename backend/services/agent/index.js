import "../auth/loadEnv.js";
import express from "express"
import cookieParser from "cookie-parser"
import connectDB from "./config/db.js"


const port = process.env.PORT || 8001

const app = express()

app.use(express.json())
app.use(cookieParser())



app.get("/", (req, res) => {
    res.json({ message: "chat service is running" })
})

app.listen(port, () => {
    console.log(`chat service is running at port ${port}`)
    connectDB()
})
