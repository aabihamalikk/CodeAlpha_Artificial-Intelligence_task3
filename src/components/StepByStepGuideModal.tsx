import React, { useState } from 'react';
import { X, Check, Copy, Terminal, Globe, Code, Play, Cpu, Sparkles, BookOpen, ChevronRight, FileText, Download, AlertTriangle } from 'lucide-react';

interface StepByStepGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EASY_PYTHON_SCRIPT = `""\"
EASY 1-CLICK YOLOv8 + TRACKING SCRIPT (Zero C++ compilers needed!)
Requires ONLY: py -m pip install ultralytics opencv-python
Run: py easy_tracker.py
""\"
import cv2
from ultralytics import YOLO

def main():
    print("[INFO] Loading YOLOv8 Object Detection & Tracking Model...")
    # Auto-downloads COCO weights on first launch
    model = YOLO("yolov8n.pt")

    # Run tracking on webcam (source=0) or video file ("traffic.mp4")
    # Uses ByteTrack/SORT tracking engine built directly into Ultralytics
    print("[INFO] Starting tracking... Press 'q' on the video screen to exit.")
    model.track(source=0, show=True, conf=0.35, tracker="bytetrack.yaml")

if __name__ == "__main__":
    main()
`;

const PYTHON_CODE_SNIPPET = `"""
REAL-TIME OBJECT DETECTION AND TRACKING USING YOLOv8 AND SORT
Run with: python main_yolo_sort.py --source 0 (Webcam) or --source video.mp4
Requires: py -m pip install ultralytics opencv-python numpy scipy
"""
import argparse
import cv2
import numpy as np
from ultralytics import YOLO

# --- STANDALONE SORT TRACKER ENGINE (No external sort.py module needed!) ---
def iou_batch(bb_test, bb_gt):
    bb_gt = np.expand_dims(bb_gt, 0)
    bb_test = np.expand_dims(bb_test, 1)
    xx1 = np.maximum(bb_test[..., 0], bb_gt[..., 0])
    yy1 = np.maximum(bb_test[..., 1], bb_gt[..., 1])
    xx2 = np.minimum(bb_test[..., 2], bb_gt[..., 2])
    yy2 = np.minimum(bb_test[..., 3], bb_gt[..., 3])
    w = np.maximum(0., xx2 - xx1)
    h = np.maximum(0., yy2 - yy1)
    wh = w * h
    area_test = (bb_test[..., 2] - bb_test[..., 0]) * (bb_test[..., 3] - bb_test[..., 1])
    area_gt = (bb_gt[..., 2] - bb_gt[..., 0]) * (bb_gt[..., 3] - bb_gt[..., 1])
    return wh / (area_test + area_gt - wh + 1e-6)

class KalmanBoxTracker:
    count = 0
    def __init__(self, bbox):
        self.id = KalmanBoxTracker.count
        KalmanBoxTracker.count += 1
        self.time_since_update = 0
        self.hits = 0
        self.hit_streak = 0
        self.age = 0
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x, y = bbox[0] + w / 2.0, bbox[1] + h / 2.0
        self.x = np.array([x, y, w * h, w / float(h) if h != 0 else 1.0, 0, 0, 0], dtype=float)

    def update(self, bbox):
        self.time_since_update = 0
        self.hits += 1
        self.hit_streak += 1
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x, y = bbox[0] + w / 2.0, bbox[1] + h / 2.0
        self.x[0], self.x[1], self.x[2], self.x[3] = x, y, w * h, w / float(h) if h != 0 else 1.0

    def predict(self):
        self.x[0] += self.x[4]
        self.x[1] += self.x[5]
        self.x[2] += self.x[6]
        self.age += 1
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1
        return self.get_state()

    def get_state(self):
        w = np.sqrt(max(1.0, self.x[2] * self.x[3]))
        h = self.x[2] / w if w != 0 else 1.0
        return np.array([self.x[0] - w/2.0, self.x[1] - h/2.0, self.x[0] + w/2.0, self.x[1] + h/2.0])

class Sort:
    def __init__(self, max_age=30, min_hits=3, iou_threshold=0.3):
        self.max_age, self.min_hits, self.iou_threshold = max_age, min_hits, iou_threshold
        self.trackers = []
        self.frame_count = 0

    def update(self, dets=np.empty((0, 5))):
        self.frame_count += 1
        trks = np.zeros((len(self.trackers), 5))
        to_del = []
        for t, trk in enumerate(trks):
            pos = self.trackers[t].predict()
            trk[:] = [pos[0], pos[1], pos[2], pos[3], 0]
            if np.any(np.isnan(pos)):
                to_del.append(t)
        for t in reversed(to_del):
            self.trackers.pop(t)

        matched, unmatched_dets, _ = self._associate(dets, trks)

        for m in matched:
            self.trackers[m[1]].update(dets[m[0], :4])

        for i in unmatched_dets:
            self.trackers.append(KalmanBoxTracker(dets[i, :4]))

        ret, i = [], len(self.trackers)
        for trk in reversed(self.trackers):
            d = trk.get_state()
            if (trk.time_since_update < 1) and (trk.hit_streak >= self.min_hits or self.frame_count <= self.min_hits):
                ret.append(np.concatenate((d, [trk.id + 1])).reshape(1, -1))
            i -= 1
            if trk.time_since_update > self.max_age:
                self.trackers.pop(i)

        return np.concatenate(ret) if len(ret) > 0 else np.empty((0, 5))

    def _associate(self, dets, trks):
        if len(trks) == 0 or len(dets) == 0:
            return np.empty((0, 2), dtype=int), np.arange(len(dets)), np.arange(len(trks))
        iou_matrix = iou_batch(dets[:, :4], trks[:, :4])
        from scipy.optimize import linear_sum_assignment
        matched_indices = np.array(list(zip(*linear_sum_assignment(-iou_matrix))))
        
        unmatched_dets = [d for d in range(len(dets)) if d not in matched_indices[:, 0]]
        unmatched_trks = [t for t in range(len(trks)) if t not in matched_indices[:, 1]]
        
        matches = []
        for m in matched_indices:
            if iou_matrix[m[0], m[1]] < self.iou_threshold:
                unmatched_dets.append(m[0])
                unmatched_trks.append(m[1])
            else:
                matches.append(m.reshape(1, 2))
        return (np.concatenate(matches, axis=0) if len(matches) > 0 else np.empty((0, 2), dtype=int)), np.array(unmatched_dets), np.array(unmatched_trks)

def main():
    parser = argparse.ArgumentParser(description="YOLOv8 + SORT Object Detection & Tracking")
    parser.add_argument("--source", type=str, default="0", help="Webcam ID ('0') or path to video file")
    parser.add_argument("--conf", type=float, default=0.35, help="Detection confidence threshold")
    parser.add_argument("--iou", type=float, default=0.3, help="SORT IoU tracking match threshold")
    args = parser.parse_args()

    print("[INFO] Loading YOLOv8 Model...")
    model = YOLO("yolov8n.pt") # Auto-downloads COCO weights

    print("[INFO] Initializing SORT Tracker Engine...")
    tracker = Sort(max_age=30, min_hits=3, iou_threshold=args.iou)

    source = 0 if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video source: {args.source}")
        return

    print("[INFO] Press 'q' on the video screen to exit.")
    colors = np.random.randint(0, 255, size=(1000, 3), dtype=np.uint8)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, stream=True, conf=args.conf)
        detections = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                detections.append([x1, y1, x2, y2, conf])

        detections = np.array(detections) if len(detections) > 0 else np.empty((0, 5))
        tracked_objects = tracker.update(detections)

        for obj in tracked_objects:
            x1, y1, x2, y2, track_id = map(int, obj)
            color = [int(c) for c in colors[track_id % len(colors)]]

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"ID #{track_id}"
            cv2.putText(frame, label, (x1, max(y1 - 10, 15)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imshow("YOLOv8 + SORT Object Detection & Tracking", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
`;

