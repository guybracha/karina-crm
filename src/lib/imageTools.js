// דחיסה/ריסייז לתמונת קובץ → Data URL דחוס
export async function compressImageFile(file, {
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.72,
  mime = 'image/jpeg', // אם צריך שקיפות => 'image/png' (לא תומך quality)
} = {}) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  // חישוב יחס שמירה על פרופורציות
  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1); // לא מגדילים
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);

  // שימוש ב-OffscreenCanvas אם קיים (איכות טובה יותר), אחרת canvas רגיל
  const canvas = ('OffscreenCanvas' in window) ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  if (!('OffscreenCanvas' in window)) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d', { alpha: mime !== 'image/jpeg' });

  // שיפור איכות ריסייז
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  // יצוא ל-Data URL
  if ('convertToBlob' in canvas) {
    const blob = await canvas.convertToBlob({ type: mime, quality });
    return await blobToDataURL(blob);
  } else {
    return canvas.toDataURL(mime, quality);
  }
}

export async function compressFiles(fileList, opts) {
  const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
  const results = [];
  for (const f of files) {
    const url = await compressImageFile(f, opts);
    results.push(url);
  }
  return results;
}

export function approxBytesOfDataURL(dataUrl) {
  // אומדן גודל בבתים ל-Base64 Data URL
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4); // בלי padding
}

async function blobToDataURL(blob) {
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}
