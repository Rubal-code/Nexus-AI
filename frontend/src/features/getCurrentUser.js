import api from "../../utils/axios"

const getCurrentUser = async () => {
    try {
        const { data } = await api.get("/api/me")
        return data
    } catch (error) {
        if (error.response?.status !== 401) {
            console.log("getCurrentUser error:", error.response?.data || error.message)
        }
        return null
    }
}

export default getCurrentUser
