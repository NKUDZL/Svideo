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
  Save,
  Crop,
  Settings,
  Scissors,
  Move, // 移动图标
  Trash2, // 删除图标
  Square, // 复选框图标
  CheckSquare, // 已选中的复选框图标
  Keyboard
} from 'lucide-react';

export default function App() {
  // --- 状态管理 ---
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [decisions, setDecisions] = useState({}); 
  const [cropInfo, setCropInfo] = useState({});
  const [ffmpegPath, setFfmpegPath] = useState(null); 
  
  const [playbackRate, setPlaybackRate] = useState(1.0); 
  const [isPlaying, setIsPlaying] = useState(true);
  const [view, setView] = useState('upload'); 
  const [mode, setMode] = useState('filter'); // 'filter' | 'crop'
  const [videoError, setVideoError] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // 批量选择状态
  const [selectionMode, setSelectionMode] = useState(false); // 是否处于选择模式
  const [selectedFiles, setSelectedFiles] = useState(new Set()); // 选中的文件集合
  const [showClearModal, setShowClearModal] = useState(false); // 显示清除确认对话框
  const [clearDecisionsChecked, setClearDecisionsChecked] = useState(true); // 清除筛选的复选框状态
  const [clearCropsChecked, setClearCropsChecked] = useState(true); // 清除裁剪的复选框状态
  
  // 裁剪交互状态
  const [activeCropPreset, setActiveCropPreset] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingCrop, setIsCreatingCrop] = useState(false); // 是否正在创建新的裁剪框
  const [customCropWidth, setCustomCropWidth] = useState('');
  const [customCropHeight, setCustomCropHeight] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  // 用于记录拖拽起始状态
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const cropCreateStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  
  // UI 交互状态
  const [showResetModal, setShowResetModal] = useState(false); 
  const [toasts, setToasts] = useState([]); 

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null); 
  const fileInputRef = useRef(null);   
  const folderInputRef = useRef(null); 
  const sidebarRef = useRef(null);

  // --- 获取 FFmpeg 路径（Electron 环境）---
  useEffect(() => {
    // 检查是否在 Electron 环境中
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('get-ffmpeg-path').then((path) => {
          if (path) {
            setFfmpegPath(path);
            console.log('FFmpeg 路径:', path);
          }
        }).catch((err) => {
          console.error('获取 FFmpeg 路径失败:', err);
        });
      } catch (e) {
        console.log('不在 Electron 环境中或无法访问 IPC');
      }
    }
  }, []);

  // --- 消息提示系统 ---
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

  // --- 暂存功能：保存到 txt 文件 ---
  const handleSaveProgress = async () => {
    if (Object.keys(decisions).length === 0 && Object.keys(cropInfo).length === 0) {
      addToast("暂无进度可保存", "info");
      return;
    }
    
    const dataToSave = { 
      decisions, 
      cropInfo,
      currentIndex,
      files: files.map(f => ({ name: f.name, size: f.size })),
      timestamp: new Date().toISOString()
    };
    
    // 如果在 Electron 环境中，使用文件对话框保存
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('save-progress-to-file', dataToSave);
        if (result.success) {
          try { localStorage.setItem('svideo_saved_data', JSON.stringify(dataToSave)); } catch (_) {}
          addToast("进度已保存到文件！", "success");
        } else if (!result.canceled) {
          addToast("保存失败: " + result.error, "error");
        }
      } catch (e) {
        console.error('保存失败:', e);
        // 降级到 localStorage
        try {
          localStorage.setItem('svideo_saved_data', JSON.stringify(dataToSave));
          addToast("进度已暂存到本地存储", "success");
        } catch (localError) {
          addToast("保存失败，存储空间不足", "error");
        }
      }
    } else {
      // 浏览器环境：下载 txt 文件
      try {
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Svideo_暂存_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addToast("进度已下载为 txt 文件！", "success");
      } catch (e) {
        console.error(e);
        addToast("保存失败", "error");
      }
    }
  };
  
  // --- 加载暂存功能：从 txt 文件加载 ---
  const handleLoadProgress = async () => {
    if (files.length === 0) {
      addToast("请先导入视频文件", "info");
      return;
    }
    
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('load-progress-from-file');
        if (result.success) {
          const { data } = result;
          const decisionsData = data.decisions || {};
          const cropData = data.cropInfo || {};
          const restoredDecisions = {};
          const restoredCropInfo = {};
          files.forEach(file => {
            if (decisionsData[file.name]) restoredDecisions[file.name] = decisionsData[file.name];
            if (cropData[file.name]) restoredCropInfo[file.name] = cropData[file.name];
          });
          setDecisions(restoredDecisions);
          setCropInfo(restoredCropInfo);
          
          // 定位到保存的位置
          let targetIndex = 0;
          if (data.currentIndex !== undefined && data.currentIndex < files.length) {
            targetIndex = data.currentIndex;
          } else if (data.files && data.files.length > 0) {
            // 尝试根据文件名匹配
            const firstSavedFile = data.files[0];
            if (firstSavedFile) {
              const matchedIndex = files.findIndex(f => f.name === firstSavedFile.name);
              if (matchedIndex !== -1) {
                targetIndex = matchedIndex;
              }
            }
          }
          setCurrentIndex(targetIndex);
          try {
            const toStore = { decisions: restoredDecisions, cropInfo: restoredCropInfo, currentIndex: targetIndex, files: data.files || files.map(f => ({ name: f.name, size: f.size })), timestamp: new Date().toISOString() };
            localStorage.setItem('svideo_saved_data', JSON.stringify(toStore));
          } catch (_) {}
          addToast(`已加载暂存，定位到第 ${targetIndex + 1} 个视频`, "success");
        } else if (!result.canceled) {
          addToast("加载失败: " + result.error, "error");
        }
      } catch (e) {
        console.error('加载失败:', e);
        addToast("加载失败", "error");
      }
    } else {
      // 浏览器环境：使用文件输入
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const decisionsData = data.decisions || {};
          const cropData = data.cropInfo || {};
          const restoredDecisions = {};
          const restoredCropInfo = {};
          files.forEach(file => {
            if (decisionsData[file.name]) restoredDecisions[file.name] = decisionsData[file.name];
            if (cropData[file.name]) restoredCropInfo[file.name] = cropData[file.name];
          });
          setDecisions(restoredDecisions);
          setCropInfo(restoredCropInfo);
          let targetIndex = 0;
          if (data.currentIndex !== undefined && data.currentIndex < files.length) {
            targetIndex = data.currentIndex;
          }
          setCurrentIndex(targetIndex);
          try {
            const toStore = { decisions: restoredDecisions, cropInfo: restoredCropInfo, currentIndex: targetIndex, files: data.files || files.map(f => ({ name: f.name, size: f.size })), timestamp: new Date().toISOString() };
            localStorage.setItem('svideo_saved_data', JSON.stringify(toStore));
          } catch (_) {}
          addToast(`已加载暂存，定位到第 ${targetIndex + 1} 个视频`, "success");
        } catch (err) {
          addToast("文件格式错误", "error");
        }
      };
      input.click();
    }
  };

  // --- 文件处理逻辑 ---
  const processFiles = (fileList) => {
    const videoFiles = fileList.filter(isVideoFile);
    if (videoFiles.length === 0) {
      addToast("未找到支持的视频文件 (MP4, MOV 等)", "error");
      return;
    }
    videoFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    setFiles(videoFiles);
    
    // 恢复逻辑
    try {
      const savedDataStr = localStorage.getItem('svideo_saved_data');
      let restoredDecisions = {};
      let restoredCropInfo = {};
      let restoredCount = 0;

      if (savedDataStr) {
        const savedData = JSON.parse(savedDataStr);
        const decisionsData = savedData.decisions || (savedData.fileName ? {} : savedData); 
        const cropData = savedData.cropInfo || {};

        videoFiles.forEach(file => {
          if (decisionsData[file.name]) {
            restoredDecisions[file.name] = decisionsData[file.name];
            restoredCount++;
          }
          if (cropData[file.name]) {
            restoredCropInfo[file.name] = cropData[file.name];
          }
        });
      }

      setDecisions(restoredDecisions);
      setCropInfo(restoredCropInfo);

      let firstUnreviewedIndex = 0;
      if (restoredCount > 0) {
        firstUnreviewedIndex = videoFiles.findIndex(f => !restoredDecisions[f.name]);
        if (firstUnreviewedIndex === -1) firstUnreviewedIndex = 0;
        addToast(`已自动恢复 ${restoredCount} 个视频的记录`, "success");
      }

      setCurrentIndex(firstUnreviewedIndex);
    } catch (e) {
      console.error("Restore failed", e);
      setDecisions({});
      setCropInfo({});
      setCurrentIndex(0);
    }

    setPlaybackRate(1.0);
    setVideoError(false);
    // 不立即进入筛选页，留在首页以便用户可先「加载暂存」再「开始筛选」
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
    setActiveCropPreset(null);
    
    if (sidebarRef.current) {
      const activeItem = sidebarRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex]);

  // --- 核心逻辑：决策 ---
  const handleDecision = useCallback((type) => {
    if (currentIndex === -1 || currentIndex >= files.length) return;

    const currentFile = files[currentIndex];
    setDecisions(prev => ({
      ...prev,
      [currentFile.name]: type
    }));

    if (mode === 'filter') {
      if (currentIndex < files.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        addToast("已是最后一个视频", "success");
        setTimeout(() => setView('summary'), 1000);
      }
    } else {
      addToast(`已标记为 ${type === 'keep' ? '保留' : '舍弃'}`, type === 'keep' ? 'success' : 'info');
    }
  }, [currentIndex, files, mode]);

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

  // --- 辅助函数：将数值调整为 8 的倍数 ---
  const roundToMultipleOf8 = (value) => {
    return Math.max(8, Math.floor(value / 8) * 8);
  };

  // --- 裁剪逻辑：应用预设 ---
  const applyCropPreset = (targetWidth, targetHeight, type) => {
    if (!videoRef.current) return;
    
    const vW = videoRef.current.videoWidth;
    const vH = videoRef.current.videoHeight;
    
    if (vW === 0 || vH === 0) {
        addToast("视频尚未加载完成，请稍后", "error");
        return;
    }

    // 智能修正：如果预设尺寸超过视频分辨率，自动缩小到视频大小
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    let adjusted = false;

    if (finalWidth > vW) {
        finalWidth = roundToMultipleOf8(vW);
        adjusted = true;
    } else {
        finalWidth = roundToMultipleOf8(finalWidth);
    }
    
    if (finalHeight > vH) {
        finalHeight = roundToMultipleOf8(vH);
        adjusted = true;
    } else {
        finalHeight = roundToMultipleOf8(finalHeight);
    }

    const currentFile = files[currentIndex];
    // 默认居中
    const x = Math.max(0, Math.floor((vW - finalWidth) / 2));
    const y = Math.max(0, Math.floor((vH - finalHeight) / 2));

    setCropInfo(prev => ({
      ...prev,
      [currentFile.name]: { width: finalWidth, height: finalHeight, x, y, label: type }
    }));
    setActiveCropPreset(type);
    
    if (adjusted) {
        addToast(`视频尺寸较小，已自动调整为 ${finalWidth}x${finalHeight}`, "info");
    } else {
        addToast(`已应用 ${finalWidth}x${finalHeight} 裁剪框 (可拖动调整)`, "success");
    }
  };

  // --- 裁剪逻辑：手动输入尺寸 ---
  const applyCustomCrop = () => {
    if (!videoRef.current) return;
    
    const vW = videoRef.current.videoWidth;
    const vH = videoRef.current.videoHeight;
    
    if (vW === 0 || vH === 0) {
        addToast("视频尚未加载完成，请稍后", "error");
        return;
    }

    const width = parseInt(customCropWidth);
    const height = parseInt(customCropHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        addToast("请输入有效的尺寸", "error");
        return;
    }

    // 调整为 8 的倍数
    let finalWidth = roundToMultipleOf8(Math.min(width, vW));
    let finalHeight = roundToMultipleOf8(Math.min(height, vH));

    const currentFile = files[currentIndex];
    // 默认居中
    const x = Math.max(0, Math.floor((vW - finalWidth) / 2));
    const y = Math.max(0, Math.floor((vH - finalHeight) / 2));

    setCropInfo(prev => ({
      ...prev,
      [currentFile.name]: { width: finalWidth, height: finalHeight, x, y, label: 'custom' }
    }));
    setActiveCropPreset('custom');
    setShowCustomInput(false);
    setCustomCropWidth('');
    setCustomCropHeight('');
    
    addToast(`已应用自定义裁剪框 ${finalWidth}x${finalHeight} (已调整为 8 的倍数)`, "success");
  };

  // --- 裁剪逻辑：坐标计算辅助函数 ---
  const getVideoDisplayRect = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const rect = video.getBoundingClientRect(); // 元素在视口的位置(含黑边)
    
    // 计算实际显示区域(去黑边)
    const videoRatio = video.videoWidth / video.videoHeight;
    const elementRatio = rect.width / rect.height;
    
    let displayWidth = rect.width;
    let displayHeight = rect.height;
    let displayLeft = rect.left;
    let displayTop = rect.top;

    if (elementRatio > videoRatio) {
      // 容器比视频宽 -> 左右有黑边，高度占满
      displayWidth = rect.height * videoRatio;
      displayLeft = rect.left + (rect.width - displayWidth) / 2;
    } else {
      // 容器比视频窄 -> 上下有黑边，宽度占满
      displayHeight = rect.width / videoRatio;
      displayTop = rect.top + (rect.height - displayHeight) / 2;
    }
    
    // scale: 屏幕像素 / 视频原始像素
    return { 
      left: displayLeft, 
      top: displayTop, 
      width: displayWidth, 
      height: displayHeight, 
      scale: displayWidth / video.videoWidth 
    };
  };

  // --- 裁剪逻辑：拖拽处理（移动现有裁剪框）---
  const handleCropMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentFile = files[currentIndex];
    const crop = cropInfo[currentFile.name];
    if (!crop) return;

    setIsDragging(true);
    setIsCreatingCrop(false);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: crop.x,
      startY: crop.y
    };
  };

  // --- 裁剪逻辑：开始创建新的裁剪框 ---
  const handleVideoAreaMouseDown = (e) => {
    if (mode !== 'crop' || !videoRef.current) return;
    
    const rect = getVideoDisplayRect();
    if (!rect) return;

    // 检查是否点击在视频显示区域内
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    if (mouseX < rect.left || mouseX > rect.left + rect.width ||
        mouseY < rect.top || mouseY > rect.top + rect.height) {
      return; // 点击在视频区域外
    }

    // 检查是否点击在现有裁剪框上
    const currentFile = files[currentIndex];
    const crop = cropInfo[currentFile.name];
    if (crop) {
      const cropLeft = rect.left + (crop.x * rect.scale);
      const cropTop = rect.top + (crop.y * rect.scale);
      const cropRight = cropLeft + (crop.width * rect.scale);
      const cropBottom = cropTop + (crop.height * rect.scale);
      
      if (mouseX >= cropLeft && mouseX <= cropRight &&
          mouseY >= cropTop && mouseY <= cropBottom) {
        return; // 点击在现有裁剪框上，不创建新的
      }
    }

    // 开始创建新的裁剪框
    e.preventDefault();
    setIsCreatingCrop(true);
    setIsDragging(false);
    
    // 转换为视频坐标
    const videoX = (mouseX - rect.left) / rect.scale;
    const videoY = (mouseY - rect.top) / rect.scale;
    
    cropCreateStartRef.current = {
      mouseX: mouseX,
      mouseY: mouseY,
      startX: Math.max(0, Math.min(videoX, videoRef.current.videoWidth)),
      startY: Math.max(0, Math.min(videoY, videoRef.current.videoHeight))
    };
  };

  // 全局鼠标监听，确保拖拽流畅不丢失
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!videoRef.current) return;
      
      const rect = getVideoDisplayRect();
      if (!rect) return;

      const currentFile = files[currentIndex];
      const vW = videoRef.current.videoWidth;
      const vH = videoRef.current.videoHeight;

      // 处理创建新裁剪框
      if (isCreatingCrop) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // 转换为视频坐标
        const currentVideoX = Math.max(0, Math.min((mouseX - rect.left) / rect.scale, vW));
        const currentVideoY = Math.max(0, Math.min((mouseY - rect.top) / rect.scale, vH));
        
        // 计算裁剪框的起始位置和尺寸
        const startX = cropCreateStartRef.current.startX;
        const startY = cropCreateStartRef.current.startY;
        
        let cropX = Math.min(startX, currentVideoX);
        let cropY = Math.min(startY, currentVideoY);
        let cropWidth = Math.abs(currentVideoX - startX);
        let cropHeight = Math.abs(currentVideoY - startY);
        
        // 限制在视频边界内
        cropX = Math.max(0, Math.min(cropX, vW - 8));
        cropY = Math.max(0, Math.min(cropY, vH - 8));
        cropWidth = Math.min(cropWidth, vW - cropX);
        cropHeight = Math.min(cropHeight, vH - cropY);
        
        // 调整为 8 的倍数
        cropWidth = roundToMultipleOf8(cropWidth);
        cropHeight = roundToMultipleOf8(cropHeight);
        
        // 确保不超出边界
        if (cropX + cropWidth > vW) {
          cropX = vW - cropWidth;
        }
        if (cropY + cropHeight > vH) {
          cropY = vH - cropHeight;
        }
        
        // 更新临时裁剪框（仅在创建过程中显示，不保存）
        setCropInfo(prev => ({
          ...prev,
          [currentFile.name]: { 
            width: cropWidth, 
            height: cropHeight, 
            x: Math.floor(cropX), 
            y: Math.floor(cropY), 
            label: 'dragged' 
          }
        }));
        return;
      }

      // 处理移动现有裁剪框
      if (isDragging) {
        const crop = cropInfo[currentFile.name];
        if (!crop) return;

        // 计算鼠标位移 (屏幕像素)
        const deltaX_screen = e.clientX - dragStartRef.current.mouseX;
        const deltaY_screen = e.clientY - dragStartRef.current.mouseY;

        // 转换为视频原始像素位移
        const deltaX_video = deltaX_screen / rect.scale;
        const deltaY_video = deltaY_screen / rect.scale;

        // 计算新位置
        let newX = dragStartRef.current.startX + deltaX_video;
        let newY = dragStartRef.current.startY + deltaY_video;

        // 边界限制 (不能移出视频外)
        // 确保 newX 不小于 0，且 (newX + width) 不大于 vW
        newX = Math.max(0, Math.min(newX, vW - crop.width));
        // 确保 newY 不小于 0，且 (newY + height) 不大于 vH
        newY = Math.max(0, Math.min(newY, vH - crop.height));

        // 更新状态 (取整)
        setCropInfo(prev => ({
          ...prev,
          [currentFile.name]: { ...crop, x: Math.floor(newX), y: Math.floor(newY) }
        }));
      }
    };

    const handleGlobalMouseUp = () => {
      if (isCreatingCrop) {
        // 创建完成，确认裁剪框
        const currentFile = files[currentIndex];
        const crop = cropInfo[currentFile.name];
        if (crop && crop.width >= 8 && crop.height >= 8) {
          addToast(`已创建裁剪框 ${crop.width}x${crop.height} (可拖动调整位置)`, "success");
        } else {
          // 尺寸太小，清除
          setCropInfo(prev => {
            const newCrop = { ...prev };
            delete newCrop[currentFile.name];
            return newCrop;
          });
        }
        setIsCreatingCrop(false);
      }
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging || isCreatingCrop) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isCreatingCrop, currentIndex, files, cropInfo]);


  // --- UI 组件：可拖拽的裁剪覆盖层 ---
  const CropOverlay = () => {
    const currentFile = files[currentIndex];
    const crop = cropInfo[currentFile.name];
    
    // 只有在当前视频有裁剪信息时才显示（包括正在创建的）
    if (!crop || !videoRef.current) return null;
    
    // 如果正在创建且尺寸太小，不显示
    if (isCreatingCrop && (crop.width < 8 || crop.height < 8)) return null;

    // 计算覆盖层在屏幕上的位置
    const rect = getVideoDisplayRect();
    if (!rect) return null; // 视频未加载完

    const style = {
      position: 'fixed', // 使用 fixed 定位以避免父级 overflow 问题
      left: rect.left + (crop.x * rect.scale),
      top: rect.top + (crop.y * rect.scale),
      width: crop.width * rect.scale,
      height: crop.height * rect.scale,
      zIndex: 50,
      cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <div 
            style={style}
            onMouseDown={isCreatingCrop ? undefined : handleCropMouseDown}
            className={`group border-2 border-orange-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] box-content ${isDragging ? 'cursor-grabbing' : isCreatingCrop ? 'cursor-crosshair' : 'cursor-grab hover:bg-white/5'}`}
        >
            {/* 顶部信息标签 */}
            <div className="absolute -top-8 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-t font-bold shadow-sm whitespace-nowrap flex items-center gap-1">
                {isCreatingCrop ? (
                  <>创建中: {crop.width} x {crop.height}</>
                ) : (
                  <>
                    <Move size={12} />
                    {crop.width} x {crop.height} (XY: {Math.floor(crop.x)},{Math.floor(crop.y)})
                  </>
                )}
            </div>
            
            {/* 九宫格辅助线 */}
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity">
                <div className="border-r border-orange-400/50 border-b border-orange-400/50"></div>
                <div className="border-r border-orange-400/50 border-b border-orange-400/50"></div>
                <div className="border-b border-orange-400/50"></div>
                <div className="border-r border-orange-400/50 border-b border-orange-400/50"></div>
                <div className="border-r border-orange-400/50 border-b border-orange-400/50"></div>
                <div className="border-b border-orange-400/50"></div>
                <div className="border-r border-orange-400/50"></div>
                <div className="border-r border-orange-400/50"></div>
                <div></div>
            </div>
            
            {/* 四个角的装饰 */}
            <div className="absolute -left-1 -top-1 w-3 h-3 border-l-4 border-t-4 border-orange-500"></div>
            <div className="absolute -right-1 -top-1 w-3 h-3 border-r-4 border-t-4 border-orange-500"></div>
            <div className="absolute -left-1 -bottom-1 w-3 h-3 border-l-4 border-b-4 border-orange-500"></div>
            <div className="absolute -right-1 -bottom-1 w-3 h-3 border-r-4 border-b-4 border-orange-500"></div>
        </div>
    );
  }

  // --- 重置与键盘 ---
  const triggerReset = () => setShowResetModal(true);
  
  const executeReset = () => {
    setShowResetModal(false);
    setView('upload');
    setTimeout(() => {
      setFiles([]);
      setDecisions({});
      setCropInfo({});
      setCurrentIndex(-1);
      setVideoError(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
      addToast("已重置", "success");
    }, 50);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showResetModal) { setShowResetModal(false); return; }
        if (showClearModal) { setShowClearModal(false); return; }
      }
      if (showResetModal || showClearModal) return;
      if (view !== 'screening') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
  }, [view, handleDecision, navigate, handleUndo, videoError, showResetModal, showClearModal, mode]);

  // --- 导出：可选三项，对应筛选 / 裁剪 / 批处理 ---
  const filesToProcess = useMemo(() => files.filter(f => {
    const status = decisions[f.name];
    const hasCrop = cropInfo[f.name];
    if (status === 'discard') return false;
    return status === 'keep' || hasCrop;
  }), [files, decisions, cropInfo]);
  const hasExplicitKeeps = Object.values(decisions).some(v => v === 'keep');
  const hasCrops = Object.keys(cropInfo).length > 0;

  const exportFilterList = async () => {
    if (!hasExplicitKeeps) {
      addToast("没有筛选保留记录", "info");
      return;
    }
    const kept = files.filter(f => decisions[f.name] === 'keep');
    const content = `Svideo 筛选清单\n导出时间: ${new Date().toLocaleString()}\n\n` + kept.map(f => f.name).join('\n') + '\n';
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const r = await ipcRenderer.invoke('save-text-file', { defaultName: 'Svideo_筛选清单.txt', content, title: '保存筛选清单' });
        if (r.success) { addToast("筛选清单已保存", "success"); }
        else if (!r.canceled) { addToast("保存失败: " + (r.error || ''), "error"); }
      } catch (e) {
        addToast("保存失败", "error");
      }
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'Svideo_筛选清单.txt';
    a.click();
    URL.revokeObjectURL(u);
    addToast("已下载筛选清单", "success");
  };

  const exportCropList = async () => {
    if (!hasCrops) {
      addToast("没有裁剪记录", "info");
      return;
    }
    let content = `Svideo 视频裁剪清单\n导出时间: ${new Date().toLocaleString()}\n\n`;
    content += `文件名\t尺寸(宽x高)\t偏移(x,y)\n`;
    files.forEach(f => {
      const c = cropInfo[f.name];
      if (c) content += `${f.name}\t${c.width}x${c.height}\t${c.x}, ${c.y}\n`;
    });
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const r = await ipcRenderer.invoke('save-text-file', { defaultName: 'Svideo_裁剪清单.txt', content, title: '保存视频裁剪清单' });
        if (r.success) { addToast("裁剪清单已保存", "success"); }
        else if (!r.canceled) { addToast("保存失败: " + (r.error || ''), "error"); }
      } catch (e) {
        addToast("保存失败", "error");
      }
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'Svideo_裁剪清单.txt';
    a.click();
    URL.revokeObjectURL(u);
    addToast("已下载裁剪清单", "success");
  };

  const exportBatAndFfmpeg = async () => {
    if (filesToProcess.length === 0) {
      addToast("没有需要处理的文件 (请保留视频或设置裁剪)", "info");
      return;
    }
    const firstFileName = filesToProcess[0].name.replace(/"/g, '""');
    let batContent = `@echo off\r\n`;
    batContent += `cd /d "%~dp0"\r\n`;
    batContent += `chcp 65001 >nul\r\n`;
    batContent += `set "FFMPEG_CMD="\r\n`;
    batContent += `\r\n`;
    batContent += `echo ==========================================\r\n`;
    batContent += `echo      Svideo Batch Processing Script\r\n`;
    batContent += `echo ==========================================\r\n`;
    batContent += `echo.\r\n\r\n`;
    batContent += `echo [Check] Detecting FFmpeg...\r\n`;
    batContent += `where ffmpeg >nul 2>nul\r\n`;
    batContent += `if %errorlevel%==0 (\r\n`;
    batContent += `    set "FFMPEG_CMD=ffmpeg"\r\n`;
    batContent += `    echo [Check] Using ffmpeg from system PATH\r\n`;
    batContent += `    goto :detect_ok\r\n)\r\n`;
    batContent += `if exist "%~dp0ffmpeg.exe" (\r\n`;
    batContent += `    "%~dp0ffmpeg.exe" -version >nul 2>nul\r\n`;
    batContent += `    if %errorlevel%==0 (\r\n`;
    batContent += `        set "FFMPEG_CMD=%~dp0ffmpeg.exe"\r\n`;
    batContent += `        echo [Check] Using local ffmpeg.exe\r\n`;
    batContent += `        goto :detect_ok\r\n`;
    batContent += `    ) else (\r\n`;
    batContent += `        echo [Check] Local ffmpeg.exe exists but cannot run ^(e.g. Access denied^). Trying PATH again...\r\n`;
    batContent += `        where ffmpeg >nul 2>nul\r\n`;
    batContent += `        if %errorlevel%==0 set "FFMPEG_CMD=ffmpeg"\r\n`;
    batContent += `    )\r\n`;
    batContent += `)\r\n`;
    batContent += `if not defined FFMPEG_CMD (\r\n`;
    batContent += `    color 0C\r\n`;
    batContent += `    echo.\r\necho [ERROR] FFmpeg not found or not allowed to run.\r\n`;
    batContent += `    echo - Put ffmpeg.exe in the same folder as this script, or\r\n`;
    batContent += `    echo - Install FFmpeg system-wide and add to PATH.\r\n`;
    batContent += `    echo - On company PC: ask IT to allow ffmpeg.exe or use system FFmpeg.\r\n`;
    batContent += `    echo.\r\npause\r\nexit /b 1\r\n)\r\n`;
    batContent += `:detect_ok\r\n`;
    batContent += `echo.\r\n`;
    batContent += `if not exist "${firstFileName}" (\r\n`;
    batContent += `    color 0C\r\n`;
    batContent += `    echo [ERROR] Video file not found: ${firstFileName}\r\n`;
    batContent += `    echo.\r\n`;
    batContent += `    echo Please put this script and ffmpeg.exe in the SAME folder as your video files,\r\n`;
    batContent += `    echo then run this script again.\r\n`;
    batContent += `    echo.\r\npause\r\nexit /b 1\r\n)\r\n`;
    batContent += `\r\n`;
    batContent += `:process\r\n`;
    batContent += `if not exist "Svideo_Output" mkdir "Svideo_Output"\r\n`;
    batContent += `echo [Start] Processing ${filesToProcess.length} video(s)...\r\n\r\n`;

    filesToProcess.forEach((f, index) => {
      const crop = cropInfo[f.name];
      const safeName = f.name.replace(/"/g, '""');
      batContent += `echo [${index + 1}/${filesToProcess.length}] Processing: ${f.name}\r\n`;
      if (crop) {
        batContent += `"%FFMPEG_CMD%" -y -i "${safeName}" -vf "crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}" -c:v libx264 -preset medium -crf 23 -c:a copy "Svideo_Output\\${safeName}"\r\n`;
        batContent += `if errorlevel 1 (echo [ERROR] Failed: ${f.name}\r\npause\r\ngoto :end)\r\n`;
        batContent += `echo [OK] Cropped: ${f.name}\r\n`;
      } else {
        batContent += `copy /y "${safeName}" "Svideo_Output\\${safeName}" >nul\r\n`;
        batContent += `if errorlevel 1 (echo [ERROR] Failed: ${f.name}\r\npause\r\ngoto :end)\r\n`;
        batContent += `echo [OK] Copied: ${f.name}\r\n`;
      }
      batContent += `echo.\r\n`;
    });

    batContent += `echo.\r\necho ==========================================\r\n`;
    batContent += `echo           All Done!\r\n`;
    batContent += `echo ==========================================\r\n:end\r\npause\r\n`;

    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('export-script-and-ffmpeg-to-folder', { batContent });
        if (result.success) {
          const msg = result.ffmpegCopied
            ? `已导出到 ${result.folderPath}。请确保 .bat 与 ffmpeg.exe 和所有视频在同一文件夹内，再双击运行 .bat。`
            : `已导出到 ${result.folderPath}。请将 ffmpeg.exe 放入该文件夹，确保与 .bat 和视频在同一文件夹内，再双击运行 .bat。`;
          addToast(msg, "success");
        } else if (result.canceled) {
          addToast("已取消导出", "info");
        } else {
          addToast("导出失败: " + (result.error || '未知错误'), "error");
        }
        return;
      } catch (e) {
        addToast("导出失败，请重试", "error");
        return;
      }
    }
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'Svideo_处理脚本.bat';
    a.click();
    URL.revokeObjectURL(u);
    addToast("已下载处理脚本。请将 .bat 与 ffmpeg.exe 放在视频文件夹中后运行。", "info");
  };

  const currentVideoUrl = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < files.length) {
      return URL.createObjectURL(files[currentIndex]);
    }
    return null;
  }, [files, currentIndex]);

  // --- UI 组件 ---
  const ToastContainer = () => (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-md animate-in slide-in-from-right fade-in duration-300 flex items-center gap-2 max-w-sm pointer-events-auto ${t.type === 'error' ? 'bg-red-500/90 text-white' : t.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-white'}`}>
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
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><RotateCcw size={24} /></div>
            <div><h3 className="text-lg font-bold text-slate-800">重新开始？</h3><p className="text-slate-500 text-sm mt-1">当前进度将清空。确定要返回首页吗？</p></div>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button onClick={() => setShowResetModal(false)} className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={executeReset} className="px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">确定清空</button>
            </div>
            <p className="text-xs text-slate-400 mt-2">按 <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono">Esc</kbd> 关闭</p>
          </div>
        </div>
      </div>
    );
  };

  const ClearSelectedModal = () => {
    if (!showClearModal) return null;
    
    const selectedCount = selectedFiles.size;
    const selectedFileNames = Array.from(selectedFiles).slice(0, 3);
    const hasDecisions = Array.from(selectedFiles).some(name => decisions[name]);
    const hasCrops = Array.from(selectedFiles).some(name => cropInfo[name]);
    
    // 当打开对话框时，根据选中文件的状态设置默认值
    useEffect(() => {
      if (showClearModal) {
        setClearDecisionsChecked(hasDecisions);
        setClearCropsChecked(hasCrops);
      }
    }, [showClearModal, hasDecisions, hasCrops]);
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 scale-100 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center"><Trash2 size={24} /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">批量清除记录</h3>
                <p className="text-slate-500 text-sm mt-1">已选择 {selectedCount} 个文件</p>
              </div>
            </div>
            
            {selectedFileNames.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="text-xs text-slate-600 font-bold mb-1">选中的文件：</div>
                {selectedFileNames.map(name => (
                  <div key={name} className="text-xs text-slate-500 truncate">• {name}</div>
                ))}
                {selectedCount > 3 && <div className="text-xs text-slate-400 mt-1">... 还有 {selectedCount - 3} 个文件</div>}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-700">选择要清除的内容：</div>
              <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={clearDecisionsChecked}
                  onChange={(e) => setClearDecisionsChecked(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">清除筛选记录（保留/舍弃标记）</span>
              </label>
              <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={clearCropsChecked}
                  onChange={(e) => setClearCropsChecked(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">清除裁剪记录</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={() => setShowClearModal(false)} className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
              <button 
                onClick={() => {
                  if (!clearDecisionsChecked && !clearCropsChecked) {
                    addToast("请至少选择一项要清除的内容", "info");
                    return;
                  }
                  handleClearSelected(clearDecisionsChecked, clearCropsChecked);
                }} 
                className="px-4 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
              >
                确定清除
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">按 <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono">Esc</kbd> 关闭</p>
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
          <button onClick={handleSaveProgress} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors" title="暂存当前进度 (Ctrl+S)">
            <Save size={16} /><span className="hidden sm:inline">暂存</span>
          </button>
          
          <button 
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedFiles(new Set());
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              selectionMode 
                ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
            title="批量选择后可清除记录"
          >
            {selectionMode ? <X size={16} /> : <Square size={16} />}
            <span className="hidden sm:inline">{selectionMode ? '取消选择' : '批量操作'}</span>
          </button>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button onClick={() => setMode('filter')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'filter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CheckCircle2 size={14}/> 筛选</button>
             <button onClick={() => setMode('crop')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'crop' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Crop size={14}/> 裁剪</button>
          </div>

          <button onClick={() => setView('summary')} className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap">结束 & 导出</button>
          <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setShowSidebar(!showSidebar)}><Menu size={20} /></button>
        </div>
      )}
    </header>
  );

  // --- 批量清除功能 ---
  const toggleFileSelection = (fileName) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.name)));
    }
  };

  const handleClearSelected = (clearDecisions, clearCrops) => {
    if (selectedFiles.size === 0) {
      addToast("请先选择要清除的文件", "info");
      return;
    }

    setDecisions(prev => {
      const newDecisions = { ...prev };
      selectedFiles.forEach(fileName => {
        if (clearDecisions) {
          delete newDecisions[fileName];
        }
      });
      return newDecisions;
    });

    setCropInfo(prev => {
      const newCropInfo = { ...prev };
      selectedFiles.forEach(fileName => {
        if (clearCrops) {
          delete newCropInfo[fileName];
        }
      });
      return newCropInfo;
    });

    const clearedCount = selectedFiles.size;
    const clearedTypes = [];
    if (clearDecisions) clearedTypes.push('筛选');
    if (clearCrops) clearedTypes.push('裁剪');
    
    addToast(`已清除 ${clearedCount} 个文件的${clearedTypes.join('和')}记录`, "success");
    setSelectedFiles(new Set());
    setSelectionMode(false);
    setShowClearModal(false);
  };

  const Sidebar = () => (
    <div ref={sidebarRef} className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 pt-16 pb-24 md:pb-0 transform transition-transform duration-300 ease-in-out flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><List size={16} /> 视频列表 ({files.length})</span>
          <span className="text-xs text-slate-400">{(currentIndex + 1)} / {files.length}</span>
        </div>
        {selectionMode && (
          <div className="flex items-center gap-2 mt-2">
            <button 
              onClick={toggleSelectAll}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-bold transition-colors"
            >
              {selectedFiles.size === files.length ? '取消全选' : '全选'}
            </button>
            <button 
              onClick={() => { setSelectionMode(false); setSelectedFiles(new Set()); }}
              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-bold transition-colors"
            >
              取消
            </button>
            {selectedFiles.size > 0 && (
              <button 
                onClick={() => setShowClearModal(true)}
                className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded font-bold transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                清除记录 ({selectedFiles.size})
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {files.map((file, index) => {
          const status = decisions[file.name];
          const hasCrop = cropInfo[file.name];
          const isActive = index === currentIndex;
          const isSelected = selectedFiles.has(file.name);
          const hasAnyData = status || hasCrop;
          
          return (
            <div 
              key={file.name} 
              data-index={index} 
              onClick={(e) => {
                if (selectionMode) {
                  e.stopPropagation();
                  toggleFileSelection(file.name);
                } else {
                  setCurrentIndex(index);
                }
              }}
              className={`group flex items-center gap-3 p-3 px-4 text-sm cursor-pointer transition-all border-l-4 ${
                isActive && !selectionMode ? 'bg-blue-50 border-blue-600 text-blue-700' : 
                isSelected ? 'bg-orange-50 border-orange-400' :
                'border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              {selectionMode ? (
                <div 
                  className="shrink-0 flex items-center justify-center w-5 h-5"
                  onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.name); }}
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-orange-500" />
                  ) : (
                    <Square size={18} className="text-slate-400" />
                  )}
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-center w-5 h-5">
                  {status === 'keep' ? <CheckCircle2 size={16} className="text-green-500 fill-green-100" /> : status === 'discard' ? <XCircle size={16} className="text-red-500 fill-red-100" /> : <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'bg-blue-400 scale-125' : 'bg-slate-200 group-hover:bg-slate-300'}`} />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={`truncate ${isActive && !selectionMode ? 'font-semibold' : ''}`}>{file.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {hasCrop && <div className="text-[10px] text-orange-500 flex items-center gap-1"><Scissors size={10}/> 已裁剪</div>}
                  {status && <div className={`text-[10px] flex items-center gap-1 ${status === 'keep' ? 'text-green-500' : 'text-red-500'}`}>
                    {status === 'keep' ? '✓ 保留' : '✗ 舍弃'}
                  </div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const clearFilesAndResetUpload = () => {
    setFiles([]);
    setDecisions({});
    setCropInfo({});
    setCurrentIndex(-1);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const clearStashOnUpload = () => {
    setDecisions({});
    setCropInfo({});
    setCurrentIndex(0);
    addToast("已取消暂存", "info");
  };

  const startScreening = () => {
    const idx = files.findIndex(f => !decisions[f.name]);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setView('screening');
    setPlaybackRate(1.0);
    setVideoError(false);
  };

  if (view === 'upload') {
    const hasImported = files.length > 0;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans selection:bg-blue-100">
        <Header />
        <ToastContainer />
        <main className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="max-w-4xl w-full text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">Svideo</h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">专为创作者打造的高效能视频初选与裁剪工具。<br/><span className="text-base font-normal mt-2 block text-slate-400">导入 → 筛选 → 设定裁剪 → 批量导出处理脚本</span></p>
            <div className="max-w-2xl mx-auto mt-8 px-4 py-4 bg-white/80 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard size={18} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-600">筛选时可用的快捷键</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">A</kbd>/<kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">D</kbd> 切换视频</div>
                <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">Y</kbd> 保留</div>
                <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">N</kbd> 舍弃</div>
                <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">Z</kbd> 撤销</div>
                <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">空格</kbd> 播放/暂停</div>
                <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold">Ctrl+S</kbd> 暂存</div>
              </div>
            </div>

            {!hasImported ? (
              <>
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
                  <div className="group relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-10 transition-all duration-300 bg-white hover:bg-blue-50/20 cursor-pointer shadow-sm hover:shadow-xl flex flex-col items-center gap-4" onClick={() => fileInputRef.current.click()}>
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300"><FileVideo size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-700 group-hover:text-blue-600">选择视频文件</h3>
                    <input type="file" multiple ref={fileInputRef} className="hidden" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.mp4" onChange={(e) => processFiles(Array.from(e.target.files))} />
                  </div>
                  <div className="group relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-10 transition-all duration-300 bg-white hover:bg-blue-50/20 cursor-pointer shadow-sm hover:shadow-xl flex flex-col items-center gap-4" onClick={() => folderInputRef.current.click()}>
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300"><FolderInput size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-700 group-hover:text-indigo-600">导入整个文件夹</h3>
                    <input type="file" multiple ref={folderInputRef} className="hidden" {...{webkitdirectory: "", directory: ""}} onChange={(e) => processFiles(Array.from(e.target.files))} />
                  </div>
                </div>
                <div className="mt-8">
                  <button onClick={handleLoadProgress} className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed" disabled title="请先导入视频后再加载暂存">
                    <FileText size={20} />
                    加载暂存文件
                  </button>
                  <p className="text-sm text-slate-400 mt-2">需先导入视频后再加载暂存</p>
                </div>
              </>
            ) : (
              <div className="max-w-2xl mx-auto mt-12 space-y-6">
                <div className="px-6 py-4 bg-green-50 border border-green-200 rounded-2xl">
                  <p className="text-lg font-bold text-green-800">已导入 {files.length} 个视频</p>
                  <p className="text-sm text-green-600 mt-1">可先加载暂存再开始筛选，或直接开始</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="relative inline-flex">
                    <button onClick={handleLoadProgress} className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold transition-colors border border-blue-200">
                      <FileText size={20} />
                      加载暂存文件
                    </button>
                    {(Object.keys(decisions).length > 0 || Object.keys(cropInfo).length > 0) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearStashOnUpload(); }}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors"
                        title="取消暂存"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                  <button onClick={startScreening} className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30">
                    <Play size={20} />
                    开始筛选
                  </button>
                  <button onClick={clearFilesAndResetUpload} className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">
                    重新选择
                  </button>
                </div>
              </div>
            )}
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
        <ClearSelectedModal />
        
        <div className="flex-1 flex pt-16 pb-24 h-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden" onClick={() => setShowSidebar(false)}>
            <div 
              ref={videoContainerRef} 
              className="relative w-full h-full max-w-6xl max-h-full flex items-center justify-center bg-black rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-200/50"
              onMouseDown={mode === 'crop' ? handleVideoAreaMouseDown : undefined}
              style={{ cursor: mode === 'crop' && !isDragging && !isCreatingCrop ? 'crosshair' : 'default' }}
            >
              {currentFile ? (
                <>
                  {!videoError ? (
                    <video key={currentFile.name} ref={videoRef} src={currentVideoUrl} className="w-full h-full object-contain" autoPlay={mode === 'filter'} controls={false} loop muted playsInline onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={(e) => { console.error("Video Error:", e); setVideoError(true); setIsPlaying(false); }} />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-white/80 animate-in fade-in bg-slate-900/80 p-8 rounded-2xl backdrop-blur">
                      <AlertCircle size={48} className="text-red-400" />
                      <div className="text-center"><h3 className="text-lg font-bold text-white">无法播放</h3></div>
                    </div>
                  )}
                  {/* 裁剪覆盖层 (全屏响应鼠标) */}
                  {mode === 'crop' && <CropOverlay />}
                </>
              ) : <div className="text-white">加载中...</div>}
              
              {mode === 'filter' && status && <div className={`absolute top-6 right-6 px-5 py-2.5 rounded-full font-bold text-white shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in duration-200 ${status === 'keep' ? 'bg-green-500' : 'bg-red-500'}`}>{status === 'keep' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}{status === 'keep' ? 'KEEP' : 'DISCARD'}</div>}
              
              {mode === 'crop' && !videoError && (
                  <div 
                    className="absolute top-6 right-6 flex flex-col gap-2 animate-in fade-in slide-in-from-right z-[60]"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div className="bg-black/60 backdrop-blur text-white p-3 rounded-xl border border-white/10 shadow-xl max-w-xs">
                          <div className="text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">设置裁剪尺寸</div>
                          <div className="flex flex-col gap-2">
                              <button onClick={() => applyCropPreset(832, 480, 'landscape')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeCropPreset === 'landscape' ? 'bg-orange-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>832 x 480 (横)</button>
                              <button onClick={() => applyCropPreset(480, 832, 'portrait')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeCropPreset === 'portrait' ? 'bg-orange-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>480 x 832 (竖)</button>
                              
                              {/* 手动输入尺寸 */}
                              {!showCustomInput ? (
                                <button onClick={() => setShowCustomInput(true)} className="px-4 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 transition-all">
                                  自定义尺寸
                                </button>
                              ) : (
                                <div className="bg-white/5 p-2 rounded-lg space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      placeholder="宽度"
                                      value={customCropWidth}
                                      onChange={(e) => setCustomCropWidth(e.target.value)}
                                      className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-white/50 focus:outline-none focus:border-orange-500"
                                      min="8"
                                      step="8"
                                    />
                                    <input
                                      type="number"
                                      placeholder="高度"
                                      value={customCropHeight}
                                      onChange={(e) => setCustomCropHeight(e.target.value)}
                                      className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-white/50 focus:outline-none focus:border-orange-500"
                                      min="8"
                                      step="8"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={applyCustomCrop} className="flex-1 px-3 py-1.5 rounded text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                                      应用
                                    </button>
                                    <button onClick={() => { setShowCustomInput(false); setCustomCropWidth(''); setCustomCropHeight(''); }} className="px-3 py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors">
                                      取消
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-white/50 text-center">尺寸必须是 8 的倍数</div>
                                </div>
                              )}
                              
                              <button onClick={() => { setCropInfo(prev => { const n = {...prev}; delete n[currentFile.name]; return n; }); setActiveCropPreset(null); }} className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">清除裁剪</button>
                          </div>
                          
                          {/* 拖拽提示 */}
                          <div className="pt-2 mt-2 border-t border-white/10 text-[10px] text-white/50 text-center">
                            提示：在视频上拖拽可创建裁剪框
                          </div>
                          
                          {/* New Next Button */}
                          <div className="pt-2 mt-2 border-t border-white/10">
                              <button onClick={() => navigate('next')} className="w-full px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors">
                                  确认 & 下一个 <ChevronRight size={16}/>
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pt-20 pointer-events-none">
                <div className="flex items-end justify-between text-white">
                  <div><h2 className="text-lg font-semibold truncate max-w-md drop-shadow-md select-text pointer-events-auto">{currentFile?.name}</h2><p className="text-xs text-white/70 font-mono mt-1">{(currentFile?.size / 1024 / 1024).toFixed(1)} MB</p></div>
                  <div className="flex gap-2">{!isPlaying && !videoError && <div className="bg-white/20 backdrop-blur px-2 py-1 rounded text-xs font-bold">PAUSED</div>}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {mode === 'filter' && (
            <div className="fixed bottom-0 left-0 right-0 pt-3 pb-4 md:pb-3 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center gap-1 z-50 px-4 relative">
            <button onClick={handleUndo} className="w-12 h-12 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors absolute left-4 md:left-8 top-1/2 -translate-y-1/2 hidden md:flex" title="撤销 (Z)"><Undo2 size={20} /></button>
            <div className="flex items-center gap-4 md:gap-8">
                <button onClick={() => navigate('prev')} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95" title="上一个 (A)"><ChevronLeft size={28} /></button>
                <button onClick={() => handleDecision('discard')} className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all active:scale-95 border-2 ${status === 'discard' ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white border-slate-100 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50'}`} title="舍弃 (N)"><XCircle size={32} /><span className="text-[10px] font-bold mt-1 uppercase tracking-wider">No</span></button>
                <button onClick={() => handleDecision('keep')} className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all active:scale-95 border-2 ${status === 'keep' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white border-slate-100 text-slate-400 hover:border-green-200 hover:text-green-500 hover:bg-green-50'}`} title="保留 (Y)"><CheckCircle2 size={32} /><span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Yes</span></button>
                <button onClick={() => navigate('next')} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95" title="下一个 (D)"><ChevronRight size={28} /></button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block"><kbd className="px-1 rounded bg-slate-100 font-mono">A</kbd>/<kbd className="px-1 rounded bg-slate-100 font-mono">D</kbd> 切换 · <kbd className="px-1 rounded bg-slate-100 font-mono">Y</kbd>/<kbd className="px-1 rounded bg-slate-100 font-mono">N</kbd> 判定 · <kbd className="px-1 rounded bg-slate-100 font-mono">Z</kbd> 撤销 · <kbd className="px-1 rounded bg-slate-100 font-mono">空格</kbd> 播放</p>
            </div>
        )}
      </div>
    );
  }

  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <ToastContainer />
        <ResetConfirmModal />
        <ClearSelectedModal />
        <main className="max-w-5xl mx-auto p-6 md:p-12 pt-24">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in p-8 text-center">
             <h2 className="text-3xl font-bold text-slate-800 mb-4">准备导出</h2>
             <p className="text-slate-500 mb-8">按需选择导出内容，对应 <strong>视频筛选</strong> 与 <strong>视频裁剪</strong> 两类功能。</p>

             <div className="flex flex-col sm:flex-row flex-wrap items-stretch justify-center gap-4 mb-10">
                <button
                  onClick={exportFilterList}
                  disabled={!hasExplicitKeeps}
                  className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent text-left min-w-[200px]"
                >
                  <List size={28} className="text-green-600" />
                  <span className="font-bold text-slate-800">导出筛选清单</span>
                  <span className="text-xs text-slate-500">保留/舍弃记录，仅筛选时可用</span>
                </button>
                <button
                  onClick={exportCropList}
                  disabled={!hasCrops}
                  className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent text-left min-w-[200px]"
                >
                  <Scissors size={28} className="text-orange-600" />
                  <span className="font-bold text-slate-800">导出视频裁剪清单</span>
                  <span className="text-xs text-slate-500">裁剪尺寸与偏移，仅裁剪时可用</span>
                </button>
                <button
                  onClick={exportBatAndFfmpeg}
                  disabled={filesToProcess.length === 0}
                  className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent text-left min-w-[200px]"
                >
                  <Download size={28} className="text-blue-600" />
                  <span className="font-bold text-slate-800">导出 bat 脚本和 FFmpeg</span>
                  <span className="text-xs text-slate-500">选文件夹写入，用于批量处理视频</span>
                </button>
             </div>

             <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6">
                <button onClick={() => setView('screening')} className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"><Film size={16}/> 返回视频处理</button>
                <button onClick={triggerReset} className="text-slate-400 hover:text-slate-600 font-medium flex items-center gap-2"><RotateCcw size={16}/> 返回首页</button>
             </div>
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