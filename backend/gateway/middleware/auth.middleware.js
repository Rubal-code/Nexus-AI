import redis from "../../shared/redis/redis.js"

const protect = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.sessionId

        if (!sessionId) {
            return res.status(401).json({
                message: "Unauthorized - no session"
            })
        }

        const session = await redis.get(`session-${sessionId}`)

        if (!session) {
            return res.status(401).json({
                message: "Unauthorized - session not found"
            })
        }

        req.user = JSON.parse(session)
        return next()
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error)

        return res.status(500).json({
            message: "Authentication middleware error"
        })
    }
}

export const optionalAuth = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.sessionId

        if (!sessionId) {
            req.user = null
            return next()
        }

        const session = await redis.get(`session-${sessionId}`)

        if (!session) {
            req.user = null
            return next()
        }

        req.user = JSON.parse(session)
        return next()
    } catch (error) {
        console.error("OPTIONAL AUTH ERROR:", error)
        req.user = null
        return next()
    }
}

export default protect
