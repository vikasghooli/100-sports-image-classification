import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { btnGhost } from "./ui";

export const MAX_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 10;

export function validateImage(f: File): string | null {
  if (!["image/jpeg", "image/png"].includes(f.type)) return "Only JPG, JPEG and PNG images are supported.";
  if (f.size > MAX_MB * 1024 * 1024) return `Image is too large (max ${MAX_MB} MB).`;
  return null;
}

interface Props {
  onFiles: (files: File[]) => void;
  onError: (m: string) => void;
  onCameraCapture?: (file: File) => void;
  multiple?: boolean;
  camera?: boolean;
}

export default function ImagePicker({ onFiles, onError, onCameraCapture, multiple = false, camera = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [cam, setCam] = useState(false);

  const handle = (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return onError("Please upload an image.");
    const good: File[] = [];
    for (const f of files) {
      const err = validateImage(f);
      if (err) onError(err); else good.push(f);
    }
    if (good.length) onFiles(multiple ? good : good.slice(0, 1));
  };

  if (cam) return <CameraCapture onClose={() => setCam(false)} onCapture={(f) => {
    setCam(false);
    const error = validateImage(f);
    if (error) onError(error);
    else if (onCameraCapture) onCameraCapture(f);
    else handle([f]);
  }} />;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center ${drag ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`}
    >
      <ImagePlus size={40} className="text-slate-400" />
      <p className="text-slate-600">Drag & drop {multiple ? "images" : "an image"} here</p>
      <p className="text-xs text-slate-400">JPG, JPEG or PNG, up to {MAX_MB} MB</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button className={btnGhost} onClick={() => input.current?.click()}>Browse files</button>
        {camera && <button className={btnGhost} onClick={() => setCam(true)}><Camera size={16} /> Use Camera</button>}
      </div>
      <input ref={input} type="file" hidden multiple={multiple} accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={(e) => { if (e.target.files) handle(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
