const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbwlC3jaqhBjaHMfbE4dsuBpcVX_bsZZBHHMkkIy8kqzuO7R4kVoW2V1tOzP5nUO0HNCgQ/exec";

// ==========================================
// VARIABEL LOKASI SEKOLAH & RADIUS 
// ==========================================
let SCHOOL_LAT = -6.200000; 
let SCHOOL_LNG = 106.816666;
let MAX_RADIUS_METERS = 50; 

let isLocationValid = false;
let userLocationString = "Lokasi tidak diverifikasi";
let masterSiswaList = [];
let rekapSiswaHasil = [];

const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', options);

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
document.getElementById('tanggal').value = `${year}-${month}-${day}`;

document.addEventListener('DOMContentLoaded', function() {
    muatPengaturanLokasi(); 
    muatMasterDataDariDatabase();
    muatLaporanHariIni(); 
});

// ==========================================
// KONTROL NAVIGASI MENU
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('active');
    if (!isOpen) {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        history.pushState({ sidebarOpen: true }, '');
    } else {
        closeSidebarUI();
        if (history.state && history.state.sidebarOpen) history.back();
    }
}

function closeSidebarUI() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

window.addEventListener('popstate', function (event) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) closeSidebarUI();
});

function switchTab(pageId, element) {
    document.querySelectorAll('.page-section').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active');
    if (element) element.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        closeSidebarUI();
        if (history.state && history.state.sidebarOpen) history.back();
    }
}

// ==========================================
// PENGATURAN KOORDINAT LOKASI
// ==========================================
function muatPengaturanLokasi() {
    const savedLat = localStorage.getItem('school_lat');
    const savedLng = localStorage.getItem('school_lng');
    const savedRadius = localStorage.getItem('school_radius');

    if (savedLat) SCHOOL_LAT = parseFloat(savedLat);
    if (savedLng) SCHOOL_LNG = parseFloat(savedLng);
    if (savedRadius) MAX_RADIUS_METERS = parseInt(savedRadius);

    document.getElementById('set-lat').value = SCHOOL_LAT;
    document.getElementById('set-lng').value = SCHOOL_LNG;
    document.getElementById('set-radius').value = MAX_RADIUS_METERS;
}

function simpanPengaturanLokasi() {
    const lat = parseFloat(document.getElementById('set-lat').value);
    const lng = parseFloat(document.getElementById('set-lng').value);
    const radius = parseInt(document.getElementById('set-radius').value);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        Swal.fire('Peringatan', 'Harap isi semua kolom pengaturan dengan angka yang valid.', 'warning');
        return;
    }

    SCHOOL_LAT = lat;
    SCHOOL_LNG = lng;
    MAX_RADIUS_METERS = radius;

    localStorage.setItem('school_lat', SCHOOL_LAT);
    localStorage.setItem('school_lng', SCHOOL_LNG);
    localStorage.setItem('school_radius', MAX_RADIUS_METERS);

    Swal.fire('Tersimpan', 'Pengaturan koordinat dan radius berhasil disimpan.', 'success');
}

