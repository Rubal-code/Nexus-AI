export const getCurrentUser = async (req, res) => {
    try {
        console.log("GET CURRENT USER CALLED");
        console.log("REQ.USER:", req.user);

        return res.status(200).json(req.user);

    } catch (error) {
        console.error("GET CURRENT USER ERROR:", error);

        return res.status(500).json({
            message: `get current user error ${error}`
        });
    }
};