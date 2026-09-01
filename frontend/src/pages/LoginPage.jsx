import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase";
import api from "../../utils/axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { FcGoogle } from "react-icons/fc";
import {
  FiSearch,
  FiTerminal,
  FiFileText,
  FiSliders,
  FiCheckCircle,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

const FEATURES = [
  { icon: FiSearch, title: "Autonomous Web Search", desc: "Real-time query discovery and citation synthesis" },
  { icon: FiTerminal, title: "Senior Coding Intelligence", desc: "Production code generation, refactoring, and debugging" },
  { icon: FiSliders, title: "Presentation Architect", desc: "Instant structured slide decks and speaker outlines" },
  { icon: FiFileText, title: "Document Blueprinting", desc: "Automated PDF generation and reporting" },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const googleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const { data } = await api.post("/api/auth/login", { token });
      dispatch(setUserData(data));
    } catch (error) {
      console.error("Login error:", error);
      setErrorMsg(error.response?.data?.message || error.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090b10] text-white relative overflow-hidden p-4">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#0f121a]/90 border border-white/[0.08] rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Left Side: Brand & Value Proposition */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <HiSparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Nexus AI
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Agentic v2
                </span>
              </h1>
              <p className="text-xs text-slate-400">Next-Generation AI Workspace</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Supercharge your workflow with autonomous AI agents.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unified intelligence powered by LangGraph routing, persistent Redis memory, and real-time live search.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            {FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200">{f.title}</h3>
                    <p className="text-[11px] text-slate-400">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Sign-in Form Card */}
        <div className="flex flex-col justify-center bg-[#141824] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-semibold text-slate-100">Welcome to Nexus AI</h3>
            <p className="text-xs text-slate-400">Sign in with your Google account to access your workspaces and chat history.</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <button
            onClick={googleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-indigo-400/30 shadow-lg shadow-indigo-600/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FcGoogle className="w-5 h-5 bg-white rounded-full p-0.5" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted sessions & isolated conversation memory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
