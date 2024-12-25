importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-database-compat.js');

// Konfigurasi Firebase (sama seperti di script.js)
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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

self.addEventListener('install', event => {
  console.log('Service worker installed');
});

self.addEventListener('activate', event => {
  console.log('Service worker activated');
});

// Fungsi untuk menampilkan notifikasi
function showNotification(lantai, jumlahOrang) {
  self.registration.showNotification(`Lantai ${lantai}: ${jumlahOrang} orang`, {
    body: `Jumlah orang di lantai ${lantai} telah berubah.`
  });
}

// Memantau perubahan data di setiap lantai
for (let i = 1; i <= 10; i++) {
  db.ref(`lantai${i}/jumlahOrang`).onSnapshot(snapshot => {
    const jumlahOrang = snapshot.val();
    showNotification(i, jumlahOrang);
  });
}
