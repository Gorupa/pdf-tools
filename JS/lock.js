/* ============================================
   PDF Tools — js/lock.js
   Author: gorupa (https://github.com/gorupa)
   License: MIT
   Description: Lock and unlock PDFs using
                pdf-lib encryption API.
   ============================================ */

'use strict';

let lockFile = null;
let lockMode = 'lock'; // 'lock' | 'unlock'

const lockZone     = document.getElementById('lockUploadZone');
const lockInput    = document.getElementById('lockFileInput');
const lockControls = document.getElementById('lockControls');
const lockResults  = document.getElementById('lockResults');

// ── Mode Toggle ──────────────────────────────

/**
 * Switch between Lock and Unlock mode
 * @param {string} mode - 'lock' | 'unlock'
 */
function setLockMode(mode) {
    lockMode = mode;
    document.getElementById('lockModeBtn').classList.toggle('active',   mode === 'lock');
    document.getElementById('unlockModeBtn').classList.toggle('active', mode === 'unlock');
    document.getElementById('lockFields').classList.toggle('hidden',    mode !== 'lock');
    document.getElementById('unlockFields').classList.toggle('hidden',  mode !== 'unlock');
    document.getElementById('lockUploadTitle').textContent =
        mode === 'lock' ? 'Drop a PDF to lock' : 'Drop a PDF to unlock';
    // Reset state
    lockFile        = null;
    lockInput.value = '';
    document.getElementById('lockError').innerHTML = '';
    hide(lockControls);
    hide(lockResults);
    show(lockZone);
}

// ── Upload handlers ──────────────────────────

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
    document.getElementById('lockError').innerHTML      = '';
    hide(lockZone);
    show(lockControls);
    hide(lockResults);
}

// ── Password visibility toggle ───────────────

/**
 * Toggle password field between visible and hidden
 * @param {string} inputId - ID of the password input
 * @param {HTMLButtonElement} btn - The toggle button
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

// ── Error display ────────────────────────────

/**
 * Show a styled error message inside the lock panel
 * @param {string} msg
 */
function showLockError(msg) {
    document.getElementById('lockError').innerHTML = `
        <div class="error-box">
            <span class="material-icons-round">error_outline</span>
            ${msg}
        </div>`;
}

// ── Lock ─────────────────────────────────────

/** Encrypt the loaded PDF with a user-supplied password using pdf-lib */
async function lockPDF() {
    if (!lockFile) return;

    const pw  = document.getElementById('lockPassword').value;
    const pw2 = document.getElementById('lockPasswordConfirm').value;
    document.getElementById('lockError').innerHTML = '';

    if (!pw)        return showLockError('Please enter a password.');
    if (pw !== pw2) return showLockError('Passwords do not match.');

    const btn     = document.getElementById('lockBtn');
    btn.disabled  = true;
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

    btn.disabled  = false;
    btn.innerHTML = '<span class="material-icons-round">lock</span> Lock PDF';
}

// ── Unlock ───────────────────────────────────

/** Remove password protection from the loaded PDF */
async function unlockPDF() {
    if (!lockFile) return;

    const pw = document.getElementById('unlockPassword').value;
    document.getElementById('lockError').innerHTML = '';

    if (!pw) return showLockError('Please enter the PDF password.');

    const btn     = document.getElementById('unlockBtn');
    btn.disabled  = true;
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

    btn.disabled  = false;
    btn.innerHTML = '<span class="material-icons-round">lock_open</span> Unlock PDF';
}

// ── Reset ────────────────────────────────────

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
