"""
REAL-TIME OBJECT DETECTION AND TRACKING USING YOLOv8 AND SORT
Run with: python main_yolo_sort.py --source 0 (Webcam) or --source video.mp4
"""
import argparse
import cv2
import numpy as np
from ultralytics import YOLO
# SORT tracker relies on filterpy for Kalman Filtering and lap/scipy for Hungarian Algorithm
from sort import Sort

def main():
    parser = argparse.ArgumentParser(description="YOLOv8 + SORT Object Detection & Tracking")
    parser.add_argument("--source", type=str, default="0", help="Webcam ID ('0') or path to video file")
    parser.add_argument("--conf", type=float, default=0.35, help="Detection confidence threshold")
    parser.add_argument("--iou", type=float, default=0.3, help="SORT IoU tracking match threshold")
    args = parser.parse_args()

    # 1. Load Pre-trained YOLOv8 Object Detection Model (nano / small / medium)
    print("[INFO] Loading YOLOv8 Model...")
    model = YOLO("yolov8n.pt") # Auto-downloads COCO weights

    # 2. Initialize SORT Multi-Object Tracker (max_age=30 frames, min_hits=3, iou_threshold=0.3)
    tracker = Sort(max_age=30, min_hits=3, iou_threshold=args.iou)

    # 3. Setup Video Stream (OpenCV)
    source = 0 if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video source: {args.source}")
        return

    print("[INFO] Press 'q' to exit real-time tracking stream.")

    colors = np.random.randint(0, 255, size=(1000, 3), dtype=uint8)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # 4. Perform Object Detection on frame using YOLO
        results = model(frame, stream=True, conf=args.conf)

        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Bounding box coordinates [x1, y1, x2, y2]
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                cls = int(box.cls[0].cpu().numpy())
                
                # Format detection: [x1, y1, x2, y2, score]
                detections.append([x1, y1, x2, y2, conf])

        detections = np.array(detections) if len(detections) > 0 else np.empty((0, 5))

        # 5. Apply SORT Tracking Engine (Kalman Prediction + Hungarian Matching)
        tracked_objects = tracker.update(detections)

        # 6. Draw Bounding Boxes and Tracking IDs on Video Frame
        for obj in tracked_objects:
            x1, y1, x2, y2, track_id = map(int, obj)
            color = [int(c) for c in colors[track_id % len(colors)]]

            # Bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Label tag with Track ID
            label = f"ID #{track_id}"
            cv2.putText(frame, label, (x1, max(y1 - 10, 15)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # 7. Display Stream Output
        cv2.imshow("YOLOv8 + SORT Object Detection & Tracking", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
