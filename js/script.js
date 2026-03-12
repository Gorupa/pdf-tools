/* ============================================
   PDF Tools — js/script.js
   Author: gorupa (https://github.com/gorupa)
   License: MIT

   Sections:
   1. Utilities
   2. Tab Switcher
   3. Compress Tab
   4. Lock / Unlock Tab
   5. Merge Tab
   ============================================ */

'use strict';

// ═══════════════════════════════════════════════
// 1. UTILITIES
// ═══════════════════════════════════════════════

/**
 * Format bytes into human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Calculate percentage saved (a = original, b = new)
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function pct(a, b) {
    return Math.max(0, Math.round((1 - b / a) * 100));
}

/** Show an element by removing .hidden */
function show(el) { el.classList.remove('hidden'); }

/** Hide an element by adding .hidden */
function hide(el) { el.classList.add('hidden'); }

/**
 * Update the range slider gradient fill to match current value
 * @param {HTMLInputElement} slider
 */
function setSliderBg(slider) {
    const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${val}%, #e0d9f7 ${val}%, #e0d9f7 100%)`;
}


// ═══════════════════════════════════════════════
// 2. TAB SWITCHER
// ═══════════════════════════════════════════════

/**
 * Switch between Compress / Lock / Merge tabs
 * @param {string} tab - 'compress' | 'lock' | 'merge'
 */
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`panel-${tab}`).classList.add('active');
}


// ═══════════════════════════════════════════════
// 3. COMPRESS TAB
// ═══════════════════════════════════════════════

let compressFile = null;
let compressOriginalBytes = 0;

const compressZone     = document.getElementById('compressUploadZone');
const compressInput    = document.getElementById('compressFileInput');
const compressControls = document.getElementById('compressControls');
const compressResults  = document.getElementById('compressResults');
const compressSlider   = document.getElementById('compressSlider');

// --- Upload handlers ---
compressZone.addEventListener('click', () => compressInput.click());

compressZone.addEventListener('dragover', e => {
    e.preventDefault();
    compressZone.classList.add('dragover');
});
compressZone.addEventListener('dragleave', () => compressZone.classList.remove('dragover'));

compressZone.addEventListener('drop', e => {
    e.preventDefault();
    compressZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') loadCompressFile(file);
});

compressInput.addEventListener('change', e => {
    if (e.target.files[0]) loadCompressFile(e.target.files[0]);
});

/**
 * Load a PDF file into the compress tool
 * @param {File} file
 */
function loadCompressFile(file) {
    compressFile = file;
    compressOriginalBytes = file.size;
    document.getElementById('compressFileName').textContent = file.name;
    document.getElementById('compressFileSize').textContent = fmtSize(file.size);
    document.getElementById('compressPreviewOriginal').textContent = fmtSize(file.size);
    hide(compressZone);
    show(compressControls);
    hide(compressResults);
    updateCompressPreview();
    setSliderBg(compressSlider);
}

// --- Slider ---
compressSlider.addEventListener('input', () => {
    document.getElementById('compressQualityVal').textContent = compressSlider.value + '%';
    setSliderBg(compressSlider);
    updateCompressPreview();
});

/** Update the live estimated output size */
function updateCompressPreview() {
    const q    = compressSlider.value / 100;
    const est  = Math.round(compressOriginalBytes * (0.15 + q * 0.75));
    const saved = pct(compressOriginalBytes, est);
    document.getElementById('compressPreviewEst').textContent    = fmtSize(est);
    document.getElementById('compressPreviewSaving').textContent = `~${saved}% saved`;
}

