class TranscriptionManager {
  constructor(engine) {
    this.engine = engine;
    this.storageKey = 'stonelight_session_v1';
    this.sampleName = 'ELEANOR C. VANE';
    this.initElements();
    this.bindEvents();
    this.loadSavedData();
  }

  initElements() {
    this.inputName = document.getElementById('f-name');
    this.inputBirth = document.getElementById('f-birth');
    this.inputDeath = document.getElementById('f-death');
    this.inputAge = document.getElementById('f-age');
    this.inputRel = document.getElementById('f-rel');
    this.inputInscription = document.getElementById('f-inscription');
    this.inputCemetery = document.getElementById('f-cemetery');
    this.selectMaterial = document.getElementById('f-material');
    this.inputNotes = document.getElementById('f-notes');

    this.btnCopyFindAGrave = document.getElementById('btn-copy-findagrave');
    this.btnPrintCard = document.getElementById('btn-print-card');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnResetForm = document.getElementById('btn-reset-form');

    this.prName = document.getElementById('pr-name');
    this.prBirth = document.getElementById('pr-birth');
    this.prDeath = document.getElementById('pr-death');
    this.prAge = document.getElementById('pr-age');
    this.prRel = document.getElementById('pr-rel');
    this.prInscription = document.getElementById('pr-inscription');
    this.prCemetery = document.getElementById('pr-cemetery');
    this.prMaterial = document.getElementById('pr-material');
    this.prNotes = document.getElementById('pr-notes');
    this.prImgRelit = document.getElementById('print-img-relit');
    this.prImgFlash = document.getElementById('print-img-flash');
  }

