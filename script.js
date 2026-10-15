// PASTIKAN URL INI SAMA PERSIS DENGAN YANG ADA DI SCRIPT GURU
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbyiT5PWDYEQV1xtjsB12rz-bgf4Rlu_TAUe7OqEbKO3noATaEhwU1pFjzfwBeNDLF-LsA/exec";

// ==========================================
// 1. SISTEM LOGIN & INISIALISASI (Z-INDEX FIX)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    cekLoginAdmin();
});

function cekLoginAdmin() {
    const isLoggedIn = sessionStorage.getItem("admin_logged_in");
    
    if (!isLoggedIn) {
        // Form Login menggunakan SweetAlert2 dengan perbaikan returnFocus
        Swal.fire({
            title: 'Login Administrator',
            html: `
                <input type="text" id="username" class="swal2-input" placeholder="Username (contoh: admin)">
                <input type="password" id="password" class="swal2-input" placeholder="Password (contoh: 123456)">
            `,
            confirmButtonText: 'Masuk',
            allowOutsideClick: false,
            allowEscapeKey: false,
            returnFocus: false, // Mencegah error fokus aksesibilitas di console
            didOpen: () => {
                // Hapus aria-hidden untuk memperbaiki peringatan aksesibilitas (sesuai histori progres Anda)
                document.body.removeAttribute('aria-hidden');
            },
            preConfirm: () => {
                const user = Swal.getPopup().querySelector('#username').value;
                const pass = Swal.getPopup().querySelector('#password').value;
                if (!user || !pass) {
                    Swal.showValidationMessage(`Username dan Password wajib diisi!`);
                }
                return { user, pass };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Contoh validasi sederhana (Sebaiknya divalidasi ke backend/Google Sheets)
                if (result.value.user === "admin" && result.value.pass === "123456") {
                    sessionStorage.setItem("admin_logged_in", "true");
                    Swal.fire({
                        title: 'Berhasil Login',
                        text: 'Selamat datang di Panel Admin EduAbsensi',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false,
                        returnFocus: false
                    });
                    initAdminDashboard();
                } else {
                    Swal.fire({
                        title: 'Login Gagal',
                        text: 'Username atau Password salah!',
                        icon: 'error',
                        returnFocus: false
                    }).then(() => cekLoginAdmin()); // Panggil ulang form login
                }
            }
        });
    } else {
        initAdminDashboard();
    }
}

// Fungsi Logout
function logoutAdmin() {
    Swal.fire({
        title: 'Keluar?',
        text: "Anda akan keluar dari Panel Administrator.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal',
        returnFocus: false
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem("admin_logged_in");
            window.location.reload();
        }
    });
}


// ==========================================
// 2. NAVIGASI MENU DASHBOARD
// ==========================================
function initAdminDashboard() {
    // Tampilkan halaman Dashboard sebagai default
    bukaMenu('dashboard');
    muatDataDashboard();
}

function bukaMenu(menuId) {
    // Sembunyikan semua halaman
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.style.display = 'none');
    
    // Tampilkan halaman yang dipilih
    const selectedPage = document.getElementById('page-' + menuId);
    if (selectedPage) selectedPage.style.display = 'block';

    // Aksi khusus saat menu tertentu dibuka
    if (menuId === 'pengaturan') muatPengaturan();
    if (menuId === 'master') muatMasterSiswa();
}


// ==========================================
// 3. PENGATURAN LOKASI GPS & JAM (ADMIN)
// ==========================================
function muatPengaturan() {
    Swal.fire({ title: 'Memuat Pengaturan...', allowOutsideClick: false, returnFocus: false, didOpen: () => { Swal.showLoading(); } });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_pengaturan" })
    })
    .then(res => res.json())
    .then(response => {
        Swal.close();
        if (response.result === 'success') {
            // Isi kolom input di form HTML admin dengan data dari server
            document.getElementById('input-lat').value = response.data.lat;
            document.getElementById('input-lng').value = response.data.lng;
            document.getElementById('input-radius').value = response.data.radius;
            // Format waktu otomatis ditarik sebagai 2 digit berkat perbaikan backend sebelumnya
            document.getElementById('input-waktu-mulai').value = response.data.waktu_mulai;
            document.getElementById('input-waktu-selesai').value = response.data.waktu_selesai;
        }
    }).catch(err => Swal.fire('Error', 'Gagal memuat data pengaturan.', 'error'));
}

// Fitur Menarik Lokasi Admin Saat Ini (Untuk set titik pusat sekolah)
function gunakanLokasiSaatIni() {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser Anda tidak mendukung deteksi GPS.', 'error');
        return;
    }

    Swal.fire({ title: 'Mencari Titik Koordinat...', text: 'Pastikan GPS perangkat Anda aktif.', allowOutsideClick: false, returnFocus: false, didOpen: () => { Swal.showLoading(); } });

    navigator.geolocation.getCurrentPosition(
        (position) => {
            Swal.close();
            // Masukkan titik koordinat ke dalam input form
            document.getElementById('input-lat').value = position.coords.latitude;
            document.getElementById('input-lng').value = position.coords.longitude;
            Swal.fire({ title: 'Sukses!', text: 'Titik koordinat berhasil disesuaikan dengan lokasi Anda sekarang.', icon: 'success', returnFocus: false });
        },
        (error) => {
            Swal.fire('Gagal', 'Tidak dapat mendeteksi lokasi. Pastikan izin akses lokasi diberikan ke browser.', 'error');
        },
        { enableHighAccuracy: true }
    );
}

// Simpan Pengaturan Baru ke Database
function simpanPengaturan() {
    const lat = document.getElementById('input-lat').value;
    const lng = document.getElementById('input-lng').value;
    const radius = document.getElementById('input-radius').value;
    const waktu_mulai = document.getElementById('input-waktu-mulai').value;
    const waktu_selesai = document.getElementById('input-waktu-selesai').value;

    if (!lat || !lng || !radius || !waktu_mulai || !waktu_selesai) {
        Swal.fire('Peringatan', 'Semua kolom pengaturan harus diisi!', 'warning');
        return;
    }

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, returnFocus: false, didOpen: () => { Swal.showLoading(); } });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
            action: "save_pengaturan", 
            lat: lat, 
            lng: lng, 
            radius: radius, 
            waktu_mulai: waktu_mulai, 
            waktu_selesai: waktu_selesai 
        })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            Swal.fire({ title: 'Tersimpan!', text: 'Pengaturan sekolah berhasil diperbarui.', icon: 'success', returnFocus: false });
        } else {
            Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan data.', 'error');
        }
    }).catch(err => Swal.fire('Error', 'Gagal menyimpan pengaturan.', 'error'));
}

// ==========================================
// 4. PLACEHOLDER UNTUK MASTER DATA & DASHBOARD
// ==========================================
// Anda bisa menambahkan logika render tabel Master Siswa dan Chart Dashboard di sini
function muatDataDashboard() {
    // Logika mengambil statistik (Total Siswa, Hadir, dll) dari Apps Script
    console.log("Memuat ringkasan dashboard...");
}

function muatMasterSiswa() {
    // Logika mengambil daftar nama siswa untuk ditampilkan di tabel Admin
    console.log("Memuat tabel master data siswa...");
}
