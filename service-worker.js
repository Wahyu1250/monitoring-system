const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  // ... tambahkan file lain yang ingin di-cache
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // Jika request untuk Firebase, ambil data secara berkala
  if (event.request.url.includes('firebasedatabase.app')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // ... (proses data dari Firebase)
          return response;
        })
    );
  } else {
    // Jika request untuk file website, ambil dari cache
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});

// --- Firebase Integration ---

importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js');

// Konfigurasi Firebase (ganti dengan konfigurasi kamu)
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

// Fungsi untuk update data di IndexedDB
function updateIndexedDB(lantai, data) {
  // Gunakan localforage untuk mempermudah penggunaan IndexedDB
  localforage.setItem(`lantai-${lantai}`, data)
    .then(() => console.log(`Data lantai ${lantai} berhasil disimpan di IndexedDB`))
    .catch(error => console.error(`Error menyimpan data lantai ${lantai} di IndexedDB:`, error));
}

// Pantau perubahan data di Firebase (polling setiap 5 detik)
setInterval(() => {
  for (let i = 1; i <= 10; i++) {
    const lantaiRef = db.ref(`lantai${i}`);
    lantaiRef.once('value').then(snapshot => {
      const data = snapshot.val() || {};

      // Update IndexedDB
      updateIndexedDB(i, data);

      // Logika untuk orangMasuk dan orangKeluar
      const orangMasukRef = db.ref(`lantai${i}/orangMasuk`);
      orangMasukRef.once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
          const jumlahOrangMasuk = Object.keys(data).length;
          // Simulasikan updateData() dengan data dari IndexedDB
          localforage.getItem(`lantai-${i}`).then(lantaiData => {
            if (lantaiData) {
              lantaiData.jumlahOrang = (lantaiData.jumlahOrang || 0) + jumlahOrangMasuk;
              lantaiData.totalOrangMasuk = (lantaiData.totalOrangMasuk || 0) + jumlahOrangMasuk;
              updateIndexedDB(i, lantaiData);
            }
          });
          orangMasukRef.remove();
        }
      });

      const orangKeluarRef = db.ref(`lantai${i}/orangKeluar`);
      orangKeluarRef.once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
          const jumlahOrangKeluar = Object.keys(data).length;
          // Simulasikan updateData() dengan data dari IndexedDB
          localforage.getItem(`lantai-${i}`).then(lantaiData => {
            if (lantaiData) {
              lantaiData.jumlahOrang = Math.max((lantaiData.jumlahOrang || 0) - jumlahOrangKeluar, 0);
              updateIndexedDB(i, lantaiData);
            }
          });
          orangKeluarRef.remove();
        }
      });

      // ... (logika notifikasi jika diperlukan)
    });
  }
}, 5000); // Polling setiap 5 detik
