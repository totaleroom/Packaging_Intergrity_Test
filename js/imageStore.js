/**
 * @file imageStore.js
 * @description Manages storage and retrieval of image data using Supabase Storage.
 * Version: 6.0 - Migrated from IndexedDB to Supabase Storage
 */

import { supabase } from './supabaseClient.js';

const BUCKET_NAME = 'test-images';
const DB_NAME = 'PackagingTestImageDB_v6';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let db;
let cleanupIntervalId = null;

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

            if (!cleanupIntervalId) {
                cleanupIntervalId = setInterval(() => {
                    console.log('Running IndexedDB cleanup...');
                }, 24 * 60 * 60 * 1000);
            }

            resolve(db);
        };

        request.onerror = event => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(new Error('Failed to open IndexedDB.'));
        };
    });
}

function fallbackSaveToIndexedDB(imageBlob) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add({ image: imageBlob, timestamp: Date.now() });

            request.onsuccess = event => resolve(`idb-${event.target.result}`);
            request.onerror = () => reject(new Error('Failed to store image: ' + request.error));
        } catch (error) {
            reject(error);
        }
    });
}

function fallbackGetFromIndexedDB(imageId) {
    return new Promise(async (resolve, reject) => {
        try {
            const numericId = parseInt(imageId.replace('idb-', ''));
            if (isNaN(numericId)) return resolve(null);

            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(numericId);

            request.onsuccess = event => resolve(event.target.result ? event.target.result.image : null);
            request.onerror = () => reject(new Error('Failed to retrieve image: ' + request.error));
        } catch (error) {
            reject(error);
        }
    });
}

export async function saveImage(imageBlob) {
    try {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, imageBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Failed to upload to Supabase Storage, using IndexedDB fallback:', error);
        return await fallbackSaveToIndexedDB(imageBlob);
    }
}

export async function getImage(imageId) {
    try {
        if (!imageId) return null;

        if (typeof imageId === 'string' && imageId.startsWith('idb-')) {
            return await fallbackGetFromIndexedDB(imageId);
        }

        if (typeof imageId === 'number') {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(imageId);

                request.onsuccess = event => resolve(event.target.result ? event.target.result.image : null);
                request.onerror = () => reject(new Error('Failed to retrieve image: ' + request.error));
            });
        }

        if (typeof imageId === 'string' && (imageId.startsWith('http://') || imageId.startsWith('https://'))) {
            const response = await fetch(imageId);
            if (!response.ok) throw new Error('Failed to fetch image');
            return await response.blob();
        }

        return null;
    } catch (error) {
        console.error('Error retrieving image:', error);
        return null;
    }
}