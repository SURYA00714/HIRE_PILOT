import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f111a] overflow-x-hidden selection:bg-primary/30">
      
      {/* Glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation (Simple version for landing page) */}
      <nav className="relative z-50 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            H
          </div>
          <span className="text-xl font-black tracking-tighter text-white">HIRE<span className="text-primary-light">PILOT</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign In</Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-4 shadow-[0_0_15px_rgba(139,92,246,0.3)]">Get Started</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative z-10">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center pt-20 pb-32 px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-gray-300">HirePilot AI Engine v2.0 is Live</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 text-white max-w-5xl leading-[1.1]">
            Master your <span className="text-gradient">interviews</span> with AI precision.
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
            Experience realistic, adaptive interviews powered by Google's Gemini 2.5 Flash. Get instant feedback, ATS scoring, and track your growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/register" className="btn-primary flex items-center justify-center gap-2 group px-8 py-4 text-lg w-full sm:w-auto shadow-[0_0_30px_rgba(139,92,246,0.4)]">
              Start Practicing Free
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </div>
        </section>

        {/* Value Prop Section */}
        <section className="py-24 px-6 relative border-t border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Not just another prep tool</h2>
              <p className="text-gray-400 text-lg">We simulate the actual pressure and rigor of a real interview.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass-panel p-8 group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 text-primary border border-primary/20 group-hover:border-primary/50 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Adaptive Intelligence</h3>
                <p className="text-gray-400 leading-relaxed">The AI adjusts difficulty in real-time. Ace a question? It dives deeper. Struggle? It pivots to fundamentals.</p>
              </div>
              
              <div className="glass-panel p-8 group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mb-6 text-blue-400 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Resume Analysis</h3>
                <p className="text-gray-400 leading-relaxed">Upload your PDF and get instant ATS scoring. Our AI then asks tailored questions based on your specific experience.</p>
              </div>

              <div className="glass-panel p-8 group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center mb-6 text-yellow-400 border border-yellow-500/20 group-hover:border-yellow-500/50 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gamified Growth</h3>
                <p className="text-gray-400 leading-relaxed">Earn XP, maintain daily streaks, and unlock achievements as you build confidence for the real thing.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 text-center">
          <div className="max-w-4xl mx-auto glass-panel p-12 relative overflow-hidden border-primary/30">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent -z-10"></div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to land your dream job?</h2>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">Join thousands of engineers who used HirePilot to ace their technical interviews at top tech companies.</p>
            <Link href="/register" className="btn-primary text-lg px-10 py-4 shadow-[0_0_40px_rgba(139,92,246,0.5)]">
              Create Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} HirePilot AI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
