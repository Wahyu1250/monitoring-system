// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyDLw246Xy5bkoso9g65GuXPW_hYWQrrhpo",
  authDomain: "counting-system-smart-building.firebaseapp.com",
  databaseURL: "https://counting-system-smart-building-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "counting-system-smart-building",
  storageBucket: "counting-system-smart-building.firebasorage.app",
  messagingSenderId: "843861880904",
  appId: "1:843861880904:web:880988d1b6a8467720287d",
  measurementId: "G-GWC34GC7LP"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const floorsContainer = document.querySelector('.floors-container');

// Membuat elemen UI untuk setiap lantai
for (let i = 1; i <= 10; i++) {
  const floorDiv = document.createElement('div');
  floorDiv.classList.add('floor');
  floorDiv.innerHTML = `
    <h2>Lantai ${i}</h2>
    <div class="data-item">
      <p id="peopleInside-${i}">0</p>
      <h3>Orang</h3>
    </div>
    <div class="data-item">
      <p id="totalPeopleEntered-${i}">0</p>
      <h3>Pengunjung</h3>
    </div>
  `;
  floorsContainer.appendChild(floorDiv);

  // Referensi lokasi data untuk lantai
  const lantaiRef = db.ref(`lantai${i}`);

  // Pantau perubahan data di Firebase
  lantaiRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    updateTampilan(i, data);
  });

  // Pantau perubahan data orangMasuk
const orangMasukPerangkatRef = db.ref(`lantai${i}/orangMasuk`);
orangMasukPerangkatRef.on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // Hitung jumlah orang masuk dari semua perangkat
    const jumlahOrangMasuk = Object.keys(data).length; 
    for (let j = 0; j < jumlahOrangMasuk; j++) {
      updateData(i, 'masuk'); 
    }
    orangMasukPerangkatRef.set(0); 
  }
});

  // Pantau perubahan data orangKeluar
const orangKeluarPerangkatRef = db.ref(`lantai${i}/orangKeluar`);
orangKeluarPerangkatRef.on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // Hitung jumlah orang keluar dari semua perangkat
    const jumlahOrangKeluar = Object.keys(data).length;
    for (let j = 0; j < jumlahOrangKeluar; j++) {
      updateData(i, 'keluar'); 
    }
    orangKeluarPerangkatRef.set(0); 
  }
});
}

// Fungsi untuk memperbarui tampilan data
function updateTampilan(lantai, data) {
  document.getElementById(`peopleInside-${lantai}`).innerText = data.jumlahOrang || 0;
  document.getElementById(`totalPeopleEntered-${lantai}`).innerText = data.totalOrangMasuk || 0;
  updateTotalCounts();
}

// Fungsi untuk memperbarui data di Firebase menggunakan transaksi
function updateData(lantai, status) {
  const lantaiRef = db.ref(`lantai${lantai}`);
  lantaiRef.transaction((data) => {
    if (!data) data = {};
    if (status === 'masuk') {
      data.jumlahOrang = (data.jumlahOrang || 0) + 1;
      data.totalOrangMasuk = (data.totalOrangMasuk || 0) + 1;
    } else if (status === 'keluar') {
      data.jumlahOrang = Math.max((data.jumlahOrang || 0) - 1, 0);
      data.totalOrangKeluar = (data.totalOrangKeluar || 0) + 1;
    }
    return data;
  });
}

// Fungsi untuk mereset data di Firebase
async function resetData() {
  const today = new Date().toISOString().slice(0, 10);
  const rekapHarianRef = db.ref(`rekapHarian/${today}`);

  // Menyimpan total orang di dalam gedung dan total pengunjung ke dalam rekap harian
  const totalVisitorsToday = document.getElementById('totalVisitorsToday').innerText;

  await rekapHarianRef.update({
    totalOrangDalamGedung: totalPeopleInside,
    totalPengunjung: totalVisitorsToday
  }).then(() => {
    showWebNotification('Data rekap harian berhasil disimpan', 'success'); 
  }).catch((error) => {
    console.error("Error menyimpan data rekap harian:", error);
    showWebNotification('Gagal menyimpan data rekap harian', 'error');
  });

  // Simpan data saat ini ke rekapHarian sebelum direset
  for (let i = 1; i <= 10; i++) {
    const lantaiRef = db.ref(`lantai${i}`);
    lantaiRef.once('value', (snapshot) => {
      const data = snapshot.val() || {};
      rekapHarianRef.child(`lantai${i}`).set({
        totalOrangMasuk: data.totalOrangMasuk || 0,
      });
    });
  }

  // Reset data harian di node lantai
  for (let i = 1; i <= 10; i++) {
    const lantaiRef = db.ref(`lantai${i}`);
    lantaiRef.set({
      jumlahOrang: 0,
      totalOrangMasuk: 0,
      totalOrangKeluar: 0
    });
  }

  showNotification();
}

