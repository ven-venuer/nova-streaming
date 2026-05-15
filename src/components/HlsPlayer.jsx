import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2 } from 'lucide-react';

export default function HlsPlayer({ src, poster, autoPlay = true }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;

    const initPlayer = () => {
      setLoading(true);
      setError(null);

      if (Hls.isSupported()) {
        hls = new Hls({
          maxLoadingDelay: 4,
          minAutoBitrate: 0,
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (autoPlay) {
            video.play().catch(e => console.log('Autoplay prevented:', e));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error encountered, try to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error encountered, try to recover');
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setError('Failed to load video stream.');
                setLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setLoading(false);
          if (autoPlay) {
            video.play().catch(e => console.log('Autoplay prevented:', e));
          }
        });
        video.addEventListener('error', () => {
          setError('Failed to load video stream.');
          setLoading(false);
        });
      } else {
        setError('Your browser does not support HLS video streaming.');
        setLoading(false);
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, autoPlay]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <Loader2 className="w-12 h-12 text-[#e50914] animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10 px-4 text-center">
          <div className="text-white space-y-4">
            <p className="text-xl font-medium">{error}</p>
            <p className="text-gray-400 text-sm">The stream source might be offline or blocked.</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        controls
        playsInline
      />
    </div>
  );
}
