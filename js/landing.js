(() => {
  const W = 560;
  const H = 720;
  const N = W * H;
  const CAPTURE_ELEVATION = (20 * Math.PI) / 180;
  const HOURS = [12, 2, 3, 5, 6, 8, 9, 11];
  const INSCRIPTION = [
    'IN MEMORY OF',
    'ELEANOR C. VANE',
    'Wife of',
    'CAPT. THOMAS VANE',
    'WHO DEPARTED THIS LIFE',
    'OCTOBER 14, 1847',
    'AGED 38 YEARS'
  ].join('\n');

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('js');

  const scratch = document.createElement('canvas');
  scratch.width = W;
  scratch.height = H;
  const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function readPixels(img) {
    scratchCtx.drawImage(img, 0, 0, W, H);
    return scratchCtx.getImageData(0, 0, W, H).data;
  }

  function hourToRad(hour) {
    return ((3 - hour) * Math.PI) / 6;
  }

  function clockLabel(rad) {
    let turns = (Math.PI / 2 - rad) / (2 * Math.PI);
    turns -= Math.floor(turns);
    const minutes = Math.round(turns * 720) % 720;
    const h = Math.floor(minutes / 60) || 12;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function invert3(m) {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
      A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
      B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
      C / det, -(a * h - b * g) / det, (a * e - b * d) / det
    ];
  }

  function blur3(src) {
    const out = new Float32Array(N);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const j = y * W + x;
        out[j] = (
          src[j - W - 1] + src[j - W] + src[j - W + 1] +
          src[j - 1] + src[j] + src[j + 1] +
          src[j + W - 1] + src[j + W] + src[j + W + 1]
        ) / 9;
      }
    }
    return out;
  }

  function centreAndScale(field, scale) {
    let mean = 0;
    for (let j = 0; j < N; j++) mean += field[j];
    mean /= N;
    for (let j = 0; j < N; j++) field[j] = (field[j] - mean) * scale;
  }

  async function buildSurface() {
    const [flash, ...torches] = await Promise.all([
      loadImage('sample/flash.jpg'),
      ...HOURS.map(h => loadImage(`sample/torch_${h}.jpg`))
    ]);

    const albedo = readPixels(flash);
    const photos = torches.map(readPixels);

    const cosE = Math.cos(CAPTURE_ELEVATION);
    const sinE = Math.sin(CAPTURE_ELEVATION);
    const lights = HOURS.map((h) => {
      const a = hourToRad(h);
      return [Math.cos(a) * cosE, Math.sin(a) * cosE, sinE];
    });

    const ata = new Array(9).fill(0);
    lights.forEach((l) => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) ata[r * 3 + c] += l[r] * l[c];
      }
    });
    const inv = invert3(ata);
    const solver = lights.map(l => [0, 1, 2].map(r => inv[r * 3] * l[0] + inv[r * 3 + 1] * l[1] + inv[r * 3 + 2] * l[2]));

    let P = new Float32Array(N);
    let Q = new Float32Array(N);

    for (let j = 0, p = 0; j < N; j++, p += 4) {
      let gx = 0;
      let gy = 0;
      let gz = 0;
      for (let k = 0; k < photos.length; k++) {
        const px = photos[k];
        const lum = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
        const s = solver[k];
        gx += s[0] * lum;
        gy += s[1] * lum;
        gz += s[2] * lum;
      }
      const z = gz > 1 ? gz : 1;
      P[j] = gx / z;
      Q[j] = gy / z;
    }

    P = blur3(P);
    Q = blur3(Q);

    const mags = [];
    for (let j = 0; j < N; j += 37) mags.push(Math.hypot(P[j], Q[j]));
    mags.sort((a, b) => a - b);
    const scale = 1 / (mags[Math.floor(mags.length * 0.985)] || 1);
    centreAndScale(P, scale);
    centreAndScale(Q, scale);

    for (let j = 0; j < N; j++) {
      const m2 = P[j] * P[j] + Q[j] * Q[j];
      const keep = m2 / (m2 + 0.1);
      P[j] *= keep;
      Q[j] *= keep;
    }

    return { albedo, photos, P, Q };
  }

  function shade(out, surface, dx, dy, k) {
    const { albedo, P, Q } = surface;
    const kx = dx * k;
    const ky = dy * k;
    for (let j = 0, p = 0; j < N; j++, p += 4) {
      let s = 1 + P[j] * kx + Q[j] * ky;
      if (s < 0.1) s = 0.1;
      else if (s > 2.2) s = 2.2;
      out[p] = albedo[p] * s;
      out[p + 1] = albedo[p + 1] * s;
      out[p + 2] = albedo[p + 2] * s;
      out[p + 3] = 255;
    }
  }

  function buildNormals(surface) {
    const { P, Q } = surface;
    const out = new Uint8ClampedArray(N * 4);
    for (let j = 0, p = 0; j < N; j++, p += 4) {
      const nx = P[j] * 0.9;
      const ny = Q[j] * 0.9;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      out[p] = 127.5 + 127.5 * nx * inv;
      out[p + 1] = 127.5 + 127.5 * ny * inv;
      out[p + 2] = 127.5 + 127.5 * inv;
      out[p + 3] = 255;
    }
    return out;
  }

  function drawCompare(surface) {
    const frame = scratchCtx.createImageData(W, H);
    [['cmp-flash', 1, 0, 0], ['cmp-rake', -1, 0, 0.95]].forEach(([id, dx, dy, k]) => {
      const target = document.getElementById(id);
      if (!target) return;
      shade(frame.data, surface, dx, dy, k);
      scratchCtx.putImageData(frame, 0, 0);
      target.getContext('2d').drawImage(scratch, 0, 0, target.width, target.height);
    });
  }

  function initHero(surface) {
    const hero = document.getElementById('top');
    const stage = document.getElementById('hero-stage');
    const stone = document.getElementById('stone');
    const canvas = document.getElementById('hero-canvas');
    const torch = document.getElementById('torch');
    const line = document.getElementById('torch-line');
    const hint = document.getElementById('stage-hint');
    const hudAz = document.getElementById('hud-az');
    const hudEl = document.getElementById('hud-el');
    const hudState = document.getElementById('hud-state');
    const hudMs = document.getElementById('hud-ms');

    const ctx = canvas.getContext('2d');
    const frame = ctx.createImageData(W, H);
    const geo = { cx: 0, cy: 0, radius: 1 };
    const light = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

    let orbit = (135 * Math.PI) / 180;
    let pointerActive = false;
    let visible = true;
    let lastTime = 0;
    let drawnX = NaN;
    let drawnY = NaN;
    let frameMs = 0;
    let hudAt = 0;

    function measure() {
      const s = stage.getBoundingClientRect();
      const r = stone.getBoundingClientRect();
      geo.cx = r.left - s.left + r.width / 2;
      geo.cy = r.top - s.top + r.height / 2;
      geo.radius = r.height * 0.57;
      drawnX = NaN;
    }

    function aim(e) {
      const s = stage.getBoundingClientRect();
      light.tx = e.clientX - s.left - geo.cx;
      light.ty = e.clientY - s.top - geo.cy;
      pointerActive = true;
      hint.classList.add('is-done');
    }

    function release() {
      if (!pointerActive) return;
      pointerActive = false;
      orbit = Math.atan2(-light.y, light.x);
    }

    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && !stage.contains(e.target)) return;
      aim(e);
    });
    stage.addEventListener('pointerdown', aim);
    hero.addEventListener('pointerleave', release);
    stage.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') release();
    });
    stage.addEventListener('pointercancel', release);

    window.addEventListener('resize', measure);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }).observe(hero);

    if (window.matchMedia('(pointer: coarse)').matches) {
      hint.textContent = 'Drag across the stone to move the light.';
    }

    measure();
    light.x = light.tx = Math.cos(orbit) * geo.radius;
    light.y = light.ty = -Math.sin(orbit) * geo.radius;

    return (now) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
      lastTime = now;
      if (!visible) return;

      if (!pointerActive) {
        if (!reduceMotion) orbit -= dt * 0.42;
        light.tx = Math.cos(orbit) * geo.radius;
        light.ty = -Math.sin(orbit) * geo.radius;
      }

      const omega = 16;
      light.vx += (omega * omega * (light.tx - light.x) - 2 * omega * light.vx) * dt;
      light.vy += (omega * omega * (light.ty - light.y) - 2 * omega * light.vy) * dt;
      light.x += light.vx * dt;
      light.y += light.vy * dt;

      if (Math.abs(light.x - drawnX) + Math.abs(light.y - drawnY) < 0.2) return;
      drawnX = light.x;
      drawnY = light.y;

      const len = Math.hypot(light.x, light.y);
      const rake = Math.min(1, len / geo.radius);
      const ux = len > 0.5 ? light.x / len : 1;
      const uy = len > 0.5 ? light.y / len : 0;

      const started = performance.now();
      shade(frame.data, surface, ux, -uy, rake * 0.95);
      ctx.putImageData(frame, 0, 0);
      frameMs += (performance.now() - started - frameMs) * 0.15;

      const tx = geo.cx + ux * rake * geo.radius;
      const ty = geo.cy + uy * rake * geo.radius;
      torch.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
      torch.classList.toggle('flip', ux > 0.25);
      line.setAttribute('x1', geo.cx.toFixed(1));
      line.setAttribute('y1', geo.cy.toFixed(1));
      line.setAttribute('x2', tx.toFixed(1));
      line.setAttribute('y2', ty.toFixed(1));

      root.style.setProperty('--lx', ux.toFixed(3));
      root.style.setProperty('--ly', uy.toFixed(3));
      root.style.setProperty('--rake', rake.toFixed(3));

      if (now - hudAt > 90) {
        hudAt = now;
        hudAz.textContent = clockLabel(Math.atan2(-uy, ux));
        hudEl.textContent = `${Math.round(90 - 78 * rake)}°`;
        hudState.textContent = rake > 0.55 ? 'Raking' : (rake > 0.25 ? 'Oblique' : 'Head-on');
        hudMs.textContent = `${frameMs.toFixed(1)} ms`;
      }
    };
  }

  function initHow(surface) {
    const track = document.getElementById('how-track');
    const sticky = track.querySelector('.how-sticky');
    const nav = document.querySelector('.nav');
    const ring = document.getElementById('ring');
    const canvas = document.getElementById('how-canvas');
    const scan = document.getElementById('scanline');
    const typed = document.getElementById('how-typed');
    const steps = Array.from(document.querySelectorAll('#steps .step'));
    const ticks = Array.from(document.querySelectorAll('#how-progress span'));

    const ctx = canvas.getContext('2d');
    const frame = ctx.createImageData(W, H);
    const out = frame.data;
    const normals = buildNormals(surface);
    const rowBytes = W * 4;

    let visible = false;
    let activeStep = -1;
    let drawnKey = '';
    let typedCount = -1;

    const thumbs = HOURS.map((h) => {
      const img = document.createElement('img');
      const a = hourToRad(h);
      img.className = 'ring-thumb';
      img.src = `sample/torch_${h}.jpg`;
      img.alt = '';
      img.style.left = `${50 + 48 * Math.cos(a)}%`;
      img.style.top = `${50 - 48 * Math.sin(a)}%`;
      ring.appendChild(img);
      return img;
    });

    const dot = document.createElement('span');
    dot.className = 'ring-torch';
    ring.appendChild(dot);

    function placeDot(rad) {
      dot.style.left = `${50 + 39 * Math.cos(rad)}%`;
      dot.style.top = `${50 - 39 * Math.sin(rad)}%`;
    }

    function setStep(idx) {
      if (idx === activeStep) return;
      activeStep = idx;
      steps.forEach((el, i) => el.classList.toggle('is-active', i === idx));
      ticks.forEach((el, i) => el.classList.toggle('is-on', i <= idx));
      ring.classList.toggle('show-thumbs', idx === 1 || idx === 2);
      ring.classList.toggle('show-scan', idx === 2);
      ring.classList.toggle('show-torch', idx === 1 || idx === 3);
      ring.classList.toggle('show-card', idx === 4);
      if (idx !== 1) thumbs.forEach(el => el.classList.remove('is-on'));
    }

    function draw(key, paint) {
      if (key === drawnKey) return;
      drawnKey = key;
      paint();
      ctx.putImageData(frame, 0, 0);
    }

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }).observe(track);

    return () => {
      if (!visible) return;

      const rect = track.getBoundingClientRect();
      const range = rect.height - sticky.offsetHeight;
      const progress = Math.min(1, Math.max(0, (nav.offsetHeight - rect.top) / (range || 1)));
      const pos = progress * steps.length;
      const idx = Math.min(steps.length - 1, Math.floor(pos));
      const t = Math.min(1, Math.max(0, (pos - idx - 0.12) / 0.76));

      setStep(idx);

      if (idx === 0) {
        draw('flat', () => out.set(surface.albedo));
      } else if (idx === 1) {
        const k = Math.min(HOURS.length - 1, Math.floor(t * HOURS.length));
        draw(`photo:${k}`, () => {
          const px = surface.photos[k];
          for (let p = 0; p < px.length; p += 4) {
            out[p] = px[p] * 3.6;
            out[p + 1] = px[p + 1] * 3.6;
            out[p + 2] = px[p + 2] * 3.6;
            out[p + 3] = 255;
          }
          thumbs.forEach((el, i) => el.classList.toggle('is-on', i === k));
          placeDot(hourToRad(HOURS[k]));
        });
      } else if (idx === 2) {
        const rows = Math.round(t * H);
        draw(`solve:${rows}`, () => {
          const cut = rows * rowBytes;
          out.set(normals.subarray(0, cut), 0);
          out.set(surface.albedo.subarray(cut), cut);
          scan.style.top = `${(t * 100).toFixed(2)}%`;
        });
      } else if (idx === 3) {
        const rad = (150 * Math.PI) / 180 - t * Math.PI * 2.5;
        draw(`sweep:${rad.toFixed(3)}`, () => {
          shade(out, surface, Math.cos(rad), Math.sin(rad), 0.95);
          placeDot(rad);
        });
      } else {
        const rad = (150 * Math.PI) / 180;
        draw('read', () => shade(out, surface, Math.cos(rad), Math.sin(rad), 0.95));
        const count = Math.round(t * INSCRIPTION.length);
        if (count !== typedCount) {
          typedCount = count;
          typed.textContent = INSCRIPTION.slice(0, count) + (count < INSCRIPTION.length ? '▌' : '');
        }
      }
    };
  }

  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => observer.observe(el));
  }

  initReveal();

  buildSurface().then((surface) => {
    drawCompare(surface);
    const tickHero = initHero(surface);
    const tickHow = initHow(surface);

    function loop(now) {
      tickHero(now);
      tickHow();
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }).catch(() => {
    root.classList.remove('js');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
