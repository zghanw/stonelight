class GuideModal {
  constructor() {
    this.modalGuide = document.getElementById('modal-guide');
    this.btnOpenGuide = document.getElementById('btn-open-guide');
    this.btnCloseGuide = document.getElementById('btn-close-guide');
    this.btnGuideOk = document.getElementById('btn-guide-ok');

    this.modalClock = document.getElementById('modal-clock');
    this.btnCloseClock = document.getElementById('btn-close-clock');
    this.clockButtons = document.querySelectorAll('.clock-pick-btn');

    this.onClockSelectedCallback = null;
    this.currentEditingIndex = null;
    this.lastFocusedElement = null;

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnOpenGuide) {
      this.btnOpenGuide.addEventListener('click', () => this.showGuide());
    }
    if (this.btnCloseGuide) {
      this.btnCloseGuide.addEventListener('click', () => this.hideGuide());
    }
    if (this.btnGuideOk) {
      this.btnGuideOk.addEventListener('click', () => this.hideGuide());
    }

    if (this.modalGuide) {
      this.modalGuide.addEventListener('click', (e) => {
        if (e.target === this.modalGuide) this.hideGuide();
      });
    }

    if (this.btnCloseClock) {
      this.btnCloseClock.addEventListener('click', () => this.hideClockPicker());
    }

    if (this.modalClock) {
      this.modalClock.addEventListener('click', (e) => {
        if (e.target === this.modalClock) this.hideClockPicker();
      });
    }

    this.clockButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const hour = btn.getAttribute('data-hour');
        if (this.onClockSelectedCallback) {
          this.onClockSelectedCallback(this.currentEditingIndex, hour);
        }
        this.hideClockPicker();
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideGuide();
        this.hideClockPicker();
      }
    });
  }

  showGuide() {
    this.lastFocusedElement = document.activeElement;
    if (this.modalGuide) {
      this.modalGuide.classList.remove('hidden');
      if (this.btnCloseGuide) {
        this.btnCloseGuide.focus();
      }
    }
  }

  hideGuide() {
    if (this.modalGuide) {
      this.modalGuide.classList.add('hidden');
    }
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }

  openClockPicker(index, currentHour, onSelect) {
    this.currentEditingIndex = index;
    this.onClockSelectedCallback = onSelect;
    this.lastFocusedElement = document.activeElement;

    this.clockButtons.forEach(btn => {
      const h = btn.getAttribute('data-hour');
      if (h === String(currentHour)) {
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
      }
    });

    if (this.modalClock) {
      this.modalClock.classList.remove('hidden');
      if (this.btnCloseClock) {
        this.btnCloseClock.focus();
      }
    }
  }

  hideClockPicker() {
    if (this.modalClock) {
      this.modalClock.classList.add('hidden');
    }
    this.currentEditingIndex = null;
    this.onClockSelectedCallback = null;
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }
}