function autoFillLokasiSekolah() {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser tidak mendukung GPS.', 'error');
        return;
    }
    
    Swal.fire({
        title: 'Mendeteksi Lokasi...',
        text: 'Mohon tunggu, pastikan GPS Anda aktif.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('set-lat').value = position.coords.latitude.toFixed(6);
            document.getElementById('set-lng').value = position.coords.longitude.toFixed(6);
            Swal.close();
            Swal.fire('Berhasil', 'Lokasi saat ini berhasil ditarik. Jangan lupa klik "Simpan Pengaturan".', 'info');
        },
        (error) => {
            Swal.close();
            Swal.fire('Gagal', 'Tidak dapat mengambil lokasi. Pastikan izin lokasi (GPS) diaktifkan.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==========================================
// DATA MASTER SISWA
// ==========================================
function muatMasterDataDariDatabase() {
    const tbody = document.querySelector('#master-table tbody');
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Sedang menghubungkan & memuat data...</p></div></td></tr>`;

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_master" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success' && response.data && response.data.length > 0) {
            masterSiswaList = response.data;
            document.getElementById('db-status-info').innerHTML = `<span style="color: var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Terhubung!</span> Berhasil memuat ${masterSiswaList.length} data.`;
            updateDashboardUI();
            tampilkanMasterTabel(masterSiswaList);
            updateDropdownKelas();
        } else {
            document.getElementById('db-status-info').innerText = "Belum ada master data siswa. Silakan upload file Excel.";
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-file-excel"></i><p>Database kosong. Silakan upload file Excel.</p></div></td></tr>`;
            updateDashboardUI();
            updateDropdownKelas();
        }
    })
    .catch(err => {
        document.getElementById('db-status-info').innerHTML = `<span style="color: var(--danger); font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal Terhubung!</span> Periksa koneksi internet Anda.`;
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p style="color:var(--danger)">Gagal memuat data dari Sheets.</p></div></td></tr>`;
        updateDashboardUI();
    });
}

function simpanMasterSiswa() {
    if (masterSiswaList.length === 0) { Swal.fire('Peringatan', 'Impor file Excel siswa terlebih dahulu!', 'warning'); return; }
    const btn = document.querySelector('#master-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "simpan_master", data: masterSiswaList })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') Swal.fire('Berhasil!', `Master data berhasil disimpan.`, 'success');
        else Swal.fire('Gagal!', response.message, 'error');
    })
    .catch(err => Swal.fire('Error', 'Gagal menyimpan. Periksa koneksi.', 'error'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

function updateDashboardUI() {
    const container = document.getElementById('class-cards-container');
    container.innerHTML = '';
    if (masterSiswaList.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Belum ada data siswa.</p>';
        document.getElementById('stat-total-siswa').innerText = 0;
        document.getElementById('stat-total-kelas').innerText = 0;
        document.getElementById('stat-total-l').innerText = 0;
        document.getElementById('stat-total-p').innerText = 0;
        return;
    }
    const classMap = {}; let totalL = 0, totalP = 0;
    masterSiswaList.forEach(s => {
        const k = s.kelas || "Tanpa Kelas";
        if (!classMap[k]) classMap[k] = { total: 0, l: 0, p: 0 };
        classMap[k].total++;
        const jkVal = (s.jk || "").toString().trim().toUpperCase();
        if (jkVal === "L" || jkVal === "LAKI-LAKI" || jkVal === "LAKI LAKI") { classMap[k].l++; totalL++; }
        else if (jkVal === "P" || jkVal === "PEREMPUAN") { classMap[k].p++; totalP++; }
    });
    const classNames = Object.keys(classMap).sort();
    document.getElementById('stat-total-siswa').innerText = masterSiswaList.length;
    document.getElementById('stat-total-kelas').innerText = classNames.length;
    document.getElementById('stat-total-l').innerText = totalL;
    document.getElementById('stat-total-p').innerText = totalP;

    classNames.forEach(namaKelas => {
        const info = classMap[namaKelas];
        const card = document.createElement('div');
        card.className = 'class-card';
        card.innerHTML = `<div class="class-card-header"><span class="class-card-title"><i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i> ${namaKelas}</span><span class="class-card-total">${info.total} <small style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">Siswa</small></span></div><div class="class-gender-stats"><div class="gender-badge badge-l">L: ${info.l}</div><div class="gender-badge badge-p">P: ${info.p}</div></div>`;
        container.appendChild(card);
    });
}

