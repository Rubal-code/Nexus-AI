import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"

dotenv.config()

const port=process.env.PORT 

const app=express();

app.get("/",(req,res)=>{
    res.json({message:"Auth service is running"})
})

app.listen(port,()=>{
    console.log(`Auth service is running at port ${port}`)
    connectDB()
})