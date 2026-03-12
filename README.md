# PDF Tools

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pdf--tools-7c3aed?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pdf-tools-dgs.pages.dev/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-6d28d9?style=for-the-badge&logo=github)](https://github.com/gorupa/pdf-tools)
[![No Server](https://img.shields.io/badge/No%20Server-100%25%20Local-10b981?style=for-the-badge)](https://github.com/gorupa/pdf-tools)

> Free, private, open source PDF tools — compress, lock, unlock and merge PDFs entirely in your browser. No uploads. No accounts. No ads.

---

## Tools

### 🗜️ Compress
Reduce PDF file size by re-rendering pages at a lower resolution.
- Quality slider from 10% to 100%
- Live estimated output size preview
- Per-page progress bar
- Shows exact % saved after compression

### 🔒 Lock / Unlock
Add or remove password protection from any PDF.
- **Lock** — encrypt with a password, blocks copying and editing
- **Unlock** — strip password protection if you know the current password
- Show/hide password toggle
- Clear error messages for wrong passwords

### 🔀 Merge
Combine multiple PDFs into one file.
- Upload 2 or more PDFs
- Drag to reorder before merging
- Add or remove files from the queue
- Shows total pages and final file size

---

## Privacy

Everything runs locally in your browser.

- ✅ No file uploads to any server
- ✅ No data collection or tracking
- ✅ No account or sign-up required
- ✅ Works offline after the page loads

---

## Tech Stack

| Library | Version | Used for |
|---|---|---|
| [pdf-lib](https://github.com/Hopding/pdf-lib) | 1.17.1 | Lock, unlock and merge |
| [PDF.js](https://github.com/mozilla/pdf.js) | 3.11.174 | Render pages for compression |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Rebuild compressed PDF |

All libraries are loaded via CDN — no build step or `npm install` needed.

---

## File Structure

```
pdf-tools/
├── index.html          # Main page
├── css/
│   └── style.css       # All styles
├── js/
│   ├── utils.js        # Shared helpers (load first)
│   ├── compress.js     # Compress tab logic
│   ├── lock.js         # Lock / unlock tab logic
│   └── merge.js        # Merge tab logic
├── LICENSE
└── README.md
```

---

## Run Locally

No build tools needed. Just open the file:

```bash
git clone https://github.com/gorupa/pdf-tools.git
cd pdf-tools
# Open index.html in your browser
```

Or serve it with any static server:

```bash
npx serve .
```

---

## Other Tools by gorupa

| Tool | Description |
|---|---|
| [Image Compressor](https://local-image-compressor.pages.dev) | Compress JPG and PNG images locally |
| [Image to PDF](https://image-to-pdf-afb.pages.dev) | Convert images to a PDF in your browser |
| [MLSU Law Resources](https://mlsu-dhj.pages.dev) | Free notes and papers for MLSU LLB students |

---
 <div align="center">

Made with ❤️ by [gorupa](https://github.com/gorupa)

🌐 **Live at [local-image-compressor.pages.dev](https://pdf-tools-dgs.pages.dev/)**

⭐ If this project helped you, consider giving it a star!

</div>