function tampilkanMasterTabel(data) {
    const tbody = document.querySelector('#master-table tbody');
    tbody.innerHTML = '';
    data.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${index + 1}</strong></td><td><code>${siswa.nis}</code></td><td><strong>${siswa.nama}</strong></td><td><span class="chip" style="display:inline-block; padding:4px 10px; border-radius:6px; background:var(--bg-main); border:1px solid var(--border); font-size:0.8rem; font-weight:600;">${siswa.kelas}</span></td><td><strong>${siswa.jk || '-'}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function updateDropdownKelas() {
    const selectKelas = document.getElementById('kelas');
    const selectRekapKelas = document.getElementById('rekap-kelas');
    selectKelas.innerHTML = '<option value="">-- Pilih Kelas / Rombel --</option>';
    selectRekapKelas.innerHTML = '<option value="">-- Pilih Kelas / Rombel --</option>';
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    if (daftarKelas.length === 0) {
        selectKelas.innerHTML = '<option value="">-- Belum Ada Data Kelas --</option>';
        selectRekapKelas.innerHTML = '<option value="">-- Belum Ada Data Kelas --</option>';
    } else {
        daftarKelas.forEach(k => {
            selectKelas.appendChild(new Option(k, k));
            selectRekapKelas.appendChild(new Option(k, k));
        });
    }
    selectKelas.value = "";
    filterDataAbsensi();
}

document.getElementById('excel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let siswaBaruDitambahkan = 0, siswaDiperbarui = 0;

        rawData.forEach(item => {
            const nis = String(item.NIS || item.nis || item.Nis || item.NISN || '-').trim();
            const nama = String(item.Nama || item.nama || item.NAMA || '-').trim();
            const kelas = String(item.Kelas || item.kelas || item.KELAS || item.Rombel || 'Tanpa Kelas').trim();
            const jk = String(item.JK || item.jk || item.Jk || item['Jenis Kelamin'] || item['JENIS KELAMIN'] || '-').trim();
            if (nis === '-' || nis === '') return;
            const indexSiswa = masterSiswaList.findIndex(s => String(s.nis) === nis);
            if (indexSiswa === -1) {
                masterSiswaList.push({ nis, nama, kelas, jk });
                siswaBaruDitambahkan++;
            } else {
                masterSiswaList[indexSiswa].nama = nama;
                masterSiswaList[indexSiswa].kelas = kelas;
                masterSiswaList[indexSiswa].jk = jk;
                siswaDiperbarui++;
            }
        });
        if (siswaBaruDitambahkan > 0) Swal.fire({ title: 'Impor Berhasil', html: `Menambahkan <b>${siswaBaruDitambahkan}</b> siswa baru.<br>Data lama tidak digandakan.`, icon: 'success' });
        else Swal.fire({ title: 'Tidak Ada Siswa Baru', html: `Semua NIS sudah ada.<br><b>${siswaDiperbarui}</b> disinkronkan.`, icon: 'info' });
        updateDashboardUI();
        tampilkanMasterTabel(masterSiswaList);
        updateDropdownKelas();
        document.getElementById('excel-file').value = '';
    };
    reader.readAsArrayBuffer(file);
});