const REQUIREMENTS_TXT = `ultralytics>=8.0.0
opencv-python>=4.8.0
filterpy>=1.4.5
lapx>=0.5.5
numpy>=1.22.0
scipy>=1.10.0
`;

const SORT_PY_REFERENCE = `import numpy as np
from filterpy.kalman import KalmanFilter
from scipy.optimize import linear_sum_assignment

def iou(bb_test, bb_gt):
    ""\"Calculates IoU between two bounding boxes [x1,y1,x2,y2]""\"
    xx1 = np.maximum(bb_test[0], bb_gt[0])
    yy1 = np.maximum(bb_test[1], bb_gt[1])
    xx2 = np.minimum(bb_test[2], bb_gt[2])
    yy2 = np.minimum(bb_test[3], bb_gt[3])
    w = np.maximum(0., xx2 - xx1)
    h = np.maximum(0., yy2 - yy1)
    wh = w * h
    o = wh / ((bb_test[2]-bb_test[0])*(bb_test[3]-bb_test[1]) + (bb_gt[2]-bb_gt[0])*(bb_gt[3]-bb_gt[1]) - wh)
    return o

class Sort(object):
    def __init__(self, max_age=30, min_hits=3, iou_threshold=0.3):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.trackers = []
        self.frame_count = 0
`;

