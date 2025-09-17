/**
 * @file ui.js
 * @description Handles all direct DOM manipulations.
 * Version: 6.0
 */

const contentContainer = document.querySelector('.tab-content');

function clearContent() {
    contentContainer.innerHTML = '';
}

function renderDashboardFilters(brandList, skuList) {
    const template = document.getElementById('dashboard-filters-template');
    if (!template) return;
    const clone = template.content.cloneNode(true);
    
    const brandSelect = clone.querySelector('#brand-filter');
    const skuSelect = clone.querySelector('#sku-filter');

    if (brandSelect) {
        brandList.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandSelect.appendChild(option);
        });
    }
    if (skuSelect) {
        skuList.forEach(sku => {
            const option = document.createElement('option');
            option.value = sku;
            option.textContent = sku;
            skuSelect.appendChild(option);
        });
    }
    contentContainer.prepend(clone);
}

export function renderDashboard(stats, brandList, skuList) {
    clearContent();
    renderDashboardFilters(brandList, skuList);

    const dashboardContent = document.createElement('div');
    dashboardContent.id = 'dashboard-content';
    dashboardContent.innerHTML = `
        <div class="form-section">
            <h3>📊 Ringkasan Statistik</h3>
            <div class="stats-grid">
                <div class="stat-card"><h4>Total Test</h4><div class="stat-value">${stats.totalTests}</div></div>
                <div class="stat-card"><h4>Total Case Diuji</h4><div class="stat-value">${stats.totalCases}</div></div>
                <div class="stat-card"><h4>Total Produk Gagal</h4><div class="stat-value">${stats.totalFailedProducts}</div></div>
                <div class="stat-card"><h4>Tingkat Kegagalan</h4><div class="stat-value">${stats.failureRate}%</div></div>
            </div>
        </div>
        <div class="form-section">
            <h3>📈 Mode Kegagalan Produk Paling Umum</h3>
            <div class="chart-container">
                <canvas id="failureModeChart"></canvas>
            </div>
        </div>
    `;
    contentContainer.appendChild(dashboardContent);
    drawFailureModeChart(stats.failureModeData);
}

