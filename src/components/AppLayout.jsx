import { Navbar } from "@/components/Navbar.jsx";
import { ChatBot } from "@/components/ChatBot.jsx";
import { useAuth } from "@/context/AuthContext.jsx";

export function AppLayout({ children }) {
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
      {/* Only show chatbot on user side, not admin */}
      {userRole !== "admin" && <ChatBot />}
    </div>
  );
}