function downloadTemplateExcel() {
    const dataSiswa = []; let count = 0, kelasCurrent = 1;
    for (let i = 1; i <= 100; i++) {
        dataSiswa.push({ "NIS": "2026" + String(i).padStart(3, '0'), "Nama": `Siswa ${i}`, "Kelas": `Kelas ${kelasCurrent} A`, "JK": (i % 2 === 0) ? "L" : "P" });
        count++; if (count >= 17 && kelasCurrent < 6) { kelasCurrent++; count = 0; }
    }
    const ws = XLSX.utils.json_to_sheet(dataSiswa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Siswa");
    XLSX.writeFile(wb, "Template_Master_Siswa.xlsx");
}

// ==========================================
// PRESENSI & LOKASI
// ==========================================
function filterDataAbsensi() {
    const kelasTerpilih = document.getElementById('kelas').value;
    const tbody = document.querySelector('#attendance-table tbody');
    tbody.innerHTML = '';
    if (!kelasTerpilih) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-chalkboard-user" style="font-size: 2.8rem; color: var(--primary);"></i><p>Silakan Pilih Kelas / Rombel Anda</p></div></td></tr>`;
        return;
    }
    const siswaKelas = masterSiswaList.filter(s => s.kelas === kelasTerpilih);
    if (siswaKelas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Tidak ada siswa di kelas ini.</p></div></td></tr>`;
        return;
    }
    siswaKelas.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        tr.onclick = function() { document.querySelectorAll('#attendance-table tbody tr').forEach(r => r.classList.remove('selected-row')); tr.classList.add('selected-row'); };
        tr.innerHTML = `<td><strong>${index + 1}</strong></td><td><code>${siswa.nis}</code></td><td><strong>${siswa.nama}</strong></td>
            <td><select class="status-select" name="status_${index}" onfocus="this.closest('tr').click()">
                <option value="Hadir" selected>Hadir</option><option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option><option value="Alpa">Alpa</option>
            </select></td>`;
        tbody.appendChild(tr);
    });
}

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180;
    const deltaP = (lat2-lat1) * Math.PI/180, deltaLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function dapatkanLokasi() {
    const statusEl = document.getElementById('radius-status');
    const koorEl = document.getElementById('koordinat-text');
    const spinner = document.getElementById('loc-spinner');
    const btnLoc = document.getElementById('btn-cek-lokasi');

    if (!navigator.geolocation) { Swal.fire('Error', 'Browser tidak mendukung GPS.', 'error'); return; }

    statusEl.className = 'loc-status loc-wait';
    spinner.style.display = 'inline-block';
    statusEl.innerHTML = spinner.outerHTML + ' Mendapatkan lokasi...';
    btnLoc.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            userLocationString = `${userLat}, ${userLng} (Akurasi: ${Math.round(position.coords.accuracy)}m)`;
            koorEl.innerText = `Koordinat: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;

            const jarak = hitungJarakMeter(userLat, userLng, SCHOOL_LAT, SCHOOL_LNG);

            if (jarak <= MAX_RADIUS_METERS) {
                isLocationValid = true;
                statusEl.className = 'loc-status loc-success';
                statusEl.innerHTML = `<i class="fa-solid fa-check"></i> Dalam Radius (${jarak} Meter)`;
                Swal.fire('Lokasi Sesuai', `Anda berada dalam radius sekolah (${jarak} meter). Absensi diizinkan.`, 'success');
            } else {
                isLocationValid = false;
                statusEl.className = 'loc-status loc-error';
                statusEl.innerHTML = `<i class="fa-solid fa-xmark"></i> Luar Radius (${jarak} Meter)`;
                Swal.fire('Lokasi Ditolak', `Jarak Anda ${jarak} meter dari sekolah. (Batas maksimal ${MAX_RADIUS_METERS} meter).`, 'error');
            }
            btnLoc.disabled = false;
        },
        (error) => {
            isLocationValid = false;
            statusEl.className = 'loc-status loc-error';
            statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Gagal Mendapatkan Lokasi`;
            koorEl.innerText = "Koordinat: Error";
            Swal.fire('Gagal GPS', 'Pastikan GPS menyala dan izin lokasi diberikan.', 'error');
            btnLoc.disabled = false;
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function simpanAbsensi() {
    const kelas = document.getElementById('kelas').value;
    const tanggal = document.getElementById('tanggal').value;
    const barisSiswa = document.querySelectorAll('#attendance-table tbody tr');

    if (!kelas || barisSiswa.length === 0 || barisSiswa[0].querySelector('.empty-state')) { Swal.fire('Peringatan', 'Pilih kelas terlebih dahulu!', 'warning'); return; }
    if (!isLocationValid) { Swal.fire('Akses Ditolak', 'Posisi Anda belum dideteksi atau di luar radius sekolah.', 'error'); return; }

    let hasilAbsensi = [];
    barisSiswa.forEach((tr, index) => {
        hasilAbsensi.push({ nis: tr.children[1].innerText, nama: tr.children[2].innerText, status: tr.querySelector(`select[name="status_${index}"]`).value });
    });

    const payload = { action: "simpan_absensi", kelas, tanggal, koordinat: userLocationString, data: hasilAbsensi };
    const btn = document.querySelector('#absensi-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    }).then(res => res.json()).then(response => {
        if (response.result === 'success') {
            Swal.fire('Berhasil!', `Presensi ${kelas} berhasil disimpan.`, 'success');
            isLocationValid = false;
            document.getElementById('radius-status').className = 'loc-status loc-wait';
            document.getElementById('radius-status').innerHTML = 'Menunggu deteksi lokasi...';
            document.getElementById('koordinat-text').innerText = 'Koordinat: Belum didapatkan';
            userLocationString = "Lokasi tidak diverifikasi";
        } else Swal.fire('Gagal!', response.message, 'error');
    }).catch(err => Swal.fire('Error', 'Gagal menyimpan.', 'error'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

// ==========================================
// REKAP & LAPORAN HARIAN
// ==========================================
function muatLaporanHariIni() {
    document.getElementById('today-summary-container').innerHTML = `<div class="empty-state" style="padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_today_summary", tanggal: document.getElementById('tanggal').value })
    }).then(res => res.json()).then(response => {
        if (response.result === 'success') renderLaporanHariIni(response.data);
        else document.getElementById('today-summary-container').innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Gagal memuat.</p></div>`;
    }).catch(err => document.getElementById('today-summary-container').innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Koneksi bermasalah.</p></div>`);
}

