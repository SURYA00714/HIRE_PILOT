"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../../../../context/AuthContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

type Message = {
  sender: 'ai' | 'user';
  text: string;
};

export default function InterviewRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(true);
  const [interviewStatus, setInterviewStatus] = useState<'initializing' | 'active' | 'completed' | 'error'>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only needed for testing when ResponsiveVoice is not loaded yet
  }, []);

  // Perfect tuning using ResponsiveVoice
  const speakText = (text: string, overrideGender?: 'female' | 'male') => {
    if (isMuted || typeof window === 'undefined') return;
    const cleanText = text.replace(/[*#]/g, '').trim();
    if (!cleanText) return;
    const targetGender = overrideGender || voiceGender;

    // @ts-ignore
    if (typeof window !== 'undefined' && window.responsiveVoice) {
      const voiceProfile = targetGender === 'female' ? "UK English Female" : "UK English Male";
      const rate = 1.0; // Both male and female voices are now equal speed (1.0)
      
      setIsSpeaking(true);
      // @ts-ignore
      window.responsiveVoice.speak(cleanText, voiceProfile, {
        rate: rate,
        pitch: 1,
        onstart: () => setIsSpeaking(true),
        onend: () => setIsSpeaking(false)
      });
    }
  };

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.responsiveVoice) {
        // @ts-ignore
        window.responsiveVoice.cancel();
      }
    };
  }, []);

  // Load preferred voice from settings
  useEffect(() => {
    const savedVoice = localStorage.getItem('preferredVoiceGender');
    if (savedVoice === 'male' || savedVoice === 'female') {
      setVoiceGender(savedVoice);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to AI Interview Server');
      setInterviewStatus('initializing');
      setErrorMessage('');
      
      newSocket.emit('start_interview', {
        sessionId: id,
        role: 'Software Engineer',
        experienceLevel: 'Mid-Level'
      });
    });

    newSocket.on('next_question', (data: { question: string, feedbackOnLast?: string, questionNumber?: number, totalQuestions?: number }) => {
      setInterviewStatus('active');
      setIsAiThinking(false);
      
      if (data.questionNumber && data.totalQuestions) {
        setProgress((data.questionNumber / data.totalQuestions) * 100);
      }
      
      let speechText = '';

      if (data.feedbackOnLast) {
        setMessages(prev => [...prev, { sender: 'ai', text: `Feedback: ${data.feedbackOnLast}` }]);
        speechText += data.feedbackOnLast + '. ';
      }
      
      setMessages(prev => [...prev, { sender: 'ai', text: data.question }]);
      speechText += data.question;
      
      // Speak the feedback and the next question
      speakText(speechText);
    });

    newSocket.on('interview_completed', (finalEval: any) => {
      setInterviewStatus('completed');
      setIsAiThinking(false);
      setProgress(100);
      
      const completionText = 'The interview has concluded. Thank you for your time. Your detailed evaluation is being finalized.';
      setMessages(prev => [...prev, { sender: 'ai', text: completionText }]);
      speakText(completionText);
      
      setTimeout(() => {
        router.push(`/interviews/${id}`);
      }, 5000);
    });

    newSocket.on('interview_error', (err) => {
      console.error("Socket Error Payload:", err);
      setIsAiThinking(false);
      setInterviewStatus('error');
      
      let msg = 'An error occurred during the interview.';
      if (typeof err === 'string') msg = err;
      else if (err && err.message) msg = err.message;
      else if (err instanceof Error) msg = err.toString();
      else msg = JSON.stringify(err);
      
      setErrorMessage(msg);
    });

    newSocket.on('connect_error', (err) => {
      console.error("Socket Connect Error:", err.message, err);
      setInterviewStatus('error');
      setErrorMessage('Connection failed: ' + err.message);
    });

    newSocket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        newSocket.connect();
      } else if (interviewStatus !== 'completed') {
        setInterviewStatus('error');
        setErrorMessage('Connection lost: ' + reason);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || isAiThinking) return;
    
    // Removed primer because ResponsiveVoice API rejects empty string / space with 400 Bad Request

    setMessages(prev => [...prev, { sender: 'user', text: inputValue }]);
    socket.emit('submit_answer', { answer: inputValue });
    
    setInputValue('');
    setIsAiThinking(true);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // @ts-ignore
    if (!isMuted && window.responsiveVoice) {
      // @ts-ignore
      window.responsiveVoice.cancel();
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] py-4 px-4 md:px-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: AI Visualization */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
          <div className="glass-panel p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[320px]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className={`absolute inset-0 rounded-full bg-primary/20 blur-2xl transition-all duration-1000 ${isAiThinking ? 'animate-pulse scale-150' : 'scale-100'}`}></div>
              <div className={`w-32 h-32 rounded-full border-2 border-primary/50 flex items-center justify-center bg-[#0f111a] z-10 relative shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all ${isAiThinking ? 'shadow-[0_0_60px_rgba(139,92,246,0.6)]' : ''}`}>
                <span className="text-5xl">🤖</span>
              </div>
              
              {/* Audio Waveform Visualizer */}
              {isSpeaking && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8 w-24 z-20">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-primary rounded-t-sm animate-[waveform_0.5s_ease-in-out_infinite_alternate]"
                      style={{ animationDelay: `${i * 0.1}s`, height: `${Math.max(20, Math.random() * 100)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <h2 className="mt-8 text-2xl font-bold text-gradient z-10">Gemini Agent</h2>
            <p className="text-sm text-gray-400 mt-2 font-medium z-10">
              {interviewStatus === 'initializing' && 'Preparing session...'}
              {interviewStatus === 'active' && (isAiThinking ? 'Analyzing your answer...' : 'Listening...')}
              {interviewStatus === 'completed' && 'Interview complete'}
              {interviewStatus === 'error' && <span className="text-red-400">Connection Error</span>}
            </p>

            <div className="mt-6 flex flex-col gap-3 w-full max-w-[200px] z-10">
              <div className="flex items-center justify-between bg-[#1a1d2d] p-2 rounded-lg border border-white/5">
                <span className="text-sm font-medium text-gray-300">Voice</span>
                <div className="flex bg-black/40 rounded-md p-1">
                  <button 
                    onClick={() => setVoiceGender('female')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${voiceGender === 'female' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Female
                  </button>
                  <button 
                    onClick={() => setVoiceGender('male')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${voiceGender === 'male' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Male
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h3 className="font-semibold mb-4 text-gray-300">Interview Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Completion</span>
                  <span className="text-primary-light">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chat Interface with Responsive Height & Independent Message Scroll */}
        <div className="w-full lg:w-2/3 glass-panel flex flex-col h-[calc(100vh-3rem)] max-h-[750px] min-h-[450px] relative overflow-hidden">
          {/* Error Banner */}
          {interviewStatus === 'error' && (
            <div className="bg-red-500/90 text-white p-3 text-sm text-center font-medium absolute top-0 left-0 right-0 z-20 shadow-lg">
              {errorMessage}
            </div>
          )}

          {/* Fixed Header */}
          <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-bold text-lg">Live Interview</h2>
              <p className="text-xs text-gray-400">ID: {id?.toString().substring(0, 8)}...</p>
            </div>
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-sm px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              End Interview
            </button>
          </div>

          {/* 1. INDEPENDENT QUESTION & MESSAGE SCROLL AREA */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
            {messages.length === 0 && interviewStatus === 'initializing' && (
              <div className="h-full flex items-center justify-center text-gray-500">
                Connecting to AI Engine...
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-tr-sm shadow-[0_4px_20px_rgba(139,92,246,0.3)]' 
                    : 'bg-[#1a1d2d] text-gray-200 border border-white/10 rounded-tl-sm shadow-lg'
                }`}>
                  {msg.sender === 'ai' && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-primary-light font-bold uppercase tracking-wider">Interviewer</span>
                      <button 
                        type="button"
                        onClick={() => speakText(msg.text)}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors bg-white/5 px-2 py-0.5 rounded-md"
                        title="Listen to this question"
                      >
                        🔊 Listen
                      </button>
                    </div>
                  )}
                  <p className="leading-relaxed text-sm md:text-base">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isAiThinking && interviewStatus === 'active' && (
              <div className="flex justify-start">
                <div className="bg-[#1a1d2d] border border-white/10 rounded-2xl rounded-tl-sm p-5 w-24 shadow-lg">
                  <div className="flex space-x-2 items-center justify-center h-4">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Footer Input Form */}
          <div className="p-5 border-t border-white/10 bg-[#0f111a]/95 backdrop-blur-md shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isAiThinking || interviewStatus === 'completed' || interviewStatus === 'error'}
                placeholder={isAiThinking ? "Interviewer is typing..." : "Type your answer..."}
                className="flex-1 glass-input bg-white/5 border-white/10 disabled:opacity-50 text-base"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isAiThinking || interviewStatus === 'completed' || interviewStatus === 'error'}
                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
