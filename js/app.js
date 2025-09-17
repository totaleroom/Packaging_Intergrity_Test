/**
 * @file app.js
 * @description Main application controller.
 * Version: 6.0
 */

import * as db from './database.js';
import * as ui from './ui.js';
import * as imageStore from './imageStore.js';

const IMAGE_COMPRESSION_QUALITY = 0.7;
const state = {
    database: null,
    activeTab: 'dashboard'
};

// --- DEKLARASI FUNGSI UTAMA ---

function updateNavLamp() {
    const activeTab = document.querySelector('.nav-tab.active');
    const lamp = document.getElementById('nav-lamp');
    if (!activeTab || !lamp) return;

    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;

    lamp.style.width = `${width}px`;
    lamp.style.transform = `translateX(${left}px)`;
}

function navigateToTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    requestAnimationFrame(updateNavLamp);
    showActiveTabContent();
}

function showActiveTabContent() {
    try {
        switch (state.activeTab) {
            case 'dashboard':
                const allBrands = [...new Set(state.database.tests.map(t => t.brandName).filter(Boolean))];
                const allSkus = [...new Set(state.database.tests.map(t => t.productSku).filter(Boolean))];
                ui.renderDashboard(calculateStatistics(), allBrands, allSkus);
                attachDashboardListeners();
                break;
            case 'test-list':
                ui.renderTestList(state.database.tests);
                break;
            case 'new-test':
                ui.showSelectTestTypeModal();
                break;
            case 'reports':
                ui.renderReports();
                attachReportsListeners();
                break;
            case 'benchmark':
                ui.renderBenchmark(state.database.tests);
                attachBenchmarkListeners();
                break;
            default:
                throw new Error(`Unknown tab: ${state.activeTab}`);
        }
    } catch (error) {
        console.error("Failed to render tab content:", error);
        ui.showNotification("Error loading content.", "error");
    }
}

function attachGlobalListeners() {
    document.querySelector('.floating-nav').addEventListener('click', handleNavClick);
    document.querySelector('.tab-content').addEventListener('click', handleContentClick);
    window.addEventListener('resize', updateNavLamp);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('changelog-link').addEventListener('click', (e) => {
        e.preventDefault();
        ui.showChangelogModal();
    });
    document.getElementById('changelog-modal').addEventListener('click', (e) => {
        if (e.target.matches('.btn-close-modal') || e.target.classList.contains('modal')) {
            ui.hideChangelogModal();
        }
    });
    document.getElementById('test-detail-modal').addEventListener('click', (e) => {
        if (e.target.matches('.btn-close-modal') || e.target.classList.contains('modal')) {
            ui.hideTestDetailModal();
        }
        if (e.target.matches('#export-single-pdf-btn')) {
            const testId = parseInt(e.target.closest('.modal').dataset.testid);
            const test = db.getTestById(testId);
            if (test) generateSingleTestPdfReport(test);
        }
    });
    document.getElementById('select-test-type-modal').addEventListener('click', (e) => {
        if (e.target.matches('.btn-close-modal')) {
            ui.hideSelectTestTypeModal();
        }
        if (e.target.matches('[data-test-type]')) {
            const testType = e.target.dataset.testType;
            ui.hideSelectTestTypeModal();
            ui.renderNewTestForm();
            document.querySelector('.test-type-display').textContent = testType.charAt(0).toUpperCase() + testType.slice(1) + ' Test';
            if (testType === 'transport') {
                ui.renderTransportFields();
            }
            attachNewTestFormListeners(testType);
        }
    });
    document.getElementById('benchmark-results-modal').addEventListener('click', (e) => {
        if (e.target.matches('.btn-close-modal') || e.target.classList.contains('modal')) {
            ui.hideBenchmarkResultsModal();
        }
    });
}

function attachDashboardListeners() {
    const brandFilter = document.getElementById('brand-filter');
    const skuFilter = document.getElementById('sku-filter');

    const updateDashboardView = () => {
        const selectedBrand = brandFilter.value;
        const selectedSku = skuFilter.value;
        const filteredStats = calculateStatistics(selectedBrand, selectedSku);
        
        const allBrands = [...new Set(state.database.tests.map(t => t.brandName).filter(Boolean))];
        const allSkus = [...new Set(state.database.tests.map(t => t.productSku).filter(Boolean))];
        
        ui.renderDashboard(filteredStats, allBrands, allSkus);
        document.getElementById('brand-filter').value = selectedBrand;
        document.getElementById('sku-filter').value = selectedSku;
        attachDashboardListeners();
    };

    if (brandFilter) brandFilter.addEventListener('change', updateDashboardView);
    if (skuFilter) skuFilter.addEventListener('change', updateDashboardView);
}

function attachReportsListeners() {
    const generateBtn = document.getElementById('generate-summary-pdf-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateSummaryPdfReport);
    }
}

function attachBenchmarkListeners() {
    const compareBtn = document.getElementById('compare-btn');
    const checkboxes = document.querySelectorAll('.benchmark-checkbox');
    const clearBtn = document.getElementById('clear-benchmark-selection-btn');

    const updateCompareButtonState = () => {
        const selectedCount = document.querySelectorAll('.benchmark-checkbox:checked').length;
        if(compareBtn) compareBtn.disabled = selectedCount < 2;
    };

    checkboxes.forEach(cb => cb.addEventListener('change', updateCompareButtonState));

    if (compareBtn) {
        compareBtn.addEventListener('click', handleBenchmark);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateCompareButtonState();
        });
    }
}

async function handleContentClick(e) {
    const listItem = e.target.closest('.list-item');
    if (listItem) {
        const testId = parseInt(listItem.dataset.id);
        if (e.target.matches('.btn-delete-test')) {
            if (confirm('Apakah Anda yakin ingin menghapus test ini? Tindakan ini tidak bisa dibatalkan.')) {
                db.deleteTest(testId);
                state.database = db.getDatabase();
                ui.showNotification("Test berhasil dihapus.", "success");
                showActiveTabContent();
            }
        } else if (e.target.closest('.list-item-main')) {
            const test = db.getTestById(testId);
            if (test) {
                document.getElementById('test-detail-modal').dataset.testid = test.id;
                await ui.showTestDetailModal(test, imageStore.getImage);
            }
        }
    }
}

function handleNavClick(e) {
    const clickedTab = e.target.closest('.nav-tab');
    if (clickedTab && clickedTab.dataset.tab !== state.activeTab) {
        navigateToTab(clickedTab.dataset.tab);
    }
}

function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function attachNewTestFormListeners(testType) {
    const form = document.getElementById('test-form');
    if (!form) return;
    let caseCounter = 0;
    form.addEventListener('click', (e) => {
        if (e.target.matches('#btn-add-case')) { caseCounter++; ui.addCaseCardToUI(caseCounter); }
        if (e.target.matches('.btn-remove-case')) { e.target.closest('.case-card')?.remove(); }
        if (e.target.matches('.btn-add-failure')) { ui.addProductFailureToUI(e.target); }
        if (e.target.matches('.btn-remove-failure')) { e.target.closest('.product-failure-item')?.remove(); }
        if (e.target.matches('#btn-reset-form')) { form.reset(); document.getElementById('cases-container').innerHTML = ''; caseCounter = 0; }
    });
    form.addEventListener('change', e => {
        if (e.target.matches('.case-image-input, .product-image-input')) { ui.previewImage(e.target); }
    });
    form.addEventListener('submit', (e) => handleFormSubmit(e, testType));
}

async function handleFormSubmit(e, testType) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    if (!form.checkValidity()) {
        ui.showNotification("Please fill all required fields.", "error");
        form.reportValidity();
        return;
    }
    submitButton.disabled = true;
    submitButton.innerHTML = `<div class="spinner"></div> Saving...`;
    try {
        const testData = await getFormDataWithImages(testType);
        db.addTest(testData);
        state.database = db.getDatabase();
        ui.showNotification("Test data saved successfully!", "success");
        navigateToTab('test-list');
    } catch (error) {
        console.error("Form submission failed:", error);
        ui.showNotification("Failed to save data.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "💾 Simpan Test";
    }
}

