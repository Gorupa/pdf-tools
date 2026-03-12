/* ============================================
   PDF Tools — js/merge.js
   Author: gorupa (https://github.com/gorupa)
   License: MIT
   Description: Merge multiple PDFs into one
                using pdf-lib. Supports drag-to-
                reorder queue before merging.
   ============================================ */

'use strict';

/** @type {Array<{file: File, id: number}>} */
let mergeFiles = [];
let dragSrcId  = null;

const mergeZone     = document.getElementById('mergeUploadZone');
const mergeInput    = document.getElementById('mergeFileInput');
const mergeControls = document.getElementById('mergeControls');
const mergeResults  = document.getElementById('mergeResults');
const mergeQueue    = document.getElementById('mergeQueue');

// ── Upload handlers ──────────────────────────

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

// ── Add more button ──────────────────────────

const mergeAddBtn   = document.getElementById('mergeAddBtn');
const mergeAddInput = document.getElementById('mergeAddInput');

mergeAddBtn.addEventListener('click', () => mergeAddInput.click());

mergeAddInput.addEventListener('change', e => {
    const files = [...e.target.files].filter(f => f.type === 'application/pdf');
    if (files.length) addMergeFiles(files);
    e.target.value = '';
});

// ── Queue management ─────────────────────────

/**
 * Add PDF files to the merge queue and show controls
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

/** Re-render the sortable drag-and-drop queue list */
function renderMergeQueue() {
    mergeQueue.innerHTML = '';

    mergeFiles.forEach(item => {
        const div      = document.createElement('div');
        div.className  = 'queue-item';
        div.draggable  = true;
        div.dataset.id = item.id;
        div.innerHTML  = `
            <span class="material-icons-round drag-handle">drag_indicator</span>
            <span class="material-icons-round pdf-icon">picture_as_pdf</span>
            <span class="queue-name">${item.file.name}</span>
            <span class="queue-size">${fmtSize(item.file.size)}</span>
            <button class="queue-remove" onclick="removeMergeFile('${item.id}')">
                <span class="material-icons-round">close</span>
            </button>`;

        // Drag events for reordering
        div.addEventListener('dragstart', () => {
            dragSrcId = item.id;
            setTimeout(() => div.classList.add('dragging'), 0);
        });
        div.addEventListener('dragend',   () => div.classList.remove('dragging'));
        div.addEventListener('dragover',  e  => { e.preventDefault(); div.classList.add('drag-over'); });
        div.addEventListener('dragleave', ()  => div.classList.remove('drag-over'));
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
 * Remove a file from the merge queue by id
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

// ── Merge ────────────────────────────────────

/** Merge all queued PDFs into a single output file using pdf-lib */
async function mergePDFs() {
    if (mergeFiles.length < 2) {
        alert('Please add at least 2 PDF files to merge.');
        return;
    }

    const btn           = document.getElementById('mergeBtn');
    const progressWrap  = document.getElementById('mergeProgress');
    const progressFill  = document.getElementById('mergeProgressFill');
    const progressLabel = document.getElementById('mergeProgressLabel');

    btn.disabled  = true;
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

    btn.disabled  = false;
    btn.innerHTML = '<span class="material-icons-round">merge</span> Merge PDFs';
}

// ── Reset ────────────────────────────────────

document.getElementById('mergeReset').addEventListener('click', () => {
    mergeFiles          = [];
    mergeInput.value    = '';
    mergeQueue.innerHTML = '';
    hide(mergeControls);
    hide(mergeResults);
    show(mergeZone);
});
