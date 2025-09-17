/**
 * @file database.js
 * @description Manages interactions with localStorage for text-based test data.
 * Version: 6.0
 */

const DB_KEY = 'packaging_test_db_v6'; // Kunci baru untuk v6

/**
 * Retrieves the entire database object from localStorage.
 * @returns {object} The database object.
 */
export function getDatabase() {
    try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        const defaultDatabase = { tests: [] };
        localStorage.setItem(DB_KEY, JSON.stringify(defaultDatabase));
        return defaultDatabase;
    } catch (error) {
        console.error("Failed to read from localStorage:", error);
        return { tests: [] };
    }
}

/**
 * Saves the entire database object to localStorage.
 * @param {object} db The database object to save.
 */
export function saveDatabase(db) {
    try {
        if (!db || !Array.isArray(db.tests)) {
            throw new Error("Invalid database structure provided.");
        }
        const jsonString = JSON.stringify(db);
        localStorage.setItem(DB_KEY, jsonString);
    } catch (error) {
        console.error("Failed to save to localStorage:", error);
    }
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

/**
 * Deletes a test by its ID.
 * @param {number} testId The ID of the test to delete.
 */
export function deleteTest(testId) {
    let db = getDatabase();
    db.tests = db.tests.filter(t => t.id !== testId);
    saveDatabase(db);
}