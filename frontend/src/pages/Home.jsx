import React from "react";
import { useSelector } from "react-redux";
import LoginPage from "./LoginPage";
import ChatPage from "./ChatPage";

export default function Home() {
  const { userData } = useSelector((state) => state.user);

  if (userData) {
    return <ChatPage />;
  }

  return <LoginPage />;
}
