/**
 * @file imageStore.js
 * @description Manages storage and retrieval of binary image data using IndexedDB.
 * This provides a robust, asynchronous solution for large file storage.
 * Version: 3.0
 */

const DB_NAME = 'PackagingTestImageDB_v3';
const STORE_NAME = 'images';
let db;

/**
 * Initializes and opens the IndexedDB database.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = event => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = event => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject('Error opening IndexedDB.');
        };
    });
}

/**
 * Saves an image blob to the database.
 * @param {Blob} imageBlob The image file blob to save.
 * @returns {Promise<number>} A promise that resolves with the unique ID of the stored image.
 */
export async function saveImage(imageBlob) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add({ image: imageBlob });

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject('Could not store image: ' + event.target.error);
    });
}

/**
 * Retrieves an image blob from the database by its ID.
 * @param {number} imageId The ID of the image to retrieve.
 * @returns {Promise<Blob|null>} A promise that resolves with the image blob or null if not found.
 */
export async function getImage(imageId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(imageId);

        request.onsuccess = event => resolve(event.target.result ? event.target.result.image : null);
        request.onerror = event => reject('Could not retrieve image: ' + event.target.error);
    });
}