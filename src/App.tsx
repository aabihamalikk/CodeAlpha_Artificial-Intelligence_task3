/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { ControlPanel } from './components/ControlPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { StepByStepGuideModal } from './components/StepByStepGuideModal';
import { ExportModal } from './components/ExportModal';
import {
  SourceType,
  TrackedObject,
  TrackerConfig,
  DisplayOptions,
  DetectionLogRecord,
} from './types';
import { Cpu, HelpCircle, ShieldCheck, Sparkles, Activity, RefreshCw, AlertCircle } from 'lucide-react';

const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  confidenceThreshold: 0.35,
  iouThreshold: 0.3,
  maxAge: 30,
  minHits: 2,
  maxTrajectoryLength: 20,
  targetFps: 30,
  modelResolution: 'lite',
};

const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  showBoxes: true,
  showLabels: true,
  showScores: true,
  showTrajectories: true,
  showVelocity: true,
  showIds: true,
  boxStyle: 'corner',
  blurObjects: false,
};

export default function App() {
  const [sourceType, setSourceType] = useState<SourceType>('sample');
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // Hyperparameters & Controls
  const [trackerConfig, setTrackerConfig] = useState<TrackerConfig>(DEFAULT_TRACKER_CONFIG);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(DEFAULT_DISPLAY_OPTIONS);
  const [classFilter, setClassFilter] = useState<Set<string>>(new Set());

  // Real-time Telemetry State
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [fps, setFps] = useState<number>(0);
  const [processTimeMs, setProcessTimeMs] = useState<number>(0);
  const [totalUniqueTracked, setTotalUniqueTracked] = useState<number>(0);

  // Telemetry Log buffer (up to 500 records)
  const [logRecords, setLogRecords] = useState<DetectionLogRecord[]>([]);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // UI Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Track ID counter observer
  const maxTrackIdSeen = useRef<number>(0);

  // Load TensorFlow.js COCO-SSD Model
  const loadModel = useCallback(async () => {
    try {
      setIsModelLoading(true);
      setModelError(null);
      await tf.ready();
      try {
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl');
        }
      } catch {
        console.warn('WebGL backend not available, falling back to CPU backend.');
        await tf.setBackend('cpu');
      }
      await tf.ready();

      let loadedModel: cocoSsd.ObjectDetection | null = null;
      try {
        loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch (e1) {
        console.warn('Lite MobileNet V2 model fetch failed, trying MobileNet V2:', e1);
        try {
          loadedModel = await cocoSsd.load({ base: 'mobilenet_v2' });
        } catch (e2) {
          console.warn('MobileNet V2 failed, trying MobileNet V1:', e2);
          loadedModel = await cocoSsd.load({ base: 'mobilenet_v1' });
        }
      }

      if (loadedModel) {
        setModel(loadedModel);
        setIsModelLoading(false);
        setModelError(null);
      } else {
        throw new Error('Failed to fetch COCO-SSD model parameters from CDN.');
      }
    } catch (err: any) {
      console.error('Failed to load COCO-SSD model:', err);
      setIsModelLoading(false);
      setModelError('Failed to fetch AI model weights from CDN network. You can click Retry, or continue using benchmark clip simulation!');
    }
  }, []);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Update real-time tracked objects callback
  const handleUpdateTrackedObjects = useCallback(
    (tracks: TrackedObject[], currentFps: number, timeMs: number) => {
      setTrackedObjects(tracks);
      setFps(currentFps);
      setProcessTimeMs(timeMs);

      // Track max unique ID
      for (const t of tracks) {
        if (t.trackId > maxTrackIdSeen.current) {
          maxTrackIdSeen.current = t.trackId;
          setTotalUniqueTracked(maxTrackIdSeen.current);
        }
      }
    },
    []
  );

  // Record Telemetry log buffer
  const handleRecordLog = useCallback((tracks: TrackedObject[]) => {
    if (tracks.length === 0) return;

    setLogRecords((prev) => {
      const nowStr = new Date().toISOString();
      const newEntries: DetectionLogRecord[] = tracks.map((t, idx) => ({
        frame: prev.length + idx + 1,
        timestamp: nowStr,
        trackId: t.trackId,
        className: t.class,
        confidence: t.score,
        x: t.bbox.x,
        y: t.bbox.y,
        width: t.bbox.width,
        height: t.bbox.height,
      }));

      const updated = [...prev, ...newEntries];
      return updated.slice(-500); // Keep last 500 frame records
    });
  }, []);

  const handleTakeSnapshot = (dataUrl: string) => {
    setSnapshotUrl(dataUrl);
    setIsExportOpen(true);
  };

  const resetDefaults = () => {
    setTrackerConfig(DEFAULT_TRACKER_CONFIG);
    setDisplayOptions(DEFAULT_DISPLAY_OPTIONS);
    setClassFilter(new Set());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Top Application Bar */}
      <Header
        sourceType={sourceType}
        setSourceType={setSourceType}
        isModelLoaded={!isModelLoading && !!model}
        activeTrackCount={trackedObjects.length}
        fps={fps}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        showSidebar={showSidebar}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Model Loading State Banner */}
        {isModelLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-emerald-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Initializing COCO-SSD Detector...</h3>
                <p className="text-xs text-slate-500">
                  Downloading lightweight MobileNet backbone weights into browser WebGL GPU memory.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-600 font-semibold animate-pulse">Loading...</span>
          </div>
        )}

        {/* Model Load Error Callout with Retry */}
        {modelError && !isModelLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">CDN Model Download Retry Available</h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {modelError}
                </p>
              </div>
            </div>
            <button
              onClick={loadModel}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0 ml-3 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          </div>
        )}

        {/* Primary Viewport & Control Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Video Viewport Canvas */}
          <div className={`${showSidebar ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6 transition-all`}>
            {/* Real-time Video Canvas Player */}
            <VideoPlayer
              sourceType={sourceType}
              model={model}
              trackerConfig={trackerConfig}
              displayOptions={displayOptions}
              classFilter={classFilter}
              onUpdateTrackedObjects={handleUpdateTrackedObjects}
              onTakeSnapshot={handleTakeSnapshot}
              onRecordLog={handleRecordLog}
            />

            {/* Analytics Dashboard */}
            <AnalyticsPanel
              trackedObjects={trackedObjects}
              fps={fps}
              processTimeMs={processTimeMs}
              totalUniqueTracked={totalUniqueTracked}
            />
          </div>

          {/* Right Column (1 Col): Settings & Hyperparameter Panel */}
          {showSidebar && (
            <div className="space-y-6">
              <ControlPanel
                trackerConfig={trackerConfig}
                setTrackerConfig={setTrackerConfig}
                displayOptions={displayOptions}
                setDisplayOptions={setDisplayOptions}
                classFilter={classFilter}
                setClassFilter={setClassFilter}
                onResetDefaults={resetDefaults}
              />

              {/* Quick Guide Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">How SORT Tracking Works</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Simple Online and Realtime Tracking (SORT)</strong> pairs YOLO frame detections with a Kalman Filter motion model using the Hungarian Algorithm (IoU distance matrix) to maintain persistent track IDs across frames.
                </p>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100/80 transition flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Open Complete Step-by-Step Guide</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Step-by-step Instructions Modal */}
      <StepByStepGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Export Telemetry & Snapshot Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        logRecords={logRecords}
        snapshotUrl={snapshotUrl}
        activeTracks={trackedObjects}
      />
    </div>
  );
}
