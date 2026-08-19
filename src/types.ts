export type SourceType = 'webcam' | 'file' | 'sample';

export interface BoundingBox {
  x: number; // top-left x in pixels
  y: number; // top-left y in pixels
  width: number;
  height: number;
}

export interface Detection {
  id?: string;
  bbox: BoundingBox; // [x, y, width, height]
  class: string;
  score: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface TrackedObject {
  trackId: number;
  class: string;
  bbox: BoundingBox; // current smoothed bounding box
  score: number;
  color: string;
  history: TrackPoint[]; // centroid movement trajectory
  hits: number;
  age: number;
  timeSinceUpdate: number;
  velocity: { vx: number; vy: number };
  firstSeen: number;
  lastSeen: number;
}

export interface TrackerConfig {
  confidenceThreshold: number; // 0.15 - 0.95
  iouThreshold: number; // 0.1 - 0.8 (SORT matching threshold)
  maxAge: number; // frames to keep track without detection (e.g. 15)
  minHits: number; // minimum detections before displaying track ID (e.g. 2)
  maxTrajectoryLength: number; // number of history points (e.g. 20)
  targetFps: number; // 15, 30, 60
  modelResolution: 'lite' | 'full'; // COCO-SSD backbone
}

export interface DisplayOptions {
  showBoxes: boolean;
  showLabels: boolean;
  showScores: boolean;
  showTrajectories: boolean;
  showVelocity: boolean;
  showIds: boolean;
  boxStyle: 'corner' | 'solid' | 'neon';
  blurObjects: boolean;
}

export interface TrackingStats {
  fps: number;
  detectionTimeMs: number;
  trackingTimeMs: number;
  totalTrackedCount: number;
  activeCount: number;
  classCounts: Record<string, number>;
  totalFramesProcessed: number;
}

export interface DetectionLogRecord {
  frame: number;
  timestamp: string;
  trackId: number;
  className: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SampleVideoItem {
  id: string;
  name: string;
  description: string;
  type: 'traffic' | 'pedestrians' | 'sports' | 'shapes';
  thumbnailUrl?: string;
}