async function getFormDataWithImages(testType) {
    const form = document.getElementById('test-form');
    const testData = {
        id: Date.now(),
        testType: testType,
        dateOfTest: form.querySelector('#dateOfTest').value,
        testerName: form.querySelector('#testerName').value,
        brandName: form.querySelector('#brandName').value,
        productName: form.querySelector('#productName').value,
        productSku: form.querySelector('#productSku').value,
        testNotes: form.querySelector('#testNotes').value,
        overallConclusion: form.querySelector('#overallConclusion').value,
        recommendations: form.querySelector('#recommendations').value,
        cases: []
    };

    if (testType === 'transport') {
        testData.transportMethod = form.querySelector('#transportMethod')?.value || '';
        testData.originLocation = form.querySelector('#originLocation')?.value || '';
        testData.destinationLocation = form.querySelector('#destinationLocation')?.value || '';
        testData.transportDuration = form.querySelector('#transportDuration')?.value || '';
    }

    for (const caseCard of form.querySelectorAll('.case-card')) {
        const caseImageInput = caseCard.querySelector('.case-image-input');
        const caseData = {
            position: caseCard.querySelector('.case-position').value,
            totalUnitsInspected: parseInt(caseCard.querySelector('.total-units-inspected').value) || 0,
            caseDamage: {
                type: caseCard.querySelector('.case-damage-type').value,
                description: caseCard.querySelector('.case-damage-description').value,
                imageId: null
            },
            productFailures: []
        };
        if (caseImageInput.files[0]) {
            const compressedBlob = await compressImage(caseImageInput.files[0]);
            caseData.caseDamage.imageId = await imageStore.saveImage(compressedBlob);
        }
        for (const failureItem of caseCard.querySelectorAll('.product-failure-item')) {
            const productImageInput = failureItem.querySelector('.product-image-input');
            const failureData = {
                mode: failureItem.querySelector('.failure-mode').value,
                unitsFailed: parseInt(failureItem.querySelector('.units-failed').value) || 0,
                imageId: null
            };
            if (productImageInput.files[0]) {
                const compressedBlob = await compressImage(productImageInput.files[0]);
                failureData.imageId = await imageStore.saveImage(compressedBlob);
            }
            caseData.productFailures.push(failureData);
        }
        testData.cases.push(caseData);
    }
    return testData;
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (blob) { resolve(blob); } 
                    else { reject(new Error('Canvas to Blob conversion failed')); }
                }, 'image/jpeg', IMAGE_COMPRESSION_QUALITY);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

function calculateStatistics(filterBrand = 'all', filterSku = 'all', testArray = state.database.tests) {
    let tests = testArray;
    if (filterBrand !== 'all') {
        tests = tests.filter(t => t.brandName === filterBrand);
    }
    if (filterSku !== 'all') {
        tests = tests.filter(t => t.productSku === filterSku);
    }

    let totalCases = 0;
    let totalInspectedProducts = 0;
    let totalFailedProducts = 0;
    const failureModeCounts = {};

    if (!tests) return { totalTests: 0, totalCases: 0, totalFailedProducts: 0, failureRate: 0, failureModeData: {} };

    tests.forEach(test => {
        test.cases.forEach(currentCase => {
            totalCases++;
            totalInspectedProducts += currentCase.totalUnitsInspected;
            currentCase.productFailures.forEach(failure => {
                totalFailedProducts += failure.unitsFailed;
                failureModeCounts[failure.mode] = (failureModeCounts[failure.mode] || 0) + failure.unitsFailed;
            });
        });
    });

    const failureRate = totalInspectedProducts > 0 
        ? ((totalFailedProducts / totalInspectedProducts) * 100).toFixed(1) 
        : 0;

    return {
        totalTests: tests.length,
        totalCases,
        totalFailedProducts,
        failureRate,
        failureModeData: failureModeCounts
    };
}

async function generateSummaryPdfReport() {
    ui.showNotification("Membuat laporan ringkas...", "info");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const fromDate = document.getElementById('report-from-date').value;
    const toDate = document.getElementById('report-to-date').value;
    let testsToReport = state.database.tests.filter(t => {
        if (fromDate && t.dateOfTest < fromDate) return false;
        if (toDate && t.dateOfTest > toDate) return false;
        return true;
    });

    if (testsToReport.length === 0) {
        ui.showNotification("Tidak ada data untuk dilaporkan pada periode ini.", "error");
        return;
    }

    const logoImg = document.querySelector('.logo');
    doc.addImage(logoImg, 'PNG', 14, 12, 30, 10);
    doc.setFontSize(18);
    doc.text("Laporan Ringkas Packaging Test", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`v6.0.0 | Dibuat: ${new Date().toLocaleDateString()}`, 105, 26, { align: 'center' });

    const tableData = testsToReport.map(t => {
        const totalFailed = t.cases.reduce((sum, c) => sum + c.productFailures.reduce((s, f) => s + f.unitsFailed, 0), 0);
        return [t.dateOfTest, t.brandName, t.productSku, t.testType, totalFailed, t.testerName];
    });
    doc.autoTable({
        head: [['Tanggal', 'Brand', 'SKU', 'Tipe Test', 'Total Gagal', 'Pengecek']],
        body: tableData,
        startY: 40,
    });

    doc.save(`laporan-ringkas-${Date.now()}.pdf`);
}

