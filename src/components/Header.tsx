import React from 'react';
import { Camera, Film, HelpCircle, Download, Activity, Cpu, Sliders, PlayCircle } from 'lucide-react';
import { SourceType } from '../types';

interface HeaderProps {
  sourceType: SourceType;
  setSourceType: (type: SourceType) => void;
  isModelLoaded: boolean;
  activeTrackCount: number;
  fps: number;
  onOpenGuide: () => void;
  onOpenExport: () => void;
  onToggleSidebar: () => void;
  showSidebar: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sourceType,
  setSourceType,
  isModelLoaded,
  activeTrackCount,
  fps,
  onOpenGuide,
  onOpenExport,
  onToggleSidebar,
  showSidebar,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 px-4 py-3 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 p-0.5 shadow-md shadow-emerald-600/10 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-slate-900">
                SORT Object Tracker AI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                v2.4 REALTIME
              </span>
            </div>
            <p className="text-xs text-slate-500">
              YOLO/COCO-SSD Detection + SORT Multi-Object Kalman Tracking
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200/80">
            <div
              className={`w-2 h-2 rounded-full ${
                isModelLoaded ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-700 font-medium">
              {isModelLoaded ? 'COCO-SSD Ready' : 'Loading Model...'}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200/80">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-mono text-teal-700 font-semibold">{fps} FPS</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200/80">
            <span className="text-slate-500">Tracked:</span>
            <span className="font-mono text-emerald-600 font-bold">{activeTrackCount} IDs</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Input Source Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSourceType('webcam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceType === 'webcam'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>

            <button
              onClick={() => setSourceType('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceType === 'file'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video File</span>
            </button>

            <button
              onClick={() => setSourceType('sample')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceType === 'sample'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Benchmark Clips</span>
            </button>
          </div>

          {/* Export Telemetry */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition"
            title="Export tracking logs or take snapshot"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Toggle Sidebar Controls */}
          <button
            onClick={onToggleSidebar}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border shadow-xs ${
              showSidebar
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* How to Run Guide Modal Button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all transform hover:scale-[1.02]"
          >
            <HelpCircle className="w-4 h-4" />
            <span>How to Run (Guide)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
