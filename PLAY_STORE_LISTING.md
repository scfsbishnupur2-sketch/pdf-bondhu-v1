# PDF Bondhu 2.0 — Google Play Store Release Kit

## Brand Identity
- **App Name:** PDF Bondhu
- **Tagline:** One App. Everyday Solutions.
- **Package ID:** `com.nayak.pdfbondhu`
- **Version:** `2.0.0` (`versionCode: 3`)
- **Developer:** Suman Nayak
- **Price:** 100% Free (No paid subscriptions, no locked tools)
- **Languages:** English, Bengali (বাংলা), Hindi (हिन्दी)

## Short Description (80 chars max)
> 100% Free offline PDF Studio, Passport Photo, QR, Calculators & Private Vault.

## Full Description
**PDF Bondhu 2.0 — One App. Everyday Solutions.**

Transform your smartphone into a fast, private, and completely free document & daily utility studio. PDF Bondhu processes your PDFs, photos, spreadsheets, and personal documents **100% locally on your device** — no forced cloud uploads, no watermarks, no subscriptions.

### PDF Studio
- **AI Document Scanner:** Auto 4-corner perspective crop, Magic Color enhancement, multi-page PDF export.
- **Compress, Merge & Split PDF:** Shrink large files to exact KB/MB targets, combine documents, or extract pages.
- **Edit, E-Sign & Watermark:** Add text, whiteout mistakes, highlight, draw signatures, stamp watermarks & page numbers.
- **Organize, Repair & Verify:** Rotate/reorder pages, rescue damaged PDFs, inspect e-Aadhaar/PAN digital signatures.
- **PDF to Images, PDF Unlock & Compare:** Export pages as HD JPG/PNG, unlock authorized PDFs, compare two PDFs side-by-side.

### Image Studio
- **Exact KB Image Reducer:** Shrink any photo to exact KB (20 KB, 50 KB, 100 KB, or custom KB) for online forms.
- **Passport Size Photo Maker:** India 35×45mm, PAN 25×35mm, US Visa 51×51mm, background color change & printable A4/4×6 sheets.
- **ID Card 2-in-1 A4 Maker, Photo/Signature Resizer, Cropper, Format Converter, JPG to PDF & Offline OCR (English & Bengali).**

### Office Studio
- **Excel Merger, Excel Cleaner, PDF to Excel, CSV & Spreadsheet Viewer/Converter, ZIP Creator & ZIP Extractor.**

### Daily Utility Center
- **Calculators:** Standard & Scientific Calculator, Indian GST Calculator (CGST/SGST/IGST), EMI Calculator, Percentage, Age & Date Difference.
- **Unit Converters:** Length, Weight, Temperature, Area (including Bigha/Katha/Acre), Volume, Electricity Bill & Unit Converter, Data Storage, Time.
- **Productivity:** Notes, To-Do List, Shopping List, Daily Expense Tracker (CSV export), Indian Calendar, Stopwatch, Timer & Reminders.
- **Smart Tools:** QR & Barcode Scanner, QR & Wi-Fi/UPI QR Generator, Real Internet Speed Test.

### Personal Document Center & India Essentials
- Organize local documents into folders with **4-digit PIN lock**, **AES-GCM local encryption**, and **Android Biometric Unlock**.
- Curated **India Essentials** with verified official government portal links and PAN/Aadhaar/Voter/Passport checklists (independent utility app — not affiliated with any government agency).

## Privacy Policy Summary
- **Zero Server Uploads:** All PDF, image, spreadsheet, OCR, and vault operations execute strictly on your device.
- **Local Storage Only:** Documents saved in Personal Document Center stay in private device storage (`IndexedDB` / encrypted local records).
- **Minimal Permissions:** Camera permission is requested only when scanning documents or QR codes.
- **Data Safety Declaration:** No personal documents or analytics are transmitted to external servers.

## Building the Release-Ready Android App Bundle (`.aab`)
Push to `main` on GitHub — the automated workflow compiles and signs both:
1. `PDF-Bondhu-2.0.apk` (Direct Android install)
2. `PDF-Bondhu-2.0.aab` (Upload directly to Google Play Console → Production / Internal Testing)
