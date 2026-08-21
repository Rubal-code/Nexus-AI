import redis from "../../shared/redis/redis.js";

const protect = async (req, res, next) => {
    try {
        console.log("AUTH MIDDLEWARE CALLED");

        const sessionId = req.cookies.sessionId;

        console.log("Cookies:", req.cookies);
        console.log("Session ID:", sessionId);

        if (!sessionId) {
            return res.status(401).json({
                message: "Unauthorized - no session"
            });
        }

        console.log("Checking Redis...");

        const session = await redis.get(`session-${sessionId}`);

        console.log("Redis session:", session);

        if (!session) {
            return res.status(401).json({
                message: "Unauthorized - session not found"
            });
        }

        const user = JSON.parse(session);

        console.log("USER FOUND:", user);

        req.user = user;

        console.log("CALLING NEXT");

        return next();

    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(500).json({
            message: "Authentication middleware error"
        });
    }
};

export default protect;