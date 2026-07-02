'use client';

import { X, RefreshCw, Video as VideoIcon } from 'lucide-react';
import { cn, getAssetUrl } from '@/lib/utils';

type MediaStatus = 'uploading' | 'done' | 'error';

/**
 * Thumbnail for an inspection photo/video that reflects its upload state:
 *  - uploading → dimmed with a spinner
 *  - error     → red overlay, tap to retry the upload
 *  - done      → normal, tap to zoom
 * This is what lets the inspector *see* that every photo was actually saved
 * before finishing the inspection.
 */
export default function MediaThumb({
  url,
  status,
  size = 'md',
  isVideo = false,
  onRemove,
  onRetry,
  onZoom,
}: {
  url: string;
  status: MediaStatus;
  size?: 'sm' | 'md';
  isVideo?: boolean;
  onRemove: () => void;
  onRetry?: () => void;
  onZoom?: () => void;
}) {
  const box = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
  const resolved = getAssetUrl(url);

  return (
    <div
      className={cn(
        box,
        'rounded-xl overflow-hidden border relative group shadow-sm shrink-0',
        status === 'error' ? 'border-rose-400' : 'border-slate-200'
      )}
    >
      {isVideo ? (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
          <VideoIcon className="w-6 h-6 text-slate-400" />
        </div>
      ) : (
        <img
          src={resolved}
          alt="Mídia da vistoria"
          onClick={() => status === 'done' && onZoom?.()}
          className={cn(
            'w-full h-full object-cover transition-transform',
            status === 'done' ? 'cursor-zoom-in group-hover:scale-110' : 'opacity-50'
          )}
        />
      )}

      {status === 'uploading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {status === 'error' && (
        <button
          onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/85 text-white gap-0.5"
          title="Falha no envio — toque para reenviar"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-[7px] font-black uppercase tracking-wider">Reenviar</span>
        </button>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className={cn(
          'absolute top-1 right-1 bg-rose-500 rounded-lg flex items-center justify-center text-white hover:bg-rose-600 shadow opacity-0 group-hover:opacity-100 transition-opacity',
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
        )}
      >
        <X className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>
    </div>
  );
}
