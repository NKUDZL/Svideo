import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Upload, 
  FolderInput,
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Film,
  RotateCcw,
  Undo2,
  FileText,
  AlertCircle,
  FileVideo,
  List,
  Menu,
  X,
  Info,
  Save // 新增 Save 图标
} from 'lucide-react';

export default function App() {
  // --- 状态管理 ---
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [decisions, setDecisions] = useState({}); 
  const [playbackRate, setPlaybackRate] = useState(1.0); 
  const [isPlaying, setIsPlaying] = useState(true);
  const [view, setView] = useState('upload'); 
  const [videoError, setVideoError] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // UI 交互状态
  const [showResetModal, setShowResetModal] = useState(false); 
  const [toasts, setToasts] = useState([]); 

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);   
  const folderInputRef = useRef(null); 
  const sidebarRef = useRef(null);

  // --- 消息提示系统 (Toast) ---
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- 文件类型检测 ---
  const isVideoFile = (file) => {
    if (file.type.startsWith('video/')) return true;
    const videoExtensions = /\.(mp4|mov|webm|mkv|avi|wmv|flv|m4v|3gp|ts|mts|m2ts)$/i;
    return videoExtensions.test(file.name);
  };

  // --- 暂存功能：保存进度 ---
  const handleSaveProgress = () => {
    if (Object.keys(decisions).length === 0) {
      addToast("暂无进度可保存", "info");
      return;
    }
    try {
      // 保存 decisions 到 localStorage
      localStorage.setItem('svideo_saved_decisions', JSON.stringify(decisions));
      addToast("进度已暂存成功！下次导入相同文件将自动恢复。", "success");
    } catch (e) {
      console.error(e);
      addToast("保存失败，可能是存储空间已满", "error");
    }
  };

  // --- 通用文件处理逻辑 (含自动恢复) ---
  const processFiles = (fileList) => {
    const videoFiles = fileList.filter(isVideoFile);
    if (videoFiles.length === 0) {
      addToast("未找到支持的视频文件 (MP4, MOV 等)", "error");
      return;
    }
    // 自然排序
    videoFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    setFiles(videoFiles);
    
    // --- 尝试恢复进度 ---
    try {
      const savedData = localStorage.getItem('svideo_saved_decisions');
      let restoredDecisions = {};
      let restoredCount = 0;

      if (savedData) {
        const parsedSaved = JSON.parse(savedData);
        // 仅恢复当前文件列表中存在的文件的决策
        videoFiles.forEach(file => {
          if (parsedSaved[file.name]) {
            restoredDecisions[file.name] = parsedSaved[file.name];
            restoredCount++;
          }
        });
      }

      setDecisions(restoredDecisions);

      // 智能跳转：跳转到第一个“未标记”的视频
      let firstUnreviewedIndex = 0;
      if (restoredCount > 0) {
        firstUnreviewedIndex = videoFiles.findIndex(f => !restoredDecisions[f.name]);
        if (firstUnreviewedIndex === -1) firstUnreviewedIndex = 0; // 全部都标记过，从头开始或跳转到最后？这里选从头预览
        
        addToast(`已自动恢复 ${restoredCount} 个视频的筛选记录`, "success");
      }

      setCurrentIndex(firstUnreviewedIndex);
    } catch (e) {
      console.error("Restore failed", e);
      setDecisions({});
      setCurrentIndex(0);
    }

    setView('screening');
    setPlaybackRate(1.0);
    setVideoError(false);
  };

  // --- 视频控制 ---
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentIndex, videoError]);

  useEffect(() => {
    setVideoError(false);
    setIsPlaying(true);
    
    // 侧边栏自动滚动到当前项
    if (sidebarRef.current) {
      const activeItem = sidebarRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex]);

  // --- 核心逻辑：决策与导航 ---
  const handleDecision = useCallback((type) => {
    if (currentIndex === -1 || currentIndex >= files.length) return;

    const currentFile = files[currentIndex];
    setDecisions(prev => ({
      ...prev,
      [currentFile.name]: type
    }));

    // 自动跳到下一个
    if (currentIndex < files.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      addToast("已是最后一个视频，正在生成报告...", "success");
      setTimeout(() => setView('summary'), 1000);
    }
  }, [currentIndex, files]);

  const navigate = useCallback((direction) => {
    if (direction === 'next' && currentIndex < files.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, files.length]);

  const handleUndo = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevFileName = files[prevIndex].name;
      setCurrentIndex(prevIndex);
      setDecisions(prev => {
        const newDecisions = { ...prev };
        delete newDecisions[prevFileName];
        return newDecisions;
      });
    }
  }, [currentIndex, files]);

  // --- 触发重置流程 ---
  const triggerReset = () => {
    setShowResetModal(true);
  };

  // --- 执行重置 ---
  const executeReset = () => {
    setShowResetModal(false);
    setView('upload');
    setTimeout(() => {
      setFiles([]);
      setDecisions({});
      setCurrentIndex(-1);
      setVideoError(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
      addToast("已重置 (本地暂存记录未清除，如需清除请手动覆盖)", "success");
    }, 50);
  };

  // --- 键盘监听 ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showResetModal) return; 
      if (view !== 'screening') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // 支持 Ctrl+S 保存
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProgress();
        return;
      }

      switch(e.key.toLowerCase()) {
        case 'y':
          handleDecision('keep');
          break;
        case 'n':
          handleDecision('discard');
          break;
        case 'd':
        case 'arrowright':
          navigate('next');
          break;
        case 'a':
        case 'arrowleft':
          navigate('prev');
          break;
        case 'z':
        case 'backspace':
          handleUndo();
          break;
        case ' ':
          e.preventDefault();
          if (videoRef.current && !videoError) {
            if (videoRef.current.paused) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
            setIsPlaying(!videoRef.current.paused);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleDecision, navigate, handleUndo, videoError, showResetModal]);

  // --- 导出逻辑 ---
  const exportSingleList = (type) => {
    const list = files
      .filter(f => decisions[f.name] === type)
      .map(f => f.name);
      
    if (list.length === 0) {
      addToast(`没有标记为 ${type === 'keep' ? '保留' : '舍弃'} 的文件`, "info");
      return;
    }

    const title = type === 'keep' ? '保留清单 (KEEP)' : '舍弃清单 (DISCARD)';
    const content = `Svideo ${title}\n导出时间: ${new Date().toLocaleString()}\n\n${list.join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Svideo_${type === 'keep' ? '保留' : '舍弃'}_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("下载已开始", "success");
  };

  // --- 生成视频 URL ---
  const currentVideoUrl = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < files.length) {
      return URL.createObjectURL(files[currentIndex]);
    }
    return null;
  }, [files, currentIndex]);

  // --- 组件渲染 (UI) ---
  const ToastContainer = () => (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={`
            px-4 py-3 rounded-lg shadow-lg backdrop-blur-md animate-in slide-in-from-right fade-in duration-300 flex items-center gap-2 max-w-sm pointer-events-auto
            ${t.type === 'error' ? 'bg-red-500/90 text-white' : t.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-white'}
          `}
        >
          {t.type === 'error' ? <AlertCircle size={18}/> : <Info size={18}/>}
          <span className="text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );

  const ResetConfirmModal = () => {
    if (!showResetModal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <RotateCcw size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">重新开始？</h3>
              <p className="text-slate-500 text-sm mt-1">当前进度将清空。确定要返回首页吗？</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button onClick={() => setShowResetModal(false)} className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={executeReset} className="px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">确定清空</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-[60] flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-2 cursor-pointer group" onClick={view === 'upload' ? null : triggerReset}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30 group-hover:bg-blue-700 transition-colors">S</div>
        <span className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">Svideo</span>
      </div>

      {view === 'screening' && (
        <div className="flex items-center gap-3 md:gap-4">
          {/* 暂存按钮 */}
          <button 
            onClick={handleSaveProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
            title="暂存当前进度 (Ctrl+S)"
          >
            <Save size={16} />
            <span className="hidden sm:inline">暂存</span>
          </button>

          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg">
            {[0.8, 1.0, 1.5, 2.0].map((rate) => (
              <button key={rate} onClick={() => setPlaybackRate(rate)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${playbackRate === rate ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>{rate}x</button>
            ))}
          </div>
          <button onClick={() => setView('summary')} className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap">结束筛选</button>
          <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setShowSidebar(!showSidebar)}><Menu size={20} /></button>
        </div>
      )}
    </header>
  );

  const Sidebar = () => (
    <div ref={sidebarRef} className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 pt-16 pb-24 md:pb-0 transform transition-transform duration-300 ease-in-out flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><List size={16} /> 视频列表 ({files.length})</span>
        <span className="text-xs text-slate-400">{(currentIndex + 1)} / {files.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {files.map((file, index) => {
          const status = decisions[file.name];
          const isActive = index === currentIndex;
          return (
            <div key={file.name} data-index={index} onClick={() => setCurrentIndex(index)} className={`group flex items-center gap-3 p-3 px-4 text-sm cursor-pointer transition-all border-l-4 ${isActive ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}>
              <div className="shrink-0 flex items-center justify-center w-5 h-5">
                {status === 'keep' ? <CheckCircle2 size={16} className="text-green-500 fill-green-100" /> : status === 'discard' ? <XCircle size={16} className="text-red-500 fill-red-100" /> : <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'bg-blue-400 scale-125' : 'bg-slate-200 group-hover:bg-slate-300'}`} />}
              </div>
              <span className={`truncate flex-1 ${isActive ? 'font-semibold' : ''}`}>{file.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans selection:bg-blue-100">
        <Header />
        <ToastContainer />
        <main className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="max-w-4xl w-full text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">Svideo</h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">专为创作者打造的高效能视频初选工具。<br/><span className="text-base font-normal mt-2 block text-slate-400">极简设计，可视化列表，键盘流操作。</span></p>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
              <div className="group relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-10 transition-all duration-300 bg-white hover:bg-blue-50/20 cursor-pointer shadow-sm hover:shadow-xl flex flex-col items-center gap-4" onClick={() => fileInputRef.current.click()}>
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300"><FileVideo size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700 group-hover:text-blue-600">选择视频文件</h3>
                <p className="text-sm text-slate-400">支持多选 (Ctrl/Cmd + 点击)</p>
                <input type="file" multiple ref={fileInputRef} className="hidden" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.mp4" onChange={(e) => processFiles(Array.from(e.target.files))} />
              </div>
              <div className="group relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-10 transition-all duration-300 bg-white hover:bg-blue-50/20 cursor-pointer shadow-sm hover:shadow-xl flex flex-col items-center gap-4" onClick={() => folderInputRef.current.click()}>
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300"><FolderInput size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700 group-hover:text-indigo-600">导入整个文件夹</h3>
                <p className="text-sm text-slate-400">批量扫描文件夹内的视频</p>
                <input type="file" multiple ref={folderInputRef} className="hidden" {...{webkitdirectory: "", directory: ""}} onChange={(e) => processFiles(Array.from(e.target.files))} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-16 text-left">
              <KeyGuide k="A / ←" label="上一个" icon={<ChevronLeft size={14}/>} />
              <KeyGuide k="D / →" label="下一个" icon={<ChevronRight size={14}/>} />
              <KeyGuide k="Y" label="保留 (Yes)" color="green" icon={<CheckCircle2 size={14}/>} />
              <KeyGuide k="N" label="舍弃 (No)" color="red" icon={<XCircle size={14}/>} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'screening') {
    const currentFile = files[currentIndex];
    const status = decisions[currentFile.name];

    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        <Header />
        <ToastContainer />
        <ResetConfirmModal />
        
        <div className="flex-1 flex pt-16 pb-24 h-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden" onClick={() => setShowSidebar(false)}>
            <div className="relative w-full h-full max-w-6xl max-h-full flex items-center justify-center bg-black rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-200/50">
              {currentFile ? (
                <>
                  {!videoError ? (
                    <video key={currentFile.name} ref={videoRef} src={currentVideoUrl} className="w-full h-full object-contain" autoPlay controls={false} loop muted playsInline onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={(e) => { console.error("Video Error:", e); setVideoError(true); setIsPlaying(false); }} />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-white/80 animate-in fade-in bg-slate-900/80 p-8 rounded-2xl backdrop-blur">
                      <AlertCircle size={48} className="text-red-400" />
                      <div className="text-center"><h3 className="text-lg font-bold text-white">无法播放此格式</h3><p className="text-sm mt-2 text-white/60 max-w-xs">文件名: {currentFile.name}<br/>建议使用转码工具处理后再导入。</p></div>
                    </div>
                  )}
                </>
              ) : <div className="text-white">加载中...</div>}
              {status && <div className={`absolute top-6 right-6 px-5 py-2.5 rounded-full font-bold text-white shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in duration-200 ${status === 'keep' ? 'bg-green-500' : 'bg-red-500'}`}>{status === 'keep' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}{status === 'keep' ? 'KEEP' : 'DISCARD'}</div>}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pt-20 pointer-events-none">
                <div className="flex items-end justify-between text-white">
                  <div><h2 className="text-lg font-semibold truncate max-w-md drop-shadow-md select-text pointer-events-auto">{currentFile?.name}</h2><p className="text-xs text-white/70 font-mono mt-1">{(currentFile?.size / 1024 / 1024).toFixed(1)} MB</p></div>
                  <div className="flex gap-2">{!isPlaying && !videoError && <div className="bg-white/20 backdrop-blur px-2 py-1 rounded text-xs font-bold">PAUSED</div>}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)] flex items-center justify-center gap-4 md:gap-8 z-50 px-4">
           <button onClick={handleUndo} className="w-12 h-12 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors tooltip absolute left-4 md:left-8 hidden md:flex" title="撤销 (Z)"><Undo2 size={20} /></button>
           <div className="flex items-center gap-4 md:gap-8">
             <button onClick={() => navigate('prev')} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95" title="上一个 (A)"><ChevronLeft size={28} /></button>
             <button onClick={() => handleDecision('discard')} className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all active:scale-95 border-2 ${status === 'discard' ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white border-slate-100 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50'}`} title="快捷键: N"><XCircle size={32} /><span className="text-[10px] font-bold mt-1 uppercase tracking-wider">No</span></button>
             <button onClick={() => handleDecision('keep')} className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all active:scale-95 border-2 ${status === 'keep' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white border-slate-100 text-slate-400 hover:border-green-200 hover:text-green-500 hover:bg-green-50'}`} title="快捷键: Y"><CheckCircle2 size={32} /><span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Yes</span></button>
             <button onClick={() => navigate('next')} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95" title="下一个 (D)"><ChevronRight size={28} /></button>
           </div>
        </div>
      </div>
    );
  }

  if (view === 'summary') {
    const keeps = files.filter(f => decisions[f.name] === 'keep');
    const discards = files.filter(f => decisions[f.name] === 'discard');
    
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <ToastContainer />
        <ResetConfirmModal />
        <main className="max-w-5xl mx-auto p-6 md:p-12 pt-24">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-3xl font-bold text-slate-800">筛选结果汇总</h2>
              <div className="flex gap-4 mt-2 text-sm text-slate-500 font-medium"><span>总文件: {files.length}</span><span className="text-slate-300">•</span><span className="text-green-600">保留: {keeps.length}</span><span className="text-slate-300">•</span><span className="text-red-600">舍弃: {discards.length}</span></div>
            </div>
            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100/50 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-2 text-green-700 font-bold text-lg"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 size={20} /></div><h3>保留列表</h3></div><button onClick={() => exportSingleList('keep')} className="flex items-center gap-2 bg-white hover:bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"><Download size={16} />导出保留日志</button></div>
                <div className="bg-white rounded-xl border border-green-100 flex-1 overflow-hidden flex flex-col h-64 md:h-80"><ul className="overflow-y-auto p-2 h-full custom-scrollbar">{keeps.map(f => (<li key={f.name} className="flex items-center gap-2 p-2 text-sm text-slate-600 border-b border-slate-50 last:border-0 hover:bg-slate-50"><FileText size={14} className="text-green-400 shrink-0"/><span className="truncate">{f.name}</span></li>))}{keeps.length === 0 && <li className="p-4 text-center text-slate-400 text-sm italic">列表为空</li>}</ul></div>
              </div>
              <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100/50 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-2 text-red-700 font-bold text-lg"><div className="p-2 bg-red-100 rounded-lg"><XCircle size={20} /></div><h3>舍弃列表</h3></div><button onClick={() => exportSingleList('discard')} className="flex items-center gap-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"><Download size={16} />导出舍弃日志</button></div>
                <div className="bg-white rounded-xl border border-red-100 flex-1 overflow-hidden flex flex-col h-64 md:h-80"><ul className="overflow-y-auto p-2 h-full custom-scrollbar">{discards.map(f => (<li key={f.name} className="flex items-center gap-2 p-2 text-sm text-slate-600 border-b border-slate-50 last:border-0 hover:bg-slate-50"><FileText size={14} className="text-red-400 shrink-0"/><span className="truncate">{f.name}</span></li>))}{discards.length === 0 && <li className="p-4 text-center text-slate-400 text-sm italic">列表为空</li>}</ul></div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center"><button onClick={triggerReset} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-medium transition-colors px-6 py-3 rounded-lg hover:bg-slate-100 cursor-pointer"><RotateCcw size={18} />清空并重新开始</button></div>
          </div>
        </main>
      </div>
    );
  }
  
  return null;
}

const KeyGuide = ({ k, label, icon, color = "slate" }) => {
  const colors = { slate: "bg-slate-100 text-slate-600", green: "bg-green-50 text-green-600", red: "bg-red-50 text-red-600" };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div><div className="font-bold text-slate-700">{label}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{k}</div></div>
    </div>
  );
};