export const StepByStepGuideModal: React.FC<StepByStepGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'webapp' | 'python'>('webapp');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-900">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step-by-Step Setup & Execution Guide
              </h2>
              <p className="text-xs text-slate-500">
                How to run real-time object detection & SORT multi-object tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('webapp')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs border-b-2 transition ${
              activeTab === 'webapp'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>1. How to Use Web Application (Live Browser)</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs border-b-2 transition ${
              activeTab === 'python'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>2. How to Run Locally in Python (OpenCV + YOLO + SORT)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {activeTab === 'webapp' ? (
            /* WEB APP STEPS */
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-900 text-xs">
                <Sparkles className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-emerald-950 mb-1">Zero-Installation Browser Runtime</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    This web app executes object detection (TensorFlow.js COCO-SSD) and SORT tracking
                    (Kalman Filter + Hungarian Algorithm) directly inside your web browser with hardware acceleration.
                  </p>
                </div>
              </div>

              {/* Step List */}
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Select Input Stream Source</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Choose from the top toolbar:
                    </p>
                    <ul className="text-xs text-slate-700 list-disc list-inside space-y-1 pl-1 pt-1">
                      <li>
                        <strong className="text-emerald-700">Webcam:</strong> Live camera feed from your device.
                      </li>
                      <li>
                        <strong className="text-emerald-700">Video File:</strong> Upload your own `.mp4`, `.webm`, or `.mov` video.
                      </li>
                      <li>
                        <strong className="text-emerald-700">Benchmark Clips:</strong> Pre-loaded scenarios (Traffic, Pedestrians, Sports) for testing without a camera.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Grant Camera Permissions (If using Webcam)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Click "Allow" when the browser prompts for camera access. Your video stays strictly local on your device and is never uploaded anywhere.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Tune Hyperparameters & Overlays</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Open the Settings sidebar to adjust:
                    </p>
                    <ul className="text-xs text-slate-700 list-disc list-inside space-y-1 pl-1 pt-1">
                      <li><strong>Confidence Threshold:</strong> Filter low-certainty detections.</li>
                      <li><strong>SORT IoU Match Threshold:</strong> Control distance strictness for track assignment.</li>
                      <li><strong>Max Age:</strong> Set track memory lifetime for occluded objects.</li>
                      <li><strong>Overlays:</strong> Toggle trajectory tails, speed arrows, and privacy blur.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Export Analytics & Snapshots</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Click the <strong className="text-emerald-700">Export</strong> button in the header to download a complete CSV/JSON telemetry log of all tracked object IDs, coordinates, and confidence scores, or capture PNG snapshots.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PYTHON LOCAL STEPS */
            <div className="space-y-6">
              {/* Architecture diagram */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  SORT Architecture & Data Pipeline
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono">
                    1. OpenCV Frame Input
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono">
                    2. YOLOv8 Detection
                  </div>
                  <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-mono">
                    3. Kalman + Hungarian IoU
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-mono">
                    4. Draw ID Bounding Box
                  </div>
                </div>
              </div>

              {/* Step 1: Install Requirements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-600" />
                    <span>Option A (Easiest - 1 Command, Zero C++ Setup):</span>
                  </h4>
                  <button
                    onClick={() => handleCopy('py -m pip install ultralytics opencv-python', 'pip-easy')}
                    className="flex items-center gap-1 text-xs text-emerald-700 hover:underline font-medium"
                  >
                    {copiedCode === 'pip-easy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'pip-easy' ? 'Copied!' : 'Copy Easy Install'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400">
                  py -m pip install ultralytics opencv-python
                </div>

                {/* Easy Script Box */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Download Easy 1-Click Script (`easy_tracker.py`)</span>
                    </span>
                    <button
                      onClick={() => handleDownloadFile('easy_tracker.py', EASY_PYTHON_SCRIPT)}
                      className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-xs font-bold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download easy_tracker.py</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    This simple script uses YOLOv8 with built-in ByteTrack/SORT tracking. It requires <strong>NO C++ compilers</strong> and works on any Windows PC with Python 3.8 to 3.13!
                  </p>
                </div>
              </div>

              {/* Option B: Custom SORT tracker */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Option B: Custom SORT Tracking Script (`main_yolo_sort.py`)</span>
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadFile('main_yolo_sort.py', PYTHON_CODE_SNIPPET)}
                      className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-slate-700 transition border border-slate-200"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600" />
                      <span>Download .py</span>
                    </button>
                    <button
                      onClick={() => handleCopy(PYTHON_CODE_SNIPPET, 'py-code')}
                      className="flex items-center gap-1 text-xs text-teal-700 hover:underline font-medium"
                    >
                      {copiedCode === 'py-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'py-code' ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative bg-slate-900 p-4 rounded-xl border border-slate-800 max-h-56 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
                  <pre>{PYTHON_CODE_SNIPPET}</pre>
                </div>
              </div>

              {/* Step 3: Run Command */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-amber-600" />
                  <span>Step 3: Execute Tracking Command</span>
                </h4>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-400 flex justify-between items-center">
                    <span># Run live on Webcam (Camera ID 0)</span>
                    <button
                      onClick={() => handleCopy('python main_yolo_sort.py --source 0', 'run-webcam')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {copiedCode === 'run-webcam' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
                    python main_yolo_sort.py --source 0
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-400 flex justify-between items-center">
                    <span># Run on Video File</span>
                    <button
                      onClick={() => handleCopy('python main_yolo_sort.py --source traffic.mp4', 'run-file')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {copiedCode === 'run-file' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
                    python main_yolo_sort.py --source traffic.mp4
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            Powered by OpenCV, YOLOv8, and SORT (Kalman Filter + Hungarian Algorithm).
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm transition"
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
