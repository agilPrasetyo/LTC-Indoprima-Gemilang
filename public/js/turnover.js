// Dropdown Kota Dinamis dari Data Turnover Siswa
function populateTurnoverCitiesDropdown() {
    const select = document.getElementById('filter-turnover-wilayah');
    if (!select) return;
    
    const currentSelected = select.value;
    select.innerHTML = '<option value="">Semua Kota (Jawa Timur)</option>';
    
    const filteredSet = new Set();

    // Tambahkan HANYA kota yang ada di data turnover siswa
    const currentTurnoverDataset = rawTurnoverData.length > 0 ? rawTurnoverData : fallbackStats.turnover;
    currentTurnoverDataset.forEach(s => {
        const rawCity = s.wilayah || s.asalDaerah || s.asal || s.Kota;
        if (rawCity) {
            const normCity = normalizeCityName(rawCity);
            if (normCity && normCity !== "-" && normCity !== "NULL") {
                filteredSet.add(normCity);
            }
        }
    });

    const uniqueSortedList = Array.from(filteredSet).sort();

    uniqueSortedList.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.innerText = city;
        select.appendChild(opt);
    });

    if (currentSelected && filteredSet.has(currentSelected)) {
        select.value = currentSelected;
    } else {
        select.value = "";
    }
}

function normalizeCityName(name) {
    if (!name) return "";
    let norm = name.toUpperCase()
                   .replace("KABUPATEN ", "")
                   .replace("KOTA ", "")
                   .replace("KAB. ", "")
                   .replace("KOT. ", "")
                   .trim();
    if (norm === "GRSIK" || norm === "GRSK" || norm === "GRESK") norm = "GRESIK";
    if (norm === "SBY") norm = "SURABAYA";
    if (norm === "MLG") norm = "MALANG";
    if (norm === "SMG") norm = "SEMARANG";
    return norm;
}

// Render peta fallback yang disederhanakan tanpa menampilkan garis batas biru putus-putus
function renderSimplifiedFallbackMap(filteredData, cityStats) {
    if (geoJsonLayer) {
        mapTurnoverInstance.removeLayer(geoJsonLayer);
        geoJsonLayer = null;
    }
    
    if (!window.fallbackLayerGroup) {
        window.fallbackLayerGroup = L.layerGroup().addTo(mapTurnoverInstance);
    } else {
        window.fallbackLayerGroup.clearLayers();
    }

    window.turnoverMarkers = {}; // Reset tracking marker di memori

    // Pasang PIN interaktif untuk setiap kota yang memiliki data turnover
    Object.keys(cityStats).forEach(cityName => {
        const normCity = normalizeCityName(cityName);
        const coord = coordsJawa[normCity] || coordsJawa[cityName];
        if (!coord) return;
        
        const stat = cityStats[cityName];
        
        // Menentukan class bulatan berdasarkan kondisi turnover asli daerah tersebut
        let markerClass = 'map-marker-blue';
        const totalNeg = stat.resign + stat.indisipliner;
        const totalPos = stat.lulus;

        if (totalNeg > totalPos) markerClass = 'map-marker-red';
        else if (totalPos > totalNeg) markerClass = 'map-marker-green';
        else if (totalPos === totalNeg && totalPos > 0) markerClass = 'map-marker-yellow';

        const coloredPinIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="${markerClass}"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const totalCases = stat.resign + stat.lulus + stat.indisipliner;
        const marker = L.marker(coord, { icon: coloredPinIcon }).addTo(window.fallbackLayerGroup);

        let popupContent = `<div class="p-2 font-sans">
            <h4 class="font-extrabold text-sm text-slate-800 border-b pb-1">📍 ${cityName}</h4>
            <p class="text-xs text-slate-600 mt-2">Total Kasus: <b>${totalCases} Siswa</b></p>
            <div class="mt-2 text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg border font-medium">
                <p class="text-emerald-600 font-semibold">● Lulus Sukses: ${stat.lulus} orang</p>
                <p class="text-amber-600 font-semibold">● Resign Kerja: ${stat.resign} orang</p>
                <p class="text-rose-600 font-semibold">● Indisipliner: ${stat.indisipliner} orang</p>
            </div>
        </div>`;

        marker.bindPopup(popupContent);

        // Daftarkan marker ke mapping global
        window.turnoverMarkers[cityName] = marker;
    });

    // Fokus kamera & Buka Popup Instan jika filter diaktifkan
    const filterWilInput = document.getElementById('filter-turnover-wilayah');
    const activeCityFilter = filterWilInput ? normalizeCityName(filterWilInput.value) : "";
    if (activeCityFilter && coordsJawa[activeCityFilter]) {
        mapTurnoverInstance.flyTo(coordsJawa[activeCityFilter], 11, { animate: true, duration: 1.2 });
        const targetMarker = window.turnoverMarkers[activeCityFilter];
        if (targetMarker) {
            setTimeout(() => {
                targetMarker.openPopup();
            }, 1300);
        }
    } else {
        mapTurnoverInstance.setView([-7.7, 112.5], 8);
    }
}

