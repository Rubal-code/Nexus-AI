import { useEffect } from "react"
import Home from "./pages/Home"
import getCurrentUser from "./features/getCurrentUser"

function App() {

  useEffect(() => {

    const getUser = async () => {
      await getCurrentUser()
    }

    getUser()

  }, [])

  return <Home />
}

export default App