// --- Compress button ---
document.getElementById('compressBtn').addEventListener('click', async () => {
    if (!compressFile) return;

    const btn           = document.getElementById('compressBtn');
    const progressWrap  = document.getElementById('compressProgress');
    const progressFill  = document.getElementById('compressProgressFill');
    const progressLabel = document.getElementById('compressProgressLabel');

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round" style="animation:spin 0.8s linear infinite">autorenew</span> Compressing…';
    show(progressWrap);

    try {
        // Set PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const quality  = compressSlider.value / 100;
        const scale    = 0.4 + quality * 0.6; // lower quality = lower render scale

        const arrayBuf = await compressFile.arrayBuffer();
        const pdfDoc   = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
        const numPages = pdfDoc.numPages;

        const { jsPDF } = window.jspdf;
        let outputPdf   = null;

        for (let i = 1; i <= numPages; i++) {
            progressLabel.textContent = `Rendering page ${i} of ${numPages}…`;
            progressFill.style.width  = ((i - 1) / numPages * 90) + '%';

            const page     = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas   = document.createElement('canvas');
            canvas.width   = viewport.width;
            canvas.height  = viewport.height;
            const ctx      = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            const imgData = canvas.toDataURL('image/jpeg', quality);
            const w = canvas.width;
            const h = canvas.height;

            if (i === 1) {
                outputPdf = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h] });
            } else {
                outputPdf.addPage([w, h], w > h ? 'l' : 'p');
            }
            outputPdf.addImage(imgData, 'JPEG', 0, 0, w, h);
        }

        progressLabel.textContent = 'Finalising PDF…';
        progressFill.style.width  = '100%';

        const blob    = outputPdf.output('blob');
        const url     = URL.createObjectURL(blob);
        const newSize = blob.size;
        const saved   = pct(compressOriginalBytes, newSize);

        document.getElementById('compressOldSize').textContent  = fmtSize(compressOriginalBytes);
        document.getElementById('compressNewSize').textContent  = fmtSize(newSize);
        document.getElementById('compressSavings').textContent  = `↓ ${saved}% saved`;

        const dl    = document.getElementById('compressDownload');
        dl.href     = url;
        dl.download = 'compressed_' + compressFile.name;

        await new Promise(r => setTimeout(r, 300));
        hide(compressControls);
        hide(progressWrap);
        show(compressResults);

    } catch (err) {
        console.error(err);
        alert('Compression failed: ' + err.message);
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">compress</span> Compress PDF';
});

// --- Reset ---
document.getElementById('compressReset').addEventListener('click', () => {
    compressFile  = null;
    compressInput.value = '';
    hide(compressControls);
    hide(compressResults);
    show(compressZone);
});


// ═══════════════════════════════════════════════
// 4. LOCK / UNLOCK TAB
// ═══════════════════════════════════════════════

let lockFile = null;
let lockMode = 'lock'; // 'lock' | 'unlock'

const lockZone     = document.getElementById('lockUploadZone');
const lockInput    = document.getElementById('lockFileInput');
const lockControls = document.getElementById('lockControls');
const lockResults  = document.getElementById('lockResults');

/**
 * Switch between Lock and Unlock mode
 * @param {string} mode - 'lock' | 'unlock'
 */
function setLockMode(mode) {
    lockMode = mode;
    document.getElementById('lockModeBtn').classList.toggle('active', mode === 'lock');
    document.getElementById('unlockModeBtn').classList.toggle('active', mode === 'unlock');
    document.getElementById('lockFields').classList.toggle('hidden', mode !== 'lock');
    document.getElementById('unlockFields').classList.toggle('hidden', mode !== 'unlock');
    document.getElementById('lockUploadTitle').textContent =
        mode === 'lock' ? 'Drop a PDF to lock' : 'Drop a PDF to unlock';
    // Reset state
    lockFile = null;
    lockInput.value = '';
    hide(lockControls);
    hide(lockResults);
    show(lockZone);
    document.getElementById('lockError').innerHTML = '';
}

// --- Upload handlers ---
lockZone.addEventListener('click', () => lockInput.click());

lockZone.addEventListener('dragover', e => {
    e.preventDefault();
    lockZone.classList.add('dragover');
});
lockZone.addEventListener('dragleave', () => lockZone.classList.remove('dragover'));

lockZone.addEventListener('drop', e => {
    e.preventDefault();
    lockZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') loadLockFile(file);
});

lockInput.addEventListener('change', e => {
    if (e.target.files[0]) loadLockFile(e.target.files[0]);
});

/**
 * Load a PDF file into the lock/unlock tool
 * @param {File} file
 */
function loadLockFile(file) {
    lockFile = file;
    document.getElementById('lockFileName').textContent = file.name;
    document.getElementById('lockFileSize').textContent = fmtSize(file.size);
    hide(lockZone);
    show(lockControls);
    hide(lockResults);
    document.getElementById('lockError').innerHTML = '';
}

/**
 * Toggle password field visibility
 * @param {string} inputId
 * @param {HTMLButtonElement} btn
 */
function togglePw(inputId, btn) {
    const inp  = document.getElementById(inputId);
    const icon = btn.querySelector('.material-icons-round');
    if (inp.type === 'password') {
        inp.type         = 'text';
        icon.textContent = 'visibility_off';
    } else {
        inp.type         = 'password';
        icon.textContent = 'visibility';
    }
}

/**
 * Show an error message inside the lock tool
 * @param {string} msg
 */
function showLockError(msg) {
    document.getElementById('lockError').innerHTML = `
        <div class="error-box">
            <span class="material-icons-round">error_outline</span>
            ${msg}
        </div>`;
}

