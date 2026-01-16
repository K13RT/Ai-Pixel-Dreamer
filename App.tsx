import React, { useState } from 'react';
import { 
  Palette, 
  Wand2, 
  Film, 
  Image as ImageIcon, 
  ChevronRight, 
  Loader2,
  Sparkles,
  Layers,
  ImagePlus,
  Grid,
  Trash2,
  Plus,
  ArrowUpToLine,
  ArrowDownToLine,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings,
  Monitor,
  Scissors,
  Repeat,
  Gauge,
  Images,
  Save,
  Bookmark,
  BrickWall
} from 'lucide-react';
import { AppMode, SpriteSize, ArtStyle } from './types';
import * as GeminiService from './services/geminiService';
import PixelEditor from './components/PixelEditor';

// Define the global aistudio interface by augmenting the existing interface
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

interface SavedStyle {
    id: string;
    name: string;
    prompt: string;
}

const App: React.FC = () => {
  // State
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.TEXT_TO_SPRITE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Collapsed by default for more space
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<SpriteSize>(SpriteSize.S32);
  const [style, setStyle] = useState<ArtStyle>(ArtStyle.RETRO_16BIT);
  const [customStyle, setCustomStyle] = useState('');
  
  // Custom Style Management
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>(() => {
    try {
        const saved = localStorage.getItem('pixelDreamer_customStyles');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
  });
  const [styleName, setStyleName] = useState('');
  
  // Animation States
  const [animationAction, setAnimationAction] = useState('Walk Cycle');
  const [animFrameCount, setAnimFrameCount] = useState<number>(4);
  const [animFps, setAnimFps] = useState<number>(8);
  const [animLoop, setAnimLoop] = useState<boolean>(true);
  
  // Tile States
  const [tileType, setTileType] = useState<'seamless' | 'autotile'>('seamless');

  // Feature States
  const [editPrompt, setEditPrompt] = useState('');

  // Sprite Sheet States
  const [sheetImages, setSheetImages] = useState<string[]>([]);
  const [sheetColumns, setSheetColumns] = useState(4);
  const [sheetSpacing, setSheetSpacing] = useState(0);
  const [sheetVerticalAlignment, setSheetVerticalAlignment] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [sheetHorizontalAlignment, setSheetHorizontalAlignment] = useState<'left' | 'center' | 'right'>('center');

  // Utilities
  const ensureApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }
  };

  const handleApiError = async (err: any) => {
    const errorMessage = err.message || err.toString();
    console.error("API Error:", errorMessage);
    
    // Handle Permission Denied (403) or Not Found (404) or Refusals by forcing key selection
    if (
        errorMessage.includes("403") || 
        errorMessage.includes("Permission") || 
        errorMessage.includes("permission") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("404") ||
        errorMessage.includes("API key")
    ) {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                setError("Đã cập nhật quyền truy cập. Vui lòng thử lại.");
                return;
            } catch (selectErr) {
                console.error("Key selection failed", selectErr);
            }
        }
    }
    setError(errorMessage || 'Đã xảy ra lỗi trong quá trình tạo.');
  };

  // Custom Style Handlers
  const saveCustomStyle = () => {
    if(!customStyle.trim() || !styleName.trim()) return;
    const newStyle = { id: Date.now().toString(), name: styleName, prompt: customStyle };
    const updated = [...savedStyles, newStyle];
    setSavedStyles(updated);
    localStorage.setItem('pixelDreamer_customStyles', JSON.stringify(updated));
    setStyleName('');
  };

  const deleteCustomStyle = (id: string) => {
    const updated = savedStyles.filter(s => s.id !== id);
    setSavedStyles(updated);
    localStorage.setItem('pixelDreamer_customStyles', JSON.stringify(updated));
  };

  const loadCustomStyle = (prompt: string) => {
    setCustomStyle(prompt);
  };

  // Handlers
  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError(null);
    await ensureApiKey();

    try {
      const effectiveStyle = style === ArtStyle.CUSTOM ? customStyle : style;
      
      if (currentMode === AppMode.TEXT_TO_SPRITE) {
        const result = await GeminiService.generateStandardSprite(prompt, size, effectiveStyle);
        setGeneratedImage(result);
      } else if (currentMode === AppMode.TILE_GENERATOR) {
        const result = await GeminiService.generateTileSet(prompt, tileType, effectiveStyle);
        setGeneratedImage(result);
      }
    } catch (err: any) {
      await handleApiError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!generatedImage || !editPrompt) return;
    setIsGenerating(true);
    setError(null);
    await ensureApiKey();
    try {
        const result = await GeminiService.editPixelSprite(generatedImage, editPrompt);
        setGeneratedImage(result);
        setEditPrompt(''); // Clear edit prompt after success
    } catch (err: any) {
        await handleApiError(err);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAnimate = async () => {
    if (!generatedImage) {
        setError("Vui lòng tạo hoặc tải lên sprite trước.");
        return;
    }
    setIsGenerating(true);
    setError(null);
    await ensureApiKey();
    try {
      const frames = await GeminiService.generatePixelAnimationFrames(
          generatedImage, 
          animationAction, 
          animFrameCount, 
          animLoop
      );
      setGeneratedImage(frames[0]); 
    } catch (err: any) {
      await handleApiError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackgroundRemoval = async () => {
    if (!generatedImage) return;
    setIsGenerating(true);
    setError(null);
    await ensureApiKey();
    try {
        // Use Gemini to isolate subject on Magenta background
        const result = await GeminiService.generateBackgroundRemoval(generatedImage);
        setGeneratedImage(result);
    } catch (err: any) {
        await handleApiError(err);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (currentMode === AppMode.SPRITE_SHEET) {
        // Handle multiple files for sprite sheet
        const newImages: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            await new Promise<void>((resolve) => {
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        newImages.push(reader.result);
                    }
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
        setSheetImages(prev => [...prev, ...newImages]);
    } else if (currentMode === AppMode.STYLE_TRANSFER || currentMode === AppMode.BACKGROUND_REMOVAL) {
        const file = files[0];
        // For style transfer we process, for bg removal we just load to canvas first
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            if (currentMode === AppMode.STYLE_TRANSFER) {
                 setIsGenerating(true);
                 setError(null);
                 await ensureApiKey();
                 try {
                     const pixelArt = await GeminiService.convertToPixelArt(base64);
                     setGeneratedImage(pixelArt);
                 } catch (err: any) {
                     await handleApiError(err);
                 } finally {
                     setIsGenerating(false);
                 }
            } else {
                setGeneratedImage(base64);
            }
        };
        reader.readAsDataURL(file);
    } else {
        // Just load into editor for editing or animation
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setGeneratedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAddCurrentToSheet = () => {
    if (generatedImage) {
        setSheetImages(prev => [...prev, generatedImage]);
    }
  };

  const handleRemoveFromSheet = (index: number) => {
    setSheetImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAssembleSheet = async () => {
    if (sheetImages.length === 0) return;
    setIsGenerating(true);

    try {
        const loadedImages = await Promise.all(sheetImages.map(src => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        }));

        if (loadedImages.length === 0) return;

        const maxWidth = Math.max(...loadedImages.map(i => i.width));
        const maxHeight = Math.max(...loadedImages.map(i => i.height));
        
        const cols = sheetColumns;
        const spacing = sheetSpacing;
        const rows = Math.ceil(loadedImages.length / cols);
        
        const canvas = document.createElement('canvas');
        canvas.width = cols * maxWidth + (cols - 1) * spacing;
        canvas.height = rows * maxHeight + (rows - 1) * spacing;
        
        // Ensure minimum size if only 1 image and no spacing
        if (loadedImages.length === 1) {
             canvas.width = maxWidth;
             canvas.height = maxHeight;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        loadedImages.forEach((img, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = col * (maxWidth + spacing);
            const y = row * (maxHeight + spacing);
            
            // Horizontal alignment
            let xOffset = 0;
            if (sheetHorizontalAlignment === 'center') {
                xOffset = Math.floor((maxWidth - img.width) / 2);
            } else if (sheetHorizontalAlignment === 'right') {
                xOffset = maxWidth - img.width;
            }
            
            // Vertical alignment
            let yOffset = 0;
            if (sheetVerticalAlignment === 'center') {
                yOffset = Math.floor((maxHeight - img.height) / 2);
            } else if (sheetVerticalAlignment === 'bottom') {
                yOffset = maxHeight - img.height;
            }
            
            ctx.drawImage(img, x + xOffset, y + yOffset);
        });

        setGeneratedImage(canvas.toDataURL());
    } catch (e) {
        console.error("Error assembling sheet", e);
        setError("Không thể ghép ảnh");
    } finally {
        setIsGenerating(false);
    }
  };

  const renderSidebar = () => (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-cyber-dark border-r-2 border-cyber-dim transition-all duration-300 flex flex-col z-30 shrink-0`}>
      <div className="flex items-center justify-center h-16 bg-cyber-black/30 border-b-2 border-cyber-dim">
        <div className="w-8 h-8 bg-cyber-primary rounded-none flex items-center justify-center shadow-neon-pink border border-white">
          <Palette className="text-white w-5 h-5" />
        </div>
        {isSidebarOpen && (
             <h1 className="ml-3 font-retro text-[10px] text-cyber-secondary leading-tight tracking-widest uppercase">
                Pixel<br/>Dreamer
             </h1>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-2 px-2 overflow-y-auto scrollbar-thin">
        <SidebarItem 
            icon={<Wand2 size={20} />} 
            label="TẠO ẢNH" 
            active={currentMode === AppMode.TEXT_TO_SPRITE} 
            onClick={() => setCurrentMode(AppMode.TEXT_TO_SPRITE)}
            isOpen={isSidebarOpen}
        />
        <SidebarItem 
            icon={<BrickWall size={20} />} 
            label="TILE SET" 
            active={currentMode === AppMode.TILE_GENERATOR} 
            onClick={() => setCurrentMode(AppMode.TILE_GENERATOR)}
            isOpen={isSidebarOpen}
        />
        <SidebarItem 
            icon={<ImagePlus size={20} />} 
            label="CHỈNH SỬA" 
            active={currentMode === AppMode.AI_EDIT} 
            onClick={() => setCurrentMode(AppMode.AI_EDIT)}
            isOpen={isSidebarOpen}
        />
        <SidebarItem 
            icon={<Scissors size={20} />} 
            label="TÁCH NỀN" 
            active={currentMode === AppMode.BACKGROUND_REMOVAL} 
            onClick={() => setCurrentMode(AppMode.BACKGROUND_REMOVAL)}
            isOpen={isSidebarOpen}
        />
        <SidebarItem 
            icon={<Film size={20} />} 
            label="HOẠT HÌNH" 
            active={currentMode === AppMode.ANIMATION} 
            onClick={() => setCurrentMode(AppMode.ANIMATION)}
            isOpen={isSidebarOpen}
        />
        <SidebarItem 
            icon={<Grid size={20} />} 
            label="GHÉP SHEET" 
            active={currentMode === AppMode.SPRITE_SHEET} 
            onClick={() => setCurrentMode(AppMode.SPRITE_SHEET)}
            isOpen={isSidebarOpen}
        />
        <SidebarItem 
            icon={<Layers size={20} />} 
            label="CHUYỂN ĐỔI" 
            active={currentMode === AppMode.STYLE_TRANSFER} 
            onClick={() => setCurrentMode(AppMode.STYLE_TRANSFER)}
            isOpen={isSidebarOpen}
        />
      </nav>

      <div className="p-2 border-t-2 border-cyber-dim bg-cyber-black/30">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-2 text-cyber-dim hover:bg-cyber-panel hover:text-cyber-secondary transition-all">
            {isSidebarOpen ? <span className="text-[10px] font-mono tracking-widest">[THU GỌN]</span> : <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );

  const renderConfigurationPanel = () => {
    switch (currentMode) {
        case AppMode.TEXT_TO_SPRITE:
            return (
                <div className="space-y-6">
                    <div>
                        <Label>NHẬP MÔ TẢ (PROMPT)</Label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="> Nhập mô tả nhân vật, đồ vật..."
                            className="w-full bg-cyber-black border-2 border-cyber-dim text-cyber-secondary p-3 text-sm font-mono focus:border-cyber-primary focus:outline-none min-h-[100px] resize-none placeholder-cyber-dim/50"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>KÍCH THƯỚC</Label>
                            <Select 
                                value={size}
                                onChange={(e) => setSize(e.target.value as SpriteSize)}
                                options={Object.values(SpriteSize)}
                            />
                        </div>
                        <div>
                            <Label>PHONG CÁCH</Label>
                            <Select 
                                value={style}
                                onChange={(e) => setStyle(e.target.value as ArtStyle)}
                                options={Object.values(ArtStyle)}
                            />
                        </div>
                    </div>
                    
                    {style === ArtStyle.CUSTOM && (
                        <div className="space-y-3 p-3 bg-cyber-black border border-cyber-dim/50 rounded-sm">
                            <Label>ĐỊNH NGHĨA STYLE</Label>
                            <textarea
                                value={customStyle}
                                onChange={(e) => setCustomStyle(e.target.value)}
                                placeholder="> Mô tả chi tiết phong cách (VD: Dark souls pixel art, flat design, pastel palette...)"
                                className="w-full bg-cyber-dark border border-cyber-dim text-cyber-accent p-2 text-xs font-mono focus:border-cyber-accent focus:outline-none min-h-[60px] resize-none"
                            />
                            
                            {/* Save Controls */}
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={styleName}
                                    onChange={(e) => setStyleName(e.target.value)}
                                    placeholder="Đặt tên style..."
                                    className="flex-1 bg-cyber-dark border border-cyber-dim text-cyber-text px-2 text-xs font-mono focus:border-cyber-primary outline-none"
                                />
                                <button 
                                    onClick={saveCustomStyle}
                                    disabled={!customStyle || !styleName}
                                    className="bg-cyber-panel border border-cyber-dim text-cyber-primary p-2 hover:bg-cyber-primary hover:text-white disabled:opacity-50 transition-colors"
                                    title="Lưu Style"
                                >
                                    <Save size={14} />
                                </button>
                            </div>

                            {/* Saved List */}
                            {savedStyles.length > 0 && (
                                <div className="mt-2">
                                    <Label><span className="flex items-center gap-1"><Bookmark size={10}/> ĐÃ LƯU</span></Label>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                        {savedStyles.map(s => (
                                            <div key={s.id} className="flex items-center justify-between group bg-cyber-panel/50 border border-transparent hover:border-cyber-dim p-1 px-2 transition-all">
                                                <button 
                                                    onClick={() => loadCustomStyle(s.prompt)}
                                                    className="text-xs font-mono text-cyber-dim group-hover:text-cyber-secondary truncate flex-1 text-left"
                                                >
                                                    {s.name}
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteCustomStyle(s.id); }}
                                                    className="text-cyber-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <ActionButton 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt || (style === ArtStyle.CUSTOM && !customStyle)}
                        loading={isGenerating}
                        icon={<Sparkles size={18} />}
                        label="KHỞI TẠO"
                        variant="primary"
                    />
                </div>
            );
        case AppMode.TILE_GENERATOR:
            return (
                <div className="space-y-6">
                    <InfoBox borderColor="border-green-500/50" textColor="text-green-300">
                        > MODULE: TẠO GẠCH/NỀN (TILES)<br/>
                        > HỖ TRỢ: TỰ LẶP (SEAMLESS) & RPG
                    </InfoBox>

                    <div>
                        <Label>LOẠI BỀ MẶT</Label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="> Ví dụ: Cỏ xanh, Nham thạch, Tường gạch, Nước biển..."
                            className="w-full bg-cyber-black border-2 border-cyber-dim text-cyber-secondary p-3 text-sm font-mono focus:border-cyber-primary focus:outline-none min-h-[80px] resize-none placeholder-cyber-dim/50"
                        />
                    </div>
                    
                    <div>
                        <Label>KIỂU SẮP XẾP (LAYOUT)</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTileType('seamless')}
                                className={`p-3 border-2 text-xs font-mono text-center transition-all ${tileType === 'seamless' ? 'bg-cyber-primary text-white border-cyber-primary' : 'bg-cyber-black text-cyber-dim border-cyber-dim hover:border-cyber-text'}`}
                            >
                                TEXTURE LẶP
                                <div className="w-full h-8 bg-current opacity-20 mt-2 pattern-grid-lg"></div>
                            </button>
                            <button
                                onClick={() => setTileType('autotile')}
                                className={`p-3 border-2 text-xs font-mono text-center transition-all ${tileType === 'autotile' ? 'bg-cyber-accent text-cyber-black border-cyber-accent' : 'bg-cyber-black text-cyber-dim border-cyber-dim hover:border-cyber-text'}`}
                            >
                                RPG 3x3 GRID
                                <div className="w-full h-8 grid grid-cols-3 gap-[1px] mt-2 opacity-50">
                                    {[...Array(9)].map((_,i) => <div key={i} className="bg-current"></div>)}
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <Label>PHONG CÁCH</Label>
                        <Select 
                            value={style}
                            onChange={(e) => setStyle(e.target.value as ArtStyle)}
                            options={Object.values(ArtStyle)}
                        />
                    </div>

                    <ActionButton 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        loading={isGenerating}
                        icon={<BrickWall size={18} />}
                        label="TẠO TILE SET"
                        variant="accent"
                    />
                </div>
            );
        case AppMode.AI_EDIT:
            return (
                <div className="space-y-6">
                    <InfoBox>
                        > TẢI LÊN ẢNH GỐC<br/>> MÔ TẢ BIẾN ĐỔI
                    </InfoBox>
                    
                    <div>
                         <Label>ẢNH GỐC</Label>
                         <FileInput onChange={handleFileUpload} />
                    </div>

                    <div>
                        <Label>LỆNH CHỈNH SỬA</Label>
                        <textarea 
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="> Ví dụ: Thêm kính neon, đổi màu áo..."
                            className="w-full bg-cyber-black border-2 border-cyber-dim text-cyber-secondary p-3 text-sm font-mono focus:border-cyber-secondary focus:outline-none min-h-[80px] resize-none"
                        />
                    </div>

                    <ActionButton 
                        onClick={handleEdit}
                        disabled={isGenerating || !generatedImage || !editPrompt}
                        loading={isGenerating}
                        icon={<Wand2 size={18} />}
                        label="THỰC HIỆN"
                        variant="secondary"
                    />
                </div>
            );
        case AppMode.BACKGROUND_REMOVAL:
            return (
                <div className="space-y-6">
                     <InfoBox borderColor="border-pink-500/50" textColor="text-pink-300">
                        > CÔNG CỤ: TÁCH NỀN<br/>
                        > SỬ DỤNG AI ĐỂ TÁCH NỀN TỰ ĐỘNG
                    </InfoBox>

                    <div>
                         <Label>1. TẢI ẢNH GỐC</Label>
                         <FileInput onChange={handleFileUpload} />
                    </div>

                    <div>
                        <Label>2. CHUẨN HÓA NỀN (AI)</Label>
                        <p className="text-[10px] text-cyber-dim mb-2">Dùng AI để đổi nền sang màu đơn sắc (Hồng/Xanh) để dễ dàng xử lý trong Game Engine.</p>
                        <ActionButton 
                            onClick={handleBackgroundRemoval}
                            disabled={isGenerating || !generatedImage}
                            loading={isGenerating}
                            icon={<Scissors size={18} />}
                            label="LỌC NỀN BẰNG AI"
                            variant="primary"
                        />
                    </div>
                </div>
            );
        case AppMode.ANIMATION:
            return (
                <div className="space-y-6">
                    <InfoBox>
                        > ĐẦU VÀO: SPRITE TĨNH<br/>> ĐẦU RA: CHUỖI FRAME
                    </InfoBox>

                    <div>
                        <Label>SPRITE GỐC</Label>
                        <FileInput onChange={handleFileUpload} />
                    </div>

                    <div>
                        <Label>HÀNH ĐỘNG</Label>
                        <Select 
                            value={animationAction}
                            onChange={(e) => setAnimationAction(e.target.value)}
                            options={['Idle', 'Walk', 'Attack', 'Jump', 'Die', 'Run', 'Climb']}
                        />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-cyber-dim/50">
                        {/* Frame Count Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <Label><span className="flex items-center gap-1"><Images size={10}/> SỐ LƯỢNG FRAME</span></Label>
                                <span className="text-cyber-accent font-mono text-xs">{animFrameCount}</span>
                            </div>
                            <input 
                                type="range" 
                                min="3" 
                                max="12" 
                                value={animFrameCount} 
                                onChange={(e) => setAnimFrameCount(parseInt(e.target.value))}
                                className="w-full accent-cyber-accent h-2 bg-cyber-dark rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* FPS Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <Label><span className="flex items-center gap-1"><Gauge size={10}/> TỐC ĐỘ (FPS)</span></Label>
                                <span className="text-cyber-secondary font-mono text-xs">{animFps} FPS</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="24" 
                                value={animFps} 
                                onChange={(e) => setAnimFps(parseInt(e.target.value))}
                                className="w-full accent-cyber-secondary h-2 bg-cyber-dark rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Loop Toggle */}
                        <div className="flex items-center justify-between p-2 bg-cyber-black border border-cyber-dim">
                            <Label><span className="flex items-center gap-1"><Repeat size={10}/> LẶP LẠI (LOOP)</span></Label>
                            <button 
                                onClick={() => setAnimLoop(!animLoop)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${animLoop ? 'bg-cyber-primary' : 'bg-cyber-dim'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${animLoop ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>

                    <ActionButton 
                        onClick={handleAnimate}
                        disabled={isGenerating || !generatedImage}
                        loading={isGenerating}
                        icon={<Film size={18} />}
                        label="TẠO FRAMES"
                        variant="secondary"
                    />
                </div>
            );
        case AppMode.SPRITE_SHEET:
            return (
                <div className="space-y-6">
                    <InfoBox borderColor="border-cyber-accent/50" textColor="text-cyber-accent">
                        > MODULE: GHÉP LƯỚI ẢNH
                    </InfoBox>

                    <div>
                        <Label>DANH SÁCH ẢNH ({sheetImages.length})</Label>
                        <div className="flex gap-2 mb-2">
                             <label className="flex-1 cursor-pointer bg-cyber-panel border-2 border-cyber-dim hover:border-cyber-text text-cyber-text text-xs font-bold font-mono py-2 px-3 flex items-center justify-center gap-2 transition-all active:translate-y-1">
                                <Plus size={14} /> TẢI LÊN
                                <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                             {generatedImage && (
                                <button 
                                    onClick={handleAddCurrentToSheet}
                                    className="flex-1 bg-cyber-panel border-2 border-cyber-primary/50 text-cyber-primary hover:bg-cyber-primary hover:text-white text-xs font-bold font-mono py-2 px-3 flex items-center justify-center gap-2 transition-all active:translate-y-1"
                                >
                                    <Sparkles size={14} /> THÊM ẢNH NÀY
                                </button>
                             )}
                        </div>

                        {/* Thumbnail Grid */}
                        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-cyber-black border-2 border-cyber-dim scrollbar-thin">
                            {sheetImages.map((src, idx) => (
                                <div key={idx} className="relative group aspect-square bg-cyber-panel border border-cyber-dim overflow-hidden pixelated">
                                    <img src={src} className="w-full h-full object-contain" />
                                    <button 
                                        onClick={() => handleRemoveFromSheet(idx)}
                                        className="absolute inset-0 bg-red-900/90 hidden group-hover:flex items-center justify-center text-white"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {sheetImages.length === 0 && (
                                <div className="col-span-4 text-center py-8 text-xs font-mono text-cyber-dim">DANH SÁCH TRỐNG</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <Label>SỐ CỘT</Label>
                            <input 
                                type="number" 
                                min="1" 
                                max="20"
                                value={sheetColumns}
                                onChange={(e) => setSheetColumns(parseInt(e.target.value) || 1)}
                                className="w-full bg-cyber-black border-2 border-cyber-dim text-cyber-text p-2 text-sm font-mono focus:border-cyber-accent outline-none"
                            />
                        </div>
                        <div>
                            <Label>KHOẢNG CÁCH (PX)</Label>
                            <input 
                                type="number" 
                                min="0" 
                                max="100"
                                value={sheetSpacing}
                                onChange={(e) => setSheetSpacing(parseInt(e.target.value) || 0)}
                                className="w-full bg-cyber-black border-2 border-cyber-dim text-cyber-text p-2 text-sm font-mono focus:border-cyber-accent outline-none"
                            />
                        </div>
                    </div>

                    {/* Alignment Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>CĂN NGANG</Label>
                            <div className="flex bg-cyber-black border-2 border-cyber-dim">
                                <button 
                                    onClick={() => setSheetHorizontalAlignment('left')}
                                    className={`flex-1 flex items-center justify-center p-2 transition-colors ${sheetHorizontalAlignment === 'left' ? 'bg-cyber-accent text-cyber-black' : 'text-cyber-dim hover:text-white'}`}
                                    title="Trái"
                                >
                                    <AlignLeft size={16} />
                                </button>
                                <button 
                                    onClick={() => setSheetHorizontalAlignment('center')}
                                    className={`flex-1 flex items-center justify-center p-2 transition-colors border-x-2 border-cyber-dim ${sheetHorizontalAlignment === 'center' ? 'bg-cyber-accent text-cyber-black' : 'text-cyber-dim hover:text-white'}`}
                                    title="Giữa"
                                >
                                    <AlignCenter size={16} />
                                </button>
                                <button 
                                    onClick={() => setSheetHorizontalAlignment('right')}
                                    className={`flex-1 flex items-center justify-center p-2 transition-colors ${sheetHorizontalAlignment === 'right' ? 'bg-cyber-accent text-cyber-black' : 'text-cyber-dim hover:text-white'}`}
                                    title="Phải"
                                >
                                    <AlignRight size={16} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <Label>CĂN DỌC</Label>
                            <div className="flex bg-cyber-black border-2 border-cyber-dim">
                                <button 
                                    onClick={() => setSheetVerticalAlignment('top')}
                                    className={`flex-1 flex items-center justify-center p-2 transition-colors ${sheetVerticalAlignment === 'top' ? 'bg-cyber-accent text-cyber-black' : 'text-cyber-dim hover:text-white'}`}
                                    title="Trên"
                                >
                                    <ArrowUpToLine size={16} />
                                </button>
                                <button 
                                    onClick={() => setSheetVerticalAlignment('center')}
                                    className={`flex-1 flex items-center justify-center p-2 transition-colors border-x-2 border-cyber-dim ${sheetVerticalAlignment === 'center' ? 'bg-cyber-accent text-cyber-black' : 'text-cyber-dim hover:text-white'}`}
                                    title="Giữa"
                                >
                                    <Minimize2 size={16} className="rotate-90" />
                                </button>
                                <button 
                                    onClick={() => setSheetVerticalAlignment('bottom')}
                                    className={`flex-1 flex items-center justify-center p-2 transition-colors ${sheetVerticalAlignment === 'bottom' ? 'bg-cyber-accent text-cyber-black' : 'text-cyber-dim hover:text-white'}`}
                                    title="Dưới"
                                >
                                    <ArrowDownToLine size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <ActionButton 
                        onClick={handleAssembleSheet}
                        disabled={isGenerating || sheetImages.length === 0}
                        loading={isGenerating}
                        icon={<Grid size={18} />}
                        label="XUẤT SHEET"
                        variant="accent"
                    />
                </div>
            );
        case AppMode.STYLE_TRANSFER:
            return (
                <div className="space-y-6">
                     <InfoBox>
                        > ĐẦU VÀO: ẢNH THẬT<br/>> XỬ LÝ: 16-BIT PIXEL HÓA
                    </InfoBox>

                    <div className="border-2 border-dashed border-cyber-dim hover:border-cyber-primary bg-cyber-black p-8 flex flex-col items-center justify-center transition-all group">
                        <ImageIcon size={48} className="text-cyber-dim group-hover:text-cyber-primary mb-4 transition-colors" />
                        <label className="cursor-pointer bg-cyber-panel border-2 border-cyber-dim hover:bg-cyber-primary hover:text-white hover:border-cyber-primary text-cyber-text font-mono font-bold py-2 px-4 shadow-pixel-sm transition-all active:translate-y-1">
                            CHỌN TỆP ẢNH
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                    </div>

                     {isGenerating && (
                        <div className="flex items-center justify-center gap-2 text-cyber-primary font-mono animate-pulse">
                            <Loader2 className="animate-spin" /> ĐANG XỬ LÝ DỮ LIỆU...
                        </div>
                     )}
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="flex h-screen bg-cyber-black text-cyber-text font-sans overflow-hidden retro-bg relative">
      <div className="scanlines"></div>
      
      {renderSidebar()}

      {/* Main Content Wrapper - 3 Column Layout Implementation */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        
        {/* Top Header */}
        <header className="h-14 bg-cyber-dark border-b-2 border-cyber-dim flex items-center justify-between px-6 shadow-lg z-30 shrink-0">
            <div className="flex items-center gap-3 font-mono">
               <span className="text-cyber-dim text-xs uppercase tracking-widest hidden md:inline">CHỨC NĂNG //</span>
               <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  {currentMode === AppMode.TEXT_TO_SPRITE && <><Wand2 size={16} className="text-cyber-primary"/><span className="text-cyber-primary drop-shadow-[0_0_5px_rgba(255,0,85,0.5)]">TẠO SPRITE</span></>}
                  {currentMode === AppMode.AI_EDIT && <><ImagePlus size={16} className="text-cyber-secondary"/><span className="text-cyber-secondary drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">CHỈNH SỬA AI</span></>}
                  {currentMode === AppMode.BACKGROUND_REMOVAL && <><Scissors size={16} className="text-pink-400"/><span className="text-pink-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]">TÁCH NỀN</span></>}
                  {currentMode === AppMode.ANIMATION && <><Film size={16} className="text-cyber-secondary"/><span className="text-cyber-secondary">TẠO HOẠT HÌNH</span></>}
                  {currentMode === AppMode.SPRITE_SHEET && <><Grid size={16} className="text-cyber-accent"/><span className="text-cyber-accent">GHÉP SPRITE SHEET</span></>}
                  {currentMode === AppMode.STYLE_TRANSFER && <><Layers size={16} className="text-pink-400"/><span className="text-pink-400">CHUYỂN ĐỔI STYLE</span></>}
                  {currentMode === AppMode.TILE_GENERATOR && <><BrickWall size={16} className="text-green-400"/><span className="text-green-400 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">TẠO TILE SET</span></>}
               </h2>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-cyber-black px-2 py-1 border border-cyber-dim">
                    <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-400 animate-ping' : 'bg-cyber-accent shadow-[0_0_5px_#39FF14]'}`}></div>
                    <span className="text-[10px] text-cyber-dim font-mono">HỆ THỐNG_{isGenerating ? 'ĐANG XỬ LÝ' : 'SẴN SÀNG'}</span>
                </div>
            </div>
        </header>

        {/* Workspace + Properties Split */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* CENTER COLUMN: Editor/Preview Area */}
            <div className="flex-1 bg-[#050308] relative flex flex-col overflow-hidden">
                {/* Background Grid Pattern */}
                 <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ 
                         backgroundImage: 'linear-gradient(rgba(107, 76, 154, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(107, 76, 154, 0.1) 1px, transparent 1px)',
                         backgroundSize: '20px 20px'
                     }}
                ></div>

                {/* Main Content Area */}
                <div className="flex-1 relative z-10 p-6 flex flex-col h-full items-center justify-center">
                    <div className="w-full h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-2 border-cyber-dim bg-cyber-black relative overflow-hidden flex flex-col">
                         {/* Canvas UI Decoration */}
                         <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyber-secondary z-20 pointer-events-none"></div>
                         <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyber-secondary z-20 pointer-events-none"></div>
                         <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyber-secondary z-20 pointer-events-none"></div>
                         <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyber-secondary z-20 pointer-events-none"></div>
                        
                        <PixelEditor imageUrl={generatedImage} />
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Properties Panel */}
            <div className="w-80 bg-cyber-panel border-l-2 border-cyber-dim flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] shrink-0">
                <div className="p-3 border-b-2 border-cyber-dim bg-cyber-dark flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-cyber-text">
                        <Settings size={14} />
                        <span className="text-xs font-bold font-mono tracking-widest uppercase">
                            THUỘC TÍNH
                        </span>
                    </div>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-cyber-dim"></div>
                        <div className="w-2 h-2 bg-cyber-dim/50"></div>
                        <div className="w-2 h-2 bg-cyber-primary"></div>
                    </div>
                </div>
                
                <div className="p-5 overflow-y-auto flex-1 scrollbar-thin">
                    {renderConfigurationPanel()}
                    
                    {error && (
                        <div className="mt-6 p-4 bg-red-900/20 border-l-4 border-red-500 text-xs font-mono text-red-300 relative animate-pulse">
                            <div className="font-bold mb-1 flex items-center gap-2"><Monitor size={12}/> LỖI HỆ THỐNG</div>
                            {error}
                        </div>
                    )}
                </div>
                
                <div className="p-2 border-t-2 border-cyber-dim bg-cyber-black text-[9px] text-cyber-dim text-center font-mono shrink-0">
                    MÔ HÌNH: GEMINI_2.5_FLASH // ĐỘ TRỄ: THẤP
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

// --- Reusable Styled Components ---

const SidebarItem: React.FC<{
    icon: React.ReactNode; 
    label: string; 
    active: boolean; 
    onClick: () => void;
    isOpen: boolean;
}> = ({ icon, label, active, onClick, isOpen }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-center gap-4 p-3 border-l-2 transition-all duration-200 group relative overflow-hidden ${
            active 
            ? 'border-cyber-primary bg-cyber-primary/10 text-white' 
            : 'border-transparent text-cyber-dim hover:text-cyber-secondary hover:bg-cyber-black'
        } ${isOpen ? 'justify-start px-4' : ''}`}
        title={!isOpen ? label : undefined}
    >
        <span className={`${active ? 'text-cyber-primary drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]' : 'group-hover:text-cyber-secondary'}`}>{icon}</span>
        {isOpen && (
            <span className={`text-xs font-bold tracking-wide font-sans ${active ? 'text-white' : ''}`}>{label}</span>
        )}
        {active && <div className="absolute right-0 w-1 h-full bg-cyber-primary/50 blur-sm"></div>}
    </button>
);

const Label: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <label className="block text-[10px] font-bold text-cyber-dim font-mono uppercase tracking-widest mb-2 flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-cyber-secondary">
        {children}
    </label>
);

const Select: React.FC<{
    value: string | number; 
    onChange: (e: any) => void; 
    options: string[]
}> = ({ value, onChange, options }) => (
    <select 
        value={value}
        onChange={onChange}
        className="w-full bg-cyber-black border-2 border-cyber-dim text-cyber-text rounded-none p-2 text-sm font-mono focus:border-cyber-primary outline-none appearance-none cursor-pointer hover:border-cyber-text transition-colors shadow-pixel-sm"
    >
        {options.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
);

const FileInput: React.FC<{onChange: (e: any) => void}> = ({ onChange }) => (
    <input 
        type="file" 
        accept="image/*"
        onChange={onChange}
        className="w-full text-xs font-mono text-cyber-dim 
        file:mr-4 file:py-2 file:px-4 file:border-0 
        file:text-xs file:font-bold file:bg-cyber-dim file:text-cyber-black
        hover:file:bg-cyber-secondary hover:file:text-cyber-black
        cursor-pointer"
    />
);

const InfoBox: React.FC<{children: React.ReactNode, borderColor?: string, textColor?: string}> = ({ 
    children, 
    borderColor = 'border-cyber-secondary/30', 
    textColor = 'text-cyber-secondary' 
}) => (
    <div className={`bg-cyber-black/50 border-l-4 ${borderColor} p-3 text-xs font-mono ${textColor}`}>
        {children}
    </div>
);

const ActionButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
    icon: React.ReactNode;
    label: string;
    variant: 'primary' | 'secondary' | 'accent' | 'warning';
}> = ({ onClick, disabled, loading, icon, label, variant }) => {
    
    const variants = {
        primary: "bg-cyber-primary border-cyber-primary text-white shadow-neon-pink hover:bg-[#ff3377]",
        secondary: "bg-cyber-secondary border-cyber-secondary text-cyber-black shadow-neon-cyan hover:bg-[#80f7ff]",
        accent: "bg-cyber-accent border-cyber-accent text-cyber-black hover:bg-[#8cff75]",
        warning: "bg-amber-600 border-amber-600 text-white hover:bg-amber-500"
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`w-full py-3 font-bold font-mono tracking-wider flex items-center justify-center gap-3 border-2 transition-all shadow-pixel active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : variants[variant]}
            `}
        >
            {loading ? <Loader2 className="animate-spin" /> : icon}
            {label}
        </button>
    );
};

export default App;