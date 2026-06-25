/**
 * useFaceTracking.js
 * Real-time eye detection & tracking using face-api.js (TensorFlow.js backend).
 * Models are streamed from jsDelivr CDN — no local files needed.
 *
 * Usage:
 *   const { eyeData, modelState } = useFaceTracking(videoRef, canvasRef, isActive);
 *
 * eyeData: { detected, lEyeH, rEyeH, pd, lCenter, rCenter } | null
 * modelState: 'loading' | 'ready' | 'error'
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

// ── Local Model URL ────────────────────────────────────────────────────────────
// Uses the smallest + fastest models suitable for real-time tracking.
const MODEL_URL = '/models';

// Singleton model state — shared across all hook instances
let _modelsLoaded = false;
let _modelsError = false;
let _loadPromise = null;

const ensureModelsLoaded = () => {
  if (_modelsLoaded) return Promise.resolve();
  if (_modelsError) return Promise.reject(new Error('Models failed to load'));
  if (_loadPromise) return _loadPromise;

  _loadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ])
    .then(() => {
      _modelsLoaded = true;
      console.log('[FaceTracking] Models ready');
    })
    .catch((err) => {
      _modelsError = true;
      _loadPromise = null;
      console.error('[FaceTracking] Model load failed:', err);
      throw err;
    });

  return _loadPromise;
};

// ── Canvas Drawing & Pupil Detection Helpers ────────────────────────────────────

/**
 * Finds the exact center of the black pupil/iris by searching for the darkest
 * pixel within the bounding box of the eye landmarks in the raw video frame.
 */
function findPupilCenter(video, landmarkPts, canvasWidth, canvasHeight) {
  const xs = landmarkPts.map(p => p.x);
  const ys = landmarkPts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = Math.ceil(maxX - minX);
  const h = Math.ceil(maxY - minY);

  if (w <= 0 || h <= 0) return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, darkPercent: 60 };

  if (!findPupilCenter.canvas) {
    findPupilCenter.canvas = document.createElement('canvas');
    findPupilCenter.ctx = findPupilCenter.canvas.getContext('2d', { willReadFrequently: true });
  }
  const canvas = findPupilCenter.canvas;
  const ctx = findPupilCenter.ctx;

  canvas.width = w;
  canvas.height = h;

  const videoW = video.videoWidth || canvasWidth;
  const videoH = video.videoHeight || canvasHeight;
  
  const scaleX = videoW / canvasWidth;
  const scaleY = videoH / canvasHeight;

  const videoEyeX = minX * scaleX;
  const videoEyeY = minY * scaleY;
  const videoEyeW = w * scaleX;
  const videoEyeH = h * scaleY;

  try {
    ctx.drawImage(video, videoEyeX, videoEyeY, videoEyeW, videoEyeH, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minBrightness = 255 * 3;
    let minIdx = -1;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3];

      if (a < 50) continue;

      const brightness = r + g + b;
      if (brightness < minBrightness) {
        minBrightness = brightness;
        minIdx = i;
      }
    }

    if (minIdx !== -1) {
      const pixelIdx = minIdx / 4;
      const localX = pixelIdx % w;
      const localY = Math.floor(pixelIdx / w);

      const avgBrightness = minBrightness / 3;
      const darkPercent = Math.round(((255 - avgBrightness) / 255) * 100);

      return {
        x: minX + localX,
        y: minY + localY,
        darkPercent
      };
    }
  } catch (err) {
    // ignore
  }

  // Fallback to geometric center
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    darkPercent: 65
  };
}

/**
 * Draw corner-bracket bounding box around an eye, a targeting reticle on the black pupil, and a darkness label.
 */
