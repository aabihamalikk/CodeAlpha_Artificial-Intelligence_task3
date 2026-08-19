import React from 'react';
import { Sliders, Eye, EyeOff, Layers, Activity, ShieldAlert, CheckSquare, Square, RefreshCcw } from 'lucide-react';
import { TrackerConfig, DisplayOptions } from '../types';

interface ControlPanelProps {
  trackerConfig: TrackerConfig;
  setTrackerConfig: React.Dispatch<React.SetStateAction<TrackerConfig>>;
  displayOptions: DisplayOptions;
  setDisplayOptions: React.Dispatch<React.SetStateAction<DisplayOptions>>;
  classFilter: Set<string>;
  setClassFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  onResetDefaults: () => void;
}

const COMMON_CLASSES = [
  'person',
  'car',
  'bus',
  'truck',
  'bicycle',
  'motorcycle',
  'dog',
  'cat',
  'cell phone',
  'laptop',
  'bottle',
  'chair',
  'book',
  'backpack',
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  trackerConfig,
  setTrackerConfig,
  displayOptions,
  setDisplayOptions,
  classFilter,
  setClassFilter,
  onResetDefaults,
}) => {
  const toggleClass = (className: string) => {
    setClassFilter((prev) => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  };

  const selectAllClasses = () => setClassFilter(new Set());
  const clearAllClasses = () => setClassFilter(new Set(COMMON_CLASSES));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 text-slate-900 text-sm shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <h2 className="font-bold text-base text-slate-900">Hyperparameters & View</h2>
        </div>
        <button
          onClick={onResetDefaults}
          className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition"
        >
          <RefreshCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Detection & SORT Tracking Thresholds */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Detection & Tracking Hyperparameters
        </h3>

        {/* Confidence Threshold */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 font-medium">Confidence Score Threshold</span>
            <span className="font-mono text-emerald-700 font-bold">
              {Math.round(trackerConfig.confidenceThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={trackerConfig.confidenceThreshold}
            onChange={(e) =>
              setTrackerConfig((prev) => ({
                ...prev,
                confidenceThreshold: parseFloat(e.target.value),
              }))
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <p className="text-[11px] text-slate-500">
            Higher values filter out uncertain predictions; lower values capture small objects.
          </p>
        </div>

        {/* IoU Match Threshold */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 font-medium">SORT IoU Match Threshold</span>
            <span className="font-mono text-teal-700 font-bold">
              {trackerConfig.iouThreshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.75"
            step="0.05"
            value={trackerConfig.iouThreshold}
            onChange={(e) =>
              setTrackerConfig((prev) => ({
                ...prev,
                iouThreshold: parseFloat(e.target.value),
              }))
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <p className="text-[11px] text-slate-500">
            Intersection-over-Union threshold for pairing frame predictions with Kalman tracks.
          </p>
        </div>

        {/* Max Age Frames */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 font-medium">Track Persistence Memory (Max Age)</span>
            <span className="font-mono text-amber-600 font-bold">
              {trackerConfig.maxAge} frames
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={trackerConfig.maxAge}
            onChange={(e) =>
              setTrackerConfig((prev) => ({
                ...prev,
                maxAge: parseInt(e.target.value, 10),
              }))
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <p className="text-[11px] text-slate-500">
            Number of unobserved frames before deleting a lost track ID.
          </p>
        </div>
      </div>

      {/* 2. Visual Style & Overlays */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Canvas Style & Overlays
        </h3>

        {/* Bounding Box Style */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-700 font-medium">Bounding Box Style</label>
          <div className="grid grid-cols-3 gap-2">
            {(['corner', 'solid', 'neon'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setDisplayOptions((prev) => ({ ...prev, boxStyle: style }))}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize border transition ${
                  displayOptions.boxStyle === style
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={displayOptions.showTrajectories}
              onChange={(e) =>
                setDisplayOptions((prev) => ({ ...prev, showTrajectories: e.target.checked }))
              }
              className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0"
            />
            <span className="text-slate-700">Trajectory Tails</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={displayOptions.showVelocity}
              onChange={(e) =>
                setDisplayOptions((prev) => ({ ...prev, showVelocity: e.target.checked }))
              }
              className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0"
            />
            <span className="text-slate-700">Motion Vectors</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={displayOptions.showIds}
              onChange={(e) =>
                setDisplayOptions((prev) => ({ ...prev, showIds: e.target.checked }))
              }
              className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0"
            />
            <span className="text-slate-700">Track IDs</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={displayOptions.blurObjects}
              onChange={(e) =>
                setDisplayOptions((prev) => ({ ...prev, blurObjects: e.target.checked }))
              }
              className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0"
            />
            <span className="text-slate-700">Privacy Blur</span>
          </label>
        </div>
      </div>

      {/* 3. Class Filter Checklist */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Detected Object Classes
          </h3>
          <div className="flex gap-2 text-[11px]">
            <button
              onClick={selectAllClasses}
              className="text-emerald-600 hover:underline font-medium"
            >
              All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={clearAllClasses}
              className="text-slate-500 hover:underline font-medium"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {COMMON_CLASSES.map((cls) => {
            const isChecked = classFilter.size === 0 || classFilter.has(cls);
            return (
              <button
                key={cls}
                onClick={() => toggleClass(cls)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize text-left transition ${
                  isChecked
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-700'
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{cls}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
