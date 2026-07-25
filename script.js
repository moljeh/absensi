const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbzJTLcXJvoqwHnymgOBw-04TCmsvc0XDAX2NXwyQDLSZdL3mztsugcnGJ066xOQMnSrsQ/exec";
let masterSiswaList = [];
let rekapSiswaHasil = [];

// TANGGAL & INISIALISASI
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', options);

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');

document.getElementById('tanggal').value = `${year}-${month}-${day}`;

// AUTO FETCH SAAT MEMBUKA WEBSITE
document.addEventListener('DOMContentLoaded', function() {
    muatMasterDataDariDatabase();
    muatLaporanHariIni(); // <--- Tambahkan baris ini
});

// ==========================================
// KONTROL SIDEBAR & SINKRONISASI TOMBOL BACK HP
// ==========================================

// 1. Fungsi Utama Buka / Tutup Sidebar
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
        if (history.state && history.state.sidebarOpen) {
            history.back();
        }
    }
}

// 2. Fungsi Khusus Menutup Visual Sidebar
function closeSidebarUI() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// 3. EVENT LISTENER: Tangkap Tombol Back di HP
window.addEventListener('popstate', function (event) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        closeSidebarUI();
    }
});

// 4. Perbarui Fungsi Pindah Halaman Menu (switchTab) - DIPERBAIKI
function switchTab(pageId, element) {
    // Sembunyikan semua section halaman (sesuai class di HTML & CSS)
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });

    // Hilangkan status active dari semua menu sidebar
    document.querySelectorAll('.nav-menu li').forEach(li => {
        li.classList.remove('active');
    });

    // Tampilkan halaman terpilih & aktifkan menu
    const targetPage = document.getElementById(pageId);
    if(targetPage) {
        targetPage.classList.add('active');
    }
    
    if (element) {
        element.classList.add('active');
    }

    // JIKA DI HP: Otomatis tutup sidebar & bersihkan history setelah menu diklik
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        closeSidebarUI();
        if (history.state && history.state.sidebarOpen) {
            history.back();
        }
    }
}

// ==========================================
// FUNGSI UTAMA APLIKASI
// ==========================================

