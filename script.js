// PASTIKAN URL INI SAMA DENGAN URL DI HALAMAN ADMIN YANG TERBARU
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbyiT5PWDYEQV1xtjsB12rz-bgf4Rlu_TAUe7OqEbKO3noATaEhwU1pFjzfwBeNDLF-LsA/exec";

// Beri nilai default angka agar tidak terjadi bug NaN (Not a Number)
let SCHOOL_LAT = 0;
let SCHOOL_LNG = 0;
let MAX_RADIUS_METERS = 50;
let WAKTU_MULAI = "00:00";
let WAKTU_SELESAI = "23:59";
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

function inisialisasiAplikasiGuru() {
    Swal.fire({
        title: 'Menghubungkan ke Server...',
        text: 'Mohon tunggu, sedang menyiapkan data kelas dan siswa.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_pengaturan" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            // Paksa konversi ke format desimal/angka murni agar perhitungan jarak tidak error
            SCHOOL_LAT = parseFloat(response.data.lat);
            SCHOOL_LNG = parseFloat(response.data.lng);
            MAX_RADIUS_METERS = parseInt(response.data.radius) || 50; 
            WAKTU_MULAI = response.data.waktu_mulai || "00:00";
            WAKTU_SELESAI = response.data.waktu_selesai || "23:59";
            
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
            Swal.fire({ title: 'Siap Digunakan!', text: 'Data kelas berhasil dimuat.', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire('Data Kosong', 'Data siswa belum tersedia. Silakan hubungi Admin.', 'warning');
        }
    })
    .catch(err => Swal.fire('Error', 'Gagal memuat daftar siswa. Periksa koneksi internet Anda.', 'error'));
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
    
    if (!kelasTerpilih) { tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Silakan pilih kelas terlebih dahulu.</td></tr>`; return; }
    
    const siswaKelas = masterSiswaList.filter(s => s.kelas === kelasTerpilih);
    if (siswaKelas.length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Tidak ada siswa di kelas ini.</td></tr>`; return; }
    
    siswaKelas.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td><strong>${siswa.nama}</strong><br><code style="font-size:0.75rem; color:#64748b;">${siswa.nis}</code></td>
            <td>
                <select class="status-select status-hadir" name="status_${index}" onchange="updateWarnaStatus(this)">
                    <option value="Hadir" selected>Hadir</option><option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option><option value="Alpa">Alpa</option>
                </select>
            </td>`;
        tbody.appendChild(tr);
    });
}

// RUMUS MATEMATIKA LINTANG/BUJUR BUMI (HAVERSINE)
function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

function simpanAbsensi() {
    const kelas = document.getElementById('kelas').value;
    const tanggal = document.getElementById('tanggal').value;
    const barisSiswa = document.querySelectorAll('#attendance-table tbody tr');

    if (!kelas || barisSiswa.length === 0 || barisSiswa[0].querySelector('.text-center')) { 
        Swal.fire('Peringatan', 'Pilih kelas Anda terlebih dahulu!', 'warning'); return; 
    }

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    if (currentTime < WAKTU_MULAI || currentTime > WAKTU_SELESAI) {
        Swal.fire({ title: 'Waktu Absensi Ditutup', text: `Sekarang jam ${currentTime}. Presensi hanya bisa dikirim pukul ${WAKTU_MULAI} - ${WAKTU_SELESAI}.`, icon: 'error' });
        return;
    }

    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser/HP Anda tidak mendukung fitur GPS.', 'error'); return;
    }

    Swal.fire({ title: 'Mengecek Lokasi GPS...', text: 'Pastikan GPS aktif. Jangan ditutup...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const guruLat = parseFloat(position.coords.latitude);
            const guruLng = parseFloat(position.coords.longitude);
            
            // Pengecekan ekstra: Jika data sekolah belum masuk, hentikan!
            if (SCHOOL_LAT === 0 || isNaN(SCHOOL_LAT)) {
                Swal.fire('Gagal Validasi', 'Koordinat titik sekolah belum ter-load dari sistem. Silakan refresh halaman.', 'error');
                return;
            }

            const jarakMeter = hitungJarak(guruLat, guruLng, SCHOOL_LAT, SCHOOL_LNG);
            
            // Kunci Super Ketat: Tolak jika jarak lebih dari radius ATAU jarak gagal dihitung (NaN)
            if (isNaN(jarakMeter) || jarakMeter > MAX_RADIUS_METERS) {
                Swal.fire({
                    title: 'Di Luar Jangkauan!',
                    html: `Jarak Anda terdeteksi: <b>${Math.round(jarakMeter || 0)} meter</b>.<br><br>Batas radius sekolah: <b>${MAX_RADIUS_METERS} meter</b>.<br>Anda tidak dapat mengirim presensi dari luar area sekolah.`,
                    icon: 'error'
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

            const koordinatAktual = guruLat + ", " + guruLng;
            Swal.fire({ title: 'Mengirim Data...', text: 'Mohon tunggu sebentar.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

            fetch(URL_WEB_APP, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "simpan_absensi", kelas, tanggal, koordinat: koordinatAktual, data: hasilAbsensi })
            }).then(res => res.json()).then(response => {
                if (response.result === 'success') {
                    Swal.fire('Terkirim!', `Presensi ${kelas} berhasil diserahkan ke sistem admin.`, 'success');
                    document.getElementById('kelas').value = "";
                    document.querySelector('#attendance-table tbody').innerHTML = `<tr><td colspan="3" class="text-center text-muted">Silakan pilih kelas terlebih dahulu.</td></tr>`;
                } else { Swal.fire('Gagal!', response.message, 'error'); }
            }).catch(err => Swal.fire('Error', 'Gagal mengirim data. Cek koneksi HP Anda.', 'error'));
        },
        (error) => { Swal.fire('Gagal Membaca GPS', 'Tolong aktifkan GPS (Lokasi) pada HP Anda dan pastikan browser telah diberi izin.', 'error'); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==========================================
// PWA & UI
// ==========================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
let deferredPrompt; const pwaBanner = document.getElementById('pwa-install-banner');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (pwaBanner) pwaBanner.classList.add('show'); }, 2000); });
document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { if (pwaBanner) pwaBanner.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } });
document.getElementById('btn-close-pwa')?.addEventListener('click', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });
window.addEventListener('appinstalled', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });

function updateWarnaStatus(selectElement) {
    selectElement.classList.remove('status-hadir', 'status-sakit', 'status-izin', 'status-alpa');
    const value = selectElement.value;
    if (value === 'Hadir') selectElement.classList.add('status-hadir');
    else if (value === 'Sakit') selectElement.classList.add('status-sakit');
    else if (value === 'Izin') selectElement.classList.add('status-izin');
    else if (value === 'Alpa') selectElement.classList.add('status-alpa');
}
