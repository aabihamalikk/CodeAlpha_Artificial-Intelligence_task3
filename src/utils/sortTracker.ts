import { BoundingBox, Detection, TrackedObject, TrackerConfig } from '../types';
import { BBoxKalmanFilter } from './kalmanFilter';

// Distinct vivid neon color palette for tracking IDs
const TRACK_COLORS = [
  '#00FF66', // Neon Green
  '#00E5FF', // Cyan / Cyber Blue
  '#FF3366', // Neon Pink / Rose
  '#FFD700', // Electric Gold
  '#A855F7', // Bright Purple
  '#FF9900', // Vivid Orange
  '#00FFCC', // Mint
  '#FF55FF', // Fuchsia
  '#3399FF', // Sky Blue
  '#CCFF00', // Lime
];

/**
 * Calculates Intersection over Union (IoU) between two bounding boxes
 */
export function calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersectionArea === 0) return 0;

  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;

  const unionArea = area1 + area2 - intersectionArea;
  if (unionArea <= 0) return 0;

  return intersectionArea / unionArea;
}

class TrackInstance {
  trackId: number;
  class: string;
  score: number;
  kalman: BBoxKalmanFilter;
  history: { x: number; y: number; timestamp: number }[] = [];
  hits: number = 1;
  age: number = 0;
  timeSinceUpdate: number = 0;
  color: string;
  firstSeen: number;
  lastSeen: number;

  constructor(detection: Detection, id: number) {
    this.trackId = id;
    this.class = detection.class;
    this.score = detection.score;
    this.kalman = new BBoxKalmanFilter(detection.bbox);
    this.color = TRACK_COLORS[(id - 1) % TRACK_COLORS.length];
    
    const now = Date.now();
    this.firstSeen = now;
    this.lastSeen = now;

    const cx = Math.round(detection.bbox.x + detection.bbox.width / 2);
    const cy = Math.round(detection.bbox.y + detection.bbox.height / 2);
    this.history.push({ x: cx, y: cy, timestamp: now });
  }

  predict(): BoundingBox {
    this.age++;
    this.timeSinceUpdate++;
    return this.kalman.predict();
  }

  update(detection: Detection, maxTrajectory: number) {
    this.hits++;
    this.timeSinceUpdate = 0;
    this.score = detection.score;
    this.class = detection.class;
    this.lastSeen = Date.now();

    this.kalman.update(detection.bbox);
    const currentBBox = this.kalman.getStateBBox();

    const cx = Math.round(currentBBox.x + currentBBox.width / 2);
    const cy = Math.round(currentBBox.y + currentBBox.height / 2);

    this.history.push({ x: cx, y: cy, timestamp: this.lastSeen });
    if (this.history.length > maxTrajectory) {
      this.history.shift();
    }
  }

  toTrackedObject(): TrackedObject {
    const bbox = this.kalman.getStateBBox();
    const velocity = this.kalman.getVelocity();

    return {
      trackId: this.trackId,
      class: this.class,
      bbox,
      score: this.score,
      color: this.color,
      history: [...this.history],
      hits: this.hits,
      age: this.age,
      timeSinceUpdate: this.timeSinceUpdate,
      velocity,
      firstSeen: this.firstSeen,
      lastSeen: this.lastSeen,
    };
  }
}

/**
 * SORT Multi-Object Tracker implementation
 */
export class SortTracker {
  private tracks: TrackInstance[] = [];
  private nextTrackId: number = 1;
  private totalTrackedCount: number = 0;

  constructor() {}

  reset() {
    this.tracks = [];
    this.nextTrackId = 1;
    this.totalTrackedCount = 0;
  }

  /**
   * Main tracking update step:
   * 1. Predict new positions for existing tracks
   * 2. Calculate IoU cost matrix between predicted tracks & new detections
   * 3. Match detections to tracks using greedy IoU assignment
   * 4. Create new tracks for unmatched detections
   * 5. Remove lost tracks exceeding maxAge
   */
  update(detections: Detection[], config: TrackerConfig): TrackedObject[] {
    // Step 1: Predict positions for existing tracks
    const predictedBoxes = this.tracks.map((t) => t.predict());

    // Step 2: Compute IoU matrix (tracks x detections)
    const iouMatrix: number[][] = [];
    for (let i = 0; i < this.tracks.length; i++) {
      iouMatrix[i] = [];
      for (let j = 0; j < detections.length; j++) {
        // Optional class check (can track across frames even if class flickers slightly)
        const trackClass = this.tracks[i].class;
        const detClass = detections[j].class;
        const sameClass = trackClass === detClass;

        const iou = calculateIoU(predictedBoxes[i], detections[j].bbox);
        // Boost IoU score if class matches
        iouMatrix[i][j] = sameClass ? iou * 1.15 : iou;
      }
    }

    // Step 3: Greedy IoU Matching
    const matchedTrackIndices = new Set<number>();
    const matchedDetIndices = new Set<number>();
    const matches: [number, number][] = [];

    // Flatten candidates into list of { trackIdx, detIdx, iou }
    const candidates: { tIdx: number; dIdx: number; iou: number }[] = [];
    for (let i = 0; i < this.tracks.length; i++) {
      for (let j = 0; j < detections.length; j++) {
        if (iouMatrix[i][j] >= config.iouThreshold) {
          candidates.push({ tIdx: i, dIdx: j, iou: iouMatrix[i][j] });
        }
      }
    }

    // Sort candidates descending by IoU
    candidates.sort((a, b) => b.iou - a.iou);

    for (const cand of candidates) {
      if (!matchedTrackIndices.has(cand.tIdx) && !matchedDetIndices.has(cand.dIdx)) {
        matchedTrackIndices.add(cand.tIdx);
        matchedDetIndices.add(cand.dIdx);
        matches.push([cand.tIdx, cand.dIdx]);
      }
    }

    // Step 4: Update matched tracks
    for (const [tIdx, dIdx] of matches) {
      this.tracks[tIdx].update(detections[dIdx], config.maxTrajectoryLength);
    }

    // Step 5: Create new tracks for unmatched detections
    for (let j = 0; j < detections.length; j++) {
      if (!matchedDetIndices.has(j)) {
        const newTrack = new TrackInstance(detections[j], this.nextTrackId);
        this.tracks.push(newTrack);
        this.nextTrackId++;
        this.totalTrackedCount++;
      }
    }

    // Step 6: Filter out dead tracks (unmatched for > maxAge frames)
    this.tracks = this.tracks.filter((t) => t.timeSinceUpdate <= config.maxAge);

    // Step 7: Return active tracks meeting minHits constraint
    return this.tracks
      .filter((t) => t.timeSinceUpdate === 0 || t.hits >= config.minHits)
      .map((t) => t.toTrackedObject());
  }

  getTotalTrackedCount(): number {
    return this.totalTrackedCount;
  }
}
