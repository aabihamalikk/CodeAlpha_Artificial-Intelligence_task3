import { SampleVideoItem } from '../types';

export const SAMPLE_VIDEOS: SampleVideoItem[] = [
  {
    id: 'traffic',
    name: 'City Street Traffic',
    description: 'Simulated urban road with multiple moving cars, buses, and bicycles across lanes.',
    type: 'traffic',
  },
  {
    id: 'pedestrians',
    name: 'Pedestrian Walkway',
    description: 'Busy sidewalk with multiple walking people, strollers, and shoppers crossing paths.',
    type: 'pedestrians',
  },
  {
    id: 'sports',
    name: 'Sports Field Tracking',
    description: 'High-speed movement tracking of sports players, ball, and referee on field.',
    type: 'sports',
  },
  {
    id: 'shapes',
    name: 'Geometric Benchmark Suite',
    description: 'Controlled speed, rotation, and occlusion test suite for tracking stability evaluation.',
    type: 'shapes',
  },
];

/**
 * Draws animated dynamic simulation frames on a hidden/offscreen canvas
 * when user selects a Sample Video source.
 */
export class SampleVideoSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 960;
  private height: number = 540;
  private animationFrameId: number | null = null;
  private type: 'traffic' | 'pedestrians' | 'sports' | 'shapes' = 'traffic';
  private frameCount: number = 0;

  // Animated objects inside simulator
  private objects: {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    w: number;
    h: number;
    class: string;
    color: string;
    label: string;
  }[] = [];

  constructor(type: 'traffic' | 'pedestrians' | 'sports' | 'shapes' = 'traffic') {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.type = type;
    this.initObjects();
  }

  setType(type: 'traffic' | 'pedestrians' | 'sports' | 'shapes') {
    this.type = type;
    this.frameCount = 0;
    this.initObjects();
  }

  private initObjects() {
    this.objects = [];
    if (this.type === 'traffic') {
      // 5 cars / buses on a road
      this.objects = [
        { id: 101, x: 50, y: 320, vx: 3.5, vy: 0, w: 90, h: 45, class: 'car', color: '#38bdf8', label: 'Sedan' },
        { id: 102, x: 250, y: 380, vx: 4.2, vy: 0, w: 100, h: 50, class: 'car', color: '#f43f5e', label: 'SUV' },
        { id: 103, x: 800, y: 220, vx: -2.8, vy: 0, w: 140, h: 60, class: 'bus', color: '#eab308', label: 'Transit Bus' },
        { id: 104, x: 600, y: 160, vx: -3.8, vy: 0, w: 85, h: 40, class: 'car', color: '#a855f7', label: 'Coupe' },
        { id: 105, x: 100, y: 440, vx: 2.2, vy: 0, w: 40, h: 25, class: 'bicycle', color: '#10b981', label: 'Cyclist' },
      ];
    } else if (this.type === 'pedestrians') {
      // Pedestrians walking in various directions
      this.objects = [
        { id: 201, x: 100, y: 150, vx: 1.8, vy: 0.8, w: 32, h: 80, class: 'person', color: '#ec4899', label: 'Walker A' },
        { id: 202, x: 800, y: 200, vx: -1.5, vy: 0.5, w: 30, h: 75, class: 'person', color: '#3b82f6', label: 'Walker B' },
        { id: 203, x: 450, y: 100, vx: 0.2, vy: 2.1, w: 35, h: 85, class: 'person', color: '#84cc16', label: 'Walker C' },
        { id: 204, x: 300, y: 420, vx: 2.2, vy: -0.6, w: 28, h: 70, class: 'person', color: '#f97316', label: 'Walker D' },
        { id: 205, x: 650, y: 380, vx: -1.2, vy: -1.2, w: 34, h: 82, class: 'person', color: '#06b6d4', label: 'Walker E' },
      ];
    } else if (this.type === 'sports') {
      // Sports field players & ball
      this.objects = [
        { id: 301, x: 200, y: 200, vx: 2.5, vy: 1.5, w: 35, h: 80, class: 'person', color: '#ef4444', label: 'Player #10' },
        { id: 302, x: 500, y: 300, vx: -2.0, vy: -1.8, w: 35, h: 80, class: 'person', color: '#3b82f6', label: 'Player #7' },
        { id: 303, x: 350, y: 250, vx: 3.2, vy: -1.0, w: 35, h: 80, class: 'person', color: '#ef4444', label: 'Player #9' },
        { id: 304, x: 400, y: 240, vx: 4.5, vy: -1.2, w: 22, h: 22, class: 'sports ball', color: '#facc15', label: 'Ball' },
      ];
    } else {
      // Geometric test shapes
      this.objects = [
        { id: 401, x: 100, y: 150, vx: 3.0, vy: 1.2, w: 70, h: 70, class: 'box', color: '#6366f1', label: 'Target Alpha' },
        { id: 402, x: 750, y: 350, vx: -2.5, vy: -1.5, w: 90, h: 60, class: 'box', color: '#14b8a6', label: 'Target Beta' },
        { id: 403, x: 400, y: 400, vx: -1.0, vy: -2.8, w: 60, h: 90, class: 'box', color: '#f43f5e', label: 'Target Gamma' },
      ];
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  renderFrame(): HTMLCanvasElement {
    this.frameCount++;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Draw dark futuristic background simulation ground
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    if (this.type === 'traffic') {
      // Draw road lanes
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 120, w, 360);

      // Lane dividers
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(0, 240); ctx.lineTo(w, 240);
      ctx.moveTo(0, 360); ctx.lineTo(w, 360);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (this.type === 'sports') {
      // Draw green pitch field
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, w, h);

      // Pitch lines
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 80, 0, Math.PI * 2);
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.stroke();
    } else if (this.type === 'pedestrians') {
      // Sidewalk paving pattern
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    // Update object positions
    for (const obj of this.objects) {
      obj.x += obj.vx;
      obj.y += obj.vy;

      // Bounce off boundaries
      if (obj.x <= 20 || obj.x + obj.w >= w - 20) {
        obj.vx *= -1;
        obj.x = Math.max(20, Math.min(w - 20 - obj.w, obj.x));
      }
      if (obj.y <= 20 || obj.y + obj.h >= h - 20) {
        obj.vy *= -1;
        obj.y = Math.max(20, Math.min(h - 20 - obj.h, obj.y));
      }

      // Render realistic simulated visual element
      ctx.save();
      ctx.shadowColor = obj.color;
      ctx.shadowBlur = 12;

      ctx.fillStyle = obj.color;
      if (obj.class === 'person') {
        // Draw person silhouette
        ctx.beginPath();
        ctx.arc(obj.x + obj.w / 2, obj.y + 15, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(obj.x + 4, obj.y + 28, obj.w - 8, obj.h - 28);
      } else if (obj.class === 'car' || obj.class === 'bus') {
        // Draw vehicle body with headlights
        ctx.beginPath();
        ctx.roundRect(obj.x, obj.y, obj.w, obj.h, 8);
        ctx.fill();
        // Headlights
        ctx.fillStyle = '#ffffff';
        if (obj.vx > 0) {
          ctx.fillRect(obj.x + obj.w - 6, obj.y + 6, 6, 8);
          ctx.fillRect(obj.x + obj.w - 6, obj.y + obj.h - 14, 6, 8);
        } else {
          ctx.fillRect(obj.x, obj.y + 6, 6, 8);
          ctx.fillRect(obj.x, obj.y + obj.h - 14, 6, 8);
        }
      } else if (obj.class === 'sports ball') {
        ctx.beginPath();
        ctx.arc(obj.x + obj.w / 2, obj.y + obj.h / 2, obj.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      }

      ctx.restore();
    }

    return this.canvas;
  }

  getSimulatedDetections() {
    return this.objects.map((obj) => ({
      bbox: {
        x: obj.x,
        y: obj.y,
        width: obj.w,
        height: obj.h,
      },
      class: obj.class,
      score: Math.min(0.99, Math.max(0.75, 0.88 + Math.sin(this.frameCount * 0.05 + obj.id) * 0.08)),
    }));
  }
}