// --- Bagian Jam dan Penjadwalan Reset ---

const clockElement = document.getElementById('clock');
const dateElement = document.getElementById('date');
let resetTimeout;

// Fungsi untuk menampilkan jam dan tanggal
function updateClock() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const formattedTime = `${hours} : ${minutes} : ${seconds}`;

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('id-ID', options);

  clockElement.textContent = formattedTime;
  dateElement.textContent = formattedDate;
}

// Fungsi untuk mengatur jadwal reset 
function scheduleReset(jam, menit) { 
  const now = new Date(); 
  const nextReset = new Date(); 
  nextReset.setHours(jam, menit, 0, 0); 

  if (now > nextReset) { 
    nextReset.setDate(nextReset.getDate() + 1); 
  } 
  const timeUntilReset = nextReset.getTime() - now.getTime(); 
  clearTimeout(resetTimeout); 
  resetTimeout = setTimeout(() => { 
    resetData(); 
    console.log(`Data telah direset pada jam <span class="math-inline">\{jam\}\:</span>{menit}`); 
    scheduleReset(jam, menit);
  }, timeUntilReset); 

  console.log(`Reset dijadwalkan untuk ${nextReset.toLocaleString()}`); 
} 

setInterval(updateClock, 1000); 
updateClock(); 

// --- Mengambil Jadwal Reset dari Firebase ---
const settingRef = db.ref('setting');

// Baca jadwal reset dari Firebase saat halaman dimuat
settingRef.once('value').then((snapshot) => {
    const data = snapshot.val();
    const resetHour = data ? data.jam : 0; 
    const resetMinute = data ? data.menit : 0;

    // Atur nilai input form dengan nilai dari Firebase
    document.getElementById('resetHour').value = resetHour;
    document.getElementById('resetMinute').value = resetMinute;

    // Jadwalkan reset berdasarkan waktu yang diambil dari Firebase
    scheduleReset(resetHour, resetMinute);
});

// Event listener untuk tombol "Atur Jadwal"
const setResetScheduleButton = document.getElementById('setResetSchedule');
setResetScheduleButton.addEventListener('click', () => {
    const newResetHour = parseInt(document.getElementById('resetHour').value);
    const newResetMinute = parseInt(document.getElementById('resetMinute').value);
    scheduleReset(newResetHour, newResetMinute); 
    showWebNotification(`Jadwal reset otomatis diatur ke jam ${newResetHour.toString()}:${newResetMinute.toString()}`, 'success');

    // Simpan jadwal reset ke Firebase
    const settingRef = db.ref('setting'); 
    settingRef.set({
        jam: newResetHour,
        menit: newResetMinute
    });
});

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', () => {
  showConfirmationDialog(
    'Apakah Anda yakin ingin mereset data semua lantai?',
    () => { 
      resetData(); 
      showWebNotification('Data berhasil direset!', 'success'); 
    },
    () => showWebNotification('Reset semua lantai dibatalkan', 'error')
  );
});