/** Encrypt the loaded PDF with a user-supplied password */
async function lockPDF() {
    if (!lockFile) return;
    const pw  = document.getElementById('lockPassword').value;
    const pw2 = document.getElementById('lockPasswordConfirm').value;
    document.getElementById('lockError').innerHTML = '';

    if (!pw)        return showLockError('Please enter a password.');
    if (pw !== pw2) return showLockError('Passwords do not match.');

    const btn = document.getElementById('lockBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round" style="animation:spin 0.8s linear infinite">autorenew</span> Locking…';

    try {
        const { PDFDocument } = PDFLib;
        const arrayBuf  = await lockFile.arrayBuffer();
        const pdfDoc    = await PDFDocument.load(arrayBuf);
        const encrypted = await pdfDoc.save({
            userPassword:  pw,
            ownerPassword: pw + '_owner',
            permissions: {
                printing:             'highResolution',
                modifying:            false,
                copying:              false,
                annotating:           false,
                fillingForms:         false,
                contentAccessibility: false,
                documentAssembly:     false,
            }
        });

        const blob = new Blob([encrypted], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);

        document.getElementById('lockResultIcon').textContent    = 'lock';
        document.getElementById('lockResultTitle').textContent   = 'PDF Locked!';
        document.getElementById('lockResultSub').textContent     = 'Your password-protected PDF is ready to download.';
        document.getElementById('lockDownloadLabel').textContent = 'Download Protected PDF';

        const dl    = document.getElementById('lockDownload');
        dl.href     = url;
        dl.download = 'locked_' + lockFile.name;

        hide(lockControls);
        show(lockResults);

    } catch (err) {
        showLockError('Failed to lock PDF: ' + err.message);
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">lock</span> Lock PDF';
}

/** Remove password protection from the loaded PDF */
async function unlockPDF() {
    if (!lockFile) return;
    const pw = document.getElementById('unlockPassword').value;
    document.getElementById('lockError').innerHTML = '';

    if (!pw) return showLockError('Please enter the PDF password.');

    const btn = document.getElementById('unlockBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round" style="animation:spin 0.8s linear infinite">autorenew</span> Unlocking…';

    try {
        const { PDFDocument } = PDFLib;
        const arrayBuf = await lockFile.arrayBuffer();
        const pdfDoc   = await PDFDocument.load(arrayBuf, { password: pw });
        const unlocked = await pdfDoc.save();

        const blob = new Blob([unlocked], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);

        document.getElementById('lockResultIcon').textContent    = 'lock_open';
        document.getElementById('lockResultTitle').textContent   = 'PDF Unlocked!';
        document.getElementById('lockResultSub').textContent     = 'Password removed. The PDF can now be opened freely.';
        document.getElementById('lockDownloadLabel').textContent = 'Download Unlocked PDF';

        const dl    = document.getElementById('lockDownload');
        dl.href     = url;
        dl.download = 'unlocked_' + lockFile.name;

        hide(lockControls);
        show(lockResults);

    } catch (err) {
        if (err.message && err.message.toLowerCase().includes('password')) {
            showLockError('Incorrect password. Please try again.');
        } else {
            showLockError('Could not unlock PDF. It may not be password-protected, or the password is wrong.');
        }
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">lock_open</span> Unlock PDF';
}

// --- Reset ---
document.getElementById('lockReset').addEventListener('click', () => {
    lockFile = null;
    lockInput.value = '';
    document.getElementById('lockPassword').value        = '';
    document.getElementById('lockPasswordConfirm').value = '';
    document.getElementById('unlockPassword').value      = '';
    document.getElementById('lockError').innerHTML       = '';
    hide(lockControls);
    hide(lockResults);
    show(lockZone);
});


// ═══════════════════════════════════════════════
// 5. MERGE TAB
// ═══════════════════════════════════════════════

/** @type {Array<{file: File, id: number}>} */
let mergeFiles = [];
let dragSrcId  = null;

const mergeZone     = document.getElementById('mergeUploadZone');
const mergeInput    = document.getElementById('mergeFileInput');
const mergeControls = document.getElementById('mergeControls');
const mergeResults  = document.getElementById('mergeResults');
const mergeQueue    = document.getElementById('mergeQueue');

// --- Upload handlers ---
mergeZone.addEventListener('click', () => mergeInput.click());

mergeZone.addEventListener('dragover', e => {
    e.preventDefault();
    mergeZone.classList.add('dragover');
});
mergeZone.addEventListener('dragleave', () => mergeZone.classList.remove('dragover'));

mergeZone.addEventListener('drop', e => {
    e.preventDefault();
    mergeZone.classList.remove('dragover');
    const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (files.length) addMergeFiles(files);
});

mergeInput.addEventListener('change', e => {
    const files = [...e.target.files].filter(f => f.type === 'application/pdf');
    if (files.length) addMergeFiles(files);
    e.target.value = '';
});

// --- Add more button ---
const mergeAddBtn   = document.getElementById('mergeAddBtn');
const mergeAddInput = document.getElementById('mergeAddInput');

mergeAddBtn.addEventListener('click', () => mergeAddInput.click());
mergeAddInput.addEventListener('change', e => {
    const files = [...e.target.files].filter(f => f.type === 'application/pdf');
    if (files.length) addMergeFiles(files);
    e.target.value = '';
});

/**
 * Add PDF files to the merge queue
 * @param {File[]} files
 */
function addMergeFiles(files) {
    files.forEach(f => {
        mergeFiles.push({ file: f, id: Date.now() + Math.random() });
    });
    hide(mergeZone);
    show(mergeControls);
    hide(mergeResults);
    renderMergeQueue();
}

/** Re-render the sortable merge queue list */
function renderMergeQueue() {
    mergeQueue.innerHTML = '';

    mergeFiles.forEach(item => {
        const div       = document.createElement('div');
        div.className   = 'queue-item';
        div.draggable   = true;
        div.dataset.id  = item.id;
        div.innerHTML   = `
            <span class="material-icons-round drag-handle">drag_indicator</span>
            <span class="material-icons-round pdf-icon">picture_as_pdf</span>
            <span class="queue-name">${item.file.name}</span>
            <span class="queue-size">${fmtSize(item.file.size)}</span>
            <button class="queue-remove" onclick="removeMergeFile('${item.id}')">
                <span class="material-icons-round">close</span>
            </button>`;

        div.addEventListener('dragstart', () => {
            dragSrcId = item.id;
            setTimeout(() => div.classList.add('dragging'), 0);
        });
        div.addEventListener('dragend',  () => div.classList.remove('dragging'));
        div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
        div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
        div.addEventListener('drop', e => {
            e.preventDefault();
            div.classList.remove('drag-over');
            if (dragSrcId === item.id) return;
            const srcIdx  = mergeFiles.findIndex(f => f.id === dragSrcId);
            const destIdx = mergeFiles.findIndex(f => f.id === item.id);
            const [moved] = mergeFiles.splice(srcIdx, 1);
            mergeFiles.splice(destIdx, 0, moved);
            renderMergeQueue();
        });

        mergeQueue.appendChild(div);
    });
}

/**
 * Remove a PDF from the merge queue by id
 * @param {string} id
 */
function removeMergeFile(id) {
    mergeFiles = mergeFiles.filter(f => String(f.id) !== String(id));
    if (mergeFiles.length === 0) {
        hide(mergeControls);
        show(mergeZone);
    } else {
        renderMergeQueue();
    }
}

/** Merge all queued PDFs into a single output file */
async function mergePDFs() {
    if (mergeFiles.length < 2) {
        alert('Please add at least 2 PDF files to merge.');
        return;
    }

    const btn           = document.getElementById('mergeBtn');
    const progressWrap  = document.getElementById('mergeProgress');
    const progressFill  = document.getElementById('mergeProgressFill');
    const progressLabel = document.getElementById('mergeProgressLabel');

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round" style="animation:spin 0.8s linear infinite">autorenew</span> Merging…';
    show(progressWrap);

    try {
        const { PDFDocument } = PDFLib;
        const mergedDoc = await PDFDocument.create();
        let totalPages  = 0;

        for (let i = 0; i < mergeFiles.length; i++) {
            progressLabel.textContent = `Processing ${mergeFiles[i].file.name}…`;
            progressFill.style.width  = (i / mergeFiles.length * 90) + '%';

            const arrayBuf = await mergeFiles[i].file.arrayBuffer();
            const srcDoc   = await PDFDocument.load(arrayBuf);
            const pages    = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
            pages.forEach(p => mergedDoc.addPage(p));
            totalPages += pages.length;
        }

        progressLabel.textContent = 'Finalising…';
        progressFill.style.width  = '100%';

        const merged = await mergedDoc.save();
        const blob   = new Blob([merged], { type: 'application/pdf' });
        const url    = URL.createObjectURL(blob);

        document.getElementById('mergeResultSub').textContent =
            `${mergeFiles.length} PDFs merged into 1 · ${totalPages} pages · ${fmtSize(blob.size)}`;

        const dl    = document.getElementById('mergeDownload');
        dl.href     = url;
        dl.download = 'merged.pdf';

        await new Promise(r => setTimeout(r, 300));
        hide(mergeControls);
        hide(progressWrap);
        show(mergeResults);

    } catch (err) {
        console.error(err);
        alert('Merge failed: ' + err.message);
        hide(progressWrap);
    }

    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">merge</span> Merge PDFs';
}

// --- Reset ---
document.getElementById('mergeReset').addEventListener('click', () => {
    mergeFiles = [];
    mergeInput.value    = '';
    mergeQueue.innerHTML = '';
    hide(mergeControls);
    hide(mergeResults);
    show(mergeZone);
});
