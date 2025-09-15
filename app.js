/**
 * @file app.js
 * @description Main application controller. Orchestrates all modules,
 * handles user events, and manages application state.
 * Version: 3.0.1 (Bugfix Release)
 */

// 1. IMPORT MODUL SPESIALIS
import * as db from './database.js';
import * as ui from './ui.js';
import * as imageStore from './imageStore.js';

// 2. KONFIGURASI & STATE GLOBAL
const IMAGE_COMPRESSION_QUALITY = 0.7; // Kualitas kompresi 70%
const state = {
    database: null,
    activeTab: 'dashboard'
};

// 3. FUNGSI INISIALISASI
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Memuat preferensi tema dari localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme === 'dark' ? 'dark-mode' : '';
    
    state.database = db.getDatabase();
    navigateToTab('dashboard'); // Panggilan yang menyebabkan error, sekarang fungsinya sudah ada
    attachGlobalListeners();
    console.log('Packaging Integrity Test System v3.0.1 Initialized.');
}

// 4. EVENT LISTENERS & HANDLERS
function attachGlobalListeners() {
    document.querySelector('.nav-tabs').addEventListener('click', handleNavClick);
    document.querySelector('.tab-content').addEventListener('click', handleContentClick);
    
    // Listeners untuk modals
    document.getElementById('test-detail-modal').addEventListener('click', (e) => {
        if (e.target.matches('.btn-close-modal') || e.target.classList.contains('modal')) {
            ui.hideTestDetailModal();
        }
    });
    document.getElementById('changelog-modal').addEventListener('click', (e) => {
        if (e.target.matches('.btn-close-modal') || e.target.classList.contains('modal')) {
            ui.hideChangelogModal();
        }
    });
    
    // Listener untuk header
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('changelog-link').addEventListener('click', (e) => {
        e.preventDefault();
        ui.showChangelogModal();
    });
}

function handleNavClick(e) {
    const clickedTab = e.target.closest('.nav-tab');
    if (clickedTab && clickedTab.dataset.tab !== state.activeTab) {
        navigateToTab(clickedTab.dataset.tab);
    }
}

async function handleContentClick(e) {
    // Buka detail test saat item list diklik
    if (e.target.closest('.list-item')) {
        const testId = parseInt(e.target.closest('.list-item').dataset.id);
        const test = db.getTestById(testId);
        if (test) {
            await ui.showTestDetailModal(test, imageStore.getImage);
        }
    }
    // Handle klik di tab laporan
    if (state.activeTab === 'reports') {
        if (e.target.matches('#btn-export-excel')) {
            // generateAndExportExcel(); // Fungsi ini akan kita buat nanti
        }
    }
}

function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    const newTheme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
}

// 5. NAVIGASI & RENDERING KONTEN (FUNGSI YANG HILANG)
/**
 * @description Handles the logic of switching between tabs.
 * @param {string} tabName - The name of the tab to switch to (e.g., 'dashboard').
 */
function navigateToTab(tabName) {
    state.activeTab = tabName;
    
    // Update active class on nav tabs
    document.querySelector('.nav-tab.active')?.classList.remove('active');
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    showActiveTabContent();
}

/**
 * @description Renders the content for the currently active tab. Acts as a simple router.
 */
function showActiveTabContent() {
    switch (state.activeTab) {
        case 'dashboard':
            // ui.renderDashboard(calculateStatistics());
            break;
        case 'test-list':
            // ui.renderTestList(state.database.tests);
            break;
        case 'new-test':
            ui.renderNewTestForm();
            attachNewTestFormListeners();
            break;
        case 'reports':
            // ui.renderReports();
            break;
        default:
            console.error(`Unknown tab: ${state.activeTab}`);
            document.querySelector('.tab-content').innerHTML = `<p>Error: Tab tidak ditemukan.</p>`;
    }
}


// 6. LOGIKA FORM & DATA
function attachNewTestFormListeners() {
    const form = document.getElementById('test-form');
    if (!form) return;

    let caseCounter = 0;

    form.addEventListener('click', (e) => {
        if (e.target.matches('#btn-add-case')) {
            caseCounter++;
            ui.addCaseCardToUI(caseCounter);
        }
        if (e.target.matches('.btn-remove-case')) {
            e.target.closest('.case-card').remove();
        }
        if (e.target.matches('.btn-add-inspection')) {
            ui.addProductInspectionToUI(e.target);
        }
        if (e.target.matches('.btn-remove-inspection')) {
            e.target.closest('.product-inspection-item').remove();
        }
    });

    form.addEventListener('change', e => {
        if (e.target.matches('.case-image-input, .product-image-input')) {
            ui.previewImage(e.target);
        }
    });

    form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    // ... (Logika submit form akan ditambahkan di sini) ...
    alert('Form submitted! (Logic to save data is pending)');
}

// ... (Fungsi-fungsi lain seperti getFormData, compressImage, calculateStatistics akan ditambahkan di sini) ...