// Inisialisasi Peta Tematik Batas Wilayah (GeoJSON Choropleth) Jawa Timur Lengkap
function initTurnoverMap(filteredData) {
    const mapTEl = document.getElementById('map-turnover-container');
    if (!mapTEl) return;

    if (!mapTurnoverInstance) {
        mapTurnoverInstance = L.map('map-turnover-container', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([-7.7, 112.5], 8);
        
        // Tambahkan layer group khusus untuk menampung pin perak 3D di peta
        turnoverMarkerGroup = L.layerGroup().addTo(mapTurnoverInstance);
    } else {
        setTimeout(() => {
            mapTurnoverInstance.invalidateSize();
        }, 100);
    }

    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    if (activeThematicTheme === 'dark') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
        tileAttribution = '&copy; Esri, DeLorme, NAVTEQ';
    } else if (activeThematicTheme === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        tileAttribution = '&copy; Esri &mdash; Maxar, Earthstar Geographics';
    }

    mapTurnoverInstance.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            mapTurnoverInstance.removeLayer(layer);
        }
    });
    L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: tileAttribution
    }).addTo(mapTurnoverInstance);

    const currentTurnoverDataset = rawTurnoverData.length > 0 ? rawTurnoverData : fallbackStats.turnover;
    const cityStats = {};

    currentTurnoverDataset.forEach(s => {
        const cityClean = normalizeCityName(s.wilayah || s.asalDaerah || s.asal || s.Kota);
        if (!cityStats[cityClean]) {
            cityStats[cityClean] = { resign: 0, lulus: 0, indisipliner: 0, students: [] };
        }
        
        const status = String(s.alasan || s.alasanDetail || s.alasan_detail || s.keterangan || '').toLowerCase();
        if (status.includes('resign')) {
            cityStats[cityClean].resign++;
        } else if (status.includes('lulus')) {
            cityStats[cityClean].lulus++;
        } else if (status.includes('indisipliner') || status.includes('indisiplin')) {
            cityStats[cityClean].indisipliner++;
        }
        cityStats[cityClean].students.push(s);
    });

    const filterWilInput = document.getElementById('filter-turnover-wilayah');
    const activeCityFilter = filterWilInput ? normalizeCityName(filterWilInput.value) : "";

    // Fungsi pewarnaan dinamis berbasis data riil:
    // - Wilayah belum pernah ada siswanya: tidak diberi warna (transparan, garis batas abu-abu halus)
    // - Resign & Indisipliner tinggi: Blok MERAH (#EF4444)
    // - Kelulusan tinggi / turnover rendah: Blok HIJAU (#10B981)
    // - Seimbang: Blok KUNING/ORANGE (#F59E0B)
    function styleGeoJsonFeature(feature) {
        const geoCityName = normalizeCityName(feature.properties.name || feature.properties.KABKOT || feature.properties.NAME_2);
        const stat = cityStats[geoCityName];
        
        let fillColor = 'transparent'; 
        let fillOpacity = 0;
        let weight = 1;
        let color = '#94a3b8'; // Garis batas abu-abu netral
        let dashArray = '3, 4'; // Garis putus-putus tipis untuk wilayah tanpa data

        if (stat) {
            const totalNeg = (stat.resign || 0) + (stat.indisipliner || 0);
            const totalPos = (stat.lulus || 0);
            const totalCases = totalNeg + totalPos;

            if (totalCases > 0) {
                dashArray = null;
                // Wilayah jika tingkat resign dan indisipliner tinggi -> BLOK MERAH
                if (totalNeg > totalPos) {
                    fillColor = '#EF4444'; // Zona Merah (Butuh Evaluasi)
                    fillOpacity = 0.65;
                    color = '#DC2626';
                    weight = 2;
                } 
                // Wilayah jika tingkat kelulusan sukses lebih tinggi -> BLOK HIJAU
                else if (totalPos > totalNeg) {
                    fillColor = '#10B981'; // Zona Hijau (Kelulusan Sukses)
                    fillOpacity = 0.65;
                    color = '#059669';
                    weight = 2;
                } 
                // Wilayah jika seimbang -> BLOK KUNING / ORANGE
                else if (totalPos === totalNeg) {
                    fillColor = '#F59E0B'; // Zona Jingga (Seimbang)
                    fillOpacity = 0.65;
                    color = '#D97706';
                    weight = 2;
                }
            }
        }

        if (activeCityFilter && geoCityName === activeCityFilter) {
            weight = 3.5;
            color = '#2563EB'; // Sinar border biru tebal jika dipilih di filter
            if (fillOpacity === 0) {
                fillColor = '#3B82F6';
                fillOpacity = 0.2;
            } else {
                fillOpacity = 0.85;
            }
            dashArray = null;
        }

        return {
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            color: color,
            weight: weight,
            dashArray: dashArray,
            opacity: 1
        };
    }

    function onEachFeature(feature, layer) {
        const geoCityName = normalizeCityName(feature.properties.name || feature.properties.KABKOT || feature.properties.NAME_2);
        const displayName = feature.properties.name || feature.properties.KABKOT || geoCityName;
        const stat = cityStats[geoCityName];

        let hasData = false;
        let tooltipClass = 'map-kab-label';

        if (stat) {
            const totalNeg = (stat.resign || 0) + (stat.indisipliner || 0);
            const totalPos = (stat.lulus || 0);
            const totalCases = totalNeg + totalPos;

            if (totalCases > 0) {
                hasData = true;
                if (totalNeg > totalPos) tooltipClass = 'map-kab-label-red';
                else if (totalPos > totalNeg) tooltipClass = 'map-kab-label-green';
                else if (totalPos === totalNeg) tooltipClass = 'map-kab-label-yellow';
            }
        }

        // Tampilkan label nama daerah permanen HANYA pada wilayah yang memiliki data siswa agar peta bersih & rapi
        if (hasData) {
            layer.bindTooltip(displayName, {
                permanent: true,
                direction: 'center',
                className: tooltipClass
            });
        } else {
            // Untuk wilayah tanpa data, label tooltip hanya muncul saat kursor diarahkan (hover)
            layer.bindTooltip(displayName, {
                permanent: false,
                direction: 'center',
                className: 'map-kab-label'
            });
        }

        let popupContent = `<div class="p-2.5 font-sans">
            <h4 class="font-extrabold text-sm text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                <span>📍</span> <span>${displayName}</span>
            </h4>`;
        
        if (hasData) {
            const totalCases = stat.resign + stat.lulus + stat.indisipliner;
            const totalNeg = stat.resign + stat.indisipliner;
            const totalPos = stat.lulus;
            
            let zoneBadge = '';
            if (totalNeg > totalPos) zoneBadge = '<span class="px-2.5 py-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 rounded-md">🔴 TURNOVER TINGGI (EVALUASI)</span>';
            else if (totalPos > totalNeg) zoneBadge = '<span class="px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-md">🟢 KELULUSAN TINGGI (SUKSES)</span>';
            else if (totalPos === totalNeg) zoneBadge = '<span class="px-2.5 py-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 rounded-md">🟡 ZONA SEIMBANG</span>';

            popupContent += `
                <div class="my-2">${zoneBadge}</div>
                <p class="text-xs text-slate-600 font-semibold">Total Siswa Terdata: <b>${totalCases} Orang</b></p>
                <div class="mt-2 text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg border font-medium">
                    <p class="text-emerald-600 font-bold flex justify-between"><span>● Lulus Sukses:</span> <span>${stat.lulus} orang</span></p>
                    <p class="text-amber-600 font-bold flex justify-between"><span>● Resign Mandiri:</span> <span>${stat.resign} orang</span></p>
                    <p class="text-rose-600 font-bold flex justify-between"><span>● Indisipliner:</span> <span>${stat.indisipliner} orang</span></p>
                </div>
            `;
        } else {
            popupContent += `
                <div class="my-2"><span class="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">BELUM ADA DATA SISWA</span></div>
                <p class="text-xs text-slate-500 mt-1">Belum ada siswa magang yang tercatat dari wilayah ini.</p>
            `;
        }
        popupContent += `</div>`;
        layer.bindPopup(popupContent);

        layer.on({
            mouseover: function(e) {
                const l = e.target;
                l.setStyle({ weight: 3, color: '#2563EB', fillOpacity: hasData ? 0.85 : 0.2 });
            },
            mouseout: function(e) {
                if (geoJsonLayer) geoJsonLayer.resetStyle(e.target);
            },
            click: function(e) {
                mapTurnoverInstance.fitBounds(e.target.getBounds(), { padding: [30, 30] });
            }
        });
    }

    // Memanggil GeoJSON Batas Kabupaten Jawa Timur dari penyimpanan lokal
    if (geoJsonCache) {
        renderGeoJsonLayer(geoJsonCache);
    } else {
        fetch('/data/jawa_timur.geojson')
            .then(response => {
                if (!response.ok) throw new Error("Gagal mengambil data GeoJSON lokal");
                return response.json();
            })
            .then(data => {
                geoJsonCache = data;
                renderGeoJsonLayer(geoJsonCache);
            })
            .catch(err => {
                console.warn("GeoJSON gagal dimuat, beralih ke fallback...", err);
                renderSimplifiedFallbackMap(filteredData, cityStats);
            });
    }

    function renderGeoJsonLayer(geojson) {
        if (geoJsonLayer) mapTurnoverInstance.removeLayer(geoJsonLayer);
        
        geoJsonLayer = L.geoJSON(geojson, {
            style: styleGeoJsonFeature,
            onEachFeature: onEachFeature
        }).addTo(mapTurnoverInstance);

        draw3DSilverPinsOnMap(geojson, cityStats);

        if (activeCityFilter) {
            const coord = coordsJawa[activeCityFilter];
            let matchedLayer = null;
            if (geoJsonLayer) {
                geoJsonLayer.eachLayer(layer => {
                    const name = normalizeCityName(layer.feature.properties.name || layer.feature.properties.KABKOT || layer.feature.properties.NAME_2);
                    if (name === activeCityFilter) {
                        matchedLayer = layer;
                    }
                });
            }

            if (matchedLayer) {
                mapTurnoverInstance.fitBounds(matchedLayer.getBounds(), { padding: [40, 40], animate: true, duration: 1.0 });
            } else if (coord) {
                mapTurnoverInstance.flyTo(coord, 11, { animate: true, duration: 1.0 });
            }

            setTimeout(() => {
                const targetMarker = window.turnoverMarkers[activeCityFilter];
                if (targetMarker) {
                    targetMarker.openPopup();
                } else if (matchedLayer) {
                    matchedLayer.openPopup();
                }
            }, 600);
        } else {
            mapTurnoverInstance.setView([-7.7, 112.5], 8);
            mapTurnoverInstance.closePopup();
        }

        if (window.fallbackLayerGroup) {
            mapTurnoverInstance.removeLayer(window.fallbackLayerGroup);
            window.fallbackLayerGroup = null;
        }
    }
}

