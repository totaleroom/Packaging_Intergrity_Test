/**
 * @file imageStore.js
 * @description Manages storage and retrieval of image data using IndexedDB.
 * Includes auto-cleanup for old images.
 * Version: 6.0
 */

const DB_NAME = 'PackagingTestImageDB_v6';
const STORE_NAME = 'images';
const DB_VERSION = 1;
const MAX_AGE_DAYS = 30;

let db;

/**
 * Initializes and opens the IndexedDB database.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            cleanupOldImages();
            setInterval(cleanupOldImages, 24 * 60 * 60 * 1000); // Daily
            resolve(db);
        };

        request.onerror = event => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(new Error('Failed to open IndexedDB.'));
        };
    });
}

/**
 * Saves an image blob to the database.
 * @param {Blob} imageBlob The image file blob to save.
 * @returns {Promise<number>} A promise that resolves with the unique ID of the stored image.
 */
export async function saveImage(imageBlob) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add({ image: imageBlob, timestamp: Date.now() });

            request.onsuccess = event => resolve(event.target.result);
            request.onerror = () => reject(new Error('Failed to store image: ' + request.error));
        });
    } catch (error) {
        console.error('Error saving image:', error);
        throw error;
    }
}

/**
 * Retrieves an image blob from the database by its ID.
 * @param {number} imageId The ID of the image to retrieve.
 * @returns {Promise<Blob|null>} A promise that resolves with the image blob or null if not found.
 */
export async function getImage(imageId) {
    try {
        if (!imageId || typeof imageId !== 'number') return null;
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(imageId);

            request.onsuccess = event => resolve(event.target.result ? event.target.result.image : null);
            request.onerror = () => reject(new Error('Failed to retrieve image: ' + request.error));
        });
    } catch (error) {
        console.error('Error retrieving image:', error);
        throw error;
    }
}

/**
 * Cleans up old images from the database.
 */
async function cleanupOldImages() {
    try {
        const db = await initDB();
        const cutoffDate = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        
        const range = IDBKeyRange.upperBound(cutoffDate);
        const request = index.openCursor(range);
        
        let deletedCount = 0;
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                deletedCount++;
                cursor.continue();
            } else {
                if (deletedCount > 0) {
                    console.log(`Auto-cleaned ${deletedCount} old image(s).`);
                }
            }
        };
    } catch (error) {
        console.error('Error during image cleanup:', error);
    }
}