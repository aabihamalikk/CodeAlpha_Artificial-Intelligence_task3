import cv2
from ultralytics import YOLO

def main():
    print("[INFO] Loading YOLOv8 Object Detection & Tracking Model...")
    # Auto-downloads COCO weights on first run
    model = YOLO("yolov8n.pt")

    print("[INFO] Starting live tracking... Press 'q' on the video window to exit.")
    model.track(source=0, show=True, conf=0.35, tracker="bytetrack.yaml")

if __name__ == "__main__":
    main()