// Service worker Weton City: pengingat web push, dan halaman offline saat aplikasi yang terpasang dibuka tanpa internet.
// Hanya /offline.html yang disimpan di cache. Halaman, API, dan aset lain selalu dari jaringan (data game harus terkini).
const CACHE = 'weton-offline-1'
const OFFLINE = '/offline.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE, { cache: 'reload' }))).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((semua) => Promise.all(semua.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)))
})

self.addEventListener('push', (e) => {
  let d = { judul: 'Weton City', isi: 'Ada kabar dari kota.', url: '/beranda' }
  try {
    d = { ...d, ...e.data.json() }
  } catch {}
  e.waitUntil(self.registration.showNotification(d.judul, { body: d.isi, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url }, tag: 'pengingat' }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/beranda', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((daftar) => {
      const ada = daftar.find((c) => c.url.startsWith(self.location.origin))
      if (ada) return ada.navigate(url).then((c) => c && c.focus())
      return self.clients.openWindow(url)
    }),
  )
})
