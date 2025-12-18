import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, Eraser, User, Loader2 } from 'lucide-react';
import { CourseContext } from '../types.ts';
import { createChatSession } from '../services/geminiService.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { Chat, GenerateContentResponse } from "@google/genai";

interface AiAssistantProps {
  context: CourseContext;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([{ role: 'model', text: '你好！我是您的课程 AI 助手。我可以帮您润色内容、回答学术问题，或者根据已有素材为您构思教学案例。请问有什么可以帮您的？' }]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    const txt = inputValue;
    setInputValue("");
    if (!chatRef.current) chatRef.current = createChatSession(context);
    
    setMessages(p => [...p, { role: 'user', text: txt }]);
    setLoading(true);
    
    try {
        const result = await chatRef.current.sendMessage({ message: txt });
        setMessages(p => [...p, { role: 'model', text: result.text }]);
    } catch (err) {
        setMessages(p => [...p, { role: 'model', text: '抱歉，系统繁忙，请稍后再试。' }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed bottom-8 right-8 p-5 bg-blue-600 text-white rounded-[2rem] shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all z-50 group"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce">AI</span>}
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-8 w-[420px] h-[650px] bg-white border border-slate-200 rounded-[3rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.3)] flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
          <div className="p-7 bg-slate-950 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <Bot size={20} />
               </div>
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">学术咨询助手</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">在线处理中</span>
                  </div>
               </div>
            </div>
            <button onClick={() => setMessages([{ role: 'model', text: '对话已清空。' }])} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all">
                <Eraser size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-7 space-y-8 bg-slate-50 custom-scrollbar">
            {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-9 h-9 shrink-0 rounded-2xl flex items-center justify-center shadow-md ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>
                        {m.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                    </div>
                    <div className={`max-w-[80%] p-5 rounded-[1.5rem] shadow-sm border ${m.role === 'user' ? 'bg-white border-blue-100 rounded-tr-none' : 'bg-white border-slate-100 rounded-tl-none'}`}>
                        <MarkdownRenderer content={m.text} />
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex gap-4">
                    <div className="w-9 h-9 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <Sparkles size={16} />
                    </div>
                    <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] rounded-tl-none shadow-sm flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">思考中...</span>
                    </div>
                </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
                <input 
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()} 
                    placeholder="请输入您的教学咨询指令..." 
                    className="w-full bg-slate-50 p-5 pr-16 rounded-[1.5rem] text-sm font-medium border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all" 
                />
                <button 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || loading}
                    className="absolute right-3 p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-30 active:scale-90"
                >
                    <Send size={18} />
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiAssistant;