import React, { useRef, useEffect, useState } from 'react';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';

interface PixelEditorProps {
  imageUrl: string | null;
  onSave?: (url: string) => void;
}

const PixelEditor: React.FC<PixelEditorProps> = ({ imageUrl, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);

  // Load image into canvas
  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Set canvas size to match image intrinsic size (pixel art resolution)
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.imageSmoothingEnabled = false; // Critical for pixel art
        ctx.drawImage(img, 0, 0);
      };
      img.src = imageUrl;
      img.crossOrigin = "Anonymous"; // Handle potential CORS
    }
  }, [imageUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `pixel-dreamer-asset-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  if (!imageUrl) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-cyber-dim bg-cyber-black/80 relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-[40px_auto] grid-rows-[40px_auto] opacity-5 pointer-events-none">
             {/* Decorative grid */}
        </div>
        <div className="text-6xl mb-6 animate-bounce opacity-50">👾</div>
        <p className="text-lg font-mono tracking-widest uppercase">CHƯA CÓ DỮ LIỆU</p>
        <p className="text-xs text-cyber-dim/50 mt-2 font-mono">Vui lòng chọn chức năng để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cyber-black overflow-hidden relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-cyber-panel border-b-2 border-cyber-dim z-20 shadow-md">
        <div className="flex gap-2">
             <div className="text-xs font-mono text-cyber-dim uppercase flex items-center h-full px-2">
                Trình Xem (View Mode)
             </div>
        </div>
        
        <div className="flex items-center bg-cyber-black border-2 border-cyber-dim px-2 py-1 gap-2">
            <button 
                onClick={() => setZoom(z => Math.max(1, z - 1))}
                className="text-cyber-dim hover:text-cyber-secondary"
            >
                <ZoomOut size={16} />
            </button>
            <span className="text-xs text-cyber-secondary font-mono w-10 text-center">{zoom}x</span>
            <button 
                onClick={() => setZoom(z => Math.min(20, z + 1))}
                className="text-cyber-dim hover:text-cyber-secondary"
            >
                <ZoomIn size={16} />
            </button>
        </div>

        <div>
            <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-cyber-accent text-cyber-black text-xs font-bold font-mono uppercase border-2 border-cyber-accent hover:bg-[#8cff75] shadow-neon-green transition-all"
            >
                <span className="flex items-center gap-2"><Download size={14} /> LƯU ẢNH</span>
            </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#100b1a] relative">
        {/* Checkboard pattern for transparency */}
        <div 
            style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'center',
                boxShadow: '0 0 0 2px #39FF14', // Neon border around canvas
                imageRendering: 'pixelated'
            }}
            className="bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAHElEQVQYlWNgYGD4z8AARwYYU4WJchJG68KBAwUAl+oH8V206XAAAAAASUVORK5CYII=')] bg-repeat" 
        >
            <canvas
                ref={canvasRef}
                className="block cursor-default"
            />
        </div>
      </div>
      
      <div className="px-4 py-1 bg-cyber-panel text-[10px] text-cyber-dim text-center font-mono border-t-2 border-cyber-dim uppercase tracking-widest">
        KÍCH THƯỚC: {canvasRef.current?.width}x{canvasRef.current?.height}PX
      </div>
    </div>
  );
};

export default PixelEditor;