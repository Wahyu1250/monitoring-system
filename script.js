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
  const orangMasukRef = db.ref(`lantai${i}/orangMasuk`);
  orangMasukRef.on('value', (snapshot) => {
    if (snapshot.val() === 1) {
      updateData(i, 'masuk');
      orangMasukRef.set(0); // Reset setelah diproses
    }
  });

  // Pantau perubahan data orangKeluar
  const orangKeluarRef = db.ref(`lantai${i}/orangKeluar`);
  orangKeluarRef.on('value', (snapshot) => {
    if (snapshot.val() === 1) {
      updateData(i, 'keluar');
      orangKeluarRef.set(0); // Reset setelah diproses
    }
  });
}

// Fungsi untuk memperbarui tampilan data
function updateTampilan(lantai, data) {
  document.getElementById(`peopleInside-${lantai}`).innerText = data.jumlahOrang || 0;
  document.getElementById(`totalPeopleEntered-${lantai}`).innerText = data.totalOrangMasuk || 0;
  updateTotalCounts(); // Memanggil updateTotalCounts() setiap kali data berubah
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
function scheduleReset(hour, minute) {
  const now = new Date();
  const nextReset = new Date();
  nextReset.setHours(hour, minute, 0, 0);

  if (now > nextReset) {
    nextReset.setDate(nextReset.getDate() + 1);
  }

  const timeUntilReset = nextReset.getTime() - now.getTime();

  clearTimeout(resetTimeout);

  resetTimeout = setTimeout(() => {
    resetData();
    console.log(`Data telah direset pada jam ${hour}:${minute}`);
    scheduleReset(hour, minute);
  }, timeUntilReset);

  console.log(`Reset dijadwalkan untuk ${nextReset.toLocaleString()}`);
}

setInterval(updateClock, 1000);
updateClock();

const setResetScheduleButton = document.getElementById('setResetSchedule');
setResetScheduleButton.addEventListener('click', () => {
  const resetHour = parseInt(document.getElementById('resetHour').value);
  const resetMinute = parseInt(document.getElementById('resetMinute').value);
  scheduleReset(resetHour, resetMinute);
  showWebNotification(`Jadwal reset otomatis diatur ke jam ${resetHour}:${resetMinute}`);
});

scheduleReset(0, 0);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', () => {
  showConfirmationDialog(
    'Apakah Anda yakin ingin mereset data semua lantai?',
    resetData,
    () => console.log('Reset semua lantai dibatalkan')
  );
});

// Fungsi untuk menghitung dan menampilkan total orang di dalam gedung dan total pengunjung
function updateTotalCounts() {
  let totalPeople = 0;
  let totalVisitors = 0;
  const promises = [];

  for (let i = 1; i <= 10; i++) {
    const lantaiRef = db.ref(`lantai${i}`);
    promises.push(lantaiRef.once('value'));
  }

  Promise.all(promises)
    .then((snapshots) => {
      snapshots.forEach((snapshot, index) => {
        const lantai = index + 1;
        const data = snapshot.val() || {};
        totalPeople += data.jumlahOrang || 0;
        totalVisitors += data.totalOrangMasuk || 0;

        // Cek apakah total pengunjung melebihi batas untuk lantai tersebut
        const maxVisitors = parseInt(localStorage.getItem(`maxVisitors-lantai${lantai}`)) || 100; // Default 100 jika belum diatur
        if (data.totalOrangMasuk >= maxVisitors) {
          showVisitorNotification(lantai, data.totalOrangMasuk);
        }
      });

      document.getElementById('totalPeopleInside').innerText = totalPeople;
      document.getElementById('totalVisitorsToday').innerText = totalVisitors;
    })
    .catch((error) => {
      console.error("Error getting total counts:", error);
    });
}

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

function showNotification() {
  const notification = document.getElementById('notification');
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// --- Notifikasi Web ---
const webNotification = document.getElementById('web-notification');

function showWebNotification(message) {
  webNotification.textContent = message;
  webNotification.classList.remove('hidden');
  setTimeout(() => {
    webNotification.classList.add('hidden');
  }, 3000); // Sembunyikan notifikasi setelah 3 detik
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
  overlay.classList.remove('hidden'); // Tampilkan overlay

  confirmYesButton.onclick = () => {
    confirmationDialog.classList.add('hidden');
    overlay.classList.add('hidden'); // Sembunyikan overlay
    onConfirm();
  };

  confirmNoButton.onclick = () => {
    confirmationDialog.classList.add('hidden');
    overlay.classList.add('hidden'); // Sembunyikan overlay
    onCancel();
  };
}

// --- Notifikasi Pengunjung Per Lantai ---

const lantaiSettingsContainer = document.getElementById('lantaiSettings');

// Fungsi untuk menampilkan notifikasi
function showVisitorNotification(lantai, totalVisitors) {
  alert(`Peringatan: Jumlah pengunjung Lantai ${lantai} saat ini ${totalVisitors} telah mencapai batas yang ditentukan!`);
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

  // Periksa localStorage saat halaman dimuat
  const storedMaxVisitors = localStorage.getItem(`maxVisitors-lantai${i}`);
  if (storedMaxVisitors) {
    maxVisitorsInput.value = parseInt(storedMaxVisitors);
  }

  // Event listener untuk tombol "Atur Notifikasi"
  setNotificationButton.addEventListener('click', () => {
    const maxVisitors = parseInt(maxVisitorsInput.value);
    console.log(`Batas pengunjung untuk lantai ${i} diatur ke:`, maxVisitors);
    // Simpan nilai maxVisitors ke localStorage
    localStorage.setItem(`maxVisitors-lantai${i}`, maxVisitors);
    showWebNotification(`Notifikasi lantai ${i} diatur ke ${maxVisitors} pengunjung`);
  });

  // Event listener untuk tombol "Reset Lantai"
  resetLantaiButton.addEventListener('click', () => {
    showConfirmationDialog(
      `Apakah Anda yakin ingin mereset data lantai ${i}?`,
      () => resetDataLantai(i),
      () => console.log('Reset lantai dibatalkan')
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
  showWebNotification(`Data lantai ${lantai} telah direset.`);
  // Update tampilan setelah reset
  updateTampilan(lantai, { jumlahOrang: 0, totalOrangMasuk: 0, totalOrangKeluar: 0 });
}

// Panggil updateTotalCounts() saat pertama kali dan setiap kali data berubah
updateTotalCounts();
db.ref().on('value', () => {
    updateTotalCounts();
});