function drawEyeBox(ctx, pts, center, heightLabel, side) {
  const pad = 5;
  const minX = Math.min(...pts.map((p) => p.x)) - pad;
  const maxX = Math.max(...pts.map((p) => p.x)) + pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad;
  const maxY = Math.max(...pts.map((p) => p.y)) + pad;
  const W = maxX - minX;
  const H = maxY - minY;
  const B = Math.min(8, W * 0.3); // bracket arm length

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur = 5;
  ctx.lineCap = 'round';

  // Four corner L-brackets
  const corners = [
    [minX, minY, minX + B, minY, minX, minY + B],
    [maxX - B, minY, maxX, minY, maxX, minY + B],
    [minX, maxY - B, minX, maxY, minX + B, maxY],
    [maxX, maxY - B, maxX, maxY, maxX - B, maxY],
  ];
  corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  });

  // Concentric scopes on the black pupil center
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 0.8;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 6.5, 0, Math.PI * 2);
  ctx.stroke();

  // Target Crosshair
  ctx.beginPath();
  ctx.moveTo(center.x - 9, center.y);
  ctx.lineTo(center.x + 9, center.y);
  ctx.moveTo(center.x, center.y - 9);
  ctx.lineTo(center.x, center.y + 9);
  ctx.stroke();

  // Pupil / iris center dot
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye-height dimension label below the box
  ctx.shadowBlur = 0;
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.textAlign = 'center';
  ctx.fillText(`${heightLabel}px`, center.x, maxY + 14);

  // Side and dark % label top-left/right
  ctx.font = 'bold 6.2px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  if (side === 'left') {
    ctx.textAlign = 'left';
    ctx.fillText(`L - BLACK ${center.darkPercent}%`, minX, minY - 4);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(`R - BLACK ${center.darkPercent}%`, maxX, minY - 4);
  }

  ctx.restore();
}

/**
 * Draw dashed PD ruler line between the two eye centers.
 */
function drawPDLine(ctx, lCenter, rCenter, pdLabel) {
  const midX = (lCenter.x + rCenter.x) / 2;
  const midY = (lCenter.y + rCenter.y) / 2;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.9;
  ctx.setLineDash([4, 3]);
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(lCenter.x, lCenter.y);
  ctx.lineTo(rCenter.x, rCenter.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tick marks at each eye center
  const tickH = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.2;
  [lCenter, rCenter].forEach((c) => {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - tickH);
    ctx.lineTo(c.x, c.y + tickH);
    ctx.stroke();
  });

  // PD label above the midpoint
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(`PD: ${pdLabel}mm`, midX, midY - 8);

  ctx.restore();
}

/**
 * Draw "EYE-TRACK" watermark label and a center-nose anchor dot.
 */
