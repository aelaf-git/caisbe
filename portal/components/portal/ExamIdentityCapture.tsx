"use client";

import { useEffect, useRef, useState } from "react";
import { apiUpload, ApiError } from "@/lib/auth";
import { resolveUploadUrl } from "@/lib/mediaUrl";

type CaptureKind = "id" | "face";

const COPY: Record<
  CaptureKind,
  { title: string; hint: string; captureLabel: string; facingMode: "environment" | "user" }
> = {
  id: {
    title: "Photo ID",
    hint: "Hold your government-issued photo ID in front of the camera so your name and photo are readable. You can also upload a clear image of the ID.",
    captureLabel: "Capture ID photo",
    facingMode: "environment",
  },
  face: {
    title: "Face photo",
    hint: "Center your face in the frame with good lighting. Remove hats or sunglasses that hide your face.",
    captureLabel: "Capture face photo",
    facingMode: "user",
  },
};

export default function ExamIdentityCapture({
  kind,
  value,
  onCaptured,
  onCleared,
}: {
  kind: CaptureKind;
  value: string | null;
  onCaptured: (url: string) => void;
  onCleared: () => void;
}) {
  const copy = COPY[kind];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setError(null);
      setCameraReady(false);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: copy.facingMode },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setCameraReady(true);
      } catch {
        if (!cancelled) {
          setError(
            kind === "id"
              ? "Camera permission denied. You can still upload a photo of your ID."
              : "Allow camera access to capture your face photo.",
          );
        }
      }
    }

    if (!value) {
      void startCamera();
    }

    return () => {
      cancelled = true;
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, [copy.facingMode, kind, value]);

  async function uploadBlob(blob: Blob, filename: string) {
    setBusy(true);
    setError(null);
    try {
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      const uploaded = await apiUpload("/me/uploads", file, {
        folder: "exams/identity",
        maxBytes: 8 * 1024 * 1024,
      });
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      setCameraReady(false);
      onCaptured(uploaded.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to upload the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function captureFromCamera() {
    const video = videoRef.current;
    if (!video || !cameraReady) {
      setError("Start the camera before capturing.");
      return;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to capture from the camera.");
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((next) => resolve(next), "image/jpeg", 0.9),
    );
    if (!blob) {
      setError("Unable to capture from the camera.");
      return;
    }
    await uploadBlob(blob, `${kind}-capture.jpg`);
  }

  async function onFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    await uploadBlob(file, file.name || `${kind}-upload.jpg`);
    if (fileRef.current) fileRef.current.value = "";
  }

  const previewSrc = value ? resolveUploadUrl(value) : null;

  return (
    <div className="space-y-3 rounded-md border border-ifma-border bg-admin-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-caisbe-text-dark">{copy.title}</p>
          <p className="mt-1 text-xs leading-5 text-caisbe-muted">{copy.hint}</p>
        </div>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            value ? "text-admin-success" : "text-caisbe-muted"
          }`}
        >
          {value ? "Captured" : "Required"}
        </span>
      </div>

      {previewSrc ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={`${copy.title} preview`}
            className="max-h-48 w-full rounded-md border border-ifma-border object-contain bg-admin-canvas"
          />
          <button
            type="button"
            disabled={busy}
            onClick={onCleared}
            className="rounded-md border border-ifma-border bg-admin-canvas px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text-dark hover:border-caisbe-red/40 disabled:opacity-60"
          >
            Retake
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-ifma-border bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-video w-full object-cover ${cameraReady ? "" : "min-h-[160px]"}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !cameraReady}
              onClick={() => void captureFromCamera()}
              className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-3 py-1.5 text-xs font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              {busy ? "Uploading…" : copy.captureLabel}
            </button>
            {kind === "id" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-md border border-ifma-border bg-admin-canvas px-3 py-1.5 text-xs font-semibold uppercase text-caisbe-text-dark hover:border-caisbe-red/40 disabled:opacity-60"
                >
                  Upload ID image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void onFileSelected(event.target.files)}
                />
              </>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-xs text-caisbe-red">{error}</p> : null}
    </div>
  );
}