async function generateSingleTestPdfReport(test) {
    ui.showNotification("Membuat laporan PDF detail...", "info");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let cursorY = 0;

    const addHeader = (title) => {
        const logoImg = document.querySelector('.logo');
        if (logoImg) {
            doc.addImage(logoImg, 'PNG', margin, 12, 30, 10);
        }
        doc.setFontSize(18);
        doc.text(title, pageWidth / 2, 20, { align: 'center' });
    };

    const addFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, 287, { align: 'center' });
            doc.text(`v6.0.0 | Dibuat: ${new Date().toLocaleDateString()}`, margin, 287);
        }
    };

    const checkPageBreak = (neededHeight) => {
        if (cursorY + neededHeight > 280) {
            doc.addPage();
            addHeader("Laporan Detail Test Integritas Kemasan");
            cursorY = 30;
        }
    };

    // Halaman 1: Informasi Umum & Grafik
    addHeader("Laporan Detail Test Integritas Kemasan");
    cursorY = 35;

    doc.autoTable({
        startY: cursorY,
        head: [['Informasi Umum']],
        body: [
            ['ID Test', test.id], ['Tipe Test', test.testType || 'N/A'], ['Tanggal', test.dateOfTest || 'N/A'],
            ['Pengecek', test.testerName || 'N/A'], ['Brand', test.brandName || 'N/A'], ['Produk', test.productName || 'N/A'],
            ['SKU', test.productSku || 'N/A'], ['Catatan', test.testNotes || 'N/A'],
        ],
        theme: 'striped'
    });
    cursorY = doc.lastAutoTable.finalY;

    if (test.testType === 'transport') {
        doc.autoTable({
            startY: cursorY + 5,
            head: [['Detail Transportasi']],
            body: [
                ['Metode', test.transportMethod || 'N/A'],
                ['Rute', `${test.originLocation || 'N/A'} -> ${test.destinationLocation || 'N/A'}`],
                ['Durasi', test.transportDuration || 'N/A'],
            ]
        });
        cursorY = doc.lastAutoTable.finalY;
    }

    const failureModeData = {};
    test.cases.forEach(c => c.productFailures.forEach(f => {
        failureModeData[f.mode] = (failureModeData[f.mode] || 0) + f.unitsFailed;
    }));

    if (Object.keys(failureModeData).length > 0) {
        const tempCanvas = document.createElement('canvas');
        const tempChart = new Chart(tempCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(failureModeData),
                datasets: [{
                    label: 'Jumlah Gagal',
                    data: Object.values(failureModeData),
                    backgroundColor: 'rgba(215, 20, 24, 0.7)'
                }]
            },
            options: { responsive: false, animation: false, devicePixelRatio: 2 }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const chartImgData = tempCanvas.toDataURL('image/png');
        checkPageBreak(100);
        doc.setFontSize(12);
        doc.text("Grafik Ringkasan Mode Kegagalan", margin, cursorY + 15);
        doc.addImage(chartImgData, 'PNG', margin, cursorY + 20, 180, 90);
    }

    // Halaman Berikutnya: Detail Cases & Gambar
    for (const [index, caseItem] of test.cases.entries()) {
        doc.addPage();
        addHeader(`Detail Case #${index + 1} - Posisi: ${caseItem.position}`);
        cursorY = 30;

        doc.autoTable({
            startY: cursorY,
            head: [['Detail Kerusakan Case']],
            body: [
                ['Jenis Kerusakan', caseItem.caseDamage.type || 'N/A'],
                ['Deskripsi', caseItem.caseDamage.description || 'N/A'],
                ['Total Diinspeksi', caseItem.totalUnitsInspected || 0],
            ]
        });
        cursorY = doc.lastAutoTable.finalY;

        if (caseItem.caseDamage.imageId) {
            const imgBlob = await imageStore.getImage(caseItem.caseDamage.imageId);
            if (imgBlob) {
                const imgBuffer = await imgBlob.arrayBuffer();
                checkPageBreak(65);
                doc.addImage(imgBuffer, 'JPEG', margin, cursorY + 5, 80, 60);
                cursorY += 65;
            }
        }

        if (caseItem.productFailures.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.text("Detail Kegagalan Produk", margin, cursorY + 15);
            cursorY += 20;

            for (const failure of caseItem.productFailures) {
                const failureTableBody = [
                    ['Mode Kegagalan', failure.mode || 'N/A'],
                    ['Jumlah Gagal', failure.unitsFailed || 0],
                ];
                checkPageBreak(20);
                doc.autoTable({
                    startY: cursorY,
                    body: failureTableBody,
                    theme: 'grid'
                });
                cursorY = doc.lastAutoTable.finalY;

                if (failure.imageId) {
                    const imgBlob = await imageStore.getImage(failure.imageId);
                    if (imgBlob) {
                        const imgBuffer = await imgBlob.arrayBuffer();
                        checkPageBreak(65);
                        doc.addImage(imgBuffer, 'JPEG', margin, cursorY + 5, 80, 60);
                        cursorY += 65;
                    }
                }
            }
        }
    }
    
    // Halaman Terakhir: Kesimpulan
    doc.addPage();
    addHeader("Kesimpulan & Rekomendasi");
    cursorY = 30;
    doc.setFontSize(12);
    doc.text("Kesimpulan:", margin, cursorY);
    doc.setFontSize(10);
    doc.text(test.overallConclusion || 'Tidak ada.', margin, cursorY + 7, { maxWidth: pageWidth - margin * 2 });
    
    cursorY += 40;
    doc.setFontSize(12);
    doc.text("Rekomendasi:", margin, cursorY);
    doc.setFontSize(10);
    doc.text(test.recommendations || 'Tidak ada.', margin, cursorY + 7, { maxWidth: pageWidth - margin * 2 });

    addFooter();
    doc.save(`Laporan_Test_${test.id}_${test.productSku}.pdf`);
}

function handleBenchmark() {
    const selectedIds = Array.from(document.querySelectorAll('.benchmark-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
    const testsToCompare = state.database.tests.filter(t => selectedIds.includes(t.id));
    
    const comparisonData = testsToCompare.map(test => {
        const stats = calculateStatistics('all', 'all', [test]);
        return {
            productName: `${test.brandName} - ${test.productName}`,
            totalFailedProducts: stats.totalFailedProducts,
            failureRate: stats.failureRate
        };
    });

    ui.renderBenchmarkResults(comparisonData);
}

// --- INISIALISASI APLIKASI ---
function init() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    state.database = db.getDatabase();
    attachGlobalListeners();
    navigateToTab('dashboard');
    console.log('Packaging Integrity Test System v6.0.0 Initialized.');
}

document.addEventListener('DOMContentLoaded', init);