function renderLaporanHariIni(dataSummary) {
    const container = document.getElementById('today-summary-container');
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    if (daftarKelas.length === 0) { container.innerHTML = '<p style="color: var(--text-muted); text-align:center;">Belum ada master kelas.</p>'; return; }

    let html = '<div class="summary-list">';
    daftarKelas.forEach(kelas => {
        const stat = dataSummary[kelas];
        if (stat && stat.submitted) {
            html += `<div class="summary-item"><div class="summary-class-name"><i class="fa-solid fa-chalkboard-user" style="color:var(--primary); margin-right:6px;"></i> ${kelas}</div>
                <div class="summary-badges"><span class="summary-badge s-hadir">Hadir: ${stat.hadir}</span>
                ${stat.sakit > 0 ? `<span class="summary-badge s-sakit">Sakit: ${stat.sakit}</span>` : ''}
                ${stat.izin > 0 ? `<span class="summary-badge s-izin">Izin: ${stat.izin}</span>` : ''}
                ${stat.alpa > 0 ? `<span class="summary-badge s-alpa">Alpa: ${stat.alpa}</span>` : ''}
                </div></div>`;
        } else {
            html += `<div class="summary-item"><div class="summary-class-name"><i class="fa-solid fa-chalkboard-user" style="color:var(--text-muted); margin-right:6px;"></i> ${kelas}</div>
                <div class="summary-badges"><span class="summary-badge s-belum"><i class="fa-solid fa-clock"></i> Belum Absen</span></div></div>`;
        }
    });
    container.innerHTML = html + '</div>';
}

