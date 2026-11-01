document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('main-canvas');
  const engine = new RelightEngine(canvas);
  const shadowEngine = new ShadowMapEngine(engine);
  const transcribeManager = new TranscriptionManager(engine);
  const guideManager = new GuideModal();

  let currentView = 'relight';
  let angleRad = Math.PI / 2;
  let currentContrast = 1.2;
  let currentGraze = 2;
  let compareSplit = 0.5;
  let isDraggingDial = false;
  let isDraggingCompare = false;

  const samplePhotoItems = [
    { hour: 12, src: 'sample/torch_12.jpg', name: 'torch_12.jpg' },
    { hour: 2, src: 'sample/torch_2.jpg', name: 'torch_2.jpg' },
    { hour: 3, src: 'sample/torch_3.jpg', name: 'torch_3.jpg' },
    { hour: 5, src: 'sample/torch_5.jpg', name: 'torch_5.jpg' },
    { hour: 6, src: 'sample/torch_6.jpg', name: 'torch_6.jpg' },
    { hour: 8, src: 'sample/torch_8.jpg', name: 'torch_8.jpg' },
    { hour: 9, src: 'sample/torch_9.jpg', name: 'torch_9.jpg' },
    { hour: 11, src: 'sample/torch_11.jpg', name: 'torch_11.jpg' },
    { hour: 'flash', src: 'sample/flash.jpg', name: 'flash.jpg' }
  ];

  let currentPhotoItems = [...samplePhotoItems];

  const dial = document.getElementById('orbit-dial');
  const dialNeedle = document.getElementById('dial-needle');
  const torchAngleText = document.getElementById('torch-angle-text');
  const sliderContrast = document.getElementById('slider-contrast');
  const contrastValText = document.getElementById('contrast-val');
  const sliderGraze = document.getElementById('slider-graze');
  const grazeValText = document.getElementById('graze-val');
  const compareOverlay = document.getElementById('compare-overlay');
  const compareHandle = document.getElementById('compare-handle');
  const loadingSpinner = document.getElementById('loading-spinner');
  const loadingText = document.getElementById('loading-text');

  const viewTabs = document.querySelectorAll('.view-tab');
  const relightControls = document.getElementById('relight-controls');
  const shadowmapControls = document.getElementById('shadowmap-controls');
  const filterControls = document.getElementById('filter-controls');
  const mapModeButtons = document.querySelectorAll('[data-mapmode]');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const sliderMapIntensity = document.getElementById('slider-map-intensity');
  const mapIntensityVal = document.getElementById('map-intensity-val');

  const sideTabs = document.querySelectorAll('.side-tab');
  const sidePaneTranscribe = document.getElementById('side-pane-transcribe');
  const sidePanePhotos = document.getElementById('side-pane-photos');
  const photoCountBadge = document.getElementById('photo-count-badge');
  const photoThumbGrid = document.getElementById('photo-thumb-grid');
  const photoWarningBox = document.getElementById('photo-warning-box');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnBrowseFiles = document.getElementById('btn-browse-files');
  const btnAutoAngles = document.getElementById('btn-auto-angles');
  const btnResetPhotos = document.getElementById('btn-reset-photos');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnOpenUpload = document.getElementById('btn-open-upload');
  const btnSaveImage = document.getElementById('btn-save-image');

  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  let activeMapMode = 'relief';
  let activeFilter = 'emboss';
  let currentZoom = 1.0;

  function showLoading(msg) {
    if (loadingSpinner) {
      if (loadingText && msg) loadingText.innerText = msg;
      loadingSpinner.classList.remove('hidden');
    }
  }

  function hideLoading() {
    if (loadingSpinner) {
      loadingSpinner.classList.add('hidden');
    }
  }

  async function loadPhotoSet(items) {
    showLoading('Loading photo set...');
    currentPhotoItems = items;
    shadowEngine.resetCache();

    try {
      await engine.loadImages(items);
      updatePhotoGrid();
      renderCurrentView();
    } catch (err) {
      showPhotoWarning('Failed to load photos. Please ensure files are valid images.');
    } finally {
      hideLoading();
    }
  }

  function updatePhotoGrid() {
    if (!photoThumbGrid) return;
    photoThumbGrid.innerHTML = '';

    const validTorchPhotos = currentPhotoItems.filter(p => p.hour !== 'flash');
    if (photoCountBadge) photoCountBadge.innerText = String(validTorchPhotos.length);

    currentPhotoItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'photo-card';

      const img = document.createElement('img');
      img.className = 'photo-thumb';
      img.src = item.src;
      img.alt = item.name || `Photo ${idx + 1}`;

      const badge = document.createElement('span');
      badge.className = 'photo-badge';
      badge.innerText = item.hour === 'flash' ? 'Flash Ref' : `${item.hour}:00`;

      const editBtn = document.createElement('button');
      editBtn.className = 'photo-tag-btn';
      editBtn.innerText = 'Tag';

      card.appendChild(img);
      card.appendChild(badge);
      card.appendChild(editBtn);

      card.addEventListener('click', () => {
        guideManager.openClockPicker(idx, item.hour, (targetIdx, newHour) => {
          currentPhotoItems[targetIdx].hour = newHour === 'flash' ? 'flash' : Number(newHour);
          loadPhotoSet([...currentPhotoItems]);
        });
      });

      photoThumbGrid.appendChild(card);
    });
  }

  function showPhotoWarning(msg) {
    if (!photoWarningBox) return;
    photoWarningBox.innerText = msg;
    photoWarningBox.classList.remove('hidden');
  }

  function hidePhotoWarning() {
    if (!photoWarningBox) return;
    photoWarningBox.classList.add('hidden');
  }

  function updateDialAngle(rad) {
    angleRad = rad;
    while (angleRad < 0) angleRad += 2 * Math.PI;
    angleRad = angleRad % (2 * Math.PI);

    const deg = (angleRad * 180) / Math.PI;
    const rotateDeg = 90 - deg;
    if (dialNeedle) {
      dialNeedle.style.transform = `rotate(${rotateDeg}deg)`;
    }

    const hour = engine.radiansToHour(angleRad);
    let label = `${hour}:00`;
    if (hour === 12) label += ' (Top)';
    else if (hour === 3) label += ' (Right)';
    else if (hour === 6) label += ' (Bottom)';
    else if (hour === 9) label += ' (Left)';

    if (torchAngleText) torchAngleText.innerText = label;

    if (dial) {
      dial.setAttribute('aria-valuenow', String(hour));
      dial.setAttribute('aria-valuetext', label);
    }

    if (currentView === 'relight' || currentView === 'compare') {
      renderCurrentView();
    }
  }

  function updateDialFromPointer(e) {
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - cx;
    const dy = cy - clientY;
    const rad = Math.atan2(dy, dx);
    updateDialAngle(rad);
  }

  if (dial) {
    dial.addEventListener('mousedown', (e) => {
      isDraggingDial = true;
      updateDialFromPointer(e);
    });

    dial.addEventListener('touchstart', (e) => {
      isDraggingDial = true;
      updateDialFromPointer(e);
    }, { passive: false });

    dial.addEventListener('keydown', (e) => {
      let delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = -Math.PI / 12;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = Math.PI / 12;
      if (delta !== 0) {
        e.preventDefault();
        updateDialAngle(angleRad + delta);
      }
    });
  }

  window.addEventListener('mousemove', (e) => {
    if (isDraggingDial) {
      e.preventDefault();
      updateDialFromPointer(e);
    }
    if (isDraggingCompare) {
      e.preventDefault();
      updateCompareDivider(e.clientX);
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (isDraggingDial) {
      e.preventDefault();
      updateDialFromPointer(e);
    }
    if (isDraggingCompare) {
      e.preventDefault();
      updateCompareDivider(e.touches[0].clientX);
    }
  }, { passive: false });

  window.addEventListener('mouseup', () => {
    isDraggingDial = false;
    isDraggingCompare = false;
  });

  window.addEventListener('touchend', () => {
    isDraggingDial = false;
    isDraggingCompare = false;
  });

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = Number(btn.getAttribute('data-hour'));
      const rad = engine.hourToRadians(h);
      updateDialAngle(rad);
    });
  });

  if (sliderContrast) {
    sliderContrast.addEventListener('input', (e) => {
      currentContrast = parseFloat(e.target.value);
      if (contrastValText) contrastValText.innerText = `${currentContrast.toFixed(1)}x`;
      renderCurrentView();
    });
  }

  if (sliderGraze) {
    sliderGraze.addEventListener('input', (e) => {
      currentGraze = parseInt(e.target.value, 10);
      const labels = ['', 'Soft', 'Medium', 'Sharp', 'Extreme'];
      if (grazeValText) grazeValText.innerText = labels[currentGraze] || 'Medium';
      renderCurrentView();
    });
  }

  if (sliderMapIntensity) {
    sliderMapIntensity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (mapIntensityVal) mapIntensityVal.innerText = `${val.toFixed(1)}x`;
      if (currentView === 'shadowmap') {
        shadowEngine.render(activeMapMode, val);
      }
    });
  }

  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.getAttribute('data-view');
      switchControlsForView(currentView);
      renderCurrentView();
    });
  });

  function switchControlsForView(view) {
    if (relightControls) relightControls.classList.add('hidden');
    if (shadowmapControls) shadowmapControls.classList.add('hidden');
    if (filterControls) filterControls.classList.add('hidden');
    if (compareOverlay) compareOverlay.classList.add('hidden');

    if (view === 'relight') {
      if (relightControls) relightControls.classList.remove('hidden');
    } else if (view === 'shadowmap') {
      if (shadowmapControls) shadowmapControls.classList.remove('hidden');
    } else if (view === 'compare') {
      if (relightControls) relightControls.classList.remove('hidden');
      if (compareOverlay) compareOverlay.classList.remove('hidden');
    } else if (view === 'filter') {
      if (filterControls) filterControls.classList.remove('hidden');
    }
  }

  mapModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      mapModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMapMode = btn.getAttribute('data-mapmode');
      const val = sliderMapIntensity ? parseFloat(sliderMapIntensity.value) : 1.4;
      shadowEngine.render(activeMapMode, val);
    });
  });

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      engine.applyFilter(activeFilter);
    });
  });

  function renderCurrentView() {
    if (currentView === 'relight') {
      engine.render(angleRad, currentContrast, currentGraze);
    } else if (currentView === 'shadowmap') {
      const val = sliderMapIntensity ? parseFloat(sliderMapIntensity.value) : 1.4;
      shadowEngine.render(activeMapMode, val);
    } else if (currentView === 'compare') {
      renderCompareView();
    } else if (currentView === 'filter') {
      engine.applyFilter(activeFilter);
    }
  }

  function renderCompareView() {
    const w = engine.width;
    const h = engine.height;

    engine.render(angleRad, currentContrast, currentGraze);
    const relitPixels = new Uint8ClampedArray(engine.outputBuffer.data);

    engine.renderFlashOnly();
    const flashPixels = new Uint8ClampedArray(engine.outputBuffer.data);

    const splitCol = Math.round(w * compareSplit);
    const out = engine.outputBuffer.data;

    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const p = row + x * 4;
        const src = x < splitCol ? flashPixels : relitPixels;
        out[p] = src[p];
        out[p + 1] = src[p + 1];
        out[p + 2] = src[p + 2];
        out[p + 3] = 255;
      }
    }

    engine.ctx.putImageData(engine.outputBuffer, 0, 0);
  }

  function updateCompareDivider(clientX) {
    const vp = document.getElementById('viewport-container');
    const rect = vp.getBoundingClientRect();
    let pos = (clientX - rect.left) / rect.width;
    if (pos < 0.05) pos = 0.05;
    if (pos > 0.95) pos = 0.95;
    compareSplit = pos;

    if (compareHandle) {
      compareHandle.style.left = `${(pos * 100).toFixed(1)}%`;
    }

    renderCompareView();
  }

  if (compareHandle) {
    compareHandle.addEventListener('mousedown', (e) => {
      isDraggingCompare = true;
      e.stopPropagation();
    });

    compareHandle.addEventListener('touchstart', (e) => {
      isDraggingCompare = true;
      e.stopPropagation();
    }, { passive: false });
  }

  function switchToTab(side) {
    sideTabs.forEach(t => t.classList.remove('active'));
    const targetTab = document.querySelector(`.side-tab[data-side="${side}"]`);
    if (targetTab) targetTab.classList.add('active');

    if (side === 'transcribe') {
      sidePaneTranscribe.classList.add('active');
      sidePanePhotos.classList.remove('active');
    } else {
      sidePaneTranscribe.classList.remove('active');
      sidePanePhotos.classList.add('active');
    }
  }

  sideTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const side = tab.getAttribute('data-side');
      switchToTab(side);
    });
  });

  if (btnOpenUpload) {
    btnOpenUpload.addEventListener('click', () => {
      switchToTab('photos');
    });
  }

  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', () => {
      transcribeManager.loadSampleRecord();
      loadPhotoSet(samplePhotoItems);
    });
  }

  if (btnResetPhotos) {
    btnResetPhotos.addEventListener('click', () => {
      transcribeManager.loadSampleRecord();
      loadPhotoSet(samplePhotoItems);
    });
  }

  if (btnBrowseFiles && fileInput) {
    btnBrowseFiles.addEventListener('click', () => fileInput.click());
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target !== btnBrowseFiles) fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUploadedFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleUploadedFiles(Array.from(fileInput.files));
      }
    });
  }

  async function handleUploadedFiles(files) {
    hidePhotoWarning();

    const nonImages = files.filter(f => !f.type.startsWith('image/') && !f.name.toLowerCase().endsWith('.heic'));
    if (nonImages.length > 0) {
      const names = nonImages.map(f => f.name).join(', ');
      showPhotoWarning(`${names} is not a supported image file. Please upload JPEG or PNG photos.`);
    }

    const hasHeic = files.some(f => f.name.toLowerCase().endsWith('.heic') || f.type === 'image/heic');
    if (hasHeic) {
      showPhotoWarning('HEIC photos cannot be decoded directly by the browser. Please use JPEG or PNG (iPhone: Settings > Camera > Formats > Most Compatible).');
      return;
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      if (nonImages.length === 0) {
        showPhotoWarning('No valid image files were selected.');
      }
      return;
    }

    if (imageFiles.length < 3) {
      showPhotoWarning('For best raking synthesis, 4 to 8 photos taken at different torch angles are recommended.');
    }

    showLoading('Analyzing torch directions for uploaded photos...');

    const newItems = [];
    const usedHours = new Set();

    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      const dataUrl = await readFileAsDataURL(f);
      let detectedHour = await estimateImageLightAngle(dataUrl);

      if (usedHours.has(detectedHour)) {
        const candidateHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        for (const h of candidateHours) {
          if (!usedHours.has(h)) {
            detectedHour = h;
            break;
          }
        }
      }

      usedHours.add(detectedHour);
      newItems.push({
        hour: detectedHour,
        src: dataUrl,
        name: f.name
      });
    }

    transcribeManager.clearSampleDataIfPresent();
    switchToTab('photos');
    await loadPhotoSet(newItems);
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  if (btnAutoAngles) {
    btnAutoAngles.addEventListener('click', async () => {
      showLoading('Analyzing torch directions...');
      for (const item of currentPhotoItems) {
        if (item.hour === 'flash') continue;
        const hour = await estimateImageLightAngle(item.src);
        item.hour = hour;
      }
      await loadPhotoSet([...currentPhotoItems]);
    });
  }

  function estimateImageLightAngle(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 48, 48);
        const data = ctx.getImageData(0, 0, 48, 48).data;

        let sumX = 0;
        let sumY = 0;
        let totalWeight = 0;

        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 48; x++) {
            const idx = (y * 48 + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const weight = Math.pow(lum / 255, 2.5);
            sumX += (x - 23.5) * weight;
            sumY += (y - 23.5) * weight;
            totalWeight += weight;
          }
        }

        if (totalWeight < 0.01) {
          resolve(12);
          return;
        }

        const avgX = sumX / totalWeight;
        const avgY = -(sumY / totalWeight);
        const rad = Math.atan2(avgY, avgX);
        const hour = engine.radiansToHour(rad);
        resolve(hour);
      };
      img.onerror = () => resolve(12);
      img.src = src;
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      currentZoom = Math.min(2.5, currentZoom + 0.25);
      canvas.style.transform = `scale(${currentZoom})`;
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      currentZoom = Math.max(0.5, currentZoom - 0.25);
      canvas.style.transform = `scale(${currentZoom})`;
    });
  }

  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
      currentZoom = 1.0;
      canvas.style.transform = 'scale(1)';
    });
  }

  if (btnSaveImage) {
    btnSaveImage.addEventListener('click', () => {
      const dataUrl = engine.getSnapshotURL();
      const a = document.createElement('a');
      a.href = dataUrl;
      const recName = (document.getElementById('f-name').value || 'stonelight').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `${recName}_${currentView}_view.png`;
      a.click();
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  await loadPhotoSet(samplePhotoItems);
  updateDialAngle(Math.PI / 2);
});
