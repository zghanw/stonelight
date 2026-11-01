class ShadowMapEngine {
  constructor(engine) {
    this.engine = engine;
    this.cachedRelief = null;
    this.cachedRubbing = null;
    this.cachedVariance = null;
    this.currentMode = 'relief';
    this.intensity = 1.4;
  }

  resetCache() {
    this.cachedRelief = null;
    this.cachedRubbing = null;
    this.cachedVariance = null;
  }

  computeMaps() {
    const photos = this.engine.photos;
    if (!photos || photos.length < 2) return;

    const w = this.engine.width;
    const h = this.engine.height;
    const pixelCount = w * h;
    const n = photos.length;

    const reliefBuf = new Uint8ClampedArray(pixelCount * 4);
    const rubbingBuf = new Uint8ClampedArray(pixelCount * 4);
    const varianceBuf = new Uint8ClampedArray(pixelCount * 4);

    let maxDeltaFound = 1.0;
    const deltas = new Float32Array(pixelCount);
    const means = new Float32Array(pixelCount);
    const minVals = new Float32Array(pixelCount);
    const maxVals = new Float32Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      let p = i * 4;
      let minLum = 255;
      let maxLum = 0;
      let sumLum = 0;

      for (let k = 0; k < n; k++) {
        const px = photos[k].pixels;
        const lum = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
        sumLum += lum;
      }

      const mean = sumLum / n;
      const delta = maxLum - minLum;
      if (delta > maxDeltaFound) maxDeltaFound = delta;

      deltas[i] = delta;
      means[i] = mean;
      minVals[i] = minLum;
      maxVals[i] = maxLum;
    }

    const invMaxDelta = 1.0 / (maxDeltaFound || 1.0);

    for (let i = 0; i < pixelCount; i++) {
      let p = i * 4;
      const mean = means[i];
      const minVal = minVals[i];
      const maxVal = maxVals[i];
      const delta = deltas[i];

      const diff = (maxVal - mean) - 1.4 * (mean - minVal);
      let reliefVal = 128.0 + (diff * invMaxDelta) * 280.0;
      reliefVal = reliefVal < 0 ? 0 : (reliefVal > 255 ? 255 : reliefVal);
      reliefBuf[p] = reliefVal;
      reliefBuf[p + 1] = reliefVal;
      reliefBuf[p + 2] = reliefVal;
      reliefBuf[p + 3] = 255;

      let rubNorm = (delta * invMaxDelta) * 255;
      let rubVal = 255 - rubNorm * 1.8;
      rubVal = rubVal < 0 ? 0 : (rubVal > 255 ? 255 : rubVal);
      rubbingBuf[p] = rubVal;
      rubbingBuf[p + 1] = rubVal;
      rubbingBuf[p + 2] = rubVal;
      rubbingBuf[p + 3] = 255;

      let varVal = (delta * invMaxDelta) * 255 * 1.5;
      varVal = varVal < 0 ? 0 : (varVal > 255 ? 255 : varVal);
      varianceBuf[p] = varVal;
      varianceBuf[p + 1] = varVal;
      varianceBuf[p + 2] = varVal;
      varianceBuf[p + 3] = 255;
    }

    this.cachedRelief = reliefBuf;
    this.cachedRubbing = rubbingBuf;
    this.cachedVariance = varianceBuf;
  }

  render(mode, intensity = 1.4) {
    this.currentMode = mode || this.currentMode;
    this.intensity = intensity;

    if (!this.cachedRelief) {
      this.computeMaps();
    }

    if (!this.cachedRelief) return;

    let src = this.cachedRelief;
    if (this.currentMode === 'rubbing') src = this.cachedRubbing;
    if (this.currentMode === 'variance') src = this.cachedVariance;

    const ctx = this.engine.ctx;
    const w = this.engine.width;
    const h = this.engine.height;

    if (!this.engine.outputBuffer) {
      this.engine.outputBuffer = ctx.createImageData(w, h);
    }

    const out = this.engine.outputBuffer.data;
    const factor = this.intensity;

    for (let p = 0; p < src.length; p += 4) {
      let v = src[p];
      if (this.currentMode === 'rubbing') {
        let inv = 255 - v;
        inv = inv * factor;
        v = 255 - (inv > 255 ? 255 : inv);
      } else if (this.currentMode === 'variance') {
        v = v * factor;
      } else {
        v = (v - 128) * factor + 128;
      }

      v = v < 0 ? 0 : (v > 255 ? 255 : v);
      out[p] = v;
      out[p + 1] = v;
      out[p + 2] = v;
      out[p + 3] = 255;
    }

    ctx.putImageData(this.engine.outputBuffer, 0, 0);
  }
}