// 0. SEDOT/AMBIL DATA MASTER DARI DATABASE
function muatMasterDataDariDatabase() {
    const tbody = document.querySelector('#master-table tbody');
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Sedang menghubungkan & memuat data dari Google Sheets...</p></div></td></tr>`;

    const payload = { action: "get_master" };

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success' && response.data && response.data.length > 0) {
            masterSiswaList = response.data;
			
			updateDashboardUI(); 
            muatLaporanHariIni();
			
            document.getElementById('db-status-info').innerHTML = `
                <span style="color: var(--success); font-weight:700;">
                    <i class="fa-solid fa-circle-check"></i> Terhubung!
                </span> 
                Berhasil memuat ${masterSiswaList.length} data siswa/santri dari database.
            `;
            updateDashboardUI();
            tampilkanMasterTabel(masterSiswaList);
            updateDropdownKelas();
        } else {
            document.getElementById('db-status-info').innerText = "Belum ada master data siswa di Google Sheets. Silakan upload file Excel di menu Master Data.";
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-file-excel"></i><p>Belum ada data di Google Sheets. Silakan upload file Excel data siswa/santri.</p></div></td></tr>`;
            updateDashboardUI();
            updateDropdownKelas();
        }
    })
    .catch(err => {
        console.error(err);
        document.getElementById('db-status-info').innerHTML = `
            <span style="color: var(--danger); font-weight:700;">
                <i class="fa-solid fa-triangle-exclamation"></i> Gagal Terhubung!
            </span> 
            Periksa koneksi internet atau URL Web App pada file script.js.
        `;
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p style="color:var(--danger)">Gagal memuat data dari Google Sheets.</p></div></td></tr>`;
        updateDashboardUI();
    });
}

// UPDATE TAMPILAN DASHBOARD
function updateDashboardUI() {
    const container = document.getElementById('class-cards-container');
    container.innerHTML = '';

    if (masterSiswaList.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Belum ada data siswa / santri.</p>';
        document.getElementById('stat-total-siswa').innerText = 0;
        document.getElementById('stat-total-kelas').innerText = 0;
        document.getElementById('stat-total-l').innerText = 0;
        document.getElementById('stat-total-p').innerText = 0;
        return;
    }

    const classMap = {};
    let totalL = 0;
    let totalP = 0;

    masterSiswaList.forEach(s => {
        const k = s.kelas || "Tanpa Kelas";
        if (!classMap[k]) {
            classMap[k] = { total: 0, l: 0, p: 0 };
        }
        classMap[k].total++;

        const jkVal = (s.jk || "").toString().trim().toUpperCase();
        if (jkVal === "L" || jkVal === "LAKI-LAKI" || jkVal === "LAKI LAKI") {
            classMap[k].l++;
            totalL++;
        } else if (jkVal === "P" || jkVal === "PEREMPUAN") {
            classMap[k].p++;
            totalP++;
        }
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
        card.innerHTML = `
            <div class="class-card-header">
                <span class="class-card-title"><i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i> ${namaKelas}</span>
                <span class="class-card-total">${info.total} <small style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">Siswa</small></span>
            </div>
            <div class="class-gender-stats">
                <div class="gender-badge badge-l">Laki-laki: ${info.l}</div>
                <div class="gender-badge badge-p">Perempuan: ${info.p}</div>
            </div>
        `;
        container.appendChild(card);
    });
}


// ----------------------------------------------------
// FUNGSI LAPORAN PRESENSI HARI INI
// ----------------------------------------------------
function muatLaporanHariIni() {
    const container = document.getElementById('today-summary-container');
    container.innerHTML = `<div class="empty-state" style="padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i><p>Sedang merekap presensi hari ini...</p></div>`;

    const tanggalHariIni = document.getElementById('tanggal').value; 
    const payload = { action: "get_today_summary", tanggal: tanggalHariIni };

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            renderLaporanHariIni(response.data);
        } else {
            container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Gagal memuat laporan harian.</p></div>`;
        }
    })
    .catch(err => {
        container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Koneksi ke server bermasalah.</p></div>`;
    });
}

