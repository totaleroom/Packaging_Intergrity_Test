/**
 * @file database.js
 * @description Manages interactions with Supabase for test data.
 * Version: 6.0 - Migrated from localStorage to Supabase
 */

import { supabase } from './supabaseClient.js';

const DB_KEY = 'packaging_test_db_v6';
let cachedTests = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000;

function getFromLocalStorageCache() {
    try {
        const stored = localStorage.getItem(DB_KEY);
        return stored ? JSON.parse(stored) : { tests: [] };
    } catch (error) {
        console.error("Failed to read cache:", error);
        return { tests: [] };
    }
}

function saveToLocalStorageCache(db) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Failed to save cache:", error);
    }
}

function flattenTestData(dbTest) {
    return {
        id: dbTest.id,
        testType: dbTest.test_type,
        dateOfTest: dbTest.date_of_test,
        testerName: dbTest.tester_name,
        brandName: dbTest.brand_name,
        productName: dbTest.product_name,
        productSku: dbTest.product_sku,
        testNotes: dbTest.test_notes || '',
        overallConclusion: dbTest.overall_conclusion || '',
        recommendations: dbTest.recommendations || '',
        transportMethod: dbTest.transport_method || '',
        originLocation: dbTest.origin_location || '',
        destinationLocation: dbTest.destination_location || '',
        transportDuration: dbTest.transport_duration || '',
        cases: dbTest.test_cases?.map(c => ({
            position: c.position,
            totalUnitsInspected: c.total_units_inspected,
            caseDamage: {
                type: c.case_damage_type,
                description: c.case_damage_description || '',
                imageId: c.case_damage_image_url
            },
            productFailures: c.product_failures?.map(f => ({
                mode: f.failure_mode,
                unitsFailed: f.units_failed,
                imageId: f.image_url
            })) || []
        })) || []
    };
}

export async function getDatabase() {
    const now = Date.now();
    if (cachedTests && (now - cacheTimestamp) < CACHE_DURATION) {
        return { tests: cachedTests };
    }

    try {
        const { data: tests, error } = await supabase
            .from('tests')
            .select(`
                *,
                test_cases (
                    *,
                    product_failures (*)
                )
            `)
            .order('date_of_test', { ascending: false });

        if (error) throw error;

        const flattenedTests = (tests || []).map(flattenTestData);
        cachedTests = flattenedTests;
        cacheTimestamp = now;

        saveToLocalStorageCache({ tests: flattenedTests });

        return { tests: flattenedTests };
    } catch (error) {
        console.error("Failed to fetch from Supabase, using cache:", error);
        return getFromLocalStorageCache();
    }
}

export function invalidateCache() {
    cachedTests = null;
    cacheTimestamp = 0;
}

export async function addTest(testData) {
    try {
        const testRecord = {
            id: testData.id,
            test_type: testData.testType,
            date_of_test: testData.dateOfTest,
            tester_name: testData.testerName,
            brand_name: testData.brandName,
            product_name: testData.productName,
            product_sku: testData.productSku,
            test_notes: testData.testNotes || '',
            overall_conclusion: testData.overallConclusion || '',
            recommendations: testData.recommendations || '',
            transport_method: testData.transportMethod || null,
            origin_location: testData.originLocation || null,
            destination_location: testData.destinationLocation || null,
            transport_duration: testData.transportDuration || null
        };

        const { data: insertedTest, error: testError } = await supabase
            .from('tests')
            .insert(testRecord)
            .select()
            .single();

        if (testError) throw testError;

        for (const caseItem of testData.cases) {
            const { data: insertedCase, error: caseError } = await supabase
                .from('test_cases')
                .insert({
                    test_id: testData.id,
                    position: caseItem.position,
                    total_units_inspected: caseItem.totalUnitsInspected,
                    case_damage_type: caseItem.caseDamage.type,
                    case_damage_description: caseItem.caseDamage.description || '',
                    case_damage_image_url: caseItem.caseDamage.imageId || null
                })
                .select()
                .single();

            if (caseError) throw caseError;

            if (caseItem.productFailures && caseItem.productFailures.length > 0) {
                const failures = caseItem.productFailures.map(f => ({
                    case_id: insertedCase.id,
                    failure_mode: f.mode,
                    units_failed: f.unitsFailed,
                    image_url: f.imageId || null
                }));

                const { error: failuresError } = await supabase
                    .from('product_failures')
                    .insert(failures);

                if (failuresError) throw failuresError;
            }
        }

        invalidateCache();
        return insertedTest;
    } catch (error) {
        console.error("Failed to add test:", error);
        const db = getFromLocalStorageCache();
        db.tests.push(testData);
        saveToLocalStorageCache(db);
        throw error;
    }
}

export async function getTestById(testId) {
    try {
        const { data: test, error } = await supabase
            .from('tests')
            .select(`
                *,
                test_cases (
                    *,
                    product_failures (*)
                )
            `)
            .eq('id', testId)
            .maybeSingle();

        if (error) throw error;
        if (!test) return undefined;

        return flattenTestData(test);
    } catch (error) {
        console.error("Failed to fetch test by ID:", error);
        const db = getFromLocalStorageCache();
        return db.tests.find(t => t.id === testId);
    }
}

export async function deleteTest(testId) {
    try {
        const { error } = await supabase
            .from('tests')
            .delete()
            .eq('id', testId);

        if (error) throw error;

        invalidateCache();
    } catch (error) {
        console.error("Failed to delete test:", error);
        const db = getFromLocalStorageCache();
        db.tests = db.tests.filter(t => t.id !== testId);
        saveToLocalStorageCache(db);
        throw error;
    }
}