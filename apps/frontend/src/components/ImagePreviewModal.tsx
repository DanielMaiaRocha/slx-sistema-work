'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface ImagePreviewModalProps {
  url: string | null;
  onClose: () => void;
}

export default function ImagePreviewModal({ url, onClose }: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);

  if (!url) return null;

  return (
    <AnimatePresence>
      {url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />
          
          <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center gap-6">
            <div className="absolute top-0 right-0 sm:-right-12 flex flex-col gap-4">
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
              
              <a
                href={url}
                download="vistoria-photo.jpg"
                className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>

            <div className="flex items-center gap-4 absolute bottom-0 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
               <button 
                 onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                 className="p-3 text-white hover:text-primary transition-colors"
               >
                 <ZoomOut className="w-5 h-5" />
               </button>
               <div className="w-px h-4 bg-white/10" />
               <span className="text-[10px] font-black text-white w-12 text-center uppercase tracking-widest">
                 {Math.round(scale * 100)}%
               </span>
               <div className="w-px h-4 bg-white/10" />
               <button 
                 onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
                 className="p-3 text-white hover:text-primary transition-colors"
               >
                 <ZoomIn className="w-5 h-5" />
               </button>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl"
            >
              <motion.img
                src={url}
                alt="Preview"
                animate={{ scale }}
                className="max-w-full max-h-full object-contain shadow-2xl"
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              />
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
