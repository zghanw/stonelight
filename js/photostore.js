class PhotoStore {
  constructor() {
    this.dbName = 'stonelight';
    this.storeName = 'photos';
    this.key = 'mine';
  }

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this.storeName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async load() {
    try {
      const db = await this.open();
      return await new Promise((resolve) => {
        const req = db.transaction(this.storeName).objectStore(this.storeName).get(this.key);
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  }

  async save(items) {
    try {
      const db = await this.open();
      return await new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(items, this.key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
}
