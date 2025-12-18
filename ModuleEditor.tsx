import React, { useState } from 'react';
import { Module, ContentType, CourseContext } from '../types.ts';
import { generateModuleContent, refineModuleContent } from '../services/geminiService.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { QuizModule } from './QuizModule.tsx';
import { 
  Sparkles, Loader2, LayoutTemplate, Eye, Pencil,
  Layers, RefreshCw, MessageSquare, Wand2, MapPin, GraduationCap
} from 'lucide-react';

interface ModuleEditorProps {
  module: Module;
  context: CourseContext;
  updateModuleContent: (moduleId: string, type: ContentType, content: string) => void;
  onGenerateFullWeek: () => void;
  onPause: () => void;
  isGlobalProcessing: boolean; 
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, context, updateModuleContent, onGenerateFullWeek, onPause, isGlobalProcessing }) => {
  const [activeTab, setActiveTab] = useState<ContentType>(ContentType.SLIDE_OUTLINE);
  const [loading, setLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const content = await generateModuleContent(activeTab, module, context);
      updateModuleContent(module.id, activeTab, content);
    } finally { setLoading(false); }
  };

  const handleRefine = async () => {
    setLoading(true);
    try {
      const res = await refineModuleContent(activeTab, module, context, feedback);
      updateModuleContent(module.id, activeTab, res);
      setShowRefine(false);
    } finally { setLoading(false); }
  };

  const getTabLabel = (t: ContentType) => {
    switch (t) {
      case ContentType.LESSON_PLAN: return '双语教案';
      case ContentType.SLIDE_OUTLINE: return 'PPT大纲';
      case ContentType.ASSESSMENT: return '真题练习 (含解析)';
      case ContentType.STUDY_GUIDE: return '留学生学习指南';
      case ContentType.DISCUSSION_BOARD: return '讨论板素材';
      case ContentType.VISUAL_AIDS: return '视觉插图包';
      default: return t;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
             <GraduationCap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Sparkles size={10} className="text-blue-500 fill-blue-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Academic Module - Week {module.week}</span>
            </div>
            <h1 className="text-xl font-black text-slate-800">{module.title}</h1>
          </div>
        </div>
        <div className="flex gap-3">
           {activeTab !== ContentType.ASSESSMENT && (
             <button 
                onClick={() => setIsPreview(!isPreview)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                  isPreview ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
             >
               {isPreview ? <Pencil size={14} /> : <Eye size={14} />}
               {isPreview ? '编辑模式' : '大屏预览'}
             </button>
           )}
           <button 
              onClick={onGenerateFullWeek} 
              disabled={isGlobalProcessing}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
           >
             {isGlobalProcessing ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
             全板块自动填充
           </button>
           <button 
              onClick={handleGenerate} 
              disabled={loading || isGlobalProcessing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
           >
             {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
             AI 重新生成
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 bg-white border-b flex gap-6 overflow-x-auto scrollbar-hide">
        {Object.values(ContentType).map(t => (
            <button 
                key={t} 
                onClick={() => { setActiveTab(t); if (t === ContentType.ASSESSMENT) setIsPreview(false); }} 
                className={`py-4 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all shrink-0 relative ${
                  activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
                {getTabLabel(t)}
                {module.content[t] && (
                  <div className="absolute top-2 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                )}
            </button>
        ))}
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center custom-scrollbar">
        {showRefine && (
            <div className="w-full max-w-4xl mb-6 bg-violet-50 p-5 rounded-2xl border border-violet-200 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-violet-700 font-black text-xs uppercase tracking-widest mb-3">
                  <Wand2 size={14} /> AI 调优指令
                </div>
                <div className="flex gap-2">
                  <input 
                    value={feedback} 
                    onChange={e => setFeedback(e.target.value)} 
                    placeholder="输入润色要求（如：内容再深一点、增加更多历史细节、多使用某个术语）..." 
                    className="flex-1 p-3 border border-violet-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white" 
                  />
                  <button onClick={handleRefine} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-violet-600/20">
                    提交润色
                  </button>
                </div>
            </div>
        )}

        <div className={`w-full max-w-4xl transition-all duration-500 ${isPreview || activeTab === ContentType.ASSESSMENT ? 'bg-transparent' : 'bg-white p-12 rounded-3xl shadow-2xl border border-slate-100'}`}>
            {(loading || isGlobalProcessing) ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <Sparkles className="absolute inset-0 m-auto text-blue-300" size={20} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-800 uppercase tracking-tighter">AI Professor is Brainstorming...</p>
                    <p className="text-xs text-slate-400 mt-1">
                      正在根据您的素材编写深度教学内容并构思高清插图
                    </p>
                  </div>
                </div>
            ) : module.content[activeTab] ? (
                activeTab === ContentType.ASSESSMENT ? (
                  <QuizModule dataString={module.content[activeTab] || "[]"} />
                ) : (
                  <div className={isPreview ? "grid gap-8" : ""}>
                     <MarkdownRenderer content={module.content[activeTab] || ""} isSlide={isPreview} />
                  </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                    <Sparkles size={48} className="mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">尚未生成内容</p>
                    <button onClick={handleGenerate} className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-full text-xs font-black hover:scale-105 transition-all">开始生成本节</button>
                </div>
            )}
        </div>
        
        {activeTab !== ContentType.ASSESSMENT && (
          <button 
            onClick={() => setShowRefine(!showRefine)} 
            className="mt-8 flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-xs font-black uppercase tracking-widest"
          >
            <MessageSquare size={14} /> 内容调优（润色）
          </button>
        )}
      </div>
    </div>
  );
};

export default ModuleEditor;