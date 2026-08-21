import api from "../../utils/axios"

const getCurrentUser = async () => {

  try {

    const {data} = await api.get("/api/me")

    console.log("Current user response:",data)

    

  } catch (error) {

    console.log("getCurrentUser error:", error)

    

  }
}

export default getCurrentUser