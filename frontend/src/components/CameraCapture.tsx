import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { btnGhost, btnPrimary, ErrorBox } from "./ui";

export default function CameraCapture({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser. Please upload an image instead.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => { stream.current = s; if (video.current) video.current.srcObject = s; })
      .catch(() => setError("Camera access was denied or unavailable. You can still upload an image."));
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (b) onCapture(new File([b], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      {error ? <ErrorBox message={error} /> : <video ref={video} autoPlay playsInline muted className="w-full rounded-lg bg-black" />}
      <div className="flex gap-2">
        {!error && <button className={btnPrimary} onClick={capture}><Camera size={16} /> Capture</button>}
        <button className={btnGhost} onClick={onClose}><X size={16} /> Close camera</button>
      </div>
    </div>
  );
}
