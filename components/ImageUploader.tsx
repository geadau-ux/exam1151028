import React, { useRef, useState, useEffect } from 'react';
import { UploadIcon, CameraIcon, XIcon, FileTextIcon, RobotIcon } from './Icons';
import { InputData } from '../types';

interface ImageUploaderProps {
  onInputSelected: (data: InputData, preview: string) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onInputSelected, isLoading }) => {
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [textInput, setTextInput] = useState('');
  
  // Image Refs & State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- File Upload Logic ---
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請上傳圖片檔案喔！');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      onInputSelected({ type: 'image', content: base64Content }, base64String);
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // --- Paste Logic ---
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (mode !== 'image') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              const base64String = reader.result as string;
              const base64Content = base64String.split(',')[1];
              onInputSelected({ type: 'image', content: base64Content }, base64String);
            };
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [mode, onInputSelected]);

  // --- Camera Logic ---
  const startCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("無法存取相機，請確認瀏覽器權限。");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Content = dataUrl.split(',')[1];
        
        stopCamera();
        onInputSelected({ type: 'image', content: base64Content }, dataUrl);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- Text Logic ---
  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      alert("請輸入試題內容喔！");
      return;
    }
    onInputSelected({ type: 'text', content: textInput.trim() }, textInput.trim());
  };

  return (
    <div className={`bg-white rounded-3xl overflow-hidden border-4 border-anpan-brown shadow-cartoon-sm ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      
      {/* Tabs */}
      <div className="flex border-b-4 border-anpan-brown">
        <button
          onClick={() => setMode('image')}
          className={`flex-1 py-4 flex items-center justify-center font-bold text-lg transition-colors
            ${mode === 'image' ? 'bg-anpan-yellow text-anpan-brown' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          <CameraIcon />
          <span className="ml-2">圖片/檔案上傳</span>
        </button>
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-4 flex items-center justify-center font-bold text-lg transition-colors
            ${mode === 'text' ? 'bg-anpan-yellow text-anpan-brown' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          <FileTextIcon />
          <span className="ml-2">文字輸入</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-2 bg-anpan-cream/30">
        
        {/* Mode: IMAGE */}
        {mode === 'image' && (
          <div 
            className={`relative border-4 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group bg-white
              ${dragActive ? 'border-anpan-red bg-red-50 scale-[0.99]' : 'border-anpan-brown/30 hover:border-anpan-red hover:bg-yellow-50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleChange}
            />
            
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-anpan-cream p-4 rounded-full border-2 border-anpan-brown transform group-hover:rotate-12 transition-transform duration-300">
                <UploadIcon />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-anpan-brown">
                  點擊這裡上傳圖片或檔案
                </p>
                <p className="text-base text-anpan-brown/60 font-medium">
                  支援拖曳檔案，或直接 Ctrl+V / Cmd+V 貼上圖片喔！
                </p>
              </div>

              <div className="flex items-center w-full justify-center py-4">
                <div className="h-1 bg-anpan-brown/10 w-1/4 rounded-full"></div>
                <span className="px-3 text-anpan-brown/40 text-sm font-bold">OR</span>
                <div className="h-1 bg-anpan-brown/10 w-1/4 rounded-full"></div>
              </div>

              <button
                onClick={startCamera}
                className="flex items-center space-x-2 bg-anpan-red hover:bg-red-600 text-white px-6 py-3 rounded-full border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg z-10 font-bold text-lg"
              >
                <CameraIcon />
                <span>開啟相機拍照</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode: TEXT */}
        {mode === 'text' && (
          <div className="p-4 bg-white rounded-2xl border-4 border-dashed border-anpan-brown/30">
             <label className="block text-anpan-brown font-bold mb-2 text-lg">
               請在下方輸入題目內容：
             </label>
             <textarea
               className="w-full h-48 p-4 rounded-xl border-2 border-anpan-brown/50 focus:border-anpan-red focus:ring-2 focus:ring-anpan-red/20 outline-none resize-none text-lg leading-relaxed text-anpan-brown placeholder-anpan-brown/30 bg-anpan-cream/20"
               placeholder="例如：小明有 5 顆蘋果，給了小華 2 顆後，請問小明還剩下幾顆蘋果？..."
               value={textInput}
               onChange={(e) => setTextInput(e.target.value)}
             />
             <div className="mt-4 flex justify-end">
               <button 
                 onClick={handleTextSubmit}
                 className="flex items-center space-x-2 bg-anpan-red hover:bg-red-600 text-white px-8 py-3 rounded-full border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg font-bold text-lg"
               >
                 <RobotIcon />
                 <span>開始分析</span>
               </button>
             </div>
          </div>
        )}

      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-anpan-brown/95 flex flex-col items-center justify-center sm:p-4">
          <div className="relative w-full h-full max-w-4xl flex flex-col bg-black sm:rounded-3xl overflow-hidden border-4 border-anpan-yellow">
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-end">
              <button 
                onClick={stopCamera}
                className="p-3 bg-anpan-red rounded-full text-white border-2 border-white hover:scale-110 transition-transform shadow-cartoon"
              >
                <XIcon />
              </button>
            </div>
            <div className="flex-1 relative flex items-center justify-center bg-gray-900">
               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
               <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-6 bg-white flex justify-center items-center space-x-10">
              <button onClick={stopCamera} className="px-6 py-2 text-anpan-brown font-bold hover:bg-gray-100 rounded-full transition-colors">取消</button>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-anpan-red border-4 border-white ring-4 ring-anpan-red flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-cartoon">
                <div className="w-16 h-16 rounded-full border-2 border-white/30"></div>
              </button>
              <div className="w-[88px]"></div> 
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;