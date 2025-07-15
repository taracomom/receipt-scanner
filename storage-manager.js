// Local Storage Manager for Receipt Scanner PWA
// Provides offline capability, data persistence, and synchronization

class StorageManager {
    constructor() {
        this.dbName = 'ReceiptScannerDB';
        this.dbVersion = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.maxOfflineItems = 100;
        
        this.init();
        this.setupNetworkListeners();
    }

    // Initialize IndexedDB and storage
    async init() {
        try {
            await this.initDatabase();
            await this.loadSyncQueue();
            console.log('Storage manager initialized');
        } catch (error) {
            console.error('Storage initialization failed:', error);
            ERROR_HANDLER.handleError('STORAGE_ERROR', {
                message: 'Failed to initialize local storage',
                error: error
            });
        }
    }

    // Initialize IndexedDB database
    initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create receipts store
                if (!db.objectStoreNames.contains('receipts')) {
                    const receiptsStore = db.createObjectStore('receipts', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    receiptsStore.createIndex('date', 'date', { unique: false });
                    receiptsStore.createIndex('status', 'status', { unique: false });
                    receiptsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('type', 'type', { unique: false });
                }

                // Create settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // Setup network status listeners
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network: Online');
            UI_MANAGER.showNotification('インターネット接続が復旧しました', 'success');
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network: Offline');
            UI_MANAGER.showNotification('オフラインモードです。データはローカルに保存されます', 'warning');
        });
    }

    // Save receipt data locally
    async saveReceipt(receiptData) {
        try {
            const receipt = {
                ...receiptData,
                id: this.generateId(),
                timestamp: Date.now(),
                status: this.isOnline ? 'pending_sync' : 'offline',
                synced: false,
                localOnly: !this.isOnline
            };

            await this.storeData('receipts', receipt);
            
            // Add to sync queue if online
            if (this.isOnline) {
                await this.addToSyncQueue('upload_receipt', receipt);
            }

            console.log('Receipt saved locally:', receipt.id);
            return receipt;

        } catch (error) {
            console.error('Failed to save receipt:', error);
            ERROR_HANDLER.handleError('STORAGE_ERROR', {
                code: 'SAVE_FAILED',
                message: 'Failed to save receipt data',
                error: error
            });
            throw error;
        }
    }

    // Get all receipts
    async getReceipts(filters = {}) {
        try {
            const receipts = await this.getAllData('receipts');
            
            // Apply filters
            let filtered = receipts;
            
            if (filters.date) {
                filtered = filtered.filter(r => r.date === filters.date);
            }
            
            if (filters.status) {
                filtered = filtered.filter(r => r.status === filters.status);
            }
            
            if (filters.company) {
                filtered = filtered.filter(r => 
                    r.company.toLowerCase().includes(filters.company.toLowerCase())
                );
            }

            // Sort by timestamp (newest first)
            filtered.sort((a, b) => b.timestamp - a.timestamp);
            
            return filtered;

        } catch (error) {
            console.error('Failed to get receipts:', error);
            return [];
        }
    }

    // Update receipt
    async updateReceipt(id, updates) {
        try {
            const receipt = await this.getData('receipts', id);
            if (!receipt) {
                throw new Error('Receipt not found');
            }

            const updatedReceipt = {
                ...receipt,
                ...updates,
                timestamp: Date.now(),
                status: 'pending_sync'
            };

            await this.storeData('receipts', updatedReceipt);
            
            // Add to sync queue
            if (this.isOnline) {
                await this.addToSyncQueue('update_receipt', updatedReceipt);
            }

            return updatedReceipt;

        } catch (error) {
            console.error('Failed to update receipt:', error);
            throw error;
        }
    }

    // Delete receipt
    async deleteReceipt(id) {
        try {
            await this.deleteData('receipts', id);
            
            // Add to sync queue for server deletion
            if (this.isOnline) {
                await this.addToSyncQueue('delete_receipt', { id });
            }

            console.log('Receipt deleted:', id);

        } catch (error) {
            console.error('Failed to delete receipt:', error);
            throw error;
        }
    }

    // Save image blob locally
    async saveImage(imageBlob, receiptId) {
        try {
            // Convert blob to base64 for storage
            const base64 = await this.blobToBase64(imageBlob);
            
            const imageData = {
                id: `img_${receiptId}`,
                receiptId: receiptId,
                data: base64,
                size: imageBlob.size,
                type: imageBlob.type,
                timestamp: Date.now()
            };

            await this.storeData('images', imageData);
            return imageData.id;

        } catch (error) {
            console.error('Failed to save image:', error);
            throw error;
        }
    }

    // Get image by receipt ID
    async getImage(receiptId) {
        try {
            const imageData = await this.getData('images', `img_${receiptId}`);
            if (!imageData) return null;

            // Convert base64 back to blob
            const blob = this.base64ToBlob(imageData.data, imageData.type);
            return blob;

        } catch (error) {
            console.error('Failed to get image:', error);
            return null;
        }
    }

    // Add item to sync queue
    async addToSyncQueue(type, data) {
        const queueItem = {
            type,
            data,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts: 3
        };

        await this.storeData('syncQueue', queueItem);
        this.syncQueue.push(queueItem);
    }

    // Load sync queue from storage
    async loadSyncQueue() {
        try {
            this.syncQueue = await this.getAllData('syncQueue');
            console.log(`Loaded ${this.syncQueue.length} items from sync queue`);
        } catch (error) {
            console.error('Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    // Process sync queue when online
    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log(`Processing ${this.syncQueue.length} sync items`);
        UI_MANAGER.showLoading('同期中...', 0);

        const totalItems = this.syncQueue.length;
        let processedItems = 0;

        for (const item of [...this.syncQueue]) {
            try {
                await this.processSyncItem(item);
                
                // Remove from queue
                await this.deleteData('syncQueue', item.id);
                const index = this.syncQueue.findIndex(q => q.id === item.id);
                if (index !== -1) {
                    this.syncQueue.splice(index, 1);
                }

                processedItems++;
                const progress = (processedItems / totalItems) * 100;
                UI_MANAGER.updateProgress(progress, `同期中... ${processedItems}/${totalItems}`);

            } catch (error) {
                console.error('Sync item failed:', error);
                
                // Update attempt count
                item.attempts++;
                if (item.attempts >= item.maxAttempts) {
                    // Remove failed item after max attempts
                    await this.deleteData('syncQueue', item.id);
                    const index = this.syncQueue.findIndex(q => q.id === item.id);
                    if (index !== -1) {
                        this.syncQueue.splice(index, 1);
                    }
                } else {
                    // Update item with new attempt count
                    await this.storeData('syncQueue', item);
                }
            }
        }

        UI_MANAGER.hideLoading();
        
        if (processedItems > 0) {
            UI_MANAGER.showNotification(
                `${processedItems}件のデータを同期しました`, 
                'success'
            );
        }
    }

    // Process individual sync item
    async processSyncItem(item) {
        switch (item.type) {
            case 'upload_receipt':
                return await this.syncUploadReceipt(item.data);
            case 'update_receipt':
                return await this.syncUpdateReceipt(item.data);
            case 'delete_receipt':
                return await this.syncDeleteReceipt(item.data);
            default:
                throw new Error(`Unknown sync type: ${item.type}`);
        }
    }

    // Sync upload receipt to server
    async syncUploadReceipt(receiptData) {
        // This would integrate with your Google Drive upload logic
        // For now, just mark as synced
        receiptData.status = 'synced';
        receiptData.synced = true;
        receiptData.localOnly = false;
        
        await this.storeData('receipts', receiptData);
        return receiptData;
    }

    // Sync update receipt to server
    async syncUpdateReceipt(receiptData) {
        // Update server copy
        receiptData.status = 'synced';
        receiptData.synced = true;
        
        await this.storeData('receipts', receiptData);
        return receiptData;
    }

    // Sync delete receipt from server
    async syncDeleteReceipt(data) {
        // Delete from server
        console.log('Syncing delete for receipt:', data.id);
        return true;
    }

    // Generic database operations
    async storeData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Utility functions
    generateId() {
        return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64, type) {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    }

    // Get storage statistics
    async getStorageStats() {
        const receipts = await this.getAllData('receipts');
        const syncQueue = await this.getAllData('syncQueue');
        
        const stats = {
            totalReceipts: receipts.length,
            syncedReceipts: receipts.filter(r => r.synced).length,
            offlineReceipts: receipts.filter(r => r.localOnly).length,
            pendingSync: syncQueue.length,
            isOnline: this.isOnline
        };

        return stats;
    }

    // Export data for backup
    async exportData() {
        const receipts = await this.getAllData('receipts');
        const data = {
            receipts,
            exportDate: new Date().toISOString(),
            version: this.dbVersion
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Clear all data
    async clearAllData() {
        const stores = ['receipts', 'syncQueue', 'settings'];
        
        for (const storeName of stores) {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        this.syncQueue = [];
        console.log('All local data cleared');
    }
}

// Global storage manager instance
const STORAGE_MANAGER = new StorageManager();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.STORAGE_MANAGER = STORAGE_MANAGER;
}