function drawFailureModeChart(data) {
    const ctx = document.getElementById('failureModeChart')?.getContext('2d');
    if (!ctx) return;

    if (window.myFailureChart) {
        window.myFailureChart.destroy();
    }
    window.myFailureChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Jumlah Gagal',
                data: Object.values(data),
                backgroundColor: 'rgba(215, 20, 24, 0.7)',
                borderColor: 'rgba(215, 20, 24, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

export function renderTestList(tests) {
    clearContent();
    let html = '<h2>📋 Daftar Semua Test</h2>';

    if (!tests || tests.length === 0) {
        html += '<p class="info-message">Belum ada data test.</p>';
        contentContainer.innerHTML = html;
        return;
    }

    const container = document.createElement('div');
    container.className = 'list-container';
    const template = document.getElementById('list-item-template');

    if (!template) {
        console.error("List item template not found!");
        return;
    }

    [...tests].sort((a, b) => b.id - a.id).forEach(test => {
        const clone = template.content.cloneNode(true);
        const totalFailedProducts = test.cases?.reduce((sum, c) => sum + (c.productFailures?.reduce((s, f) => s + f.unitsFailed, 0) || 0), 0) || 0;
        
        const listItem = clone.querySelector('.list-item');
        listItem.dataset.id = test.id;
        
        const mainPart = clone.querySelector('.list-item-main');
        mainPart.querySelector('h4').textContent = `${test.productName} (SKU: ${test.productSku || 'N/A'})`;
        mainPart.querySelector('p').textContent = `📅 ${test.dateOfTest || 'N/A'} | 👤 ${test.testerName || 'N/A'}`;
        
        const badge = clone.querySelector('.badge');
        badge.textContent = `Produk Gagal: ${totalFailedProducts}`;
        badge.className = `badge ${totalFailedProducts > 0 ? 'badge-danger' : 'badge-success'}`;
        
        clone.querySelector('.btn-delete-test').dataset.id = test.id;
        container.appendChild(clone);
    });

    contentContainer.innerHTML = html;
    contentContainer.appendChild(container);
}

export function renderReports() {
    clearContent();
    const template = document.getElementById('reports-template');
    if (!template) return;
    contentContainer.appendChild(template.content.cloneNode(true));
}

export function renderBenchmark(tests) {
    clearContent();
    const template = document.getElementById('benchmark-template');
    if (!template) return;
    contentContainer.appendChild(template.content.cloneNode(true));

    const listContainer = document.getElementById('benchmark-list-container');
    if (!listContainer) return;

    if (!tests || tests.length === 0) {
        listContainer.innerHTML = '<p>Tidak ada test untuk dibandingkan.</p>';
        return;
    }

    const itemsHtml = tests.map(test => `
        <div class="list-item benchmark-item">
            <label class="checkbox-group">
                <input type="checkbox" class="benchmark-checkbox" data-id="${test.id}">
                <div>
                    <h4>${test.productName} (SKU: ${test.productSku})</h4>
                    <p>📅 ${test.dateOfTest} | 👤 ${test.testerName}</p>
                </div>
            </label>
        </div>
    `).join('');
    listContainer.innerHTML = itemsHtml;
}

export function renderBenchmarkResults(comparisonData) {
    const modal = document.getElementById('benchmark-results-modal');
    const content = document.getElementById('benchmark-results-content');
    if (!modal || !content) return;

    const template = document.getElementById('benchmark-results-template');
    if (!template) return;

    content.innerHTML = '';
    content.appendChild(template.content.cloneNode(true));

    const tableContainer = content.querySelector('#benchmark-table-container');
    
    let tableHtml = `
        <div style="overflow-x: auto;">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Metrik</th>
                        ${comparisonData.map(d => `<th>${d.productName}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total Produk Gagal</td>
                        ${comparisonData.map(d => `<td>${d.totalFailedProducts}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Tingkat Kegagalan</td>
                        ${comparisonData.map(d => `<td>${d.failureRate}%</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    tableContainer.innerHTML = tableHtml;

    drawBenchmarkChart(comparisonData);
    showModal('benchmark-results-modal');
}

function drawBenchmarkChart(data) {
    const ctx = document.getElementById('benchmarkChart')?.getContext('2d');
    if (!ctx) return;

    if (window.myBenchmarkChart) {
        window.myBenchmarkChart.destroy();
    }

    window.myBenchmarkChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.productName),
            datasets: [{
                label: 'Total Produk Gagal',
                data: data.map(d => d.totalFailedProducts),
                backgroundColor: [
                    'rgba(215, 20, 24, 0.7)',
                    'rgba(20, 173, 219, 0.7)',
                    'rgba(149, 189, 33, 0.7)',
                    'rgba(243, 156, 24, 0.7)'
                ],
                borderWidth: 0,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

export function renderNewTestForm() {
    clearContent();
    const template = document.getElementById('new-test-form-template');
    if (!template) {
        console.error("New test form template not found!");
        return;
    }
    const formClone = template.content.cloneNode(true);
    contentContainer.appendChild(formClone);
    
    const dateInput = document.getElementById('dateOfTest');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
}

export function renderTransportFields() {
    const container = document.getElementById('transport-fields-container');
    const template = document.getElementById('transport-fields-template');
    if (!container || !template) return;

    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));
    container.classList.remove('hidden');
}

export function addCaseCardToUI(caseNumber) {
    const container = document.getElementById('cases-container');
    const template = document.getElementById('case-card-template');
    if (!container || !template) return;
    const clone = template.content.cloneNode(true);
    clone.querySelector('.case-number').textContent = caseNumber;
    container.appendChild(clone);
}

export function addProductFailureToUI(addButton) {
    const container = addButton.previousElementSibling;
    const template = document.getElementById('product-failure-template');
    if (!container || !template) return;
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
}

export function previewImage(inputElement) {
    const preview = inputElement.nextElementSibling;
    const file = inputElement.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
    }
}

function showModal(modalId) {
    document.getElementById(modalId)?.classList.add('show');
}

function hideModal(modalId) {
    document.getElementById(modalId)?.classList.remove('show');
}

export function showChangelogModal() { showModal('changelog-modal'); }
export function hideChangelogModal() { hideModal('changelog-modal'); }
export function showSelectTestTypeModal() { showModal('select-test-type-modal'); }
export function hideSelectTestTypeModal() { hideModal('select-test-type-modal'); }
export function showBenchmarkResultsModal() { showModal('benchmark-results-modal'); }
export function hideBenchmarkResultsModal() { hideModal('benchmark-results-modal'); }

export async function showTestDetailModal(test, imageFetcher) {
    const modal = document.getElementById('test-detail-modal');
    const content = document.getElementById('test-detail-content');
    if (!modal || !content) return;

    content.innerHTML = `<div class="spinner-container"><div class="spinner"></div><p>Loading details...</p></div>`;
    showModal('test-detail-modal');

    try {
        let casesHtml = await Promise.all(test.cases.map(async (caseItem, index) => {
            let caseImageHtml = '';
            if (caseItem.caseDamage.imageId) {
                const imageBlob = await imageFetcher(caseItem.caseDamage.imageId);
                if (imageBlob) {
                    const objectURL = URL.createObjectURL(imageBlob);
                    caseImageHtml = `<p><strong>Foto Kerusakan Case:</strong></p><img src="${objectURL}" class="detail-image">`;
                }
            }

            let failuresHtml = await Promise.all(caseItem.productFailures.map(async (failure) => {
                let failureImageHtml = '';
                if (failure.imageId) {
                    const imageBlob = await imageFetcher(failure.imageId);
                    if (imageBlob) {
                        const objectURL = URL.createObjectURL(imageBlob);
                        failureImageHtml = `<p><strong>Foto Bukti:</strong></p><img src="${objectURL}" class="detail-image">`;
                    }
                }
                return `
                    <div class="failure-detail">
                        <p><strong>Mode Kegagalan:</strong> ${failure.mode}</p>
                        <p><strong>Jumlah Gagal:</strong> ${failure.unitsFailed}</p>
                        ${failureImageHtml}
                    </div>
                `;
            }));

            return `
                <div class="case-card-detail">
                    <h4>Case #${index + 1}: Posisi ${caseItem.position}</h4>
                    <p><strong>Total Diinspeksi:</strong> ${caseItem.totalUnitsInspected}</p>
                    <p><strong>Kerusakan Case:</strong> ${caseItem.caseDamage.type} (${caseItem.caseDamage.description || 'N/A'})</p>
                    ${caseImageHtml}
                    <h5 class="sub-header">Detail Kegagalan Produk</h5>
                    ${failuresHtml.join('') || '<p>Tidak ada kegagalan produk yang tercatat.</p>'}
                </div>
            `;
        }));

        content.innerHTML = `
            <div class="test-meta">
                <p><strong>Tipe Test:</strong> <span class="badge">${test.testType}</span></p>
                <p><strong>Produk:</strong> ${test.productName} (Brand: ${test.brandName}, SKU: ${test.productSku})</p>
                <p><strong>Tanggal:</strong> ${test.dateOfTest}</p>
                <p><strong>Pengecek:</strong> ${test.testerName}</p>
                <p><strong>Catatan Umum:</strong> ${test.testNotes || 'Tidak ada.'}</p>
            </div>
            <hr class="divider">
            ${casesHtml.join('')}
            <hr class="divider">
            <div class="conclusion-section">
                <h4>Kesimpulan & Rekomendasi</h4>
                <p><strong>Kesimpulan:</strong> ${test.overallConclusion || 'Tidak ada.'}</p>
                <p><strong>Rekomendasi:</strong> ${test.recommendations || 'Tidak ada.'}</p>
            </div>
        `;
    } catch (error) {
        console.error("Failed to render test details:", error);
        content.innerHTML = "<p>Gagal memuat detail test. Silakan coba lagi.</p>";
    }
}

export function hideTestDetailModal() { hideModal('test-detail-modal'); }

export function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}