  bindEvents() {
    const inputs = [
      this.inputName, this.inputBirth, this.inputDeath, this.inputAge,
      this.inputRel, this.inputInscription, this.inputCemetery,
      this.selectMaterial, this.inputNotes
    ];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.saveToStorage());
        input.addEventListener('change', () => this.saveToStorage());
      }
    });

    if (this.btnCopyFindAGrave) {
      this.btnCopyFindAGrave.addEventListener('click', () => this.copyToFindAGrave());
    }

    if (this.btnPrintCard) {
      this.btnPrintCard.addEventListener('click', () => {
        this.populatePrintSheet();
        setTimeout(() => window.print(), 150);
      });
    }

    window.addEventListener('beforeprint', () => {
      this.populatePrintSheet();
    });

    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', () => this.exportJsonFile());
    }

    if (this.btnResetForm) {
      this.btnResetForm.addEventListener('click', () => this.resetForm());
    }
  }

  getData() {
    return {
      name: this.inputName ? this.inputName.value.trim() : '',
      birth: this.inputBirth ? this.inputBirth.value.trim() : '',
      death: this.inputDeath ? this.inputDeath.value.trim() : '',
      age: this.inputAge ? this.inputAge.value.trim() : '',
      relationship: this.inputRel ? this.inputRel.value.trim() : '',
      inscription: this.inputInscription ? this.inputInscription.value.trim() : '',
      cemetery: this.inputCemetery ? this.inputCemetery.value.trim() : '',
      material: this.selectMaterial ? this.selectMaterial.value : '',
      notes: this.inputNotes ? this.inputNotes.value.trim() : '',
      savedAt: new Date().toISOString()
    };
  }

  setData(data) {
    if (!data) return;
    if (this.inputName && data.name !== undefined) this.inputName.value = data.name;
    if (this.inputBirth && data.birth !== undefined) this.inputBirth.value = data.birth;
    if (this.inputDeath && data.death !== undefined) this.inputDeath.value = data.death;
    if (this.inputAge && data.age !== undefined) this.inputAge.value = data.age;
    if (this.inputRel && data.relationship !== undefined) this.inputRel.value = data.relationship;
    if (this.inputInscription && data.inscription !== undefined) this.inputInscription.value = data.inscription;
    if (this.inputCemetery && data.cemetery !== undefined) this.inputCemetery.value = data.cemetery;
    if (this.selectMaterial && data.material !== undefined) this.selectMaterial.value = data.material;
    if (this.inputNotes && data.notes !== undefined) this.inputNotes.value = data.notes;
  }

  loadSampleRecord() {
    this.setData({
      name: 'ELEANOR C. VANE',
      birth: '1809',
      death: 'October 14, 1847',
      age: '38 Years',
      relationship: 'Wife of Capt. Thomas Vane',
      inscription: 'IN MEMORY OF\nELEANOR C. VANE\nWife of\nCAPT. THOMAS VANE\nWHO DEPARTED THIS LIFE\nOCTOBER 14, 1847\nAGED 38 YEARS\nBlessed are the dead which die in the Lord\nErected by her bereaved husband & children',
      cemetery: 'St. Peter Old Burying Ground',
      material: 'Slate',
      notes: 'Erosion along lower epitaph lines; recovered via raking light at 11:00 and 3:00 angles.'
    });
    this.saveToStorage();
  }

  clearSampleDataIfPresent() {
    const current = this.getData();
    if (current.name === this.sampleName) {
      this.setData({
        name: '',
        birth: '',
        death: '',
        age: '',
        relationship: '',
        inscription: '',
        cemetery: '',
        material: 'Slate',
        notes: ''
      });
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      const data = this.getData();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
    }
  }

  loadSavedData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.setData(parsed);
      }
    } catch (e) {
    }
  }

  copyToFindAGrave() {
    const data = this.getData();
    let text = `Name: ${data.name || 'Unknown'}\n`;
    if (data.birth) text += `Birth: ${data.birth}\n`;
    if (data.death) text += `Death: ${data.death}\n`;
    if (data.age) text += `Age: ${data.age}\n`;
    if (data.relationship) text += `Relationship: ${data.relationship}\n`;
    if (data.cemetery) text += `Cemetery: ${data.cemetery}\n`;
    if (data.material) text += `Marker: ${data.material}\n`;
    text += `\nInscription:\n${data.inscription || 'None'}\n`;
    if (data.notes) text += `\nField Notes: ${data.notes}\n`;
    text += `\nTranscribed non-destructively using raking light synthesis (Stonelight).`;

    navigator.clipboard.writeText(text).then(() => {
      const prev = this.btnCopyFindAGrave.innerHTML;
      this.btnCopyFindAGrave.innerText = 'Copied to Clipboard!';
      setTimeout(() => {
        this.btnCopyFindAGrave.innerHTML = prev;
      }, 2000);
    });
  }

  populatePrintSheet() {
    const data = this.getData();
    if (this.prName) this.prName.innerText = data.name || '-';
    if (this.prBirth) this.prBirth.innerText = data.birth || '-';
    if (this.prDeath) this.prDeath.innerText = data.death || '-';
    if (this.prAge) this.prAge.innerText = data.age || '-';
    if (this.prRel) this.prRel.innerText = data.relationship || '-';
    if (this.prInscription) this.prInscription.innerText = data.inscription || '-';
    if (this.prCemetery) this.prCemetery.innerText = data.cemetery || '-';
    if (this.prMaterial) this.prMaterial.innerText = data.material || '-';
    if (this.prNotes) this.prNotes.innerText = data.notes || '-';

    const currentCanvasUrl = this.engine.getSnapshotURL();
    if (this.prImgRelit) this.prImgRelit.src = currentCanvasUrl;

    if (this.prImgFlash) {
      if (this.engine.flashPhoto && this.engine.flashPhoto.element) {
        this.prImgFlash.src = this.engine.flashPhoto.element.src;
      } else if (this.engine.photos[0] && this.engine.photos[0].element) {
        this.prImgFlash.src = this.engine.photos[0].element.src;
      }
    }
  }

  exportJsonFile() {
    const data = this.getData();
    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', str);
    const safeName = (data.name || 'stonelight_record').toLowerCase().replace(/[^a-z0-9]/g, '_');
    dlAnchor.setAttribute('download', `${safeName}_record.json`);
    dlAnchor.click();
  }

  resetForm() {
    if (confirm('Clear transcription fields?')) {
      this.setData({
        name: '',
        birth: '',
        death: '',
        age: '',
        relationship: '',
        inscription: '',
        cemetery: '',
        material: 'Slate',
        notes: ''
      });
      localStorage.removeItem(this.storageKey);
    }
  }
}
