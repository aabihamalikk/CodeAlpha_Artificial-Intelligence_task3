import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Play, Pause, RefreshCw, Upload, Maximize2, ShieldAlert, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { SourceType, TrackedObject, TrackerConfig, DisplayOptions, Detection } from '../types';
import { SortTracker } from '../utils/sortTracker';
import { SAMPLE_VIDEOS, SampleVideoSimulator } from '../utils/sampleVideos';

interface VideoPlayerProps {
  sourceType: SourceType;
  model: cocoSsd.ObjectDetection | null;
  trackerConfig: TrackerConfig;
  displayOptions: DisplayOptions;
  classFilter: Set<string>;
  onUpdateTrackedObjects: (tracks: TrackedObject[], fps: number, processTimeMs: number) => void;
  onTakeSnapshot: (dataUrl: string) => void;
  onRecordLog: (tracks: TrackedObject[]) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  sourceType,
  model,
  trackerConfig,
  displayOptions,
  classFilter,
  onUpdateTrackedObjects,
  onTakeSnapshot,
  onRecordLog,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedSample, setSelectedSample] = useState<string>('traffic');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Tracker instance
  const trackerRef = useRef<SortTracker>(new SortTracker());
  const simulatorRef = useRef<SampleVideoSimulator | null>(null);

  // Frame loop state
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsCounterRef = useRef<{ frames: number; lastCheck: number }>({ frames: 0, lastCheck: performance.now() });
  const [currentFps, setCurrentFps] = useState<number>(0);

  // Initialize Sample Simulator
  useEffect(() => {
    simulatorRef.current = new SampleVideoSimulator('traffic');
  }, []);

  // Update Simulator type when sample selection changes
  useEffect(() => {
    if (sourceType === 'sample' && simulatorRef.current) {
      const found = SAMPLE_VIDEOS.find((v) => v.id === selectedSample);
      if (found) {
        simulatorRef.current.setType(found.type);
      }
    }
  }, [selectedSample, sourceType]);

  // Handle Webcam Initialization
  const setupWebcam = useCallback(async () => {
    setWebcamError(null);
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setWebcamError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser settings.'
          : 'Could not connect to webcam device. Try selecting "Benchmark Clips" or uploading a video.'
      );
    }
  }, []);

  // Handle Video File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedVideoUrl(url);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Switch Sources effect
  useEffect(() => {
    trackerRef.current.reset();

    if (sourceType === 'webcam') {
      setupWebcam();
    } else if (sourceType === 'file') {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        if (uploadedVideoUrl) {
          videoRef.current.src = uploadedVideoUrl;
          videoRef.current.play();
          setIsPlaying(true);
        }
      }
    } else if (sourceType === 'sample') {
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
        videoRef.current.pause();
      }
      setIsPlaying(true);
    }
  }, [sourceType, setupWebcam, uploadedVideoUrl]);

  // Main Detection & Tracking Frame Loop
  useEffect(() => {
    let active = true;

    const processFrame = async () => {
      if (!active) return;

      const now = performance.now();
      const frameInterval = 1000 / trackerConfig.targetFps;
      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= frameInterval) {
        lastFrameTimeRef.current = now - (elapsed % frameInterval);

        // Update FPS counter
        fpsCounterRef.current.frames++;
        if (now - fpsCounterRef.current.lastCheck >= 1000) {
          const calculatedFps = Math.round(
            (fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.lastCheck)
          );
          setCurrentFps(calculatedFps);
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastCheck = now;
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          let frameSource: HTMLVideoElement | HTMLCanvasElement | null = null;

          if (sourceType === 'sample' && simulatorRef.current) {
            frameSource = simulatorRef.current.renderFrame();
          } else if (
            (sourceType === 'webcam' || sourceType === 'file') &&
            videoRef.current &&
            videoRef.current.readyState >= 2
          ) {
            frameSource = videoRef.current;
          }

          if (frameSource && ctx) {
            // Match canvas dimensions to source
            const sourceWidth = 'videoWidth' in frameSource ? frameSource.videoWidth : frameSource.width;
            const sourceHeight = 'videoHeight' in frameSource ? frameSource.videoHeight : frameSource.height;

            if (sourceWidth > 0 && sourceHeight > 0) {
              if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
                canvas.width = sourceWidth;
                canvas.height = sourceHeight;
              }

              // Draw video frame to canvas
              ctx.drawImage(frameSource, 0, 0, canvas.width, canvas.height);

              // Perform Detection if model is loaded and player is playing
              const startTime = performance.now();
              let rawDetections: Detection[] = [];

              if (sourceType === 'sample' && simulatorRef.current && isPlaying) {
                // Benchmark clips provide simulated ground-truth bounding boxes for SORT tracking
                rawDetections = simulatorRef.current.getSimulatedDetections();
              } else if (model && isPlaying) {
                try {
                  const predictions = await model.detect(frameSource, 20, trackerConfig.confidenceThreshold);
                  rawDetections = predictions.map((p) => ({
                    bbox: {
                      x: p.bbox[0],
                      y: p.bbox[1],
                      width: p.bbox[2],
                      height: p.bbox[3],
                    },
                    class: p.class,
                    score: p.score,
                  }));
                } catch (e) {
                  console.error('Detection error:', e);
                }
              }

              // Filter detections by class if filter enabled
              if (classFilter.size > 0) {
                rawDetections = rawDetections.filter((d) => classFilter.has(d.class));
              }

              // Update SORT Tracker
              const trackingStartTime = performance.now();
              const trackedObjects = trackerRef.current.update(rawDetections, trackerConfig);
              const totalProcessTime = performance.now() - startTime;

              // Notify parent of updated tracks & telemetry
              onUpdateTrackedObjects(trackedObjects, currentFps, totalProcessTime);
              onRecordLog(trackedObjects);

              // Draw Bounding Boxes and Overlays
              renderOverlays(ctx, trackedObjects, displayOptions);
            }
          }
        }
      }

      if (active) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    sourceType,
    model,
    trackerConfig,
    displayOptions,
    classFilter,
    isPlaying,
    currentFps,
    onUpdateTrackedObjects,
    onRecordLog,
  ]);

  // Custom Canvas Overlay Renderer
  const renderOverlays = (
    ctx: CanvasRenderingContext2D,
    tracks: TrackedObject[],
    opts: DisplayOptions
  ) => {
    for (const track of tracks) {
      const { bbox, color, trackId, class: className, score, history, velocity } = track;
      const { x, y, width, height } = bbox;

      // 1. Blur Region if option checked
      if (opts.blurObjects) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.filter = 'blur(12px)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.restore();
      }

      // 2. Trajectory Tail Path
      if (opts.showTrajectories && history.length > 1) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        for (let i = 0; i < history.length; i++) {
          const pt = history[i];
          if (i === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.stroke();

        // Draw trajectory nodes
        for (let i = 0; i < history.length; i++) {
          const pt = history[i];
          const radius = i === history.length - 1 ? 4 : 2;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Velocity Motion Vector Arrow
      if (opts.showVelocity && (Math.abs(velocity.vx) > 0.5 || Math.abs(velocity.vy) > 0.5)) {
        ctx.save();
        const cx = x + width / 2;
        const cy = y + height / 2;
        const endX = cx + velocity.vx * 8;
        const endY = cy + velocity.vy * 8;

        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow tip
        const angle = Math.atan2(velocity.vy, velocity.vx);
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Bounding Box Rendering
      if (opts.showBoxes) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = opts.boxStyle === 'neon' ? 12 : 4;

        if (opts.boxStyle === 'corner') {
          // Futuristic Cyber Corner Brackets
          const cornerLen = Math.min(width, height) * 0.25;
          ctx.lineWidth = 3;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(x + width - cornerLen, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerLen);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(x, y + height - cornerLen);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x + cornerLen, y + height);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(x + width - cornerLen, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height - cornerLen);
          ctx.stroke();
        } else {
          // Solid or Neon rectangle
          ctx.lineWidth = opts.boxStyle === 'neon' ? 3 : 2;
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, 6);
          ctx.stroke();

          // Subtle box background fill
          ctx.fillStyle = color + '15'; // 8% opacity
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. ID & Label Tag Badge
      if (opts.showLabels) {
        ctx.save();
        const labelText = `${opts.showIds ? `#${trackId} ` : ''}${className}${
          opts.showScores ? ` ${Math.round(score * 100)}%` : ''
        }`;

        ctx.font = '600 12px Inter, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const badgeHeight = 22;
        const badgeWidth = textWidth + 14;

        const badgeY = y - badgeHeight > 0 ? y - badgeHeight - 4 : y + 4;

        // Badge container
        ctx.fillStyle = '#090d16e6';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, badgeY, badgeWidth, badgeHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Color accent dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + 10, badgeY + badgeHeight / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, x + 18, badgeY + 15);
        ctx.restore();
      }
    }
  };

  const handleTakeSnapshot = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onTakeSnapshot(dataUrl);
    }
  };

  const toggleFullscreen = () => {
    if (!canvasRef.current) return;
    if (!isFullscreen) {
      canvasRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-col group">
      {/* Target Canvas Viewport Frame */}
      <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
        {/* Hidden Video element used as raw frame decoder */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
          loop={sourceType === 'file'}
        />

        {/* Output Render Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-crosshair transition-all"
        />

        {/* Webcam Error Warning Overlay */}
        {sourceType === 'webcam' && webcamError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <ShieldAlert className="w-12 h-12 text-rose-500 mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-2">Camera Access Needed</h3>
            <p className="text-sm text-slate-400 max-w-md mb-4">{webcamError}</p>
            <div className="flex gap-3">
              <button
                onClick={setupWebcam}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
              >
                Retry Webcam Access
              </button>
            </div>
          </div>
        )}

        {/* Video Upload Drop Area when Source = File and no file uploaded */}
        {sourceType === 'file' && !uploadedVideoUrl && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl m-4 z-20">
            <Upload className="w-12 h-12 text-emerald-400 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-white mb-1">Upload Video File for Detection</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs text-center">
              Supports MP4, WebM, or MOV formats for real-time SORT multi-object tracking.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              Select Local Video File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Top HUD Stats Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono font-medium text-emerald-400 flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE OVERLAY
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-200 shadow-md">
            {sourceType.toUpperCase()} MODE
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl opacity-90 hover:opacity-100 transition z-10">
          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title={isPlaying ? 'Pause Detection' : 'Resume Detection'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Reset Tracker IDs */}
          <button
            onClick={() => trackerRef.current.reset()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Reset Track IDs & History"
          >
            <RefreshCw className="w-4 h-4 text-teal-400" />
          </button>

          {/* Sample Selector Dropdown if Source == Sample */}
          {sourceType === 'sample' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Scenario:</span>
              <select
                value={selectedSample}
                onChange={(e) => setSelectedSample(e.target.value)}
                className="bg-slate-950 text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
              >
                {SAMPLE_VIDEOS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Change File button if Source == File */}
          {sourceType === 'file' && uploadedVideoUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white transition"
            >
              Change File
            </button>
          )}

          {/* Snapshot Button */}
          <button
            onClick={handleTakeSnapshot}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition ml-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Snapshot</span>
          </button>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Fullscreen Canvas"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