// Fungsi untuk menghitung dan menampilkan total orang di dalam gedung dan total pengunjung
function updateTotalCounts() {
  let totalPeople = 0;
  let totalVisitors = 0;
  const promises = [];
  const labels = [];
  const data = [];

  for (let i = 1; i <= 10; i++) {
      const lantaiRef = db.ref(`lantai${i}`);
      promises.push(lantaiRef.once('value'));
  }

  Promise.all(promises)
      .then((snapshots) => {
          const backgroundColors = [];
          const borderColors = [];
          snapshots.forEach((snapshot, index) => {
              const lantai = index + 1;
              const lantaiData = snapshot.val() || {};
              totalPeople += lantaiData.jumlahOrang || 0;
              totalVisitors += lantaiData.totalOrangMasuk || 0;
              labels.push(`Lantai ${lantai}`);
              data.push(lantaiData.jumlahOrang || 0);

              // Cek apakah jumlahOrang melebihi batas untuk lantai tersebut
              const maxVisitors = parseInt(localStorage.getItem(`maxVisitors-lantai${lantai}`)) || 500; // Batas maksimal orang per lantai
              if (lantaiData.jumlahOrang >= maxVisitors) {
                  showVisitorNotification(lantai, lantaiData.jumlahOrang);
                  backgroundColors.push('rgba(255, 99, 132, 0.5)');
                  borderColors.push('rgba(255, 99, 132, 1)');
              } else {
                  backgroundColors.push('rgba(54, 162, 235, 0.5)');
                  borderColors.push('rgba(54, 162, 235, 1)'); 
              }
          });

          document.getElementById('totalPeopleInside').innerText = totalPeople;
          document.getElementById('totalVisitorsToday').innerText = totalVisitors;

          // Perbarui data dan label grafik
          floorChart.data.labels = labels;
          floorChart.data.datasets[0].data = data;
          floorChart.data.datasets[0].backgroundColor = backgroundColors;
          floorChart.data.datasets[0].borderColor = borderColors;
          floorChart.update();
      })
      .catch((error) => {
          console.error("Error getting total counts:", error);
      });
}

// --- Fungsi Prediksi Lantai ---
function prediksiLantai() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7); 
  const sevenDaysAgoString = sevenDaysAgo.toISOString().slice(0, 10);
  console.log("Tanggal yang diambil:", sevenDaysAgoString);
  const rekapHarianRef = db.ref(`rekapHarian/${sevenDaysAgoString}`);
  rekapHarianRef.once('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
          let lantaiRamai = [];
          let lantaiSepi = [];
          let maxPengunjung = 0;
          let minPengunjung = Infinity;

          for (let i = 1; i <= 10; i++) {
              const lantaiKey = `lantai${i}`;
              const floorData = data[lantaiKey];
              const totalOrangMasuk = floorData ? floorData.totalOrangMasuk : 0;

              if (totalOrangMasuk > maxPengunjung) {
                  lantaiRamai = [i];
                  maxPengunjung = totalOrangMasuk;
              } else if (totalOrangMasuk === maxPengunjung) {
                  lantaiRamai.push(i);
              }

              if (totalOrangMasuk < minPengunjung) {
                  lantaiSepi = [i];
                  minPengunjung = totalOrangMasuk;
              } else if (totalOrangMasuk === minPengunjung) {
                  lantaiSepi.push(i);
              }
          }

          document.getElementById('lantaiRamai').innerText = `Lantai ${lantaiRamai.join(', ')}`;
          document.getElementById('lantaiSepi').innerText = `Lantai ${lantaiSepi.join(', ')}`;
      } else {
          document.getElementById('lantaiRamai').innerText = "Tidak ada data";
          document.getElementById('lantaiSepi').innerText = "Tidak ada data";
      }
  });
}

// Panggil fungsi prediksiLantai() saat halaman dimuat dan setiap kali data berubah
prediksiLantai();
db.ref().on('value', () => {
  prediksiLantai();
});

// --- Inisialisasi Chart.js ---  
const floorChartCanvas = document.getElementById('floorChart').getContext('2d');  
const floorChart = new Chart(floorChartCanvas, {  
    type: 'bar',   
    data: {  
        labels: [],   
        datasets: [{  
            label: 'Jumlah Orang',  
            data: [],   
            backgroundColor: [], 
            borderColor: [], 
            borderWidth: 1  
        }]  
    },  
    options: {  
        scales: {  
            y: {  
                beginAtZero: true  
            }  
        },
        plugins: { 
            legend: {
                display: false
            }
        }
    }  
});

// --- Navigasi Menu ---
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

navLinks.forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault();

    navLinks.forEach(navLink => navLink.parentElement.classList.remove('active'));
    pages.forEach(page => page.classList.remove('active'));

    const targetId = link.dataset.target;
    const targetPage = document.getElementById(targetId);

    link.parentElement.classList.add('active');
    targetPage.classList.add('active');
  });
});

