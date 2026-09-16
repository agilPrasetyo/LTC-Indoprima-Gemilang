/**
 * SERTIFIKAT GENERATOR ENGINE (LTC INDOPRIMA GEMILANG)
 * Client-Side Vector PDF Generation using pdf-lib + fontkit + Authentic Calibri TTF
 * 100% Vector Output matching contoh.pdf & template.pdf with exact coordinates and typography
 */

(function(window) {
    'use strict';

    // Helper caching buffer font agar cepat dan tidak berulang kali download
    let cachedCalibriBytes = null;
    let cachedCalibriBoldBytes = null;

    async function loadCalibriFonts() {
        if (cachedCalibriBytes && cachedCalibriBoldBytes) {
            return {
                regular: cachedCalibriBytes,
                bold: cachedCalibriBoldBytes
            };
        }

        const [respRegular, respBold] = await Promise.all([
            fetch('/fonts/calibri.ttf?v=1.1'),
            fetch('/fonts/calibrib.ttf?v=1.1')
        ]);

        if (!respRegular.ok || !respBold.ok) {
            throw new Error('Gagal memuat font Calibri dari server lokal.');
        }

        const [regularBytes, boldBytes] = await Promise.all([
            respRegular.arrayBuffer(),
            respBold.arrayBuffer()
        ]);

        cachedCalibriBytes = regularBytes;
        cachedCalibriBoldBytes = boldBytes;

        return {
            regular: regularBytes,
            bold: boldBytes
        };
    }

    /**
     * Format nama siswa agar sesuai kaidah sertifikat formal di contoh.pdf (Title Case)
     * Contoh: "MUNTOHO ADI PUTRO" -> "Muntoho Adi Putro"
     */
    function formatNamaSertifikat(name) {
        if (!name) return '';
        const str = String(name).trim();
        // Jika seluruhnya huruf kapital, ubah ke Title Case seperti di contoh.pdf
        if (str === str.toUpperCase()) {
            return str.toLowerCase().replace(/(?:^|\s|-|\.)[a-z]/g, match => match.toUpperCase());
        }
        return str;
    }

    let cachedTemplateBytes = null;
    async function loadCertificateTemplateBytes() {
        if (cachedTemplateBytes) return cachedTemplateBytes;
        const templateUrl = '/template_sertifikat/template.pdf';
        const templateResponse = await fetch(templateUrl + '?t=' + Date.now());
        if (!templateResponse.ok) {
            throw new Error('Gagal memuat template sertifikat dari ' + templateUrl);
        }
        cachedTemplateBytes = await templateResponse.arrayBuffer();
        return cachedTemplateBytes;
    }

    /**
     * Membangun dokumen PDF tunggal (PDFDocument) untuk satu siswa
     */
    async function buildCertificatePDFDoc(certData, templateBytes, regularFontBytes, boldFontBytes) {
        const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

        // 1. Load PDF Document dari template
        const pdfDoc = await PDFDocument.load(templateBytes);
        const pages = pdfDoc.getPages();
        const page1 = pages[0]; // Portrait: 595.32 x 841.92 pt
        const page3 = pages[2]; // Landscape: 841.92 x 595.32 pt

        // 2. Register Fontkit dan Embed Font Calibri (Body / Regular & Bold)
        let fontCalibri, fontCalibriBold;
        try {
            if (window.fontkit && regularFontBytes && boldFontBytes) {
                pdfDoc.registerFontkit(window.fontkit);
                fontCalibri = await pdfDoc.embedFont(regularFontBytes);
                fontCalibriBold = await pdfDoc.embedFont(boldFontBytes);
            }
        } catch (fontErr) {
            console.warn('Peringatan embed font custom Calibri:', fontErr.message);
        }

        // Fallback jika terjadi kendala pada fontkit
        if (!fontCalibriBold) {
            fontCalibriBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        }
        if (!fontCalibri) {
            fontCalibri = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }

        // 3. Pas Foto Siswa 3x4 jika tersedia (Halaman 1)
        if (certData.fotoUrl) {
            try {
                let photoBytes = null;
                if (certData.fotoUrl.startsWith('data:')) {
                    const base64Content = certData.fotoUrl.split(',')[1];
                    const binaryString = atob(base64Content);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    photoBytes = bytes.buffer;
                } else {
                    const photoFetchUrl = certData.fotoUrl.includes('?') ? certData.fotoUrl : `${certData.fotoUrl}?t=${Date.now()}`;
                    const photoResp = await fetch(photoFetchUrl);
                    if (photoResp.ok) {
                        photoBytes = await photoResp.arrayBuffer();
                    } else {
                        console.warn(`[Sertifikat Engine] Foto status ${photoResp.status} dari:`, photoFetchUrl);
                    }
                }

                if (photoBytes) {
                    let cleanBytes = photoBytes;
                    if (cleanBytes instanceof Uint8Array) {
                        cleanBytes = cleanBytes.buffer.slice(cleanBytes.byteOffset, cleanBytes.byteOffset + cleanBytes.byteLength);
                    }

                    let embeddedImage;
                    try {
                        embeddedImage = await pdfDoc.embedJpg(cleanBytes);
                    } catch (eJpg) {
                        try {
                            embeddedImage = await pdfDoc.embedPng(cleanBytes);
                        } catch (ePng) {
                            console.warn('[Sertifikat Engine] Foto bukan format JPEG/PNG valid:', ePng.message);
                        }
                    }

                    if (embeddedImage) {
                        // Koordinat kotak foto di Halaman 1 template (contoh.pdf):
                        const targetX = 255.5;
                        const targetY = 117.8;
                        const targetW = 78.5;
                        const targetH = 106.0;

                        // Bersihkan background kotak foto
                        page1.drawRectangle({
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH,
                            color: rgb(1, 1, 1),
                        });

                        // Tempel foto siswa
                        page1.drawImage(embeddedImage, {
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH,
                        });
                    }
                }
            } catch (errFoto) {
                console.warn('Tidak dapat memuat pas foto siswa untuk sertifikat:', errFoto.message);
            }
        }

        // ==========================================
        // 4. ISI DATA HALAMAN 1 (SERTIFIKAT UTAMA)
        // Portrait: 595.32 x 841.92 pt
        // ==========================================

        // A. Nomor Sertifikat: Calibri Bold, Size 7, Bold Underline
        // Posisi template contoh: X = 428.59, Y = 774.12
        if (certData.nomorSertifikat) {
            const noSertifikatText = String(certData.nomorSertifikat).trim();
            const noSertifikatX = 428.59;
            const noSertifikatY = 774.12;
            const noSertifikatSize = 7;
            const noSertifikatWidth = fontCalibriBold.widthOfTextAtSize(noSertifikatText, noSertifikatSize);

            // Gambar teks nomor sertifikat (Calibri Bold size 7)
            page1.drawText(noSertifikatText, {
                x: noSertifikatX,
                y: noSertifikatY,
                size: noSertifikatSize,
                font: fontCalibriBold,
                color: rgb(0, 0, 0),
            });

            // Bold Underline tepat di bawah teks nomor sertifikat
            page1.drawLine({
                start: { x: noSertifikatX, y: noSertifikatY - 1.5 },
                end: { x: noSertifikatX + noSertifikatWidth, y: noSertifikatY - 1.5 },
                thickness: 0.85,
                color: rgb(0, 0, 0),
            });
        }

        // B. Nama Siswa: Calibri Body Bold, Size 20
        // Posisi template contoh: X = 202.13, Y = 474.91
        const namaFormatted = formatNamaSertifikat(certData.nama || 'SISWA');
        page1.drawText(namaFormatted, {
            x: 202.13,
            y: 474.91,
            size: 20,
            font: fontCalibriBold,
            color: rgb(0, 0, 0),
        });

        // C. Tanggal Lahir (Tempat/Tgl Lahir): Calibri Body (Regular), Size 20
        // Posisi template contoh: X = 202.13, Y = 436.73
        if (certData.ttl) {
            const ttlText = String(certData.ttl).trim();
            page1.drawText(ttlText, {
                x: 202.13,
                y: 436.73,
                size: 20,
                font: fontCalibri,
                color: rgb(0, 0, 0),
            });
        }

        // D. Tanggal Pemagangan (Periode): Calibri Body (Regular), Size 20
        // Posisi template contoh: Y = 360.65, Rata Tengah (Center across 595.32 pt)
        if (certData.periode) {
            const periodeText = String(certData.periode).trim();
            const periodeWidth = fontCalibri.widthOfTextAtSize(periodeText, 20);
            const periodeCenterX = (595.32 - periodeWidth) / 2;

            page1.drawText(periodeText, {
                x: periodeCenterX,
                y: 360.65,
                size: 20,
                font: fontCalibri,
                color: rgb(0, 0, 0),
            });
        }

        // E. Tempat dan Tanggal Tanda Tangan Havid: Calibri Body (Regular), Size 14 (Pas Tengah)
        // Posisi tengah blok tanda tangan Havid: Center X = 414.16 pt, Y = 231.98 pt
        if (certData.tglTerbit) {
            let tglHavid = String(certData.tglTerbit).trim();
            if (!tglHavid.toLowerCase().startsWith('gresik')) {
                tglHavid = `Gresik, ${tglHavid}`;
            }

            const tglHavidWidth = fontCalibri.widthOfTextAtSize(tglHavid, 14);
            const tglHavidX = 414.16 - (tglHavidWidth / 2);

            page1.drawText(tglHavid, {
                x: tglHavidX,
                y: 231.98,
                size: 14,
                font: fontCalibri,
                color: rgb(0, 0, 0),
            });
        }

        // ==========================================
        // 5. ISI DATA HALAMAN 3 (TRANSKRIP NILAI)
        // Landscape: 841.92 x 595.32 pt
        // ==========================================

        // A. Nama Siswa di Atas Tabel Transkrip: Calibri Bold, Size 20
        // Posisi template contoh: Y = 431.14, Rata Tengah (Center across 841.92 pt)
        const namaP3Width = fontCalibriBold.widthOfTextAtSize(namaFormatted, 20);
        const centerP3X = (841.92 - namaP3Width) / 2;

        page3.drawText(namaFormatted, {
            x: centerP3X,
            y: 431.14,
            size: 20,
            font: fontCalibriBold,
            color: rgb(0, 0, 0),
        });

        // B. 4 Komponen Nilai pada Tabel (Kolom NILAI): Calibri Regular, Size 12
        const formatScore = (val) => {
            const n = parseFloat(val);
            return isNaN(n) ? '0.0' : n.toFixed(1);
        };

        // Alignment X persis seperti di contoh.pdf (angka < 10 digeser 3pt agar desimal sejajar)
        const getScoreX = (val) => (parseFloat(val) < 10 ? 692.26 : 689.26);

        // 1. Subtotal Kinerja (Baris I) -> Y = 337.99 (Bobot 40%)
        const subKinerja = certData.subtotalKinerja !== undefined && certData.subtotalKinerja !== null ? certData.subtotalKinerja : (parseFloat(certData.nilaiKinerja || 0) * 0.4);
        const strKinerja = formatScore(subKinerja);
        page3.drawText(strKinerja, {
            x: getScoreX(strKinerja),
            y: 337.99,
            size: 12,
            font: fontCalibri,
            color: rgb(0, 0, 0),
        });

        // 2. Subtotal BMK (Baris II) -> Y = 275.93 (Bobot 30%)
        const subBmk = certData.subtotalBmk !== undefined && certData.subtotalBmk !== null ? certData.subtotalBmk : (parseFloat(certData.nilaiBmk || 0) * 0.3);
        const strBmk = formatScore(subBmk);
        page3.drawText(strBmk, {
            x: getScoreX(strBmk),
            y: 275.93,
            size: 12,
            font: fontCalibri,
            color: rgb(0, 0, 0),
        });

        // 3. Subtotal Sikap (Baris III) -> Y = 229.37 (Bobot 20%)
        const subSikap = certData.subtotalSikap !== undefined && certData.subtotalSikap !== null ? certData.subtotalSikap : (parseFloat(certData.nilaiSikap || 0) * 0.2);
        const strSikap = formatScore(subSikap);
        page3.drawText(strSikap, {
            x: getScoreX(strSikap),
            y: 229.37,
            size: 12,
            font: fontCalibri,
            color: rgb(0, 0, 0),
        });

        // 4. Subtotal Laporan Akhir (Baris IV) -> Y = 190.85 (Bobot 10%)
        const subLaporan = certData.subtotalLaporan !== undefined && certData.subtotalLaporan !== null ? certData.subtotalLaporan : (parseFloat(certData.nilaiLaporan || 0) * 0.1);
        const strLaporan = formatScore(subLaporan);
        page3.drawText(strLaporan, {
            x: getScoreX(strLaporan),
            y: 190.85,
            size: 12,
            font: fontCalibri,
            color: rgb(0, 0, 0),
        });

        // C. Kotak Ringkasan Hasil Pendidikan
        const boxLeft = 176.9;
        const boxWidth = 128.9;
        const nAkhirVal = parseFloat(certData.nilaiAkhir) || 0;

        // 1. Nilai Akhir: Calibri Bold, Size 18, Warna Teal rgb(0, 0.4, 0.4)
        const nilaiAkhirFormatted = formatScore(nAkhirVal);
        const naTextWidth = fontCalibriBold.widthOfTextAtSize(nilaiAkhirFormatted, 18);
        const naCenterX = boxLeft + (boxWidth - naTextWidth) / 2;

        page3.drawText(nilaiAkhirFormatted, {
            x: naCenterX,
            y: 129.02,
            size: 18,
            font: fontCalibriBold,
            color: rgb(0, 0.4, 0.4),
        });

        // 2. Predikat Huruf (A / B / C / D): Calibri Bold, Size 18
        const predikatHuruf = nAkhirVal >= 90 ? 'A' : (nAkhirVal >= 80 ? 'B' : (nAkhirVal >= 70 ? 'C' : 'D'));
        const hurufTextWidth = fontCalibriBold.widthOfTextAtSize(predikatHuruf, 18);
        const hurufCenterX = boxLeft + (boxWidth - hurufTextWidth) / 2;

        page3.drawText(predikatHuruf, {
            x: hurufCenterX,
            y: 95.664,
            size: 18,
            font: fontCalibriBold,
            color: rgb(0, 0, 0),
        });

        // 3. Predikat Teks: Calibri Regular, Size 14
        let predikatTeks = 'Kurang';
        if (nAkhirVal >= 90) predikatTeks = 'Sangat Memuaskan';
        else if (nAkhirVal >= 80) predikatTeks = 'Baik';
        else if (nAkhirVal >= 70) predikatTeks = 'Cukup';

        const teksWidth = fontCalibri.widthOfTextAtSize(predikatTeks, 14);
        const teksCenterX = boxLeft + (boxWidth - teksWidth) / 2;

        page3.drawText(predikatTeks, {
            x: teksCenterX,
            y: 59.064,
            size: 14,
            font: fontCalibri,
            color: rgb(0, 0, 0),
        });

        // D. Tempat dan Tanggal di atas Moh. Hartono: Calibri Body (Regular), Size 10 (Pas Tengah)
        if (certData.tglTerbit) {
            let tglHartono = String(certData.tglTerbit).trim();
            if (!tglHartono.toLowerCase().startsWith('gresik')) {
                tglHartono = `Gresik, ${tglHartono}`;
            }

            const tglHartonoWidth = fontCalibri.widthOfTextAtSize(tglHartono, 10);
            const tglHartonoX = 707.88 - (tglHartonoWidth / 2);

            page3.drawText(tglHartono, {
                x: tglHartonoX,
                y: 158.69,
                size: 10,
                font: fontCalibri,
                color: rgb(0, 0, 0),
            });
        }

        return pdfDoc;
    }

    /**
     * Download sertifikat untuk satu siswa
     */
    async function generateAndDownloadCertificate(certData) {
        if (!window.PDFLib) {
            throw new Error('Library pdf-lib belum termuat di browser. Periksa koneksi.');
        }

        const templateBytes = await loadCertificateTemplateBytes();
        const fonts = await loadCalibriFonts();
        const pdfDoc = await buildCertificatePDFDoc(certData, templateBytes, fonts.regular, fonts.bold);

        const pdfBytesSaved = await pdfDoc.save();
        const blob = new Blob([pdfBytesSaved], { type: 'application/pdf' });
        const fileName = `Sertifikat_${String(certData.noreg || 'LTC').trim()}_${String(certData.nama || 'Siswa').trim().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        // Trigger Download di Browser
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);

        return { success: true, fileName: fileName };
    }

    /**
     * Download banyak sertifikat sekaligus (Batch Download)
     * Format: 'pdf' (Gabungan 1 File PDF) atau 'zip' (Arsip File PDF Terpisah per Siswa)
     */
    async function generateBatchCertificates(certDataList, format = 'pdf', onProgress = null) {
        if (!window.PDFLib) {
            throw new Error('Library pdf-lib belum termuat di browser. Periksa koneksi.');
        }
        if (!Array.isArray(certDataList) || certDataList.length === 0) {
            throw new Error('Tidak ada data sertifikat yang dipilih.');
        }

        const templateBytes = await loadCertificateTemplateBytes();
        const fonts = await loadCalibriFonts();
        const { PDFDocument } = window.PDFLib;

        if (format === 'zip') {
            if (!window.JSZip) {
                throw new Error('Library JSZip belum termuat di halaman.');
            }
            const zip = new window.JSZip();

            for (let i = 0; i < certDataList.length; i++) {
                const cData = certDataList[i];
                if (typeof onProgress === 'function') {
                    onProgress({ current: i + 1, total: certDataList.length, studentName: cData.nama || cData.noreg });
                }
                const singleDoc = await buildCertificatePDFDoc(cData, templateBytes, fonts.regular, fonts.bold);
                const pdfBytes = await singleDoc.save();
                const fileName = `Sertifikat_${String(cData.noreg || 'LTC').trim()}_${String(cData.nama || 'Siswa').trim().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                zip.file(fileName, pdfBytes);
            }

            const nowStr = new Date().toISOString().slice(0, 10);
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFileName = `Sertifikat_Masal_LTC_${nowStr}_${certDataList.length}_Siswa.zip`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = zipFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 15000);

            return { success: true, fileName: zipFileName, count: certDataList.length };
        } else {
            // Default: Merged Multi-page PDF
            const mergedDoc = await PDFDocument.create();

            for (let i = 0; i < certDataList.length; i++) {
                const cData = certDataList[i];
                if (typeof onProgress === 'function') {
                    onProgress({ current: i + 1, total: certDataList.length, studentName: cData.nama || cData.noreg });
                }
                const singleDoc = await buildCertificatePDFDoc(cData, templateBytes, fonts.regular, fonts.bold);
                const copiedPages = await mergedDoc.copyPages(singleDoc, singleDoc.getPageIndices());
                copiedPages.forEach(p => mergedDoc.addPage(p));
            }

            const nowStr = new Date().toISOString().slice(0, 10);
            const mergedBytes = await mergedDoc.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const mergedFileName = `Sertifikat_Gabungan_LTC_${nowStr}_${certDataList.length}_Siswa.pdf`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = mergedFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 15000);

            return { success: true, fileName: mergedFileName, count: certDataList.length };
        }
    }

    // Ekspor ke window global
    window.buildCertificatePDFDoc = buildCertificatePDFDoc;
    window.generateAndDownloadCertificate = generateAndDownloadCertificate;
    window.generateBatchCertificates = generateBatchCertificates;

})(typeof window !== 'undefined' ? window : this);
