class RelightEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.photos = [];
    this.flashPhoto = null;
    this.width = canvas.width;
    this.height = canvas.height;
    this.outputBuffer = null;
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.currentAngle = Math.PI / 2;
    this.currentContrast = 1.2;
    this.currentGraze = 2;
    this.isRendering = false;
    this.pendingRender = false;
  }

  setDimensions(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.outputBuffer = this.ctx.createImageData(w, h);
  }

  async loadImages(items) {
    this.photos = [];
    this.flashPhoto = null;

    for (const item of items) {
      const img = await this.loadImageElement(item.src);
      const offscreen = document.createElement('canvas');
      offscreen.width = this.width;
      offscreen.height = this.height;
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      offCtx.drawImage(img, 0, 0, this.width, this.height);
      const imgData = offCtx.getImageData(0, 0, this.width, this.height);

      if (item.hour === 'flash') {
        this.flashPhoto = {
          name: item.name || 'flash',
          element: img,
          pixels: imgData.data
        };
      } else {
        const rad = this.hourToRadians(item.hour);
        this.photos.push({
          hour: item.hour,
          angleRad: rad,
          name: item.name,
          element: img,
          pixels: imgData.data
        });
      }
    }

    this.photos.sort((a, b) => a.angleRad - b.angleRad);
  }

  loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  hourToRadians(hour) {
    const val = Number(hour);
    return ((3 - val) * Math.PI) / 6;
  }

  radiansToHour(rad) {
    let norm = rad;
    while (norm < 0) norm += 2 * Math.PI;
    norm = norm % (2 * Math.PI);
    let h = 3 - Math.round((norm * 6) / Math.PI);
    while (h <= 0) h += 12;
    return h;
  }

  render(angleRad, contrast = 1.2, graze = 2) {
    this.currentAngle = angleRad;
    this.currentContrast = contrast;
    this.currentGraze = graze;

    if (this.isRendering) {
      this.pendingRender = true;
      return;
    }

    if (!this.photos || this.photos.length === 0) return;

    this.isRendering = true;

    if (!this.outputBuffer || this.outputBuffer.width !== this.width || this.outputBuffer.height !== this.height) {
      this.outputBuffer = this.ctx.createImageData(this.width, this.height);
    }

    const out = this.outputBuffer.data;
    const len = out.length;
    const power = graze + 1;

    let weights = [];
    let sumWeight = 0;

    for (let i = 0; i < this.photos.length; i++) {
      const p = this.photos[i];
      let diff = Math.cos(angleRad - p.angleRad);
      let w = diff > 0 ? Math.pow(diff, power) : 0;
      weights.push(w);
      sumWeight += w;
    }

    if (sumWeight === 0) {
      let bestIdx = 0;
      let maxDot = -2;
      for (let i = 0; i < this.photos.length; i++) {
        let d = Math.cos(angleRad - this.photos[i].angleRad);
        if (d > maxDot) {
          maxDot = d;
          bestIdx = i;
        }
      }
      weights[bestIdx] = 1;
      sumWeight = 1;
    }

    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sumWeight;
    }

    const activePairs = [];
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] > 0.005) {
        activePairs.push({
          w: weights[i],
          pixels: this.photos[i].pixels
        });
      }
    }

    const cFactor = contrast;
    const activeCount = activePairs.length;

    for (let p = 0; p < len; p += 4) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let k = 0; k < activeCount; k++) {
        const item = activePairs[k];
        const px = item.pixels;
        const w = item.w;
        r += px[p] * w;
        g += px[p + 1] * w;
        b += px[p + 2] * w;
      }

      r = (r - 128) * cFactor + 128;
      g = (g - 128) * cFactor + 128;
      b = (b - 128) * cFactor + 128;

      out[p] = r < 0 ? 0 : (r > 255 ? 255 : r);
      out[p + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      out[p + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
      out[p + 3] = 255;
    }

    this.ctx.putImageData(this.outputBuffer, 0, 0);

    this.isRendering = false;
    if (this.pendingRender) {
      this.pendingRender = false;
      this.render(this.currentAngle, this.currentContrast, this.currentGraze);
    }
  }

  applyFilter(type) {
    const srcPixels = this.flashPhoto ? this.flashPhoto.pixels : (this.photos[0] ? this.photos[0].pixels : null);
    if (!srcPixels) return;

    if (!this.outputBuffer) {
      this.outputBuffer = this.ctx.createImageData(this.width, this.height);
    }

    const out = this.outputBuffer.data;
    const w = this.width;
    const h = this.height;

    if (type === 'invert') {
      for (let i = 0; i < out.length; i += 4) {
        out[i] = 255 - srcPixels[i];
        out[i + 1] = 255 - srcPixels[i + 1];
        out[i + 2] = 255 - srcPixels[i + 2];
        out[i + 3] = 255;
      }
    } else if (type === 'emboss') {
      const gray = new Float32Array(w * h);
      for (let i = 0, j = 0; i < srcPixels.length; i += 4, j++) {
        gray[j] = 0.299 * srcPixels[i] + 0.587 * srcPixels[i + 1] + 0.114 * srcPixels[i + 2];
      }

      for (let y = 1; y < h - 1; y++) {
        const row = y * w;
        for (let x = 1; x < w - 1; x++) {
          const idx = row + x;
          const val = (gray[idx - w - 1] * -2) + (gray[idx + w + 1] * 2) + 128;
          const clamped = val < 0 ? 0 : (val > 255 ? 255 : val);
          const p = idx * 4;
          out[p] = clamped;
          out[p + 1] = clamped;
          out[p + 2] = clamped;
          out[p + 3] = 255;
        }
      }
    } else if (type === 'highpass') {
      const gray = new Float32Array(w * h);
      for (let i = 0, j = 0; i < srcPixels.length; i += 4, j++) {
        gray[j] = 0.299 * srcPixels[i] + 0.587 * srcPixels[i + 1] + 0.114 * srcPixels[i + 2];
      }

      for (let y = 1; y < h - 1; y++) {
        const row = y * w;
        for (let x = 1; x < w - 1; x++) {
          const idx = row + x;
          const center = gray[idx];
          const laplacian = (gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w]) - 4 * center;
          const val = 128 - laplacian * 2.2;
          const clamped = val < 0 ? 0 : (val > 255 ? 255 : val);
          const p = idx * 4;
          out[p] = clamped;
          out[p + 1] = clamped;
          out[p + 2] = clamped;
          out[p + 3] = 255;
        }
      }
    } else if (type === 'clahe') {
      let minLum = 255;
      let maxLum = 0;
      for (let i = 0; i < srcPixels.length; i += 4) {
        let lum = 0.299 * srcPixels[i] + 0.587 * srcPixels[i + 1] + 0.114 * srcPixels[i + 2];
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }
      const range = (maxLum - minLum) || 1;

      for (let i = 0; i < srcPixels.length; i += 4) {
        let lum = 0.299 * srcPixels[i] + 0.587 * srcPixels[i + 1] + 0.114 * srcPixels[i + 2];
        let norm = ((lum - minLum) / range) * 255;
        out[i] = norm;
        out[i + 1] = norm;
        out[i + 2] = norm;
        out[i + 3] = 255;
      }
    }

    this.ctx.putImageData(this.outputBuffer, 0, 0);
  }

  renderFlashOnly() {
    if (this.flashPhoto) {
      if (!this.outputBuffer) {
        this.outputBuffer = this.ctx.createImageData(this.width, this.height);
      }
      this.outputBuffer.data.set(this.flashPhoto.pixels);
      this.ctx.putImageData(this.outputBuffer, 0, 0);
    } else if (this.photos[0]) {
      this.outputBuffer.data.set(this.photos[0].pixels);
      this.ctx.putImageData(this.outputBuffer, 0, 0);
    }
  }

  getSnapshotURL() {
    return this.canvas.toDataURL('image/png');
  }
}