document.getElementById('dashboard').classList.add('active');

// --- Bagian Tampilan Rekap ---

// Fungsi untuk menampilkan data rekap
function displayRecap(data) {
  const recapDataContainer = document.getElementById('recapData');
  recapDataContainer.innerHTML = '';

  if (!data || Object.keys(data).length === 0) {
    recapDataContainer.innerHTML = '<p>Tidak ada data untuk tanggal ini.</p>';
    return;
  }

  const recapTable = document.createElement('table');
  recapTable.classList.add('recap-table');
  recapTable.innerHTML = `
    <thead>
      <tr>
        <th>Lantai Gedung</th>
        <th>Jumlah Pengunjung</th>
      </tr>
    </thead>
    <tbody id="recapTableBody"></tbody>
  `;

  const tableBody = recapTable.querySelector('#recapTableBody');

  for (let i = 1; i <= 10; i++) {
    const lantaiKey = `lantai${i}`;
    const floorData = data[lantaiKey];

    if (!floorData) continue;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>Lantai ${i}</td>
      <td>${floorData.totalOrangMasuk || 0}</td>
    `;
    tableBody.appendChild(row);
  }

  const totalRow = document.createElement('tr');
  totalRow.innerHTML = `
    <td><strong>Total Seluruh Pengunjung</strong></td>
    <td><strong>${data.totalPengunjung || 0}</strong></td>
  `;
  tableBody.appendChild(totalRow);

  recapDataContainer.appendChild(recapTable);
}


const showRecapDataButton = document.getElementById('showRecapData');
showRecapDataButton.addEventListener('click', () => {
  const recapDate = document.getElementById('recapDate').value;
  if (recapDate) {
    const rekapHarianRef = db.ref(`rekapHarian/${recapDate}`);
    rekapHarianRef.once('value', (snapshot) => {
      const data = snapshot.val();
      displayRecap(data);
    });
  }
});

// --- Rekap Mingguan ---

// Fungsi untuk mendapatkan data rekap mingguan
async function getWeeklyRecapData() {
  const today = new Date();
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);
    labels.push(dateString);

    const snapshot = await db.ref(`rekapHarian/${dateString}`).once('value');
    const harianData = snapshot.val();
    data.push(harianData ? harianData.totalPengunjung : 0);
  }

  return { labels, data };
}

// Fungsi untuk membuat grafik mingguan
async function createWeeklyChart() {
  const weeklyChartCanvas = document.getElementById('weeklyChart').getContext('2d');
  const { labels, data } = await getWeeklyRecapData();

  const weeklyChart = new Chart(weeklyChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Pengunjung',
        data: data,
        fill: false,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.1
      }]
    },
    options: {  
      scales: {  
          y: {  
              beginAtZero: true  
          }  
      },
      plugins: { 
          legend: {
              display: false
          }
      }
    } 
  });
}

// Panggil fungsi untuk membuat grafik mingguan saat halaman dimuat
createWeeklyChart();

// --- Tab Rekap ---

const recapTabs = document.querySelectorAll('.recap-tab');
const recapContents = document.querySelectorAll('.recap-content');

recapTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Hapus kelas 'active' dari semua tab dan konten
    recapTabs.forEach(t => t.classList.remove('active'));
    recapContents.forEach(c => c.classList.remove('active'));

    // Tambahkan kelas 'active' ke tab dan konten yang dipilih
    tab.classList.add('active');
    const targetId = tab.dataset.target;
    document.getElementById(targetId).classList.add('active');
  });
});

function showWebNotification() { 
  webNotification.textContent = message;
  webNotification.classList.remove('hidden');
  setTimeout(() => {
    webNotification.classList.add('hidden');
  }, 3000); 
}

// --- Notifikasi Web ---
const webNotification = document.getElementById('web-notification');

function showWebNotification(message, type = 'info') {
  webNotification.textContent = message;
  webNotification.classList.remove('success', 'error', 'info'); 
  webNotification.classList.add(type);
  webNotification.classList.remove('hidden');
  setTimeout(() => {
    webNotification.classList.add('hidden');
  }, 3000); 
}

// --- Konfirmasi Dialog ---
const confirmationDialog = document.getElementById('confirmation-dialog');
const confirmationMessage = document.getElementById('confirmation-message');
const confirmYesButton = document.getElementById('confirm-yes');
const confirmNoButton = document.getElementById('confirm-no');
const overlay = document.getElementById('overlay');

function showConfirmationDialog(message, onConfirm, onCancel) {
  confirmationMessage.textContent = message;
  confirmationDialog.classList.remove('hidden');
  overlay.classList.remove('hidden');

  confirmYesButton.onclick = () => {
    confirmationDialog.classList.add('hidden');
    overlay.classList.add('hidden');
    onConfirm();
  };

  confirmNoButton.onclick = () => {
    confirmationDialog.classList.add('hidden');
    overlay.classList.add('hidden');
    onCancel();
  };
}

// --- Notifikasi Pengunjung Per Lantai ---

const lantaiSettingsContainer = document.getElementById('lantaiSettings');

// Referensi untuk pengaturan notifikasi di Firebase
const notificationSettingsRef = db.ref('notificationSettings');

function showVisitorNotification(lantai, totalVisitors) {
  const maxVisitors = parseInt(localStorage.getItem(`maxVisitors-lantai${lantai}`)) || 100;

  // Cek apakah jumlah orang telah mencapai batas maksimal DAN sebelumnya tidak sama dengan batas maksimal
  if (totalVisitors === maxVisitors && 
      localStorage.getItem(`lastNotificationCount-lantai${lantai}`) !== totalVisitors) {
    alert(`Peringatan: Jumlah pengunjung Lantai ${lantai} saat ini ${totalVisitors} telah mencapai batas yang ditentukan!`);
    localStorage.setItem(`lastNotificationCount-lantai${lantai}`, totalVisitors);
  }

  // Reset lastNotificationCount jika jumlah orang turun di bawah batas maksimal
  if (totalVisitors < maxVisitors) {
    localStorage.removeItem(`lastNotificationCount-lantai${lantai}`);
  }
}

// Buat elemen pengaturan notifikasi untuk setiap lantai
for (let i = 1; i <= 10; i++) {
  const lantaiSettingDiv = document.createElement('div');
  lantaiSettingDiv.classList.add('lantai-setting');
  lantaiSettingDiv.innerHTML = `
    <div class="left-group">
      <h4>Lantai ${i}</h4>
      <label for="maxVisitors-lantai${i}">Batas Max Orang:</label>
      <input type="number" id="maxVisitors-lantai${i}" min="0" value="100">
      <button class="set-notification" data-lantai="${i}">Atur Notifikasi</button>
    </div>
    <div class="right-group">
      <button class="reset-lantai" data-lantai="${i}">Reset Lantai</button>
    </div>
  `;
  lantaiSettingsContainer.appendChild(lantaiSettingDiv);

  const maxVisitorsInput = document.getElementById(`maxVisitors-lantai${i}`);
  const setNotificationButton = lantaiSettingDiv.querySelector(`.set-notification`);
  const resetLantaiButton = lantaiSettingDiv.querySelector(`.reset-lantai`);

  // Baca pengaturan dari Firebase saat halaman dimuat
  notificationSettingsRef.child(`lantai${i}`).once('value').then((snapshot) => {
      const data = snapshot.val();
      if (data && data.maxVisitors) {
          maxVisitorsInput.value = data.maxVisitors;
          localStorage.setItem(`maxVisitors-lantai${i}`, data.maxVisitors);
      }
  });

  // Event listener untuk tombol "Atur Notifikasi"
  setNotificationButton.addEventListener('click', () => {
      const maxVisitors = parseInt(maxVisitorsInput.value);
      console.log(`Batas pengunjung untuk lantai ${i} diatur ke:`, maxVisitors);
      localStorage.setItem(`maxVisitors-lantai${i}`, maxVisitors);

      // Simpan pengaturan ke Firebase
      notificationSettingsRef.child(`lantai${i}`).set({
          maxVisitors: maxVisitors
      });

      showWebNotification(`Notifikasi lantai ${i} diatur ke ${maxVisitors} pengunjung`, 'success');
  });

  // Event listener untuk tombol "Reset Lantai"
  resetLantaiButton.addEventListener('click', () => {
    showConfirmationDialog(
      `Apakah Anda yakin ingin mereset data lantai ${i}?`,
      () => resetDataLantai(i),
      () => showWebNotification('Reset lantai dibatalkan', 'error')
    );
  });
}

// Fungsi untuk mereset data lantai tertentu
function resetDataLantai(lantai) {
  const lantaiRef = db.ref(`lantai${lantai}`);
  lantaiRef.set({
    jumlahOrang: 0,
    totalOrangMasuk: 0,
    totalOrangKeluar: 0
  });
  console.log(`Data lantai ${lantai} telah direset.`);
  showWebNotification(`Data lantai ${lantai} telah direset.`, 'success');
  updateTampilan(lantai, { jumlahOrang: 0, totalOrangMasuk: 0, totalOrangKeluar: 0 });
}

// Panggil updateTotalCounts() saat pertama kali dan setiap kali data berubah
updateTotalCounts();
db.ref().on('value', () => {
    updateTotalCounts();
});

// --- Menu Login --- 

const loginButton = document.getElementById('loginButton');
const loginForm = document.getElementById('loginForm');
const loginSubmit = document.getElementById('loginSubmit');

loginButton.addEventListener('click', () => {
    loginForm.classList.toggle('hidden');
});

// Referensi node 'user' di Firebase
const userRef = db.ref('user');

// Fungsi untuk menangani submit login 
loginSubmit.addEventListener('click', () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  userRef.once('value').then((snapshot) => {
    const data = snapshot.val();
    if (username === data.username && password === data.password) { 
      loginForm.classList.add('hidden');
      enableNavigation(); 
      loginButton.textContent = "Logout";
      loginButton.style.display = "block";

      // Sembunyikan form login 
      loginForm.style.display = "none";
      loginButton.addEventListener('click', logout);

      // Tampilkan notifikasi login berhasil
      showWebNotification("Login berhasil!", "success"); 
    } else {
      showWebNotification("Username atau password salah!", "error");
    }
  });
});

// Event listener untuk input username
const usernameInput = document.getElementById('username');
usernameInput.addEventListener('keypress', (event) => {
  if (event.key === "Enter") {
    document.getElementById('password').focus();
  }
});

// Event listener untuk input password
const passwordInput = document.getElementById('password');
passwordInput.addEventListener('keypress', (event) => {
  if (event.key === "Enter") {
    loginSubmit.click(); 
  }
});

// Fungsi untuk mengaktifkan menu navigasi 
function enableNavigation() {
    navLinks.forEach(link => {
        if (link.dataset.target === 'recap' || link.dataset.target === 'setting') {
            link.parentElement.classList.remove('disabled');
            link.removeEventListener('click', preventDefault); 
        }
    });
}

// Fungsi untuk menonaktifkan menu navigasi (saat logout) 
function disableNavigation() {
    navLinks.forEach(link => {
        if (link.dataset.target === 'recap' || link.dataset.target === 'setting') {
            link.parentElement.classList.add('disabled');
            link.addEventListener('click', preventDefault);
        }
    });
}

// Fungsi untuk menangani logout 
function logout() {
    disableNavigation();
    loginButton.textContent = "Login";
    loginButton.style.display = "none";

    // Tampilkan kembali form login 
    loginForm.style.display = "block";
    loginButton.removeEventListener('click', logout);
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
}

loginButton.style.display = "none"; 
function preventDefault(event) {
    event.preventDefault();
}
disableNavigation();

// Fungsi untuk menangani ganti password
function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    userRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data.password === oldPassword) {
            userRef.update({ password: newPassword })
                .then(() => {
                    showWebNotification('Password berhasil diubah!', 'success');
                })
                .catch((error) => {
                    console.error("Error mengubah password:", error);
                    showWebNotification('Gagal mengubah password', 'error');
                });
        } else {
          showWebNotification("Password lama salah!", "error");
        }
    });
}

// Event listener untuk tombol "Ganti Password"
const changePasswordButton = document.getElementById('changePasswordButton');
changePasswordButton.addEventListener('click', changePassword);
