import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "nexusai-8032a.firebaseapp.com",
  projectId: "nexusai-8032a",
  storageBucket: "nexusai-8032a.firebasestorage.app",
  messagingSenderId: "1076782492514",
  appId: "1:1076782492514:web:2a6d207e6b315bded51a3b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();