// Fungsi menggambar bulatan indikator 3D interaktif warna-warni (Hijau, Merah, Kuning) di atas peta
function draw3DSilverPinsOnMap(geojson, cityStats) {
    turnoverMarkerGroup.clearLayers();
    window.turnoverMarkers = {};

    Object.keys(cityStats).forEach(cityName => {
        const normCity = normalizeCityName(cityName);
        const coord = coordsJawa[normCity] || coordsJawa[cityName];
        const stat = cityStats[cityName];

        if (coord && stat && (stat.resign > 0 || stat.lulus > 0 || stat.indisipliner > 0 || stat.students.length > 0)) {
            let markerClass = 'map-marker-blue';
            const totalNeg = stat.resign + stat.indisipliner;
            const totalPos = stat.lulus;

            if (totalNeg > totalPos) {
                markerClass = 'map-marker-red';
            } else if (totalPos > totalNeg) {
                markerClass = 'map-marker-green';
            } else if (totalPos === totalNeg && totalPos > 0) {
                markerClass = 'map-marker-yellow';
            }

            const coloredPinIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="${markerClass}"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            const totalCases = stat.resign + stat.lulus + stat.indisipliner;
            let popupContent = `<div class="p-2 font-sans">
                <h4 class="font-extrabold text-sm text-slate-800 border-b pb-1">📍 ${normCity}</h4>
                <p class="text-xs text-slate-600 mt-2">Total Kasus: <b>${totalCases} Siswa</b></p>
                <div class="mt-2 text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg border font-semibold">
                    <p class="text-emerald-600 font-semibold">● Lulus Sukses: ${stat.lulus} orang</p>
                    <p class="text-amber-600 font-semibold">● Resign Kerja: ${stat.resign} orang</p>
                    <p class="text-rose-600 font-semibold">● Indisipliner: ${stat.indisipliner} orang</p>
                </div>
            </div>`;

            const marker = L.marker(coord, { icon: coloredPinIcon })
             .addTo(turnoverMarkerGroup)
             .bindPopup(popupContent);

            window.turnoverMarkers[normCity] = marker;
            window.turnoverMarkers[cityName] = marker;
        }
    });
}

