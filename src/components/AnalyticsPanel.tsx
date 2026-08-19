import React from 'react';
import { Activity, Cpu, Layers, Target, Clock, Zap, Hash } from 'lucide-react';
import { TrackedObject } from '../types';

interface AnalyticsPanelProps {
  trackedObjects: TrackedObject[];
  fps: number;
  processTimeMs: number;
  totalUniqueTracked: number;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  trackedObjects,
  fps,
  processTimeMs,
  totalUniqueTracked,
}) => {
  // Compute class counts
  const classCounts: Record<string, number> = {};
  for (const obj of trackedObjects) {
    classCounts[obj.class] = (classCounts[obj.class] || 0) + 1;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 text-slate-900 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <h2 className="font-bold text-base text-slate-900">Live Analytics & Telemetry</h2>
        </div>
        <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          REAL-TIME
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            <span>Processing FPS</span>
          </div>
          <p className="text-xl font-bold font-mono text-teal-700">{fps}</p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Latency / Frame</span>
          </div>
          <p className="text-xl font-bold font-mono text-amber-700">
            {processTimeMs.toFixed(1)} <span className="text-xs text-slate-400">ms</span>
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Tracks</span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-700">{trackedObjects.length}</p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Hash className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Unique IDs</span>
          </div>
          <p className="text-xl font-bold font-mono text-indigo-700">{totalUniqueTracked}</p>
        </div>
      </div>

      {/* Class Distribution Breakdown */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Class Distribution
        </h3>
        {Object.keys(classCounts).length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">No active objects detected in view.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(classCounts).map(([cls, count]) => (
              <div
                key={cls}
                className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <span className="capitalize text-slate-700 font-medium">{cls}</span>
                <span className="px-1.5 py-0.2 font-mono font-bold text-emerald-700 bg-emerald-100/70 rounded-md">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Tracked Objects Table */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Active Track ID Stream
        </h3>

        {trackedObjects.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-slate-400 border border-slate-200/80">
            Scanning video stream for targets...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-mono text-[11px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Track ID</th>
                  <th className="p-2.5">Class</th>
                  <th className="p-2.5">Conf</th>
                  <th className="p-2.5">BBox [x, y, w, h]</th>
                  <th className="p-2.5">Velocity (px/f)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {trackedObjects.map((obj) => (
                  <tr key={obj.trackId} className="hover:bg-slate-50 transition">
                    <td className="p-2.5 font-mono font-bold flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: obj.color }}
                      />
                      <span style={{ color: obj.color }}>#{obj.trackId}</span>
                    </td>
                    <td className="p-2.5 capitalize text-slate-800 font-medium">{obj.class}</td>
                    <td className="p-2.5 font-mono text-emerald-700 font-semibold">
                      {Math.round(obj.score * 100)}%
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                      [{obj.bbox.x}, {obj.bbox.y}, {obj.bbox.width}, {obj.bbox.height}]
                    </td>
                    <td className="p-2.5 font-mono text-teal-700 text-[11px]">
                      dx: {obj.velocity.vx.toFixed(1)}, dy: {obj.velocity.vy.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
