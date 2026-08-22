import { getAuth } from "firebase-admin/auth"
import User from "../models/user.model.js"
import { app } from "../config/firebase.js"
import crypto from "crypto"
import redis from "../../../shared/redis/redis.js"

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

const toPublicUser = (user) => ({
    userId: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar
})

export const login = async (req, res) => {
    try {
        const { token } = req.body

        if (!token) {
            return res.status(400).json({
                message: "Firebase token is required"
            })
        }

        const decoded = await getAuth(app).verifyIdToken(token)

        let user = await User.findOne({
            firebaseUid: decoded.uid
        })

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture
            })
        }

        const publicUser = toPublicUser(user)
        const sessionId = crypto.randomUUID()

        await redis.set(
            `session-${sessionId}`,
            JSON.stringify(publicUser),
            "EX",
            SESSION_TTL_SECONDS
        )

        res.cookie("sessionId", sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_TTL_SECONDS * 1000
        })

        return res.status(200).json(publicUser)
    } catch (error) {
        console.error("LOGIN ERROR:", error)

        return res.status(500).json({
            message: `login error ${error.message}`
        })
    }
}

export const logOut = async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId

        if (sessionId) {
            await redis.del(`session-${sessionId}`)
        }

        res.clearCookie("sessionId", { path: "/" })

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error) {
        console.error("LOGOUT ERROR:", error)

        return res.status(500).json({
            message: `logout error ${error.message}`
        })
    }
}
