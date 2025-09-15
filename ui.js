/**
 * @file ui.js
 * @description Handles all direct DOM manipulations. Renders views, templates,
 * and modals based on data provided by app.js.
 * Version: 3.0
 */

const contentContainer = document.querySelector('.tab-content');

/** Clears the main content area. */
function clearContent() {
    contentContainer.innerHTML = '';
}

/**
 * Renders the main dashboard view with statistics and charts.
 * @param {object} stats The calculated statistics object.
 */
export function renderDashboard(stats) { /* ... (kode render dashboard) ... */ }

/**
 * Renders the list of all saved tests.
 * @param {Array<object>} tests The array of test objects.
 */
export function renderTestList(tests) { /* ... (kode render daftar test) ... */ }

/** Renders the report generation view. */
export function renderReports() { /* ... (kode render laporan) ... */ }

/** Renders the new test form by cloning its template. */
export function renderNewTestForm() {
    clearContent();
    const template = document.getElementById('new-test-form-template');
    const formClone = template.content.cloneNode(true);
    contentContainer.appendChild(formClone);
    // Anda bisa mengisi field default di sini jika perlu
}

/**
 * Adds a new case card to the UI.
 * @param {number} caseNumber The sequential number of the case.
 */
export function addCaseCardToUI(caseNumber) {
    const container = document.getElementById('cases-container');
    const template = document.getElementById('case-card-template');
    const clone = template.content.cloneNode(true);
    clone.querySelector('.case-number').textContent = caseNumber;
    container.appendChild(clone);
}

/**
 * Adds a new product inspection item to a case card.
 * @param {HTMLElement} addButton The "Add Inspection" button that was clicked.
 */
export function addProductInspectionToUI(addButton) {
    const container = addButton.previousElementSibling; // The container is right before the button
    const template = document.getElementById('product-inspection-template');
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
}

/**
 * Displays a preview of a selected image.
 * @param {HTMLInputElement} inputElement The file input element that changed.
 */
export function previewImage(inputElement) {
    const preview = inputElement.nextElementSibling; // Assumes <img> is the next sibling
    const file = inputElement.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
    }
}

/** Shows a modal by its ID. */
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

/** Hides a modal by its ID. */
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

/** Shows the changelog modal. */
export function showChangelogModal() { showModal('changelog-modal'); }

/** Hides the changelog modal. */
export function hideChangelogModal() { hideModal('changelog-modal'); }

/**
 * Displays the test detail modal with complete data, including images.
 * @param {object} test The test object.
 * @param {Function} imageFetcher A function (like imageStore.getImage) to retrieve images.
 */
export async function showTestDetailModal(test, imageFetcher) {
    const content = document.getElementById('test-detail-content');
    content.innerHTML = '<em>Loading details...</em>'; // Loading state
    // ... (Logika kompleks untuk membangun HTML detail dengan memanggil imageFetcher) ...
    showModal('test-detail-modal');
}

/** Hides the test detail modal. */
export function hideTestDetailModal() { hideModal('test-detail-modal'); }