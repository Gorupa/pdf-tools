/* ============================================
   PDF Tools — js/compress.js
   Author: gorupa (https://github.com/gorupa)
   License: MIT
   Description: PDF compression using PDF.js
                to render pages and jsPDF to
                re-encode at lower quality.
   ============================================ */

'use strict';

let compressFile = null;
let compressOriginalBytes = 0;

const compressZone     = document.getElementById('compressUploadZone');
const compressInput    = document.getElementById('compressFileInput');
const compressControls = document.getElementById('compressControls');
const compressResults  = document.getElementById('compressResults');
const compressSlider   = document.getElementById('compressSlider');

// ── Upload handlers ──────────────────────────

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
    compressFile          = file;
    compressOriginalBytes = file.size;
    document.getElementById('compressFileName').textContent        = file.name;
    document.getElementById('compressFileSize').textContent        = fmtSize(file.size);
    document.getElementById('compressPreviewOriginal').textContent = fmtSize(file.size);
    hide(compressZone);
    show(compressControls);
    hide(compressResults);
    updateCompressPreview();
    setSliderBg(compressSlider);
}

// ── Slider ───────────────────────────────────

compressSlider.addEventListener('input', () => {
    document.getElementById('compressQualityVal').textContent = compressSlider.value + '%';
    setSliderBg(compressSlider);
    updateCompressPreview();
});

/** Update the live estimated output size preview */
function updateCompressPreview() {
    const q     = compressSlider.value / 100;
    const est   = Math.round(compressOriginalBytes * (0.15 + q * 0.75));
    const saved = pct(compressOriginalBytes, est);
    document.getElementById('compressPreviewEst').textContent    = fmtSize(est);
    document.getElementById('compressPreviewSaving').textContent = `~${saved}% saved`;
}

// ── Compress button ──────────────────────────

document.getElementById('compressBtn').addEventListener('click', async () => {
    if (!compressFile) return;

    const btn           = document.getElementById('compressBtn');
    const progressWrap  = document.getElementById('compressProgress');
    const progressFill  = document.getElementById('compressProgressFill');
    const progressLabel = document.getElementById('compressProgressLabel');

    btn.disabled  = true;
    btn.innerHTML = '<span class="material-icons-round" style="animation:spin 0.8s linear infinite">autorenew</span> Compressing…';
    show(progressWrap);

    try {
        // Set PDF.js worker source
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
                outputPdf = new jsPDF({
                    orientation: w > h ? 'l' : 'p',
                    unit:        'px',
                    format:      [w, h]
                });
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

        document.getElementById('compressOldSize').textContent = fmtSize(compressOriginalBytes);
        document.getElementById('compressNewSize').textContent = fmtSize(newSize);
        document.getElementById('compressSavings').textContent = `↓ ${saved}% saved`;

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

    btn.disabled  = false;
    btn.innerHTML = '<span class="material-icons-round">compress</span> Compress PDF';
});

// ── Reset ────────────────────────────────────

document.getElementById('compressReset').addEventListener('click', () => {
    compressFile        = null;
    compressInput.value = '';
    hide(compressControls);
    hide(compressResults);
    show(compressZone);
});