function drawHUDLabels(ctx, nosePt) {
  ctx.save();

  // EYE-TRACK label
  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'left';
  ctx.fillText('EYE-TRACK', 6, 12);

  // Nose bridge anchor dot
  if (nosePt) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(nosePt.x, nosePt.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Main Hook ──────────────────────────────────────────────────────────────────

/**
 * @param {React.RefObject} videoRef  — ref to <video> element
 * @param {React.RefObject} canvasRef — ref to <canvas> overlay element
 * @param {boolean}         active    — whether to run the detection loop
 */
export function useFaceTracking(videoRef, canvasRef, active) {
  const [modelState, setModelState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [eyeData, setEyeData] = useState(null);
  const [blinkCount, setBlinkCount] = useState(0);

  const maxEyeHRef = useRef(0);
  const eyeStateRef = useRef('open'); // 'open' | 'closed'
  const closedStateTimeRef = useRef(0);
  const lastDetectionTimeRef = useRef(0);

  const rafRef = useRef(null);
  const runningRef = useRef(false);

  // ── Load models on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (_modelsLoaded) {
      setModelState('ready');
      return;
    }
    ensureModelsLoaded()
      .then(() => setModelState('ready'))
      .catch(() => setModelState('error'));
  }, []);

  // ── Detection loop ──────────────────────────────────────────────────────────
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !runningRef.current) return;
    if (video.readyState < 2 || video.paused || video.ended) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    // Throttle inference to max ~12 FPS to prevent UI thread lag on low-end/mobile devices
    const now = Date.now();
    if (now - lastDetectionTimeRef.current < 80) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }
    lastDetectionTimeRef.current = now;

    try {
      const result = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
        )
        .withFaceLandmarks(true);

      const ctx = canvas.getContext('2d');

      // Always sync canvas dimensions to displayed video size
      if (
        canvas.width !== video.clientWidth ||
        canvas.height !== video.clientHeight
      ) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (result) {
        // Resize landmark coordinates to match displayed canvas dimensions
        const dims = { width: canvas.width, height: canvas.height };
        const resized = faceapi.resizeResults(result, dims);
        const lm = resized.landmarks;

        const leftEyePts  = lm.getLeftEye();
        const rightEyePts = lm.getRightEye();
        const nosePts     = lm.getNose();
        const noseBridge  = nosePts[0]; // top of nose bridge

        const lCenter = findPupilCenter(video, leftEyePts, canvas.width, canvas.height);
        const rCenter = findPupilCenter(video, rightEyePts, canvas.width, canvas.height);

        // Eye height (vertical span)
        const eyeH = (pts) =>
          (Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))).toFixed(1);

        const lH = eyeH(leftEyePts);
        const rH = eyeH(rightEyePts);

        // Pupillary distance → mm estimate
        const pdPx = Math.hypot(rCenter.x - lCenter.x, rCenter.y - lCenter.y);
        const faceW = resized.detection.box.width;
        // Average face width ~140mm; use face bounding-box width as calibration ref
        const pdMm = ((pdPx / faceW) * 140).toFixed(1);

        // --- Active Real Blink Detection ---
        const lVal = parseFloat(lH);
        const rVal = parseFloat(rH);
        const currentH = (lVal + rVal) / 2;

        if (currentH > maxEyeHRef.current) {
          maxEyeHRef.current = currentH;
        }

        if (maxEyeHRef.current > 1.5) {
          const closedThreshold = maxEyeHRef.current * 0.60;
          const openThreshold = maxEyeHRef.current * 0.80;

          if (eyeStateRef.current === 'open') {
            if (currentH < closedThreshold) {
              eyeStateRef.current = 'closed';
              closedStateTimeRef.current = Date.now();
            }
          } else if (eyeStateRef.current === 'closed') {
            if (currentH > openThreshold) {
              eyeStateRef.current = 'open';
              setBlinkCount(prev => prev + 1);
              closedStateTimeRef.current = 0;
            } else if (closedStateTimeRef.current > 0 && Date.now() - closedStateTimeRef.current > 1500) {
              // Fail-safe calibration reset
              maxEyeHRef.current = currentH;
              eyeStateRef.current = 'open';
              closedStateTimeRef.current = 0;
            }
          }
        }

        // Draw
        drawEyeBox(ctx, leftEyePts, lCenter, lH, 'left');
        drawEyeBox(ctx, rightEyePts, rCenter, rH, 'right');
        drawPDLine(ctx, lCenter, rCenter, pdMm);
        drawHUDLabels(ctx, noseBridge);

        setEyeData({ detected: true, lEyeH: lH, rEyeH: rH, pd: pdMm, lCenter, rCenter });
      } else {
        // No face detected — clear overlay
        setEyeData({ detected: false });
        maxEyeHRef.current = 0;
        eyeStateRef.current = 'open';
        closedStateTimeRef.current = 0;
      }
    } catch (err) {
      // Silently ignore frame errors (can happen during video setup)
    }

    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(runDetection);
    }
  }, [videoRef, canvasRef]);

  // ── Start / stop loop when active changes ───────────────────────────────────
  useEffect(() => {
    if (active && modelState === 'ready') {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(runDetection);
    } else {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // Clear canvas when stopped
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setEyeData(null);
      setBlinkCount(0);
      maxEyeHRef.current = 0;
      eyeStateRef.current = 'open';
      closedStateTimeRef.current = 0;
    }

    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, modelState, runDetection, canvasRef]);

  return { eyeData, modelState, blinkCount };
}
