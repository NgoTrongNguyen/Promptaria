'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PIXEL_COLORS } from '@/lib/constants';

interface PixelCanvasProps {
  width: number;
  height: number;
  data: number[];
  onChange: (newData: number[]) => void;
  scale?: number;
}

export default function PixelCanvas({ width, height, data, onChange, scale = 20 }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [selectedColor, setSelectedColor] = useState(1); // Default black

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, height * scale);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(width * scale, y * scale);
      ctx.stroke();
    }

    // Draw Pixels
    data.forEach((colorIdx, i) => {
      if (colorIdx === 0) return;
      const x = i % width;
      const y = Math.floor(i / width);
      ctx.fillStyle = PIXEL_COLORS[colorIdx];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  }, [width, height, data, scale]);

  const handlePointerAction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const newData = [...data];
      const index = y * width + x;
      const colorToApply = tool === 'pencil' ? selectedColor : 0;

      if (newData[index] !== colorToApply) {
        newData[index] = colorToApply;
        onChange(newData);
      }
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handlePointerAction(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      handlePointerAction(e);
    }
  };

  const onPointerUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col gap-4 items-center glass-panel p-6">
      <div className="flex gap-4 items-center mb-4">
        <div className="flex gap-2">
          {PIXEL_COLORS.map((color, i) => (
            i > 0 && (
              <button
                key={i}
                onClick={() => { setSelectedColor(i); setTool('pencil'); }}
                style={{ backgroundColor: color }}
                className={`w-10 h-10 shrink-0 rounded-md border-2 ${selectedColor === i && tool === 'pencil' ? 'border-white' : 'border-transparent'} transition-transform hover:scale-110`}
                title={`Color ${i}`}
              />
            )
          ))}
        </div>
        <div className="h-8 w-[1px] bg-slate-700 mx-2" />
        <button
          onClick={() => setTool('eraser')}
          className={`px-4 py-2 rounded-md ${tool === 'eraser' ? 'bg-indigo-600' : 'bg-slate-800'} transition-colors`}
        >
          Eraser
        </button>
        <button
          onClick={() => onChange(new Array(width * height).fill(0))}
          className="px-4 py-2 rounded-md bg-slate-800 hover:bg-red-900 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="relative border-4 border-slate-700 rounded-lg overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={width * scale}
          height={height * scale}
          className="pixel-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="mt-2 text-slate-400 text-sm mono">
        {width}x{height} Grid
      </div>
    </div>
  );
}
