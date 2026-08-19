import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileJson, Image, Check, Sparkles } from 'lucide-react';
import { TrackedObject, DetectionLogRecord } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logRecords: DetectionLogRecord[];
  snapshotUrl: string | null;
  activeTracks: TrackedObject[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  logRecords,
  snapshotUrl,
  activeTracks,
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportCSV = () => {
    let csv = 'Frame,Timestamp,TrackID,Class,Confidence,BBoxX,BBoxY,BBoxW,BBoxH\n';

    const recordsToExport = logRecords.length > 0 ? logRecords : activeTracks.map((t, i) => ({
      frame: i + 1,
      timestamp: new Date(t.lastSeen).toISOString(),
      trackId: t.trackId,
      className: t.class,
      confidence: t.score,
      x: t.bbox.x,
      y: t.bbox.y,
      width: t.bbox.width,
      height: t.bbox.height,
    }));

    for (const r of recordsToExport) {
      csv += `${r.frame},"${r.timestamp}",${r.trackId},"${r.className}",${r.confidence.toFixed(3)},${r.x},${r.y},${r.width},${r.height}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `object_tracking_telemetry_${Date.now()}.csv`;
    link.click();

    setDownloadedFormat('CSV');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const exportJSON = () => {
    const dataToExport = logRecords.length > 0 ? logRecords : activeTracks.map((t, i) => ({
      frame: i + 1,
      timestamp: new Date(t.lastSeen).toISOString(),
      trackId: t.trackId,
      className: t.class,
      confidence: t.score,
      bbox: t.bbox,
      velocity: t.velocity,
      trajectoryLength: t.history.length,
    }));

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `object_tracking_telemetry_${Date.now()}.json`;
    link.click();

    setDownloadedFormat('JSON');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const downloadSnapshot = () => {
    if (!snapshotUrl) return;
    const link = document.createElement('a');
    link.href = snapshotUrl;
    link.download = `object_tracking_snapshot_${Date.now()}.png`;
    link.click();

    setDownloadedFormat('PNG Snapshot');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl text-slate-900 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Export Tracking Data & Telemetry</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm">
          {downloadedFormat && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Successfully exported {downloadedFormat} file!</span>
            </div>
          )}

          {/* Export Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={exportCSV}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition flex items-start gap-3 text-left group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Export CSV Telemetry</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Frame timestamps, Track IDs, object classes, and bounding box coordinates.
                </p>
              </div>
            </button>

            <button
              onClick={exportJSON}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition flex items-start gap-3 text-left group"
            >
              <div className="p-2.5 rounded-xl bg-teal-100 text-teal-700 border border-teal-200 group-hover:scale-105 transition">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Export JSON Log</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Structured JSON payload containing velocity vectors and track trajectories.
                </p>
              </div>
            </button>
          </div>

          {/* Snapshot Preview if available */}
          {snapshotUrl && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Current Frame Snapshot
              </h4>
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
                <img
                  src={snapshotUrl}
                  alt="Tracked Frame Snapshot"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={downloadSnapshot}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 hover:bg-emerald-700 transition"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>Download Snapshot PNG</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
