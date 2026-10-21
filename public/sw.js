// Service worker Weton City: hanya untuk menampilkan pengingat web push. Tidak menyimpan cache halaman.
self.addEventListener('push', (e) => {
  let d = { judul: 'Weton City', isi: 'Ada kabar dari kota.', url: '/beranda' }
  try {
    d = { ...d, ...e.data.json() }
  } catch {}
  e.waitUntil(self.registration.showNotification(d.judul, { body: d.isi, icon: '/icon.svg', badge: '/icon.svg', data: { url: d.url }, tag: 'pengingat' }))
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
