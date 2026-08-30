import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

const connectDB = async () => {
    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;