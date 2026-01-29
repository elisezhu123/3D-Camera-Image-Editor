
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Camera, RefreshCw, Sparkles, Image as ImageIcon, 
  Download, Box, Layers, Maximize, Focus, Telescope, 
  ZoomIn, Eye, Gamepad2, Plus, X, Target, Sliders,
  ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import CameraViewer, { generatePrompt } from './components/CameraViewer';
import { CameraSettings, GenerationState } from './types';
import { generateAngledImage } from './services/geminiService';

const EditableNumber = ({ value, min, max, suffix = "°", onChange }: { value: number, min: number, max: number, suffix?: string, onChange: (val: number) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const handleBlur = () => {
    let num = parseFloat(tempValue);
    if (isNaN(num)) num = value;
    num = Math.min(Math.max(num, min), max);
    onChange(num);
    setIsEditing(false);
  };

  useEffect(() => {
    if (!isEditing) setTempValue(value.toString());
  }, [value, isEditing]);

  if (isEditing) {
    return (
      <input
        autoFocus
        type="number"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
        className="w-16 text-xs font-mono font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-300 outline-none shadow-sm"
      />
    );
  }

  return (
    <div 
      onDoubleClick={() => { setIsEditing(true); setTempValue(Math.round(value).toString()); }}
      className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 cursor-text hover:border-indigo-200 transition-colors"
      title="双击输入数值"
    >
      {suffix === "x" ? `x${value.toFixed(2)}` : `${Math.round(value)}${suffix}`}
    </div>
  );
};

const App: React.FC = () => {
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [settings, setSettings] = useState<CameraSettings>({
    azimuth: 45,
    elevation: 35,
    distance: 1.0,
    shotType: 'medium'
  });
  const [batchSize, setBatchSize] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    outputImageUrls: [], 
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 3 - inputImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setInputImages(prev => [...prev, result].slice(0, 3));
        };
        reader.readAsDataURL(file);
      });
    }
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const setGameAngle = (azim: number) => {
    setSettings(prev => ({
      ...prev,
      azimuth: azim,
      elevation: 35 
    }));
  };

  const handleGenerate = async () => {
    if (inputImages.length === 0) {
      setGenState(prev => ({ ...prev, error: "请至少上传一张参考图。" }));
      return;
    }
    setGenState(prev => ({ ...prev, isGenerating: true, error: null, outputImageUrls: [] }));
    
    const prompt = generatePrompt(settings);
    const results: string[] = [];

    try {
      for(let i = 0; i < batchSize; i++) {
        const url = await generateAngledImage(inputImages, prompt, aspectRatio);
        results.push(url);
      }
      setGenState(prev => ({ ...prev, outputImageUrls: results, isGenerating: false }));
    } catch (err: any) {
      setGenState(prev => ({ ...prev, isGenerating: false, error: err.message || "渲染失败，请重试。" }));
    }
  };

  const shotTypeOptions = [
    { label: "全景", value: "long", icon: Telescope, dist: 1.4 },
    { label: "中景", value: "medium", icon: Eye, dist: 1.0 },
    { label: "近景", value: "close", icon: ZoomIn, dist: 0.7 },
    { label: "特写", value: "extreme", icon: Focus, dist: 0.5 },
  ];

  const btnBaseClass = "py-2.5 rounded-xl text-xs font-bold transition-all border";
  const btnActiveClass = "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100";
  const btnInactiveClass = "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white hover:border-slate-200";

  const directions = [
    { label: '左前', angle: 315, icon: ArrowUpLeft },
    { label: '正前', angle: 0, icon: ArrowUp },
    { label: '右前', angle: 45, icon: ArrowUpRight },
    { label: '正左', angle: 270, icon: ArrowLeft },
    { label: '中心', angle: -1, icon: Target }, 
    { label: '正右', angle: 90, icon: ArrowRight },
    { label: '左后', angle: 225, icon: ArrowDownLeft },
    { label: '正后', angle: 180, icon: ArrowDown },
    { label: '右后', angle: 135, icon: ArrowDownRight },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm uppercase tracking-widest text-slate-500 leading-none">
              <span className="font-[900]">空间工作室</span> <span className="text-indigo-600 ml-1 font-bold">v3.0</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">Gemini 3D 视觉引擎</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-400 tracking-wider">渲染引擎就绪</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-2 flex flex-col gap-8">
          <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" /> 参考素材库
            </h2>
            <div className="space-y-4">
              {inputImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden border border-slate-100 group bg-slate-50 shadow-inner hover:shadow-md transition-all">
                  <img src={img} className="w-full h-full object-cover" alt="素材" />
                  <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-500 text-red-500 hover:text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md shadow-sm">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {inputImages.length < 3 && (
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-indigo-50 hover:border-indigo-400 transition-all group overflow-hidden bg-slate-50/50"
                >
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">导入图片</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
          </section>

          <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-8">
             <div className="space-y-4">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Maximize className="w-3.5 h-3.5" /> 画面比例
               </h2>
               <div className="grid grid-cols-2 gap-2">
                  {["16:9", "4:3", "1:1", "9:16"].map(ratio => (
                    <button 
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`${btnBaseClass} ${aspectRatio === ratio ? btnActiveClass : btnInactiveClass}`}
                    >
                      {ratio}
                    </button>
                  ))}
               </div>
             </div>

             <div className="space-y-4">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Box className="w-3.5 h-3.5" /> 生成数量
               </h2>
               <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button 
                      key={num}
                      onClick={() => setBatchSize(num)}
                      className={`${btnBaseClass} ${batchSize === num ? btnActiveClass : btnInactiveClass}`}
                    >
                      {num}
                    </button>
                  ))}
               </div>
             </div>
          </section>
        </aside>

        <main className="lg:col-span-7 flex flex-col gap-8">
          <div className="aspect-[16/10] bg-white rounded-[48px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden relative group">
             <div className="absolute inset-0 pointer-events-none z-10 p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start opacity-20 group-hover:opacity-100 transition-opacity">
                   <div className="border-l border-t border-slate-300 w-16 h-16 rounded-tl-3xl"></div>
                   <div className="border-r border-t border-slate-300 w-16 h-16 rounded-tr-3xl"></div>
                </div>
                
                <div className="flex justify-between items-end">
                   <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[28px] border border-slate-200 flex flex-col gap-1 pointer-events-none shadow-xl">
                      <span className="text-[9px] font-black text-blue-500 tracking-widest uppercase mb-1">实时视角数据</span>
                      <div className="flex gap-6 text-[10px] font-mono font-bold text-slate-500">
                         <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> 偏航 <span className="text-slate-900">{Math.round(settings.azimuth)}°</span></div>
                         <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div> 俯仰 <span className="text-slate-900">{Math.round(settings.elevation)}°</span></div>
                         <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> 焦距 <span className="text-indigo-600">x{settings.distance.toFixed(2)}</span></div>
                      </div>
                   </div>
                   <div className="border-r border-b border-slate-300 w-16 h-16 rounded-br-3xl opacity-20 group-hover:opacity-100 transition-opacity"></div>
                </div>
             </div>

             <div className="w-full h-full">
                <CameraViewer settings={settings} onSettingsChange={setSettings} inputImage={inputImages[0] || null} />
             </div>

             {genState.isGenerating && (
               <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
                  <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-lg font-black uppercase tracking-[0.2em] text-slate-900 mb-2">执行空间同步...</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">正在生成第 {genState.outputImageUrls.length + 1} / {batchSize} 张图</p>
                  </div>
               </div>
             )}
          </div>

          <div className="bg-white border border-slate-200 rounded-[48px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">渲染结果</h2>
              </div>
            </div>
            
            {genState.outputImageUrls.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center text-slate-200 gap-4 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50">
                 <Box className="w-12 h-12" />
                 <p className="text-[10px] font-black uppercase tracking-widest">等待渲染任务</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {genState.outputImageUrls.map((url, i) => (
                  <div key={i} className="relative group bg-slate-50 p-4 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                    <img src={url} className="w-full aspect-square object-contain rounded-[28px] shadow-sm bg-white" alt="渲染成品" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <button onClick={() => { const a = document.createElement('a'); a.href = url; a.download = `render-${i}.png`; a.click(); }} className="pointer-events-auto bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
                        <Download className="w-4 h-4 inline-block mr-2" /> 导出
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <aside className="lg:col-span-3 flex flex-col gap-8">
          <div className="bg-white border border-slate-200 rounded-[48px] p-8 flex flex-col shadow-xl shadow-slate-200/50 min-h-[700px]">
            
            <div className="flex items-center gap-2 mb-6">
               <Sliders className="w-3.5 h-3.5 text-slate-400" />
               <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase">控制中心</h2>
            </div>

            <div className="space-y-8 mb-10">
              {/* 水平偏航 - 蓝色 */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">轨道方位</span>
                    <label className="text-sm font-black text-slate-500">水平偏航</label>
                  </div>
                  <EditableNumber 
                    value={settings.azimuth} 
                    min={0} max={360} 
                    onChange={(val) => setSettings(p => ({ ...p, azimuth: val }))} 
                  />
                </div>
                <input 
                  type="range" min="0" max="360" step="1" 
                  value={settings.azimuth} 
                  onChange={(e) => setSettings(p => ({ ...p, azimuth: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-blue"
                />
              </div>

              {/* 垂直仰角 - 粉色 */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">俯仰弧度</span>
                    <label className="text-sm font-black text-slate-500">垂直仰角</label>
                  </div>
                  <EditableNumber 
                    value={settings.elevation} 
                    min={-30} max={60} 
                    onChange={(val) => setSettings(p => ({ ...p, elevation: val }))} 
                  />
                </div>
                <input 
                  type="range" min="-30" max="60" step="1" 
                  value={settings.elevation} 
                  onChange={(e) => setSettings(p => ({ ...p, elevation: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-pink"
                />
              </div>

              {/* 镜头距离 - 靛蓝色 */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">焦距缩放</span>
                    <label className="text-sm font-black text-slate-500">镜头距离</label>
                  </div>
                  <EditableNumber 
                    value={settings.distance} 
                    min={0.6} max={1.4} 
                    suffix="x"
                    onChange={(val) => setSettings(p => ({ ...p, distance: val }))} 
                  />
                </div>
                <input 
                  type="range" min="0.6" max="1.4" step="0.01" 
                  value={settings.distance} 
                  onChange={(e) => setSettings(p => ({ ...p, distance: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-indigo"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col gap-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" /> 视角预设
              </h3>

              <div className="grid grid-cols-3 gap-2 mx-auto w-full max-w-[180px]">
                 {directions.map((dir, idx) => {
                   const Icon = dir.icon;
                   const isCenter = dir.angle === -1;
                   if (isCenter) {
                     return (
                       <div key={idx} className="flex items-center justify-center text-[10px] font-black text-slate-300 pointer-events-none uppercase tracking-tighter">
                         视角
                       </div>
                     );
                   }
                   const isActive = Math.round(settings.azimuth) === dir.angle;
                   return (
                     <button 
                       key={idx}
                       title={dir.label}
                       onClick={() => setGameAngle(dir.angle)} 
                       className={`${btnBaseClass} ${isActive ? btnActiveClass : btnInactiveClass} rounded-2xl flex items-center justify-center aspect-square p-0`}
                     >
                       <Icon className={`w-5 h-5 ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'} transition-opacity`} />
                     </button>
                   );
                 })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {shotTypeOptions.map((opt) => (
                   <button 
                     key={opt.value} 
                     onClick={() => setSettings(p => ({ ...p, shotType: opt.value as any, distance: opt.dist }))}
                     className={`${btnBaseClass} ${settings.shotType === opt.value ? btnActiveClass : btnInactiveClass} py-3 shadow-sm`}
                   >
                     {opt.label}
                   </button>
                 ))}
              </div>
            </div>

            <button 
              disabled={genState.isGenerating || inputImages.length === 0} 
              onClick={handleGenerate} 
              className={`mt-6 w-full py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 ${
                genState.isGenerating || inputImages.length === 0 
                ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
              }`}
            >
              {genState.isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {genState.isGenerating ? "生成中" : "开始渲染"}
            </button>
          </div>
        </aside>

      </div>
      
      <footer className="max-w-[1800px] mx-auto px-8 py-10 opacity-20 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
        <div>© 2025 SPATIAL STUDIO / V3.0</div>
        <div className="flex gap-8">
           <a href="#">DOCS</a>
           <a href="#">PRIVACY</a>
           <a href="#">SUPPORT</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
