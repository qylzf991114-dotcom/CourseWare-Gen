import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ImageIcon, Sparkles, Quote, Lightbulb, MessageCircle, HelpCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { generateImage } from '../services/geminiService.ts';

const ImageRenderer: React.FC<any> = ({ node, src, alt, ...props }) => {
    const [imageData, setImageData] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    
    const triggerGeneration = useCallback(async (prompt: string) => {
        if (!prompt || prompt.length < 5) return;
        setLoading(true);
        setError(false);
        try {
            const data = await generateImage(prompt);
            if (data) {
                setImageData(data);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Image generation failed:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!src) return;

        const decodedSrc = decodeURIComponent(src);
        const isAiGen = decodedSrc.toLowerCase().includes('ai-generated');

        if (isAiGen) {
            let prompt = decodedSrc;
            if (decodedSrc.includes('ai-generated:')) {
                prompt = decodedSrc.split('ai-generated:')[1];
            } else if (decodedSrc.includes('ai-generated%3A')) {
                prompt = decodedSrc.split('ai-generated%3A')[1];
            }
            
            const cleanPrompt = prompt.replace(/[()\]]$/g, '').trim();
            triggerGeneration(cleanPrompt);
        } else {
            setImageData(src);
        }
    }, [src, triggerGeneration]);

    if (loading) return (
      <div className="p-16 bg-slate-900 border-2 border-dashed border-blue-500/30 rounded-[3rem] flex flex-col items-center justify-center gap-6 animate-pulse my-14 overflow-hidden relative">
        <div className="absolute inset-0 bg-blue-600/10 animate-pulse"></div>
        <Sparkles className="text-blue-400 animate-bounce relative z-10" size={40} />
        <div className="text-center relative z-10">
          <span className="text-xs font-black text-blue-300 tracking-[0.4em] uppercase block mb-2">教授正在为您手绘教学插图</span>
          <p className="text-[10px] text-blue-400/70 max-w-xs mx-auto leading-relaxed italic">
             AI 正在创作：{alt || "课件场景"}
          </p>
        </div>
      </div>
    );

    if (error) return (
      <div className="p-10 bg-slate-50 border-2 border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 my-14 shadow-inner">
        <AlertTriangle className="text-amber-500" size={32} />
        <div className="text-center">
           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">插图生成失败</p>
           <button 
             onClick={() => {
                const decodedSrc = decodeURIComponent(src);
                const prompt = decodedSrc.includes('ai-generated:') ? decodedSrc.split('ai-generated:')[1] : decodedSrc.split('ai-generated%3A')[1];
                triggerGeneration(prompt.replace(/[()\]]$/g, '').trim());
             }}
             className="flex items-center gap-2 mx-auto px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
           >
             <RefreshCw size={12} /> 重试生成
           </button>
        </div>
      </div>
    );

    if (!imageData && src?.includes('ai-generated')) return null;

    return (
      <div className="my-16 group relative overflow-hidden rounded-[3rem] shadow-2xl transition-all hover:scale-[1.02] hover:shadow-blue-500/30 border border-slate-100 bg-white">
        <img 
          src={imageData} 
          alt={alt} 
          className="w-full h-auto object-cover max-h-[800px] block" 
          onError={() => setError(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-12 pt-40 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out">
           <div className="flex items-center gap-3 mb-3">
              <Sparkles size={18} className="text-blue-400" />
              <span className="text-blue-400 text-[11px] font-black uppercase tracking-[0.3em]">Courseware Visualization</span>
           </div>
           <p className="text-white text-2xl font-black leading-tight tracking-tight">{alt || "Visual Learning Aid"}</p>
        </div>
      </div>
    );
};

interface MarkdownRendererProps {
  content: string;
  isSlide?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isSlide }) => {
  return (
    <div className={`prose prose-slate max-w-none ${isSlide ? 'prose-xl' : 'prose-sm'}`}>
      <ReactMarkdown
        urlTransform={(uri) => uri} 
        components={{
          img: ImageRenderer,
          h1: ({children}) => <h1 className="text-4xl font-black text-slate-900 border-b-8 border-blue-600/20 pb-4 mb-10 tracking-tighter leading-tight">{children}</h1>,
          h2: ({children}) => <h2 className="text-2xl font-black text-slate-800 mt-24 mb-10 flex items-center gap-5">
            <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-sm shadow-xl shadow-blue-600/30 font-black">#</span>
            {children}
          </h2>,
          blockquote: ({children}) => {
            const text = String(children);
            let icon = <Quote />;
            let title = "NOTE";
            let colorClass = "bg-blue-50 border-blue-500 text-blue-900";

            if (text.includes('🚀') || text.includes('思考快闪')) {
               icon = <HelpCircle size={22} />; title = "QUICK REFLECT"; colorClass = "bg-orange-50 border-orange-500 text-orange-900";
            } else if (text.includes('💬') || text.includes('讨论')) {
               icon = <MessageCircle size={22} />; title = "CANVAS BOARD"; colorClass = "bg-indigo-50 border-indigo-500 text-indigo-900";
            } else if (text.includes('💡') || text.includes('类比')) {
               icon = <Lightbulb size={22} />; title = "ANALOGY"; colorClass = "bg-emerald-50 border-emerald-500 text-emerald-900";
            }

            return (
              <div className={`${colorClass} border-l-[12px] p-12 rounded-r-[3rem] my-14 shadow-md relative overflow-hidden group`}>
                <div className="absolute -right-8 -top-8 opacity-[0.04] group-hover:scale-125 transition-transform duration-700">
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 160 })}
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="opacity-70">{icon}</span>
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] opacity-60">{title}</span>
                </div>
                <div className="text-2xl font-bold leading-relaxed relative z-10">
                  {children}
                </div>
              </div>
            );
          },
          p: ({children}) => {
             const text = React.Children.toArray(children).join('');
             const aiImgRegex = /!\[(.*?)\]\((ai-generated:.*?)\)/;
             const match = text.match(aiImgRegex);
             
             if (match) {
                return (
                  <div>
                    <ImageRenderer src={match[2]} alt={match[1]} />
                    <p className="mb-10 leading-[2] text-slate-700 font-medium text-xl">
                       {text.replace(aiImgRegex, '')}
                    </p>
                  </div>
                );
             }
             
             return <p className="mb-10 leading-[2] text-slate-700 font-medium text-xl">{children}</p>;
          },
          code: ({node, className, children, ...props}) => {
            return <code className={`${className} bg-blue-50 text-blue-600 px-2.5 py-1 rounded-xl font-black text-[0.9em] border border-blue-100`} {...props}>{children}</code>;
          },
          hr: () => <hr className="my-24 border-slate-100 border-4 rounded-full" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};