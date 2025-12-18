import React, { useState, useEffect, useRef } from 'react';
import ContextManager from './components/ContextManager.tsx';
import ModuleEditor from './components/ModuleEditor.tsx';
import AiAssistant from './components/AiAssistant.tsx';
import { CourseContext, Module, ContentType, INITIAL_CONTEXT, Project } from './types.ts';
import { generateCourseStructure, generateModuleContent } from './services/geminiService.ts';
import { 
  Sparkles, Loader2, LayoutDashboard, FileDown, 
  Cloud, Check, Plus, ChevronRight, Layers, BookOpen,
  LayoutGrid, BookText, Settings, HelpCircle
} from 'lucide-react';
// @ts-ignore
import { get, set } from 'idb-keyval';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [context, setContext] = useState<CourseContext>(INITIAL_CONTEXT);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(true);
  const [structureLoading, setStructureLoading] = useState(false);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  const stopBatchRef = useRef(false);

  useEffect(() => {
    get('courseware_projects').then((savedProjects: Project[] | undefined) => {
      if (savedProjects && savedProjects.length > 0) {
        setProjects(savedProjects);
        loadProject(savedProjects[0]);
      } else {
        createNewProject();
      }
    });
  }, []);

  const createNewProject = () => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: `新课件项目 ${projects.length + 1}`,
      lastModified: Date.now(),
      context: INITIAL_CONTEXT,
      modules: []
    };
    const updated = [newProj, ...projects];
    setProjects(updated);
    loadProject(newProj);
    persistProjects(updated);
  };

  const loadProject = (proj: Project) => {
    setCurrentProjectId(proj.id);
    setContext(proj.context);
    setModules(proj.modules);
    if (proj.modules.length > 0) {
      setActiveModuleId(proj.modules[0].id);
      setIsContextOpen(false);
    } else {
      setActiveModuleId(null);
      setIsContextOpen(true);
    }
  };

  const persistProjects = (allProjects: Project[]) => {
    set('courseware_projects', allProjects);
  };

  const saveCurrentProject = async () => {
    if (!currentProjectId) return;
    setIsSyncing(true);
    const updatedProjects = projects.map(p => {
      if (p.id === currentProjectId) {
        return { ...p, context, modules, lastModified: Date.now() };
      }
      return p;
    }).sort((a, b) => b.lastModified - a.lastModified);
    setProjects(updatedProjects);
    await persistProjects(updatedProjects);
    setIsSyncing(false);
  };

  const deleteProject = (id: string) => {
    if (!confirm('确定删除该课程存档？数据不可恢复。')) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    persistProjects(updated);
    if (currentProjectId === id) {
      if (updated.length > 0) loadProject(updated[0]);
      else createNewProject();
    }
  };

  const renameProject = (id: string, newName: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, name: newName } : p);
    setProjects(updated);
    persistProjects(updated);
  };

  const handleGenerateStructure = async () => {
    if (!context.syllabus && !context.pptMaterials) {
      alert("请先在右侧导入大纲或讲义素材。");
      setIsContextOpen(true);
      return;
    }
    setStructureLoading(true);
    try {
      const generatedModules = await generateCourseStructure(context);
      setModules(generatedModules);
      if (generatedModules.length > 0) {
        setActiveModuleId(generatedModules[0].id);
        setIsContextOpen(false);
      }
      saveCurrentProject();
    } catch (error) {
      alert(error instanceof Error ? error.message : "生成失败，请检查素材是否完整。");
    } finally {
      setStructureLoading(false);
    }
  };

  const updateModuleContent = (moduleId: string, type: ContentType, content: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, content: { ...m.content, [type]: content } } : m));
  };

  const handleGenerateFullWeek = async (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod || isGlobalProcessing) return;
    setIsGlobalProcessing(true);
    const typesOrder = Object.values(ContentType);
    try {
      for (const type of typesOrder) {
        if (mod.content[type]) continue;
        const content = await generateModuleContent(type, mod, context);
        updateModuleContent(mod.id, type, content);
        await new Promise(r => setTimeout(r, 800));
      }
      saveCurrentProject();
    } finally { setIsGlobalProcessing(false); }
  };

  const handleFillRemaining = async () => {
    if (isGlobalProcessing) return;
    if (!confirm('确定启动全自动课件生成吗？AI 将基于已上传的素材批量填充所有缺失的周次板块。')) return;
    setIsGlobalProcessing(true);
    stopBatchRef.current = false;
    const typesOrder = Object.values(ContentType);
    let totalTasks = 0;
    modules.forEach(m => typesOrder.forEach(t => { if (!m.content[t]) totalTasks++; }));
    let currentTask = 0;
    setBatchProgress({ current: 0, total: totalTasks });

    try {
        for (const mod of modules) {
            if (stopBatchRef.current) break;
            setActiveModuleId(mod.id);
            for (const type of typesOrder) {
                if (stopBatchRef.current) break;
                if (mod.content[type]) continue;
                
                const content = await generateModuleContent(type, mod, context);
                updateModuleContent(mod.id, type, content);
                currentTask++;
                setBatchProgress({ current: currentTask, total: totalTasks });
                await new Promise(r => setTimeout(r, 1200));
            }
        }
        await saveCurrentProject();
    } finally { 
        setIsGlobalProcessing(false); 
        setBatchProgress({ current: 0, total: 0 });
    }
  };

  const activeModule = modules.find(m => m.id === activeModuleId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* 侧边导航栏 */}
      <div className={`w-80 bg-slate-950 text-slate-300 flex flex-col flex-shrink-0 z-30 shadow-2xl transition-all border-r border-white/5`}>
        <div className="p-7 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                <BookOpen className="text-white w-5 h-5" />
            </div>
            <h1 className="font-black text-white text-lg tracking-tighter">AI 课件助手</h1>
          </div>
          {isSyncing ? <Cloud className="text-blue-400 animate-pulse w-4 h-4" /> : <Check className="text-emerald-500 w-4 h-4" />}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 px-7 pt-7">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">教学大纲单元</h3>
            {modules.length > 0 && <span className="text-[10px] bg-white/10 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">{modules.length} 周次</span>}
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-2.5 custom-scrollbar">
            {modules.length === 0 ? (
              <div className="px-2 pt-6">
                <button onClick={handleGenerateStructure} disabled={structureLoading} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xs shadow-2xl shadow-blue-600/30 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 group">
                  {structureLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
                  <span>生成全学期课程结构</span>
                </button>
              </div>
            ) : (
              modules.map((mod) => (
                <button key={mod.id} onClick={() => setActiveModuleId(mod.id)} className={`group w-full text-left p-5 rounded-[1.5rem] border transition-all flex items-center justify-between ${activeModuleId === mod.id ? 'bg-white shadow-2xl text-slate-900 border-white translate-x-2' : 'bg-transparent border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
                    <div className="truncate">
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeModuleId === mod.id ? 'text-blue-600' : 'text-slate-700'}`}>Week {mod.week}</div>
                      <div className="font-black text-[13px] truncate leading-tight">{mod.title}</div>
                    </div>
                    <ChevronRight size={16} className={`transition-all duration-300 ${activeModuleId === mod.id ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`} />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-7 bg-slate-900/40 border-t border-white/5">
           {isGlobalProcessing && batchProgress.total > 0 && (
              <div className="mb-5 space-y-2.5">
                <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  <span>批量处理中...</span>
                  <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-500 shadow-lg shadow-blue-600/50" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
                </div>
              </div>
           )}
           <button 
              onClick={isGlobalProcessing ? () => { stopBatchRef.current = true; } : handleFillRemaining} 
              disabled={modules.length === 0} 
              className={`w-full flex flex-col items-center justify-center gap-2 py-5 rounded-[1.5rem] text-xs font-black transition-all shadow-2xl ${isGlobalProcessing ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}
           >
              {isGlobalProcessing ? (
                <> <Loader2 size={18} className="animate-spin" /> 停止批量生成 </>
              ) : (
                <> <Layers size={18} /> 批量自动填充缺失板块 </>
              )}
           </button>
        </div>
      </div>

      {/* 主工作区 */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${isContextOpen ? 'mr-[450px]' : 'mr-12'}`}>
        {activeModule ? (
          <ModuleEditor 
              module={activeModule} context={context} 
              updateModuleContent={updateModuleContent}
              onGenerateFullWeek={() => handleGenerateFullWeek(activeModule.id)}
              onPause={() => { stopBatchRef.current = true; }}
              isGlobalProcessing={isGlobalProcessing}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-300 p-20">
            <div className="w-32 h-32 bg-slate-200 rounded-[3.5rem] flex items-center justify-center mb-10 text-slate-300 shadow-inner group">
                <LayoutGrid size={56} className="group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">准备好开启高效授课了吗？</h2>
            <p className="text-sm text-slate-500 max-w-md text-center leading-relaxed font-medium">
              请先在右侧面板点击 <span className="text-blue-600 font-black">批量导入素材</span> 上传您的 PPT、录音或教学大纲。AI 将根据您的教学风格自动构建全套课件内容。
            </p>
            <div className="mt-12 flex gap-8">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 font-black text-xs">1</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">导入素材</span>
                </div>
                <div className="w-12 h-px bg-slate-200 self-center opacity-50"></div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 font-black text-xs">2</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">生成大纲</span>
                </div>
                <div className="w-12 h-px bg-slate-200 self-center opacity-50"></div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 font-black text-xs">3</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">填充板块</span>
                </div>
            </div>
          </div>
        )}
      </div>

      <ContextManager 
        context={context} setContext={setContext}
        isOpen={isContextOpen} toggleOpen={() => setIsContextOpen(!isContextOpen)}
        onSave={saveCurrentProject} onClear={() => setContext(INITIAL_CONTEXT)}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => {
          const proj = projects.find(p => p.id === id);
          if (proj) loadProject(proj);
        }}
        onCreateProject={createNewProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
      />

      <AiAssistant context={context} />
    </div>
  );
};

export default App;