import { getAuth } from "firebase-admin/auth"
import User from "../models/user.model.js"
import { app } from "../config/firebase.js"
import crypto from "crypto"

export const login = async (req, res) => {
    try {
        const { token } = req.body

        console.log("Login request received")

        const decoded = await getAuth(app).verifyIdToken(token)

        console.log("Firebase token verified:", decoded.email)

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

        const sessionId = crypto.randomUUID()

        res.cookie("sessionId", sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json(user)

    } catch (error) {
        console.error("LOGIN ERROR:", error)

        return res.status(500).json({
            message: `login error ${error.message}`
        })
    }
}