function muatRekapData() {
    const kelas = document.getElementById('rekap-kelas').value;
    const bulan = document.getElementById('rekap-bulan').value;
    const tahun = document.getElementById('rekap-tahun').value;
    if (!kelas) { Swal.fire('Informasi', 'Pilih kelas terlebih dahulu!', 'info'); return; }

    const btn = document.querySelector('#rekap-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengambil...';

    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_rekap", kelas, bulan, tahun })
    }).then(res => res.json()).then(response => {
        if (response.result === 'success') olahDanTampilkanRekap(kelas, response.data);
        else Swal.fire('Gagal!', response.message, 'error');
    }).catch(err => Swal.fire('Error', 'Gagal dari Sheets.', 'error'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

function olahDanTampilkanRekap(kelasSelected, rawData) {
    const tbody = document.querySelector('#rekap-table tbody');
    tbody.innerHTML = '';
    const siswaDaftar = masterSiswaList.filter(s => s.kelas === kelasSelected);
    
    if (siswaDaftar.length === 0) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Tidak ada data siswa kelas ini.</p></div></td></tr>`; return; }
    
    rekapSiswaHasil = siswaDaftar.map(s => {
        const absensiSiswa = rawData.filter(r => String(r.nis) === String(s.nis));
        let hadir = 0, sakit = 0, izin = 0, alpa = 0;
        absensiSiswa.forEach(a => {
            if (a.status === 'Hadir') hadir++; else if (a.status === 'Sakit') sakit++; else if (a.status === 'Izin') izin++; else if (a.status === 'Alpa') alpa++;
        });
        const total = hadir + sakit + izin + alpa;
        return { nis: s.nis, nama: s.nama, kelas: kelasSelected, hadir, sakit, izin, alpa, totalPertemuan: total, persentase: total > 0 ? Math.round((hadir/total)*100) : 0 };
    });

    if (rawData.length === 0) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Belum ada presensi pada periode ini.</p></div></td></tr>`; return; }

    rekapSiswaHasil.forEach((item, idx) => {
        tbody.innerHTML += `<tr><td><strong>${idx + 1}</strong></td><td><code>${item.nis}</code></td><td><strong>${item.nama}</strong></td>
            <td><span class="badge-count badge-hadir">${item.hadir}</span></td><td><span class="badge-count badge-sakit">${item.sakit}</span></td>
            <td><span class="badge-count badge-izin">${item.izin}</span></td><td><span class="badge-count badge-alpa">${item.alpa}</span></td>
            <td><strong>${item.persentase}%</strong></td></tr>`;
    });
}

function cetakRekap() {
    if (rekapSiswaHasil.length === 0) { Swal.fire('Peringatan', 'Tampilkan rekap dulu!', 'warning'); return; }
    const kelas = document.getElementById('rekap-kelas').value;
    const bulanVal = document.getElementById('rekap-bulan').value;
    const periodeTeks = (bulanVal === 'all') ? `Tahun ${document.getElementById('rekap-tahun').value}` : `Bulan ${document.getElementById('rekap-bulan').options[document.getElementById('rekap-bulan').selectedIndex].text} ${document.getElementById('rekap-tahun').value}`;
    
    let tbodyHtml = '';
    rekapSiswaHasil.forEach((item, index) => {
        tbodyHtml += `<tr><td>${index + 1}</td><td>${item.nis}</td><td>${item.nama}</td><td>${item.hadir}</td><td>${item.sakit}</td><td>${item.izin}</td><td>${item.alpa}</td><td><strong>${item.persentase}%</strong></td></tr>`;
    });

    const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const printHtml = `
        <div class="print-kop">
            <img src="asset/logoweb.png" alt="Logo Sekolah" class="print-logo">
            <div class="print-kop-text">
                <h2>SD NEGERI 1 INDONESIA</h2>
                <p>Jalan Pendidikan No. 123, Kecamatan Maju Jaya, Provinsi Anda, Kode Pos 12345</p>
                <p>Telp: (021) 1234567 | Email: info@sdn1indonesia.sch.id | Website: sdn1indonesia.sch.id</p>
            </div>
        </div>

        <div class="print-title">LAPORAN REKAPITULASI PRESENSI SISWA</div>

        <div class="print-info">
            <table>
                <tr><td>Kelas / Rombel</td><td>:</td><td>${kelas}</td></tr>
                <tr><td>Periode Laporan</td><td>:</td><td>${periodeTeks}</td></tr>
            </table>
        </div>

        <table class="print-table">
            <thead>
                <tr>
                    <th width="5%">NO</th>
                    <th width="18%">NIS / NISN</th>
                    <th width="35%">NAMA SISWA / SANTRI</th>
                    <th width="8%">HADIR</th>
                    <th width="8%">SAKIT</th>
                    <th width="8%">IZIN</th>
                    <th width="8%">ALPA</th>
                    <th width="10%">% HADIR</th>
                </tr>
            </thead>
            <tbody>
                ${tbodyHtml}
            </tbody>
        </table>

        <div class="print-ttd">
            <div class="print-ttd-box">
                <p>Mengetahui,</p>
                <p>Kepala Sekolah</p>
                <div class="print-ttd-space"></div>
                <div style="width: 220px; border-bottom: 1.5px solid black; margin: 0 auto;"></div>
                <div style="width: 220px; text-align: left; margin: 5px auto 0; font-size: 11pt;">NIP. </div>
            </div>
            <div class="print-ttd-box">
                <p>................................., ${tanggalCetak}</p>
                <p>Wali Kelas ${kelas}</p>
                <div class="print-ttd-space"></div>
                <div style="width: 220px; border-bottom: 1.5px solid black; margin: 0 auto;"></div>
                <div style="width: 220px; text-align: left; margin: 5px auto 0; font-size: 11pt;">NIP. </div>
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = printHtml;
    window.print();
}

function exportRekapExcel() {
    if (rekapSiswaHasil.length === 0) { Swal.fire('Peringatan', 'Tampilkan rekap dulu!', 'warning'); return; }
    const kelas = document.getElementById('rekap-kelas').value;
    const tahun = document.getElementById('rekap-tahun').value;
    let excelRows = [["REKAP PRESENSI"], ["Kelas", ": " + kelas], ["Tahun", ": " + tahun], [], ["NO", "NIS", "NAMA", "KELAS", "HADIR", "SAKIT", "IZIN", "ALPA", "TOTAL", "% HADIR"]];
    rekapSiswaHasil.forEach((item, idx) => excelRows.push([idx + 1, item.nis, item.nama, item.kelas, item.hadir, item.sakit, item.izin, item.alpa, item.totalPertemuan, item.persentase + "%"]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(excelRows), "Rekap"); XLSX.writeFile(wb, `Rekap_${kelas}_${tahun}.xlsx`);
}

function resetDatabase() {
    Swal.fire({ title: 'PERINGATAN!', text: "HAPUS SELURUH DATA?", icon: 'warning', showCancelButton: true, confirmButtonText: 'Hapus!' }).then((res1) => {
        if (res1.isConfirmed) {
            Swal.fire({ title: 'Yakin?', text: "Semua akan hilang.", icon: 'error', showCancelButton: true, confirmButtonText: 'Yakin!' }).then((res2) => {
                if (res2.isConfirmed) {
                    fetch(URL_WEB_APP, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "reset_database" }) })
                    .then(res => res.json()).then(r => {
                        if (r.result === 'success') { Swal.fire('Dihapus!', 'Data bersih.', 'success'); masterSiswaList = []; updateDashboardUI(); tampilkanMasterTabel([]); }
                    });
                }
            });
        }
    });
}

// ==========================================
// PWA
// ==========================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
let deferredPrompt; const pwaBanner = document.getElementById('pwa-install-banner');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (pwaBanner) pwaBanner.classList.add('show'); }, 2000); });
document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { if (pwaBanner) pwaBanner.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } });
document.getElementById('btn-close-pwa')?.addEventListener('click', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });
window.addEventListener('appinstalled', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });