import { signInWithPopup } from 'firebase/auth'
import React from 'react'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'
import {FcGoogle} from 'react-icons/fc'


function Home() {
  const handleLogin = async (token) =>{
    try{
      const {data}=await api.post("/auth/login",{token})
      console.log(data)
    }
    catch(error){
      console.log(error)
    }
  }

  const googleLogin = async()=>{
    const data = await signInWithPopup(auth,googleProvider)
    const token = await data.user.getIdToken()
    console.log(token)
    await handleLogin(token)
    console.log(data)
  }


    return (
        <div className='h-screen flex bg-[#0d0f14] text-white overflow-hidden'>
            <div className='fixed inset-0 z-50 flex items-center justify-center 
            bg-black/60 backdrop-blur-sm'>
                <div className='w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5'>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-[17px] font-semibold text-slate-100 tracking-tight'>Welcome to NexusAI</h2>
                        <p className='text-[13px] text-slate-500'>Please login to continue using this app</p>
                    </div>

                    <button className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 hover:from-indigo-600 hover:to-violet-600 active:from-indigo-600 active:to-violet-800 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-150 cursor-pointer" onClick={googleLogin}>
                        <FcGoogle size={15} className="text-white"/>
                        Continue With Google
                    </button>
                </div>

            </div>
        </div>
    )
}

export default Home
