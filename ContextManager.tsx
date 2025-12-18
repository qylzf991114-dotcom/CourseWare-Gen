import React, { useState, useRef, useMemo } from 'react';
import { CourseContext, Project } from '../types.ts';
import { 
  BookOpen, FileText, GraduationCap, Save, ChevronDown, ChevronUp, 
  Upload, Trash2, Loader2, Files, Monitor, Cloud, CheckCircle, 
  Plus, FolderOpen, MoreVertical, Pencil, History, ChevronRight, X,
  FileArchive, Video, Music, Image as ImageIcon, FileCheck, AlertCircle,
  FilePlus, Database
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import JSZip from 'jszip';
import { processMediaFile } from '../services/geminiService.ts';

const setupPdfJs = () => {
  try {
    const pdfjs = (pdfjsLib as any).default || pdfjsLib;
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return pdfjs;
  } catch (e) {
    console.warn("PDF.js 加载失败。", e);
    return null;
  }
};

const pdfjs = setupPdfJs();

const extractPptxText = async (file: File): Promise<string> => {
  const zip = await JSZip.loadAsync(file);
  let fullText = "";
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });
  for (const slideName of slideFiles) {
    const slideXml = await zip.file(slideName)?.async('text');
    if (slideXml) {
      const matches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
      if (matches) {
        const slideText = matches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
        fullText += `[幻灯片 ${slideName.match(/\d+/)?.[0] || ''}]: ${slideText}\n\n`;
      }
    }
  }
  return fullText;
};

