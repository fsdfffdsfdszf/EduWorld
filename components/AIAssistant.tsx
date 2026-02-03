
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Course, Lesson, User } from '../types';
import { getTutorResponse, connectLiveTutor, decodeAudio, decodeAudioData, encodeAudio } from '../services/geminiService';

interface AIAssistantProps {
  course: Course;
  lesson: Lesson;
  user: User;
}

const SUGGESTED_PROMPTS = [
  { label: "Summarize Lesson", text: "Can you summarize the key takeaways from this lesson in 3 bullet points?" },
  { label: "Quiz Me", text: "Ask me a conceptual question about this topic to test my understanding." },
  { label: "Real World Example", text: "How is this concept applied in the real world?" },
  { label: "Explain Like I'm 5", text: "Explain this concept simply, as if I were 5 years old." },
  { label: "Key Terminology", text: "What are the most important terms I need to remember from this?" }
];

const AIAssistant: React.FC<AIAssistantProps> = ({ course, lesson, user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: `Establish connection for **${course.title}**. Identifying context: "${lesson.title}". How can I assist your neural development?`, 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Live Voice Refs
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      stopVoiceMode();
    };
  }, []);

  const stopVoiceMode = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
      audioContextsRef.current = null;
    }
    setIsVoiceMode(false);
  };

  const startVoiceMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      setIsVoiceMode(true);

      const sysMsg = `You are Aris, an AI Tutor for the course ${course.title}. Context: ${lesson.title}. Content: ${lesson.content.replace(/<[^>]*>?/gm, '')}. Use clear spoken audio.`;

      const sessionPromise = connectLiveTutor({
        onopen: () => {
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
            
            const pcmBlob = {
              data: encodeAudio(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (message: any) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
          if (base64Audio) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
            source.onended = () => audioSourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            audioSourcesRef.current.forEach(s => s.stop());
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e: any) => {
          console.error("Live Tutor Error:", e);
          stopVoiceMode();
        },
        onclose: () => {
          setIsVoiceMode(false);
        }
      }, sysMsg);

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice mode:", err);
      stopVoiceMode();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if ((!textToSend.trim() && !selectedImage) || isTyping) return;

    const currentImage = selectedImage;
    const userMsg: ChatMessage = { 
      role: 'user', 
      text: textToSend, 
      timestamp: new Date(),
      image: currentImage || undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsTyping(true);

    const result = await getTutorResponse(
      textToSend, 
      messages, 
      {
        courseTitle: course.title,
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
        progress: course.progress || 0,
        quizHistory: user.quizScores
      },
      currentImage || undefined
    );

    const botMsg: ChatMessage = { 
      role: 'model', 
      text: result.text, 
      timestamp: new Date(),
      groundingUrls: result.urls 
    };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const formatTimestamp = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="bg-indigo-600 px-5 py-4.5 md:p-6 text-white flex items-center justify-between shadow-xl relative z-20 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner shrink-0">
            <i className="fas fa-robot text-base md:text-xl"></i>
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-xs md:text-base tracking-tight truncate">Neural Tutor Aris</h4>
            <div className="flex items-center space-x-2">
              <span className={`w-1.5 h-1.5 ${isVoiceMode ? 'bg-rose-400 animate-ping' : 'bg-green-400 animate-pulse'} rounded-full shrink-0`}></span>
              <p className="text-[8px] md:text-[10px] text-indigo-100 font-black uppercase tracking-widest truncate">
                {isVoiceMode ? 'Vocal Stream' : 'Calibrated'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={isVoiceMode ? stopVoiceMode : startVoiceMode}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${isVoiceMode ? 'bg-rose-500 shadow-rose-500/40' : 'bg-white/10 hover:bg-white/20 shadow-lg'} border border-white/10 shrink-0`}
        >
          <i className={`fas ${isVoiceMode ? 'fa-microphone-slash' : 'fa-microphone'} text-xs md:text-lg`}></i>
        </button>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8 bg-slate-950/40 no-scrollbar">
        {isVoiceMode ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
             <div className="flex items-center space-x-2.5 mb-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 4 + 1.5}rem`, animationDelay: `${i * 0.1}s` }}></div>
                ))}
             </div>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] leading-relaxed">Vocal Interface Established</p>
             <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest mt-2">Listening to neural audio feed...</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[90%] md:max-w-[85%] rounded-[24px] px-5 py-4 md:px-6 md:py-5 text-[13px] md:text-sm shadow-2xl relative ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                }`}>
                  {msg.image && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-black/30 shadow-2xl group">
                      <img src={msg.image} className="max-w-full h-auto transform transition-transform group-hover:scale-105" alt="node visual" />
                    </div>
                  )}
                  <div className={`prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-2 ${msg.role === 'user' ? 'text-white' : 'text-slate-100'}`}>
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                  
                  {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-white/10">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Neural Corroboration:</p>
                      <div className="flex flex-col gap-2">
                        {msg.groundingUrls.map((link, idx) => (
                          <a 
                            key={idx} 
                            href={link.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-slate-950/80 rounded-xl text-[9px] text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all border border-slate-800"
                          >
                            <i className="fas fa-link mr-2.5 text-[8px]"></i>
                            <span className="truncate">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className={`text-[8px] mt-3 block font-black uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-600'}`}>
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-4 flex space-x-2 shadow-inner">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-slate-900 border-t border-slate-800/80 shrink-0 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
        {/* Smart Prompts */}
        {!isVoiceMode && !isTyping && (
          <div className="flex items-center space-x-2 px-5 pt-4 overflow-x-auto no-scrollbar pb-1">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt.text)}
                className="flex-shrink-0 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all active:scale-95"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 md:p-8">
          {selectedImage && (
            <div className="mb-5 relative inline-block group animate-in slide-in-from-bottom-2">
              <img src={selectedImage} className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-2xl border-2 border-indigo-600 shadow-2xl" alt="preview" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-3 -right-3 bg-slate-950 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] shadow-2xl border border-slate-800 active:scale-90 transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          <div className="flex items-center space-x-3 bg-slate-950/80 rounded-[24px] px-5 py-2.5 md:py-3.5 border border-slate-800 focus-within:border-indigo-500/50 transition-all shadow-inner">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-600 hover:text-indigo-400 transition-colors p-1"
            >
              <i className="fas fa-camera text-base"></i>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isVoiceMode ? "Vocal mode active..." : "Ask Aris about this lesson..."}
              disabled={isVoiceMode}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1.5 text-slate-100 font-bold placeholder:text-slate-700 disabled:opacity-50"
            />
            <button 
              onClick={() => handleSend()}
              disabled={(!input.trim() && !selectedImage) || isTyping || isVoiceMode}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                (input.trim() || selectedImage) && !isTyping && !isVoiceMode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-900 text-slate-800'
              }`}
            >
              <i className="fas fa-paper-plane text-sm md:text-base"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
