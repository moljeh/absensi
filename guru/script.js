// PASTIKAN URL INI SAMA DENGAN URL DI HALAMAN ADMIN
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbzJtdR7g9fa3g_YLdO6eX_9dOXjeB7wyrSlbZX9uZDNWRVP1f28_-r9xLqFdhozAeS0ew/exec";

let SCHOOL_LAT, SCHOOL_LNG, WAKTU_MULAI, WAKTU_SELESAI;
let masterSiswaList = [];

// Setup Tanggal Hari Ini
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
document.getElementById('tanggal').value = `${year}-${month}-${day}`;

document.addEventListener('DOMContentLoaded', function() {
    inisialisasiAplikasiGuru();
});

// Tarik Pengaturan (Koordinat & Jam) lalu tarik Master Data Siswa
function inisialisasiAplikasiGuru() {
    // Munculkan Loading Saat Aplikasi Baru Dibuka
    Swal.fire({
        title: 'Menghubungkan ke Server...',
        text: 'Mohon tunggu, sedang menyiapkan data kelas dan siswa.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    // 1. Ambil Pengaturan dari Database
    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_pengaturan" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            SCHOOL_LAT = response.data.lat;
            SCHOOL_LNG = response.data.lng;
            WAKTU_MULAI = response.data.waktu_mulai || "00:00";
            WAKTU_SELESAI = response.data.waktu_selesai || "23:59";
            
            // 2. Lanjut Ambil Data Kelas/Siswa
            tarikDataSiswa();
        }
    })
    .catch(err => {
        Swal.fire('Error Koneksi', 'Gagal terhubung ke database sekolah. Periksa koneksi internet Anda.', 'error');
    });
}

function tarikDataSiswa() {
    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_master" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success' && response.data.length > 0) {
            masterSiswaList = response.data;
            updateDropdownKelas();
            
            // Jika sukses, ubah loading menjadi centang hijau dan otomatis tertutup
            Swal.fire({
                title: 'Siap Digunakan!',
                text: 'Data kelas berhasil dimuat.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Data Kosong', 'Data siswa belum tersedia. Silakan hubungi Admin.', 'warning');
        }
    })
    .catch(err => {
        Swal.fire('Error', 'Gagal memuat daftar siswa. Periksa koneksi internet Anda.', 'error');
    });
}

function updateDropdownKelas() {
    const selectKelas = document.getElementById('kelas');
    selectKelas.innerHTML = '<option value="">-- Pilih Kelas Anda --</option>';
    
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    daftarKelas.forEach(k => { selectKelas.appendChild(new Option(k, k)); });
    
    selectKelas.disabled = false;
}

function filterDataAbsensi() {
    const kelasTerpilih = document.getElementById('kelas').value;
    const tbody = document.querySelector('#attendance-table tbody');
    tbody.innerHTML = '';
    
    if (!kelasTerpilih) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Silakan pilih kelas terlebih dahulu.</td></tr>`;
        return;
    }
    
    const siswaKelas = masterSiswaList.filter(s => s.kelas === kelasTerpilih);
    if (siswaKelas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Tidak ada siswa di kelas ini.</td></tr>`;
        return;
    }
    
    siswaKelas.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td>
                <strong>${siswa.nama}</strong><br>
                <code style="font-size:0.75rem; color:#64748b;">${siswa.nis}</code>
            </td>
            <td>
                <select class="status-select" name="status_${index}">
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

// KIRIM DATA ABSENSI
function simpanAbsensi() {
    const kelas = document.getElementById('kelas').value;
    const tanggal = document.getElementById('tanggal').value;
    const barisSiswa = document.querySelectorAll('#attendance-table tbody tr');

    if (!kelas || barisSiswa.length === 0 || barisSiswa[0].querySelector('.text-center')) { 
        Swal.fire('Peringatan', 'Pilih kelas Anda terlebih dahulu!', 'warning'); return; 
    }

    // VALIDASI WAKTU ABSENSI
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    if (currentTime < WAKTU_MULAI || currentTime > WAKTU_SELESAI) {
        Swal.fire({
            title: 'Waktu Absensi Ditutup',
            text: `Sekarang jam ${currentTime}. Presensi hanya bisa dikirim antara pukul ${WAKTU_MULAI} sampai ${WAKTU_SELESAI}.`,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
        return;
    }

    let hasilAbsensi = [];
    barisSiswa.forEach((tr, index) => {
        hasilAbsensi.push({ 
            nis: tr.querySelector('code').innerText, 
            nama: tr.querySelector('strong:not(:empty)').innerText, 
            status: tr.querySelector(`select[name="status_${index}"]`).value 
        });
    });

    // Koordinat yang dikirim adalah koordinat sekolah murni dari database
    const koordinatTersimpan = SCHOOL_LAT + ", " + SCHOOL_LNG;
    const payload = { action: "simpan_absensi", kelas, tanggal, koordinat: koordinatTersimpan, data: hasilAbsensi };
    
    Swal.fire({
        title: 'Mengirim Data...',
        text: 'Mohon tunggu sebentar.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    }).then(res => res.json()).then(response => {
        if (response.result === 'success') {
            Swal.fire('Terkirim!', `Presensi ${kelas} berhasil diserahkan ke sistem admin.`, 'success');
            
            // Reset state
            document.getElementById('kelas').value = "";
            document.querySelector('#attendance-table tbody').innerHTML = `<tr><td colspan="3" class="text-center text-muted">Silakan pilih kelas terlebih dahulu.</td></tr>`;
        } else {
            Swal.fire('Gagal!', response.message, 'error');
        }
    }).catch(err => Swal.fire('Error', 'Gagal mengirim data. Cek koneksi HP Anda.', 'error'));
}

// ==========================================
// PWA (KHUSUS GURU)
// ==========================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
let deferredPrompt; const pwaBanner = document.getElementById('pwa-install-banner');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (pwaBanner) pwaBanner.classList.add('show'); }, 2000); });
document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { if (pwaBanner) pwaBanner.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } });
document.getElementById('btn-close-pwa')?.addEventListener('click', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });
window.addEventListener('appinstalled', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });