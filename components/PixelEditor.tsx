import React, { useRef, useEffect, useState } from 'react';
import { Download, Eraser, Pen, ZoomIn, ZoomOut, Wand, PaintBucket } from 'lucide-react';

interface PixelEditorProps {
  imageUrl: string | null;
  onSave?: (url: string) => void;
}

const PixelEditor: React.FC<PixelEditorProps> = ({ imageUrl, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'magic-wand' | 'fill-bucket'>('pen');
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);

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

  const getCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    // Calculate position relative to canvas
    const x = Math.floor((e.clientX - rect.left) / (rect.width / canvasRef.current.width));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / canvasRef.current.height));
    return { x, y };
  };

  const removeColor = (startX: number, startY: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasRef.current;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Get color at clicked position
    const targetIndex = (startY * width + startX) * 4;
    const r = data[targetIndex];
    const g = data[targetIndex + 1];
    const b = data[targetIndex + 2];
    const a = data[targetIndex + 3];

    // Don't do anything if clicking already transparent pixel
    if (a === 0) return;

    // Global Color Replacement (Replace all pixels of this color)
    // Tolerance is low because pixel art usually has solid colors
    const tolerance = 15; 

    for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - r) <= tolerance &&
            Math.abs(data[i + 1] - g) <= tolerance &&
            Math.abs(data[i + 2] - b) <= tolerance &&
            data[i+3] > 0) {
            
            data[i + 3] = 0; // Set Alpha to 0 (Transparent)
        }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const floodFill = (startX: number, startY: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasRef.current;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Helper to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const targetIndex = (startY * width + startX) * 4;
    const targetR = data[targetIndex];
    const targetG = data[targetIndex + 1];
    const targetB = data[targetIndex + 2];
    const targetA = data[targetIndex + 3];

    const fillColor = hexToRgb(color);
    const fillA = 255;

    // If filling with the exact same color, do nothing to prevent infinite loops
    if (targetR === fillColor.r && targetG === fillColor.g && targetB === fillColor.b && targetA === fillA) {
        return;
    }

    // Stack-based flood fill
    const pixelStack = [[startX, startY]];

    while (pixelStack.length) {
      const newPos = pixelStack.pop();
      if(!newPos) continue;
      
      const x = newPos[0];
      const y = newPos[1];

      // Boundary check
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pixelPos = (y * width + x) * 4;

      // Check if current pixel matches target color
      // We use exact match for pixel art precision
      if (
        data[pixelPos] === targetR &&
        data[pixelPos + 1] === targetG &&
        data[pixelPos + 2] === targetB &&
        data[pixelPos + 3] === targetA
      ) {
        // Fill pixel
        data[pixelPos] = fillColor.r;
        data[pixelPos + 1] = fillColor.g;
        data[pixelPos + 2] = fillColor.b;
        data[pixelPos + 3] = fillA;

        // Add neighbors to stack
        pixelStack.push([x + 1, y]);
        pixelStack.push([x - 1, y]);
        pixelStack.push([x, y + 1]);
        pixelStack.push([x, y - 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current || tool === 'magic-wand' || tool === 'fill-bucket') return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'pen') {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    } else if (tool === 'eraser') {
      ctx.clearRect(x, y, 1, 1);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCoordinates(e);
    if (tool === 'magic-wand') {
        removeColor(x, y);
    } else if (tool === 'fill-bucket') {
        floodFill(x, y);
    } else {
        setIsDrawing(true);
        draw(e);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
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
            <button 
                onClick={() => setTool('pen')}
                className={`p-2 border-2 transition-all ${tool === 'pen' ? 'bg-cyber-secondary border-cyber-secondary text-cyber-black' : 'border-cyber-dim text-cyber-dim hover:text-cyber-text'}`}
                title="Bút vẽ"
            >
                <Pen size={16} />
            </button>
            <button 
                onClick={() => setTool('eraser')}
                className={`p-2 border-2 transition-all ${tool === 'eraser' ? 'bg-cyber-primary border-cyber-primary text-white' : 'border-cyber-dim text-cyber-dim hover:text-cyber-text'}`}
                title="Tẩy"
            >
                <Eraser size={16} />
            </button>
            <button 
                onClick={() => setTool('fill-bucket')}
                className={`p-2 border-2 transition-all ${tool === 'fill-bucket' ? 'bg-cyber-accent border-cyber-accent text-cyber-black' : 'border-cyber-dim text-cyber-dim hover:text-cyber-text'}`}
                title="Thùng sơn (Fill Bucket) - Tô màu vùng liền kề"
            >
                <PaintBucket size={16} />
            </button>
            <button 
                onClick={() => setTool('magic-wand')}
                className={`p-2 border-2 transition-all ${tool === 'magic-wand' ? 'bg-cyber-dim border-cyber-dim text-white' : 'border-cyber-dim text-cyber-dim hover:text-cyber-text'}`}
                title="Đũa thần (Xóa nền) - Xóa tất cả pixel cùng màu"
            >
                <Wand size={16} />
            </button>
            <div className="border-2 border-cyber-dim p-1 flex items-center bg-cyber-black">
                <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
                />
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
                onMouseDown={handleMouseDown}
                onMouseMove={draw}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`block ${tool === 'magic-wand' || tool === 'fill-bucket' ? 'cursor-pointer' : 'cursor-crosshair'}`}
            />
        </div>
      </div>
      
      <div className="px-4 py-1 bg-cyber-panel text-[10px] text-cyber-dim text-center font-mono border-t-2 border-cyber-dim uppercase tracking-widest">
        KÍCH THƯỚC: {canvasRef.current?.width}x{canvasRef.current?.height}PX // CÔNG CỤ: {tool === 'pen' ? 'BÚT' : tool === 'eraser' ? 'TẨY' : tool === 'fill-bucket' ? 'THÙNG SƠN' : 'ĐŨA THẦN'}
      </div>
    </div>
  );
};

export default PixelEditor;