interface ContextManagerProps {
  context: CourseContext;
  setContext: React.Dispatch<React.SetStateAction<CourseContext>>;
  isOpen: boolean;
  toggleOpen: () => void;
  onSave: () => Promise<void>;
  onClear: () => void;
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

const ContextManager: React.FC<ContextManagerProps> = ({ 
  context, setContext, isOpen, toggleOpen, onSave, onClear,
  projects, currentProjectId, onSelectProject, onCreateProject, onRenameProject, onDeleteProject
}) => {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'ppt' | 'exam'>('syllabus');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0, name: '' });

  const currentFieldName = activeTab === 'syllabus' ? 'syllabus' : activeTab === 'ppt' ? 'pptMaterials' : 'examHistory';

  const uploadedFiles = useMemo(() => {
    const currentText = context[currentFieldName] || '';
    const matches = currentText.match(/--- FILE: (.*?) ---/g);
    return matches ? matches.map(m => m.replace(/--- FILE: | ---/g, '')) : [];
  }, [context, currentFieldName]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    const totalFiles = files.length;
    let accumulatedContent = context[currentFieldName] || '';

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      setProcessProgress({ current: i + 1, total: totalFiles, name: file.name });
      
      try {
        let fileText = '';
        const lowerName = file.name.toLowerCase();
        
        if (pdfjs && (file.type === 'application/pdf' || lowerName.endsWith('.pdf'))) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          fileText = fullText;
        } 
        else if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
           if (lowerName.endsWith('.ppt')) {
              fileText = `[注意：${file.name} 为旧版 PPT 格式，解析内容受限。建议另存为 .pptx]` + await file.text();
           } else {
              fileText = await extractPptxText(file);
           }
        } 
        else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          fileText = result.value;
        }
        else if (
          file.type.startsWith('image/') || 
          file.type.startsWith('video/') || 
          file.type.startsWith('audio/') ||
          /\.(mp3|wav|m4a|mp4|mov|avi|wmv)$/i.test(lowerName)
        ) {
          fileText = await processMediaFile(file);
        } 
        else {
          fileText = await file.text();
        }
        
        accumulatedContent += `\n\n--- FILE: ${file.name} ---\n${fileText}`;
      } catch (err) { 
        console.error(`解析文件失败 ${file.name}:`, err);
        accumulatedContent += `\n\n--- FILE ERROR: ${file.name} ---\n[系统提示：解析此文件时发生错误，可能由于文件加密或格式特殊]`;
      }
    }
    
    setContext(prev => ({ ...prev, [currentFieldName]: accumulatedContent }));
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (fileName: string) => {
    const currentText = context[currentFieldName];
    const regex = new RegExp(`\\n\\n--- FILE: ${fileName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')} ---[\\s\\S]*?(?=\\n\\n--- FILE:|$)`, 'g');
    const newText = currentText.replace(regex, '').trim();
    setContext(prev => ({ ...prev, [currentFieldName]: newText }));
  };

  return (
    <div className={`bg-white border-l border-slate-200 flex flex-col transition-all duration-300 ${isOpen ? 'w-[450px]' : 'w-12'} h-full fixed right-0 top-0 z-40 shadow-2xl`}>
      <button onClick={toggleOpen} className="absolute -left-10 top-6 bg-white border p-2 rounded-l-xl shadow-lg hover:bg-slate-50 transition-all hover:scale-110">
        {isOpen ? <ChevronRight className="text-slate-600" /> : <ChevronRight className="rotate-180 text-slate-600" />}
      </button>

      {isOpen && (
        <>
          <div className="bg-slate-950 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen size={20} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">项目存档管理</span>
              </div>
              <button onClick={() => setShowHistory(!showHistory)} className="text-[10px] font-black bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10">
                <History size={14} /> {showHistory ? '收起存档' : '历史存档'}
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <input 
                value={projects.find(p => p.id === currentProjectId)?.name || ""} 
                onChange={(e) => currentProjectId && onRenameProject(currentProjectId, e.target.value)}
                className="bg-transparent border-none text-xl font-black focus:ring-0 p-0 flex-1 placeholder:text-slate-800 truncate"
                placeholder="点击重命名此课程项目..."
              />
              <button onClick={onCreateProject} className="p-2.5 bg-blue-600 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30 active:scale-90">
                <Plus size={20} />
              </button>
            </div>

            {showHistory && (
              <div className="mt-6 space-y-2 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-4">
                {projects.map(p => (
                  <div key={p.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${currentProjectId === p.id ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-white/5 hover:border-white/20'}`} onClick={() => { onSelectProject(p.id); setShowHistory(false); }}>
                    <div className="flex-1 truncate pr-4">
                      <div className="text-xs font-black truncate">{p.name}</div>
                      <div className="text-[9px] opacity-40 mt-1">{new Date(p.lastModified).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }} className="p-2 hover:bg-rose-500/20 rounded-xl text-rose-400"><Trash2 size={14} /></button>
                      <ChevronRight size={18} className="text-white/20" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-b flex items-center justify-between bg-white shadow-sm">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Database size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">知识资源库</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">支持 PPT/PDF/DOC/音视频批量识别</p>
               </div>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white rounded-2xl text-[11px] font-black hover:bg-slate-800 transition-all shadow-xl active:scale-95">
                <Upload size={14} /> 批量导入素材
            </button>
          </div>

          <div className="flex border-b bg-white text-center">
            {['syllabus', 'ppt', 'exam'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all relative ${activeTab === t ? 'text-blue-600 border-blue-600 bg-blue-50/20' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                {t === 'syllabus' ? '教学大纲' : t === 'ppt' ? '讲义素材' : '测验题库'}
                {context[t === 'syllabus' ? 'syllabus' : t === 'ppt' ? 'pptMaterials' : 'examHistory'].length > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,image/*,video/*,audio/*,.mp3,.wav,.m4a,.mp4,.mov,.avi" 
              multiple 
            />
            
            {uploadedFiles.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-b max-h-[350px] overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                  <span>已收录素材清单 ({uploadedFiles.length})</span>
                  <span className="text-emerald-500 flex items-center gap-1.5"><CheckCircle size={12}/> 已就绪</span>
                </div>
                <div className="grid gap-2">
                  {uploadedFiles.map((fname, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 group hover:border-blue-300 transition-all shadow-sm">
                      <div className="flex items-center gap-3 truncate">
                        {fname.toLowerCase().match(/\.(mp4|mov|avi)$/) ? <Video size={14} className="text-blue-500" /> : 
                         fname.toLowerCase().match(/\.(mp3|wav|m4a)$/) ? <Music size={14} className="text-indigo-500" /> :
                         fname.toLowerCase().match(/\.(jpg|png|webp|jpeg)$/) ? <ImageIcon size={14} className="text-emerald-500" /> :
                         fname.toLowerCase().match(/\.(pptx|ppt)$/) ? <Monitor size={14} className="text-orange-500" /> :
                         <FileText size={14} className="text-slate-400" />}
                        <span className="text-xs font-bold text-slate-700 truncate">{fname}</span>
                      </div>
                      <button onClick={() => removeFile(fname)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-rose-500 rounded-xl transition-all">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 relative flex flex-col">
               <textarea 
                value={context[currentFieldName]}
                onChange={(e) => setContext(prev => ({ ...prev, [currentFieldName]: e.target.value }))}
                className="flex-1 w-full p-8 text-[11px] font-mono resize-none focus:outline-none bg-white leading-relaxed placeholder:text-slate-300 custom-scrollbar"
                placeholder="在此粘贴素材原文，或点击“批量导入”上传文件库。AI 教授将深度解析所有内容作为底层语料库。"
              />
              {uploadedFiles.length === 0 && !context[currentFieldName] && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-200 p-10 text-center">
                  <FilePlus size={64} className="mb-4 opacity-20" />
                  <p className="text-sm font-black opacity-30">暂无资源素材</p>
                  <p className="text-[10px] opacity-20 mt-2 max-w-[200px]">支持多选文件一次性上传，AI 会逐一解析并智能索引</p>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
                <div className="relative mb-8 scale-110">
                   <Loader2 className="animate-spin text-blue-600" size={64} />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Cloud className="text-blue-400" size={24} />
                   </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3">正在同步全量知识库</h3>
                <div className="text-[11px] text-blue-600 font-black px-4 py-2 bg-blue-50 rounded-2xl truncate max-w-full mb-6">
                  {processProgress.name}
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4 shadow-inner">
                   <div className="h-full bg-blue-600 transition-all duration-700 shadow-lg shadow-blue-500/30" style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}></div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <span>正在处理第 {processProgress.current} 个文件</span>
                   <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                   <span>总计 {processProgress.total} 个文件</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-slate-50 grid grid-cols-2 gap-4">
             <button onClick={handleSave} disabled={isSaving} className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black transition-all shadow-xl active:scale-95 disabled:opacity-50 ${showSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'}`}>
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : showSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
                {showSuccess ? '保存成功' : '保存此项目'}
             </button>
             <button onClick={() => { if(confirm('确定清空此页面的所有数据吗？此操作不可撤销。')) onClear(); }} className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:text-rose-500 text-slate-500 py-4 rounded-2xl text-xs font-black transition-all active:scale-95 hover:border-rose-100 hover:bg-rose-50/50">
                <Trash2 size={16} /> 重置此页
             </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ContextManager;