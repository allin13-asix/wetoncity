// Rekaman musik Indonesia berlisensi bebas yang ikut dibagikan di public/musik. Setiap entri wajib mencantumkan pembuat dan
// lisensinya (ditampilkan di pemutar). Untuk menambah lagu sendiri: taruh berkas .mp3 di public/musik, lalu tambahkan entri di
// sini. Hanya pakai lagu yang kamu punya haknya (ciptaan sendiri, domain publik, atau lisensi Creative Commons).
export type Rekaman = { id: string; judul: string; ket: string; src: string; atribusi: string; lisensi: string; sumber: string }

export const REKAMAN: Rekaman[] = [
  {
    id: 'gamelan-kraton',
    judul: 'Gamelan Kraton Ngayogyakarta',
    ket: 'Rekaman gamelan Jawa',
    src: '/musik/gamelan-kraton-ngayogyakarta.mp3',
    atribusi: 'RTB45',
    lisensi: 'CC BY 4.0',
    sumber: 'https://commons.wikimedia.org/wiki/File:Gamelan_angka_1_Kraton_Ngayogyakarta.ogg',
  },
  {
    id: 'ketawang-mijil',
    judul: 'Ketawang Mijil Wigaringtyas',
    ket: 'Karawitan Jawa, laras pelog nem',
    src: '/musik/ketawang-mijil-wigaringtyas.mp3',
    atribusi: 'Dandung Adityo Argo Prasetyo, Karawitan Marta Yogiswara',
    lisensi: 'CC BY-SA 4.0',
    sumber: 'https://commons.wikimedia.org/wiki/File:Ketawang_Mijil_Wigaringtyas_Pelog_Nem.oga',
  },
  {
    id: 'ketawang-sekar-teja',
    judul: 'Ketawang Sekar Teja',
    ket: 'Karawitan Jawa, laras slendro manyura',
    src: '/musik/ketawang-sekar-teja.mp3',
    atribusi: 'Dandung Adityo Argo Prasetyo, Karawitan Marta Yogiswara',
    lisensi: 'CC BY-SA 4.0',
    sumber: 'https://commons.wikimedia.org/wiki/File:Ketawang_Sekar_Teja_Slendro_Manyura.oga',
  },
]
