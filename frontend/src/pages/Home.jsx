import { signInWithPopup, signOut } from "firebase/auth"
import { useEffect } from "react"
import { auth, googleProvider } from "../../utils/firebase"
import api from "../../utils/axios"
import { FcGoogle } from "react-icons/fc"
import { useDispatch, useSelector } from "react-redux"
import { clearUserData, setUserData } from "../redux/userSlice"

function Home() {
    const dispatch = useDispatch()
    const { userData } = useSelector((state) => state.user)

    useEffect(() => {
        console.log(userData)
    }, [userData])

    const googleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider)
            const token = await result.user.getIdToken()
            const { data } = await api.post("/api/auth/login", { token })
            dispatch(setUserData(data))
        } catch (error) {
            console.log("Google login error:", error.response?.data || error.message)
        }
    }

    const handleLogout = async () => {
        try {
            await api.get("/api/auth/logout")
            await signOut(auth)
        } catch (error) {
            console.log("Logout error:", error.response?.data || error.message)
        } finally {
            dispatch(clearUserData())
        }
    }

    if (userData) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0d0f14] text-white">
                <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        {userData.avatar && (
                            <img
                                src={userData.avatar}
                                alt={userData.name}
                                className="w-11 h-11 rounded-full"
                                referrerPolicy="no-referrer"
                            />
                        )}
                        <div className="flex flex-col gap-0.5">
                            <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">
                                {userData.name}
                            </h2>
                            <p className="text-[13px] text-slate-500">
                                {userData.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full py-[11px] rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all duration-150 cursor-pointer"
                    >
                        Log out
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex bg-[#0d0f14] text-white overflow-hidden">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">
                            Welcome to NexusAI
                        </h2>
                        <p className="text-[13px] text-slate-500">
                            Please login to continue using this app
                        </p>
                    </div>
                    <button
                        onClick={googleLogin}
                        className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 hover:from-indigo-600 hover:to-violet-600 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 transition-all duration-150 cursor-pointer"
                    >
                        <FcGoogle size={15} />
                        Continue With Google
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Home