function changeThematicStyle(styleName) {
    activeThematicTheme = styleName;
    document.querySelectorAll('.thematic-btn').forEach(btn => {
        btn.className = "thematic-btn px-2.5 py-1.5 rounded-lg transition-all-300 bg-white text-slate-600 border border-slate-200 ml-1 text-xs font-semibold";
    });
    const activeBtn = document.querySelector(`.thematic-btn-${styleName}`);
    if (activeBtn) {
        activeBtn.className = `thematic-btn thematic-btn-${styleName} px-2.5 py-1.5 rounded-lg transition-all-300 bg-brand-blue text-white border border-brand-blue shadow-sm ml-1 text-xs font-semibold`;
    }
    renderTurnoverView();
}

function getMonthlyTurnoverStats(dataset) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthMap = {};

    dataset.forEach(item => {
        const dateStr = item.tanggalKeluar || item.tanggal_keluar || item.tanggal || item.masuk || '';
        let d = null;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const p0 = parseInt(parts[0]), p1 = parseInt(parts[1]), p2 = parseInt(parts[2]);
                if (p1 > 12) {
                    d = new Date(p2, p0 - 1, p1);
                } else {
                    d = new Date(p2, p1 - 1, p0);
                }
            }
        } else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
        }

        if (!d || isNaN(d.getTime())) {
            d = new Date(2026, 4, 1);
        }

        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = `${monthNames[m]} ${y}`;

        if (!monthMap[key]) {
            monthMap[key] = { label, key, lulus: 0, resign: 0, indisipliner: 0, order: y * 12 + m };
        }

        const status = String(item.alasan || item.alasanDetail || item.alasan_detail || item.keterangan || '').toLowerCase();
        if (status.includes('resign')) {
            monthMap[key].resign++;
        } else if (status.includes('lulus')) {
            monthMap[key].lulus++;
        } else if (status.includes('indisipliner') || status.includes('indisiplin')) {
            monthMap[key].indisipliner++;
        }
    });

    // Pastikan bulan berjalan saat ini (misal Sep 2026) selalu masuk ke dalam grafik
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth();
    const nowKey = `${nowY}-${String(nowM + 1).padStart(2, '0')}`;
    if (!monthMap[nowKey]) {
        monthMap[nowKey] = { label: `${monthNames[nowM]} ${nowY}`, key: nowKey, lulus: 0, resign: 0, indisipliner: 0, order: nowY * 12 + nowM };
    }

    const sortedKeys = Object.keys(monthMap).sort((a, b) => monthMap[a].order - monthMap[b].order);

    if (sortedKeys.length === 0) {
        return {
            labels: ['Mei 2026'],
            lulusData: [3],
            resignData: [3],
            indisiplinData: [2]
        };
    }

    return {
        labels: sortedKeys.map(k => monthMap[k].label),
        lulusData: sortedKeys.map(k => monthMap[k].lulus),
        resignData: sortedKeys.map(k => monthMap[k].resign),
        indisiplinData: sortedKeys.map(k => monthMap[k].indisipliner)
    };
}

