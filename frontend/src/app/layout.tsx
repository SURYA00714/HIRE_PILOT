import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "HIRE PILOT - AI Interview Platform",
  description: "A premium AI Interview Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`flex bg-[#0f111a] text-white min-h-screen font-sans`}>
        <Script src="https://code.responsivevoice.org/responsivevoice.js?key=u5SEghtK" strategy="beforeInteractive" />
        <AuthProvider>
          {/* Main Layout Container */}
          <div className="flex w-full">
            {/* Sidebar automatically hides if not authenticated (handled inside Sidebar) */}
            <Sidebar />
            
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-screen p-4 overflow-y-auto relative">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] -z-10 -translate-x-1/2 translate-y-1/2"></div>
              
              <div className="flex-1 w-full max-w-7xl mx-auto h-full z-10">
                {children}
              </div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
