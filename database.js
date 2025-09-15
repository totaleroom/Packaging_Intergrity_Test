/**
 * @file database.js
 * @description Manages all interactions with localStorage for text-based test data.
 * Acts as a synchronous, simple key-value store.
 * Version: 3.0
 */

const DB_KEY = 'transport_test_db_v3'; // Kunci baru untuk v3 agar tidak konflik dengan data lama

const defaultDatabase = {
    tests: [],
    config: { /* ... */ }
};

/**
 * Retrieves the entire database object from localStorage.
 * @returns {object} The database object.
 */
export function getDatabase() {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    saveDatabase(defaultDatabase);
    return defaultDatabase;
}

/**
 * Saves the entire database object to localStorage.
 * @param {object} db The database object to save.
 */
export function saveDatabase(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/**
 * Adds a new test record to the database.
 * @param {object} testData The new test data object.
 */
export function addTest(testData) {
    const db = getDatabase();
    db.tests.push(testData);
    saveDatabase(db);
}

/**
 * Retrieves a single test by its unique ID.
 * @param {number} testId The ID of the test to find.
 * @returns {object | undefined} The test object or undefined if not found.
 */
export function getTestById(testId) {
    const db = getDatabase();
    return db.tests.find(t => t.id === testId);
}