import { BoundingBox } from '../types';

/**
 * Lightweight 2D Kalman Filter for smooth bounding box estimation [x, y, w, h]
 * and velocity [vx, vy, vw, vh].
 */
export class BBoxKalmanFilter {
  // State: [x, y, w, h, vx, vy, vw, vh]
  private state: number[];
  private covariance: number[][];

  constructor(bbox: BoundingBox) {
    this.state = [bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, 0, 0];
    
    // Initialize covariance matrix
    this.covariance = Array(8).fill(0).map((_, i) => 
      Array(8).fill(0).map((_, j) => (i === j ? (i < 4 ? 10 : 1000) : 0))
    );
  }

  /**
   * Predict the next bounding box position based on current velocity state
   */
  predict(): BoundingBox {
    // State transition dt = 1
    const [x, y, w, h, vx, vy, vw, vh] = this.state;

    // Update state with velocity
    this.state[0] = x + vx;
    this.state[1] = y + vy;
    this.state[2] = Math.max(10, w + vw);
    this.state[3] = Math.max(10, h + vh);

    // Mild velocity damping to prevent wild drift during occlusions
    this.state[4] *= 0.92;
    this.state[5] *= 0.92;
    this.state[6] *= 0.92;
    this.state[7] *= 0.92;

    return this.getStateBBox();
  }

  /**
   * Correct/Update state with actual observed detection bbox
   */
  update(measurement: BoundingBox) {
    const alpha = 0.6; // Smoothing factor for position
    const beta = 0.4;  // Smoothing factor for velocity

    const measX = measurement.x;
    const measY = measurement.y;
    const measW = measurement.width;
    const measH = measurement.height;

    const prevX = this.state[0];
    const prevY = this.state[1];
    const prevW = this.state[2];
    const prevH = this.state[3];

    // Compute velocity from difference
    const newVx = measX - prevX;
    const newVy = measY - prevY;
    const newVw = measW - prevW;
    const newVh = measH - prevH;

    // Update position and velocity
    this.state[0] = prevX + alpha * (measX - prevX);
    this.state[1] = prevY + alpha * (measY - prevY);
    this.state[2] = prevW + alpha * (measW - prevW);
    this.state[3] = prevH + alpha * (measH - prevH);

    this.state[4] = this.state[4] * (1 - beta) + newVx * beta;
    this.state[5] = this.state[5] * (1 - beta) + newVy * beta;
    this.state[6] = this.state[6] * (1 - beta) + newVw * beta;
    this.state[7] = this.state[7] * (1 - beta) + newVh * beta;
  }

  getStateBBox(): BoundingBox {
    return {
      x: Math.round(this.state[0]),
      y: Math.round(this.state[1]),
      width: Math.round(Math.max(10, this.state[2])),
      height: Math.round(Math.max(10, this.state[3])),
    };
  }

  getVelocity(): { vx: number; vy: number } {
    return {
      vx: this.state[4],
      vy: this.state[5],
    };
  }
}
