import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import router from "./routes/auth.router.js"

dotenv.config()

const port = process.env.PORT

const app = express()

app.use(express.json())

app.use("/", router)

app.get("/", (req, res) => {
    res.json({ message: "Auth service is running" })
})

app.listen(port, () => {
    console.log(`Auth service is running at port ${port}`)
    connectDB()
})