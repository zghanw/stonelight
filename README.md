# Stonelight

> Virtual raking light inscription transcription for weathered gravestones and historic monuments.

Stonelight lets genealogists, cemetery preservationists, and Find a Grave volunteers read heavily eroded headstones directly in the browser by sweeping a virtual raking light across multi-angle phone-torch photos.

No physical contact. No shaving cream. No tripods or RAW cameras. No cloud uploads. 100% private and works offline in the field.

---

## The Problem

Over decades or centuries, slate, marble, limestone, and sandstone gravestones erode until their hand-carved inscriptions can no longer be read under flat daylight. Standard camera flash washes out the shallow bevels that cast readable shadows.

Faced with unreadable family markers or historic records, volunteers frequently:
- Smear shaving cream, chalk, or flour onto fragile stone faces (which speeds up chemical decay and is illegal or banned in many historic cemeteries).
- Post unreadable photos to forums asking strangers for enhancement.
- Attempt expensive laboratory RTI (Reflectance Transformation Imaging) setups requiring black reflective spheres, heavy tripods, DSLR cameras, and desktop command-line software.

The **Association for Gravestone Studies (AGS)** recommends angled raking light and digital image processing instead of physical contact. **Stonelight** brings that exact scientific workflow to anyone holding a smartphone and a pocket flashlight.

---

## Key Features

- **Instant Built-In Sample**: Opens directly with a simulated 1847 slate headstone (*Eleanor C. Vane*), rendered at 8 torch angles so you can try Stonelight without your own photos.
- **Interactive Virtual Torch (Orbit Dial)**: Move the light dot around the circular dial (or use keyboard arrows) to cast dynamic grazing shadows across the stone surface at 60 FPS.
- **Shadow Map (All-Angle Synthesis)**: Combines directional shadow variance from all angles into a single composite:
  - *Chisel Relief*: Accentuates carved V-grooves while normalizing stone tone.
  - *Digital Slate Rubbing*: Emulates archival paper-and-charcoal rubbings non-destructively, producing crisp dark letters on parchment tone.
  - *Directional Variance*: Maps topographic relief variations across the surface.
- **Split Compare Slider**: Wipe interactively between the flat, washed-out flash photo and the enhanced raking light view.
- **Archival Transcription Card**:
  - Live fields for Deceased Name, Birth & Death Dates, Age, Relationship, Epitaph, Cemetery, Material, and Notes.
  - Special handling for damaged text: use `-` for illegible letters.
  - Auto-saves locally in browser storage.
  - One-click *Copy for Find a Grave* format.
  - Print / Save PDF feature formatted according to historical society recording cards with side-by-side stone photos.
- **Field Capture Guide**: Step-by-step instructions for shooting at the stone: propping the phone, locking AE/AF exposure, and sweeping torch angles.
- **Upload Your Own Photos**: Drop 4 to 8 photos with automatic torch angle estimation, or adjust torch clock positions on an interactive clock face.
- **Single-Photo Filter Fallback**: Invert (negative), directional emboss, high-pass edge filter, and contrast stretch for when only one photo is available.
- **Field-Ready Offline PWA**: Installs as a standalone web app and runs without an internet connection once loaded. Zero external CDN dependencies, zero telemetry, and photos never leave your device.

---

## How It Works

When you drag the torch dial, Stonelight calculates angular cosine weights between your virtual light direction and the tagged photo angles. It blends pixel values directly in typed arrays (`Uint8ClampedArray`) on an offscreen canvas at 60 FPS, casting realistic moving shadows across carved bevels.

To generate the Shadow Map, the engine processes all photos pixel-by-pixel to measure the maximum-to-minimum luminance variation across all lighting angles. Because carved chisel cuts experience deep directional shadows while flat stone surfaces remain relatively constant, this isolates physical surface relief from background stone grain—revealing the entire inscription at once as a 3D chisel relief or an archival slate rubbing.

---

## Running Locally

Stonelight is built entirely with modern, dependency-free HTML5, CSS3, and standard ECMAScript. It requires no build step or package manager to run.

You can serve the directory using any static file server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Open `http://localhost:8000` in any modern web browser (Chrome, Edge, Safari, Firefox).

---

## 2-Minute Demo for Judges

1. **Step 1: The Problem (0:00 - 0:15)**
   - Click the **Compare Flash** tab.
   - Point out the flat flash photo on the left: the weathered 1847 inscription is washed out and unreadable under direct flash. Mention that cemetery visitors often resort to damaging shaving cream or chalk to read it.
2. **Step 2: Virtual Raking Light (0:15 - 0:45)**
   - Click the **Relight** tab.
   - Drag the virtual torch dial from 12:00 around to 9:00 and 3:00 (or press Left/Right arrow keys).
   - Watch the chisel cuts of *"ELEANOR C. VANE"*, *"OCTOBER 14, 1847"*, and the lower epitaph spring into sharp shadow relief as the virtual beam sweeps across.
3. **Step 3: All-Angle Shadow Map (0:45 - 1:10)**
   - Click the **Shadow Map** tab and toggle **Chisel Relief** or **Digital Slate Rubbing**.
   - Show how combining the multi-directional shadow data reveals all horizontal and vertical chisel strokes simultaneously.
4. **Step 4: Archival Transcription Card (1:10 - 1:40)**
   - Switch to the **Transcription Card** tab on the right.
   - Click **Print / Save Record (PDF)** to preview the clean, single-page archival preservation record with side-by-side stone images ready for church registers.
5. **Step 5: Privacy & Offline Independence (1:40 - 2:00)**
   - Disconnect Wi-Fi or enable Airplane Mode.
   - Reload the page: Stonelight continues running completely offline via its Service Worker. No photos are ever uploaded to any server.

---

## Ethical Statement & Association Guidelines

Stonelight adheres to the conservation ethics established by the **Association for Gravestone Studies (AGS)**:
- Never apply chemical substances, detergents, shaving cream, flour, or chalk to historic stone markers.
- Never use wire brushes or physical scrapers.
- Use raking optical light and non-destructive digital transcription to recover history safely.

---

## Technical Specifications

- **Client Technology**: Pure HTML5 Canvas 2D, Typed Arrays (`Uint8ClampedArray`), CSS Grid & Flexbox, Service Worker API, Web App Manifest.
- **Accessibility**: High contrast dark theme conforming to WCAG 2.2 AA standards, full keyboard navigation for the torch dial, visible focus rings, and `prefers-reduced-motion` support.
- **Privacy & Security**: Zero tracking, zero analytics, zero external network requests.
