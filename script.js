// =========================================================================
// SCRIPT UTAMA PANEL ADMINISTRATOR (EDUABSENSI) - VERSI BERSIH TANPA DOUBLE LOGIN
// =========================================================================
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbyiT5PWDYEQV1xtjsB12rz-bgf4Rlu_TAUe7OqEbKO3noATaEhwU1pFjzfwBeNDLF-LsA/exec";

// Langsung inisialisasi panel saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    initAdminPanel();
});

// ==========================================
// 1. NAVIGASI MENU (ROUTING)
// ==========================================
function initAdminPanel() {
    // Tampilkan halaman Dashboard sebagai default
    bukaMenu('dashboard');
}

function bukaMenu(menuId) {
    // Sembunyikan semua halaman (class 'page-content')
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.style.display = 'none');
    
    // Tampilkan halaman yang dituju
    const selectedPage = document.getElementById('page-' + menuId);
    if (selectedPage) selectedPage.style.display = 'block';

    // Panggil fungsi spesifik berdasarkan menu yang dibuka
    if (menuId === 'dashboard') muatDataDashboard();
    else if (menuId === 'master') muatMasterSiswa();
    else if (menuId === 'absensi') muatAbsensiHariIni();
    else if (menuId === 'rekap') muatRekapData();
    else if (menuId === 'pengaturan') muatPengaturan();
}

function logoutAdmin() {
    Swal.fire({
        title: 'Keluar?',
        text: "Anda akan keluar dari sesi Administrator.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Karena tidak ada login bawaan script, reload halaman saja
            window.location.reload();
        }
    });
}

// ==========================================
// 2. FUNGSI PENGATURAN LOKASI & JAM
// ==========================================
function muatPengaturan() {
    Swal.fire({ title: 'Memuat Pengaturan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_pengaturan" })
    })
    .then(res => res.json())
    .then(response => {
        Swal.close();
        if (response.result === 'success') {
            document.getElementById('input-lat').value = response.data.lat;
            document.getElementById('input-lng').value = response.data.lng;
            document.getElementById('input-radius').value = response.data.radius;
            document.getElementById('input-waktu-mulai').value = response.data.waktu_mulai;
            document.getElementById('input-waktu-selesai').value = response.data.waktu_selesai;
        }
    }).catch(err => Swal.fire('Error', 'Gagal terhubung ke database server.', 'error'));
}

function gunakanLokasiSaatIni() {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser Anda tidak mendukung deteksi GPS.', 'error');
        return;
    }

    Swal.fire({ title: 'Mencari Titik Sekolah...', text: 'Pastikan GPS perangkat Anda aktif.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    navigator.geolocation.getCurrentPosition(
        (position) => {
            Swal.close();
            document.getElementById('input-lat').value = position.coords.latitude;
            document.getElementById('input-lng').value = position.coords.longitude;
            Swal.fire({ title: 'Sukses!', text: 'Koordinat diperbarui ke lokasi Anda saat ini. Jangan lupa klik Simpan.', icon: 'success' });
        },
        (error) => {
            Swal.fire('Gagal', 'Tidak dapat mendeteksi lokasi. Pastikan izin akses lokasi diberikan ke browser.', 'error');
        },
        { enableHighAccuracy: true }
    );
}

function simpanPengaturan() {
    const lat = document.getElementById('input-lat').value;
    const lng = document.getElementById('input-lng').value;
    const radius = document.getElementById('input-radius').value;
    const waktu_mulai = document.getElementById('input-waktu-mulai').value;
    const waktu_selesai = document.getElementById('input-waktu-selesai').value;

    if (!lat || !lng || !radius || !waktu_mulai || !waktu_selesai) {
        Swal.fire('Peringatan', 'Semua kolom pengaturan harus diisi!', 'warning'); return;
    }

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "save_pengaturan", lat, lng, radius, waktu_mulai, waktu_selesai })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            Swal.fire({ title: 'Tersimpan!', text: 'Pengaturan berhasil diperbarui di database.', icon: 'success' });
        } else {
            Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan.', 'error');
        }
    }).catch(err => Swal.fire('Error', 'Gagal menyimpan pengaturan. Cek koneksi internet.', 'error'));
}

// ==========================================
// 3. MODUL DASHBOARD & MASTER DATA
// ==========================================
function muatDataDashboard() {
    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_dashboard_stats" })
    }).then(res => res.json()).then(response => {
        if (response.result === 'success') {
            document.getElementById('stat-total-siswa').innerText = response.data.total_siswa || 0;
            document.getElementById('stat-total-kelas').innerText = response.data.total_kelas || 0;
            document.getElementById('stat-laki').innerText = response.data.laki || 0;
            document.getElementById('stat-perempuan').innerText = response.data.perempuan || 0;
        }
    }).catch(err => console.log('Endpoint dashboard stats belum disiapkan.'));
}

function muatMasterSiswa() {
    const tbody = document.querySelector('#table-master tbody');
    if(tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Memuat data...</td></tr>`;
        
        fetch(URL_WEB_APP, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "get_master" })
        }).then(res => res.json()).then(response => {
            if (response.result === 'success') {
                tbody.innerHTML = '';
                if (response.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Data siswa masih kosong.</td></tr>`;
                    return;
                }
                response.data.forEach((siswa, index) => {
                    tbody.innerHTML += `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td>${siswa.nis}</td>
                            <td>${siswa.nama}</td>
                            <td>${siswa.jk}</td>
                            <td>${siswa.kelas}</td>
                        </tr>
                    `;
                });
            }
        }).catch(err => console.log('Error menarik master siswa.'));
    }
}

// ==========================================
// 4. MODUL ABSENSI & REKAP DATA
// ==========================================
function muatAbsensiHariIni() {
    const tbody = document.querySelector('#table-absensi-hari-ini tbody');
    if(tbody) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Memuat data hari ini...</td></tr>`;
        
        fetch(URL_WEB_APP, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "get_absensi_hari_ini" })
        }).then(res => res.json()).then(response => {
            if (response.result === 'success') {
                tbody.innerHTML = '';
                if(response.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada absensi hari ini.</td></tr>`;
                } else {
                    response.data.forEach((absen, index) => {
                        tbody.innerHTML += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${absen.kelas}</td>
                                <td>${absen.guru}</td>
                                <td>${absen.waktu}</td>
                            </tr>
                        `;
                    });
                }
            }
        }).catch(err => console.log('Endpoint absensi hari ini belum disiapkan.'));
    }
}

function muatRekapData() {
    console.log("Halaman Rekap Data siap digunakan.");
}

function cetakLaporan() {
    window.print();
}

// ==========================================
// 5. PWA INSTALLATION (ADMIN PANEL)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker Admin Terdaftar', reg))
        .catch(err => console.error('Service Worker Gagal', err));
    });
}

let deferredPromptAdmin;
const pwaBannerAdmin = document.getElementById('pwa-install-banner');

window.addEventListener('beforeinstallprompt', (e) => { 
    e.preventDefault(); 
    deferredPromptAdmin = e; 
    setTimeout(() => { if (pwaBannerAdmin) pwaBannerAdmin.classList.add('show'); }, 2000); 
});

document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { 
    if (pwaBannerAdmin) pwaBannerAdmin.classList.remove('show'); 
    if (deferredPromptAdmin) { 
        deferredPromptAdmin.prompt(); 
        deferredPromptAdmin = null; 
    } 
});

document.getElementById('btn-close-pwa')?.addEventListener('click', () => { 
    if (pwaBannerAdmin) pwaBannerAdmin.classList.remove('show'); 
});

window.addEventListener('appinstalled', () => { 
    if (pwaBannerAdmin) pwaBannerAdmin.classList.remove('show'); 
});
