export const getCurrentUser = async (req, res) => {
    try {
        return res.status(200).json(req.user || null)
    } catch (error) {
        console.error("GET CURRENT USER ERROR:", error)

        return res.status(500).json({
            message: `get current user error ${error}`
        })
    }
}
