import { useEffect } from "react"
import Home from "./pages/Home"
import getCurrentUser from "./features/getCurrentUser"
import { useDispatch } from "react-redux"
import { setUserData } from "./redux/userSlice"

function App() {
    const dispatch = useDispatch()

    useEffect(() => {
        const getUser = async () => {
            const data = await getCurrentUser()
            if (data) {
                dispatch(setUserData(data))
            }
        }

        getUser()
    }, [dispatch])

    // Global scroll-driven reveal system: watches document.body for [data-reveal]
    // elements and adds `.in-view` whenever they intersect the viewport, including
    // nodes mounted dynamically (e.g. a new chat message or the login card).
    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") {
            document.body?.classList.add("no-reveal")
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("in-view")
                        observer.unobserve(entry.target)
                    }
                })
            },
            { root: null, threshold: 0.06, rootMargin: "0px 0px -4% 0px" }
        )

        const scan = () => {
            document.querySelectorAll("[data-reveal]:not(.in-view)").forEach((node) => observer.observe(node))
        }
        scan()

        const mutation = new MutationObserver(scan)
        mutation.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
        })

        return () => {
            observer.disconnect()
            mutation.disconnect()
        }
    }, [])

    return <Home />
}

export default App