function renderLaporanHariIni(dataSummary) {
    const container = document.getElementById('today-summary-container');
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    
    if (daftarKelas.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align:center;">Belum ada master data kelas untuk ditampilkan.</p>';
        return;
    }

    let html = '<div class="summary-list">';
    
    daftarKelas.forEach(kelas => {
        const stat = dataSummary[kelas];
        
        // Jika kelas sudah absen hari ini
        if (stat && stat.submitted) {
            html += `
            <div class="summary-item">
                <div class="summary-class-name"><i class="fa-solid fa-chalkboard-user" style="color:var(--primary); margin-right:6px;"></i> ${kelas}</div>
                <div class="summary-badges">
                    <span class="summary-badge s-hadir">Hadir: ${stat.hadir}</span>
                    ${stat.sakit > 0 ? `<span class="summary-badge s-sakit">Sakit: ${stat.sakit}</span>` : ''}
                    ${stat.izin > 0 ? `<span class="summary-badge s-izin">Izin: ${stat.izin}</span>` : ''}
                    ${stat.alpa > 0 ? `<span class="summary-badge s-alpa">Alpa: ${stat.alpa}</span>` : ''}
                </div>
            </div>`;
        } else {
            // Jika kelas belum absen hari ini
            html += `
            <div class="summary-item">
                <div class="summary-class-name"><i class="fa-solid fa-chalkboard-user" style="color:var(--text-muted); margin-right:6px;"></i> ${kelas}</div>
                <div class="summary-badges">
                    <span class="summary-badge s-belum"><i class="fa-solid fa-clock"></i> Belum Absen</span>
                </div>
            </div>`;
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// 1. DOWNLOAD TEMPLATE EXCEL
function downloadTemplateExcel() {
    const namaDepan = ["Ahmad", "Budi", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hana", "Indra", "Joko"];
    const namaBelakang = ["Pratama", "Santoso", "Lestari", "Wibowo", "Kusuma", "Saputra"];
    let dataSiswa = [];
    let kelasCurrent = 1;
    let count = 0;

    for (let i = 1; i <= 100; i++) {
        let nis = "2026" + String(i).padStart(3, '0');
        let nama = `${namaDepan[i % namaDepan.length]} ${namaBelakang[i % namaBelakang.length]}`;
        let kelas = `Kelas ${kelasCurrent} A`;
        let jk = (i % 2 === 0) ? "L" : "P";

        dataSiswa.push({ "NIS": nis, "Nama": nama, "Kelas": kelas, "JK": jk });
        count++;
        if (count >= 17 && kelasCurrent < 6) { kelasCurrent++; count = 0; }
    }

    const ws = XLSX.utils.json_to_sheet(dataSiswa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Siswa");
    XLSX.writeFile(wb, "Template_Master_Siswa.xlsx");
}

// 2. UPLOAD FILE EXCEL
document.getElementById('excel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        masterSiswaList = rawData.map(item => ({
            nis: item.NIS || item.nis || item.Nis || item.NISN || '-',
            nama: item.Nama || item.nama || item.NAMA || '-',
            kelas: item.Kelas || item.kelas || item.KELAS || item.Rombel || 'Tanpa Kelas',
            jk: item.JK || item.jk || item.Jk || item['Jenis Kelamin'] || item['JENIS KELAMIN'] || '-'
        }));

        updateDashboardUI();
        tampilkanMasterTabel(masterSiswaList);
        updateDropdownKelas();
    };
    reader.readAsArrayBuffer(file);
});

function tampilkanMasterTabel(data) {
    const tbody = document.querySelector('#master-table tbody');
    tbody.innerHTML = '';
    if (data.length === 0) return;

    data.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td><code>${siswa.nis}</code></td>
            <td><strong>${siswa.nama}</strong></td>
            <td><span class="chip" style="display:inline-block; width:auto; padding:4px 10px; border-radius:6px; background:var(--bg-main); border:1px solid var(--border); font-size:0.8rem; font-weight:600;">${siswa.kelas}</span></td>
            <td><strong>${siswa.jk || '-'}</strong></td>
        `;
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
        filterDataAbsensi();
        return;
    }

    daftarKelas.forEach(k => {
        selectKelas.appendChild(new Option(k, k));
        selectRekapKelas.appendChild(new Option(k, k));
    });

    selectKelas.value = "";
    filterDataAbsensi();
}

// 3. SIMPAN MASTER DATA
function simpanMasterSiswa() {
    if (masterSiswaList.length === 0) { alert('Impor file Excel siswa terlebih dahulu!'); return; }

    const payload = { action: "simpan_master", data: masterSiswaList };
    const btn = document.querySelector('#master-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    fetch(URL_WEB_APP, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => alert(`SUKSES!\nMaster data (${masterSiswaList.length} siswa/santri) berhasil disimpan ke Google Sheets.`))
    .catch(err => alert('Gagal menyimpan Master Data.'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

// 4. FILTER INPUT PRESENSI (SUDAH DIBERSIHKAN DUPLIKASINYA)
function filterDataAbsensi() {
    const kelasTerpilih = document.getElementById('kelas').value;
    const tbody = document.querySelector('#attendance-table tbody');
    tbody.innerHTML = '';

    if (!kelasTerpilih) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state" style="padding: 36px 20px;">
                        <i class="fa-solid fa-chalkboard-user" style="font-size: 2.8rem; color: var(--primary); margin-bottom: 12px;"></i>
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-dark); margin-bottom: 6px;">
                            Silakan Pilih Kelas / Rombel Anda
                        </h4>
                        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
                            Pilih kelas yang Anda ampu dari menu dropdown di atas untuk menampilkan daftar nama siswa.
                        </p>
                        
                        <div style="display: inline-block; text-align: left; background: var(--warning-bg); border-left: 4px solid var(--warning); padding: 12px 16px; border-radius: 8px; max-width: 500px; font-size: 0.83rem; color: #78350f; line-height: 1.5;">
                            <strong style="display: flex; align-items: center; gap: 6px; font-size: 0.88rem; margin-bottom: 4px;">
                                <i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i> Petunjuk Penting:
                            </strong>
                            1. Pastikan Anda memilih <strong>kelas milik Anda / yang Anda ampu hari ini</strong>.<br>
                            2. Cek kembali <strong>Tanggal Presensi</strong> di samping pilihan kelas sebelum menyimpan.
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const siswaKelas = masterSiswaList.filter(s => s.kelas === kelasTerpilih);

    if (siswaKelas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Tidak ada siswa/santri di kelas ini.</p></div></td></tr>`;
        return;
    }

    siswaKelas.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        
        tr.onclick = function() {
            document.querySelectorAll('#attendance-table tbody tr').forEach(r => r.classList.remove('selected-row'));
            tr.classList.add('selected-row');
        };

        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td><code>${siswa.nis}</code></td>
            <td><strong class="student-name">${siswa.nama}</strong></td>
            <td>
                <select class="status-select" name="status_${index}" onfocus="this.closest('tr').click()">
                    <option value="Hadir" selected>Hadir</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 5. SIMPAN ABSENSI
function simpanAbsensi() {
    const kelas = document.getElementById('kelas').value;
    const tanggal = document.getElementById('tanggal').value;
    const barisSiswa = document.querySelectorAll('#attendance-table tbody tr');

    if (!kelas || barisSiswa.length === 0 || barisSiswa[0].querySelector('.empty-state')) {
        alert('Tidak ada data presensi yang bisa disimpan!');
        return;
    }

    let hasilAbsensi = [];
    barisSiswa.forEach((tr, index) => {
        const nis = tr.children[1].innerText;
        const nama = tr.children[2].innerText;
        const statusSelect = tr.querySelector(`select[name="status_${index}"]`);
        
        hasilAbsensi.push({ 
            nis: nis, 
            nama: nama, 
            status: statusSelect ? statusSelect.value : 'Hadir' 
        });
    });

    const payload = { action: "simpan_absensi", kelas, tanggal, data: hasilAbsensi };
    const btn = document.querySelector('#absensi-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    fetch(URL_WEB_APP, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => alert(`SUKSES!\nPresensi kelas ${kelas} tanggal ${tanggal} berhasil disimpan.`))
    .catch(err => alert('Gagal menyimpan data presensi.'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

// 6. TAMPILKAN REKAP DATA
function muatRekapData() {
    const kelas = document.getElementById('rekap-kelas').value;
    const bulan = document.getElementById('rekap-bulan').value;
    const tahun = document.getElementById('rekap-tahun').value;

    if (!kelas) {
        alert('Pilih kelas terlebih dahulu!');
        return;
    }

    const btn = document.querySelector('#rekap-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengambil Data...';

    const payload = { action: "get_rekap", kelas, bulan, tahun };

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            olahDanTampilkanRekap(kelas, response.data);
        } else {
            alert('Gagal mengambil data rekap: ' + response.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Gagal mengambil data dari Google Sheets.');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

function olahDanTampilkanRekap(kelasSelected, rawData) {
    const tbody = document.querySelector('#rekap-table tbody');
    tbody.innerHTML = '';

    const siswaDaftar = masterSiswaList.filter(s => s.kelas === kelasSelected);

    if (siswaDaftar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Tidak ada data master siswa untuk kelas ini.</p></div></td></tr>`;
        return;
    }

    rekapSiswaHasil = siswaDaftar.map(s => {
        const absensiSiswa = rawData.filter(r => String(r.nis) === String(s.nis));
        let hadir = 0, sakit = 0, izin = 0, alpa = 0;

        absensiSiswa.forEach(a => {
            if (a.status === 'Hadir') hadir++;
            else if (a.status === 'Sakit') sakit++;
            else if (a.status === 'Izin') izin++;
            else if (a.status === 'Alpa') alpa++;
        });

        const totalPertemuan = hadir + sakit + izin + alpa;
        const persentase = totalPertemuan > 0 ? Math.round((hadir / totalPertemuan) * 100) : 0;

        return {
            nis: s.nis,
            nama: s.nama,
            kelas: kelasSelected,
            hadir, sakit, izin, alpa,
            totalPertemuan,
            persentase
        };
    });

    if (rawData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Belum ada rekaman presensi pada periode kelas ini.</p></div></td></tr>`;
        return;
    }

    rekapSiswaHasil.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td><code>${item.nis}</code></td>
            <td><strong>${item.nama}</strong></td>
            <td><span class="badge-count badge-hadir">${item.hadir}</span></td>
            <td><span class="badge-count badge-sakit">${item.sakit}</span></td>
            <td><span class="badge-count badge-izin">${item.izin}</span></td>
            <td><span class="badge-count badge-alpa">${item.alpa}</span></td>
            <td><strong>${item.persentase}%</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// 7. EXPORT REKAP KE EXCEL
function exportRekapExcel() {
    if (rekapSiswaHasil.length === 0) {
        alert('Tampilkan rekap data terlebih dahulu sebelum melakukan export!');
        return;
    }

    const kelas = document.getElementById('rekap-kelas').value;
    const bulanVal = document.getElementById('rekap-bulan').value;
    const bulanText = document.getElementById('rekap-bulan').options[document.getElementById('rekap-bulan').selectedIndex].text;
    const tahun = document.getElementById('rekap-tahun').value;

    const periodeTeks = (bulanVal === 'all') 
        ? `Semua Bulan (Tahun ${tahun})` 
        : `Bulan ${bulanText} ${tahun}`;

    let excelRows = [
        ["REKAPITULASI PRESENSI SISWA / SANTRI"],
        ["Kelas / Rombel", ": " + kelas],
        ["Periode", ": " + periodeTeks],
        [],
        ["NO", "NIS / NISN", "NAMA SISWA / SANTRI", "KELAS", "HADIR", "SAKIT", "IZIN", "ALPA", "TOTAL PERTEMUAN", "PERSENTASE KEHADIRAN"]
    ];

    rekapSiswaHasil.forEach((item, index) => {
        excelRows.push([
            index + 1,
            item.nis,
            item.nama,
            item.kelas,
            item.hadir,
            item.sakit,
            item.izin,
            item.alpa,
            item.totalPertemuan,
            item.persentase + "%"
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(excelRows);
    ws['!cols'] = [
        { wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 15 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 18 }, { wch: 24 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap_Presensi");

    const namaFile = `Rekap_Presensi_${kelas}_${bulanVal === 'all' ? 'Semua_Bulan' : bulanText}_${tahun}.xlsx`;
    XLSX.writeFile(wb, namaFile);
}

// ==========================================
// REGISTRASI SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA Service Worker Berhasil Didaftarkan:', reg.scope))
            .catch(err => console.error('PWA Service Worker Gagal:', err));
    });
}

// ==========================================
// PWA INSTALL PROMPT (NOTIFIKASI INSTALL)
// ==========================================
let deferredPrompt;
const pwaBanner = document.getElementById('pwa-install-banner');
const btnInstallPwa = document.getElementById('btn-install-pwa');
const btnClosePwa = document.getElementById('btn-close-pwa');

window.addEventListener('beforeinstallprompt', (e) => {
    // Mencegah browser langsung menampilkan prompt install default
    e.preventDefault();
    
    // Simpan event untuk dipicu nanti
    deferredPrompt = e;
    
    // Tampilkan banner custom kita (misal ditunda 2 detik agar tidak terlalu mendadak)
    setTimeout(() => {
        if (pwaBanner) {
            pwaBanner.classList.add('show');
        }
    }, 2000);
});

// Event ketika tombol "Install" di banner diklik
if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
        // Sembunyikan banner
        if (pwaBanner) pwaBanner.classList.remove('show');
        
        if (deferredPrompt) {
            // Tampilkan prompt install bawaan sistem
            deferredPrompt.prompt();
            
            // Tunggu respon pengguna
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Respon User: ${outcome}`);
            
            // Reset prompt agar tidak bisa dipanggil lagi
            deferredPrompt = null;
        }
    });
}

// Event ketika tombol silang / close di banner diklik
if (btnClosePwa) {
    btnClosePwa.addEventListener('click', () => {
        if (pwaBanner) pwaBanner.classList.remove('show');
    });
}

// Event untuk melacak jika aplikasi sukses diinstall
window.addEventListener('appinstalled', () => {
    if (pwaBanner) pwaBanner.classList.remove('show');
    deferredPrompt = null;
    console.log('Aplikasi PWA berhasil diinstall ke sistem.');
});