let turnoverPageBarChartInstance = null;

function updateTurnoverBarChart(dataset) {
    const chartCanvas = document.getElementById('turnoverPieChart');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');

    if (turnoverPageBarChartInstance) {
        try { turnoverPageBarChartInstance.destroy(); } catch(e){}
        turnoverPageBarChartInstance = null;
    }

    const monthlyStats = getMonthlyTurnoverStats(dataset);

    turnoverPageBarChartInstance = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: monthlyStats.labels,
            datasets: [
                {
                    label: 'Lulus Magang',
                    data: monthlyStats.lulusData,
                    backgroundColor: '#8B5CF6',
                    borderRadius: 6,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6
                },
                {
                    label: 'Resign Kerja',
                    data: monthlyStats.resignData,
                    backgroundColor: '#F59E0B',
                    borderRadius: 6,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6
                },
                {
                    label: 'Indisipliner',
                    data: monthlyStats.indisiplinData,
                    backgroundColor: '#EF4444',
                    borderRadius: 6,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Inter', size: 11 },
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Inter', size: 11, weight: '600' }, color: '#64748B' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { family: 'Inter', size: 11 }, color: '#94A3B8' },
                    grid: { color: '#F1F5F9' }
                }
            }
        }
    });

    const datasetAll = rawTurnoverData.length > 0 ? rawTurnoverData : fallbackStats.turnover;
    const totalAll = datasetAll.length;
    let totalLulus = 0, totalResign = 0, totalIndis = 0;

    datasetAll.forEach(s => {
        const status = String(s.alasan || s.alasanDetail || s.alasan_detail || s.keterangan || '').toLowerCase();
        if (status.includes('resign')) totalResign++;
        else if (status.includes('lulus')) totalLulus++;
        else if (status.includes('indisipliner') || status.includes('indisiplin')) totalIndis++;
    });

    const totalEl = document.getElementById('donut-total-count');
    if (totalEl) totalEl.innerText = `${totalAll} Siswa`;

    const lulusCntEl = document.getElementById('donut-lulus-cnt');
    if (lulusCntEl) lulusCntEl.innerText = `(${totalLulus})`;
    const lulusPctEl = document.getElementById('donut-lulus-pct');
    if (lulusPctEl) lulusPctEl.innerText = totalAll > 0 ? `${Math.round((totalLulus/totalAll)*100)}%` : '0%';

    const resignCntEl = document.getElementById('donut-resign-cnt');
    if (resignCntEl) resignCntEl.innerText = `(${totalResign})`;
    const resignPctEl = document.getElementById('donut-resign-pct');
    if (resignPctEl) resignPctEl.innerText = totalAll > 0 ? `${Math.round((totalResign/totalAll)*100)}%` : '0%';

    const indisCntEl = document.getElementById('donut-indis-cnt');
    if (indisCntEl) indisCntEl.innerText = `(${totalIndis})`;
    const indisPctEl = document.getElementById('donut-indis-pct');
    if (indisPctEl) indisPctEl.innerText = totalAll > 0 ? `${Math.round((totalIndis/totalAll)*100)}%` : '0%';
}

function filterTurnoverMonthlyBar() {
    const dataset = rawTurnoverData.length > 0 ? rawTurnoverData : fallbackStats.turnover;
    updateTurnoverBarChart(dataset);
}

function populateTurnoverHistoryMonthFilter(dataset) {
    const select = document.getElementById('turnover-history-filter-bulan');
    if (!select) return;

    const currentVal = select.value;
    const monthSet = new Set();

    // Pastikan bulan berjalan saat ini (September 2026 dll) selalu ada di daftar filter
    const now = new Date();
    const nowYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(nowYm);

    (dataset || []).forEach(t => {
        const exitDate = String(t.tanggalKeluar || t.tgl_keluar || t.keluar || t.masuk || '').substring(0, 7);
        if (exitDate && exitDate.match(/^\d{4}-\d{2}$/)) {
            monthSet.add(exitDate);
        }
    });

    const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    const monthNamesIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    let html = '<option value="">Semua Bulan</option>';
    months.forEach(m => {
        const [year, monthNum] = m.split('-');
        const monthName = monthNamesIndo[parseInt(monthNum, 10) - 1] || m;
        const label = `${monthName} ${year}`;
        html += `<option value="${m}" ${currentVal === m ? 'selected' : ''}>${label}</option>`;
    });

    select.innerHTML = html;
}

function renderTurnoverHistoryTable() {
    renderTurnoverView();
}

function renderTurnoverView() {
    const tbody = document.getElementById('turnover-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchInput = document.getElementById('search-turnover');
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    const selectWil = document.getElementById('filter-turnover-wilayah');
    const filterWil = selectWil ? selectWil.value : "";
    
    const selectTipe = document.getElementById('filter-turnover-tipe');
    const filterTipe = selectTipe ? selectTipe.value : "";

    const dataset = rawTurnoverData.length > 0 ? rawTurnoverData : fallbackStats.turnover;

    // Populate Month Filter Dropdown Dynamically
    populateTurnoverHistoryMonthFilter(dataset);

    const historySearchVal = (document.getElementById('turnover-history-search')?.value || '').toLowerCase().trim();
    const historyMonthVal = document.getElementById('turnover-history-filter-bulan')?.value || '';
    
    let filtered = dataset.filter(t => {
        // Top filters
        if (searchVal) {
            const matchTopSearch = String(t.namaLengkap || '').toLowerCase().includes(searchVal) ||
                                   String(t.id || '').toLowerCase().includes(searchVal);
            if (!matchTopSearch) return false;
        }
        if (filterWil) {
            if (normalizeCityName(t.wilayah || t.asalDaerah || t.asal) !== normalizeCityName(filterWil)) return false;
        }
        if (filterTipe) {
            const statusStr = String(t.alasan || t.alasanDetail || t.alasan_detail || t.keterangan || '').toLowerCase();
            if (!statusStr.includes(filterTipe.toLowerCase())) return false;
        }

        // Log Riwayat Siswa Keluar Card filters
        if (historyMonthVal) {
            const exitStr = String(t.tanggalKeluar || t.tgl_keluar || t.keluar || t.masuk || '').substring(0, 7);
            if (exitStr !== historyMonthVal) return false;
        }
        if (historySearchVal) {
            const idStr = String(t.id || t.noreg || '').toLowerCase();
            const namaStr = String(t.namaLengkap || t.nama || '').toLowerCase();
            const bagianStr = String(t.bagian || t.section || '').toLowerCase();
            const daerahStr = String(t.wilayah || t.asalDaerah || t.asal || '').toLowerCase();
            const sekolahStr = String(t.asalSekolah || t.sekolah || '').toLowerCase();
            const alasanStr = String(t.alasan || '').toLowerCase();
            const ketStr = String(t.keterangan || '').toLowerCase();
            const tglKeluarStr = String(t.tanggalKeluar || t.tgl_keluar || t.keluar || '').toLowerCase();

            const matchCardSearch = idStr.includes(historySearchVal) ||
                                    namaStr.includes(historySearchVal) ||
                                    bagianStr.includes(historySearchVal) ||
                                    daerahStr.includes(historySearchVal) ||
                                    sekolahStr.includes(historySearchVal) ||
                                    alasanStr.includes(historySearchVal) ||
                                    ketStr.includes(historySearchVal) ||
                                    tglKeluarStr.includes(historySearchVal);

            if (!matchCardSearch) return false;
        }

        return true;
    });

    // Sort by NEWEST DATE FIRST (Descending by exit date or enter date)
    filtered.sort((a, b) => {
        const dateA = a.tanggalKeluar || a.tgl_keluar || a.keluar || a.masuk || '';
        const dateB = b.tanggalKeluar || b.tgl_keluar || b.keluar || b.masuk || '';
        return dateB.localeCompare(dateA);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="py-8 text-center text-xs text-brand-textSub italic">Tidak ada data riwayat siswa keluar yang sesuai filter.</td></tr>';
    } else {
        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-all-300 border-b border-slate-50";
            
            let badgeStyle = "bg-slate-50 text-slate-600";
            const statusStr = String(t.alasan || t.alasanDetail || t.alasan_detail || t.keterangan || '').toLowerCase();
            if (statusStr.includes("resign")) {
                badgeStyle = "bg-amber-50 text-amber-600";
            } else if (statusStr.includes("lulus")) {
                badgeStyle = "bg-emerald-50 text-emerald-600";
            } else if (statusStr.includes("indisipliner") || statusStr.includes("indisiplin")) {
                badgeStyle = "bg-rose-50 text-rose-600";
            }

            const statusLabel = t.alasan || t.keterangan || '-';
            const kelasDisplay = (t.kelas && t.kelas !== '-') ? t.kelas : (typeof hitungKelasSiswa === 'function' ? hitungKelasSiswa(t.masuk || t.tanggalMasuk, t.tanggalKeluar || t.keluar) : '-');

            tr.innerHTML = `
                <td class="py-3 px-4 font-semibold text-brand-textSub text-xs font-mono">${t.id}</td>
                <td class="py-3 px-4 font-bold text-brand-textMain text-xs">${t.namaLengkap}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs">${t.bagian || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold whitespace-nowrap">${kelasDisplay}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-mono whitespace-nowrap">${t.tanggalKeluar || '-'}</td>
                <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badgeStyle}">${statusLabel}</span></td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-bold">${t.wilayah || t.asalDaerah || t.asal || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs font-semibold">${t.asalSekolah || t.sekolah || '-'}</td>
                <td class="py-3 px-4 text-brand-textSub text-xs text-right">${t.keterangan || t.alasan || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    let rCount = 0, lCount = 0, iCount = 0;
    dataset.forEach(t => {
        const statusStr = String(t.alasan || t.alasanDetail || t.alasan_detail || t.keterangan || '').toLowerCase();
        if (statusStr.includes("resign")) rCount++;
        else if (statusStr.includes("lulus")) lCount++;
        else if (statusStr.includes("indisipliner") || statusStr.includes("indisiplin")) iCount++;
    });
    
    const kpiResign = document.getElementById('turnover-kpi-resign');
    if (kpiResign) kpiResign.innerText = rCount;
    
    const kpiLulus = document.getElementById('turnover-kpi-lulus');
    if (kpiLulus) kpiLulus.innerText = lCount;
    
    const kpiIndis = document.getElementById('turnover-kpi-indisipliner');
    if (kpiIndis) kpiIndis.innerText = iCount;

    const totalDonut = rCount + lCount + iCount;
    const lPct = totalDonut > 0 ? Math.round((lCount / totalDonut) * 100) : 0;
    const rPct = totalDonut > 0 ? Math.round((rCount / totalDonut) * 100) : 0;
    const iPct = totalDonut > 0 ? Math.round((iCount / totalDonut) * 100) : 0;

    const docTotal = document.getElementById('donut-total-count');
    if (docTotal) docTotal.innerText = totalDonut;
    const docLPct = document.getElementById('donut-lulus-pct');
    if (docLPct) docLPct.innerText = lPct + "%";
    const docLCnt = document.getElementById('donut-lulus-cnt');
    if (docLCnt) docLCnt.innerText = `(${lCount})`;
    const docRPct = document.getElementById('donut-resign-pct');
    if (docRPct) docRPct.innerText = rPct + "%";
    const docRCnt = document.getElementById('donut-resign-cnt');
    if (docRCnt) docRCnt.innerText = `(${rCount})`;
    const docIPct = document.getElementById('donut-indis-pct');
    if (docIPct) docIPct.innerText = iPct + "%";
    const docICnt = document.getElementById('donut-indis-cnt');
    if (docICnt) docICnt.innerText = `(${iCount})`;

    updateTurnoverBarChart(dataset);
    requestAnimationFrame(() => {
        updateTurnoverBarChart(dataset);
        initTurnoverMap(filtered);
    });
    setTimeout(() => {
        updateTurnoverBarChart(dataset);
    }, 150);
}

function triggerTurnoverFilter() {
    renderTurnoverView();
}

function resetTurnoverFilters() {
    const searchInput = document.getElementById('search-turnover');
    if (searchInput) searchInput.value = '';
    
    const selectWil = document.getElementById('filter-turnover-wilayah');
    if (selectWil) selectWil.value = '';
    
    const selectTipe = document.getElementById('filter-turnover-tipe');
    if (selectTipe) selectTipe.value = '';

    renderTurnoverView();
    showToast('Filter pencarian turnover dibersihkan.', 'info');
}
