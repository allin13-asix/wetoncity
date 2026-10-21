// Koran Weton: edisi harian yang ditulis tangan. Satu objek di `koran` = satu edisi.
//
// Menambah edisi: tambahkan objek baru di akhir daftar, dengan tanggal (WIB) lebih baru dari edisi terakhir.
// Edisi terbit pukul 00.00 WIB pada tanggalnya, jadi boleh ditulis jauh hari sebelumnya; yang belum
// waktunya tidak terlihat oleh pemain. Berita pertama adalah berita utama, dan judulnya tampil di Beranda.
// Tulis dengan bahasa sehari-hari, satu paragraf satu gagasan. `penulis` memakai nama NPC persis seperti di npc.ts.
// `pnpm cek` memeriksa semuanya dan memberi tahu sisa stok edisi.
// Membaca edisi yang belum terbit di komputer sendiri: isi KORAN_SAMPAI=YYYY-MM-DD di .env.local lalu mulai ulang
// server dev. Jangan diisi di server produksi.
//
// Berkas ini hanya boleh diimpor oleh kode server. Mengimpornya dari komponen klien membuat semua edisi,
// termasuk yang belum terbit, ikut terkirim ke peramban.

export type Berita = {
  judul: string
  /** satu elemen satu paragraf */
  isi: string[]
  /** nama NPC yang menulis */
  penulis?: string
}

export type Edisi = {
  /** tanggal terbit WIB, YYYY-MM-DD */
  tanggal: string
  /** berita pertama = berita utama */
  berita: Berita[]
  /** satu atau dua kalimat tentang isi edisi berikutnya, tanpa kata "besok"; lewati bila edisi berikutnya belum ditulis */
  besok?: string
}

export const koran: Edisi[] = [
  {
    tanggal: '2026-10-18',
    berita: [
      {
        judul: 'KM Segara Mulia merapat, pendatang baru turun dengan koper dan harapan',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Kapal penumpang KM Segara Mulia merapat di Pelabuhan Weton tepat waktu. Nakhoda Burhan Lubis turun paling akhir sambil bercerita bahwa pelayaran kali ini tenang. "Lautnya sedang baik hati," katanya.',
          'Di dermaga, Mbak Laras Setyowati sudah menunggu. Pemandu warga baru itu menyapa tiap pendatang dengan pertanyaan yang sama: capek, ya? Rata-rata mereka berumur 18 tahun, baru lulus SMA atau SMK, dan membawa uang saku Rp 1.000.000 dari kampung.',
          'Pesan Mbak Laras sederhana: pilih tempat tinggal dulu, baru cari kerja. "Jangan langsung belanja. Tagihan mingguan datang lebih cepat dari yang kamu kira," ujarnya.',
        ],
      },
      {
        judul: 'Rusunawa menampung 80 warga, kost menunggu di sisi lain kota',
        penulis: 'Putri Ayuningtyas',
        isi: [
          'Bagi yang uangnya pas-pasan, Pak Suwandi dari Rusunawa Weton membuka pintu. Satu kamar dibagi dua warga, dapur dan kamar mandi dipakai bersama, dan tarifnya Rp 315.000 per minggu. "Rusun ini untuk yang baru mulai," kata Pak Suwandi.',
          'Yang ingin kamar sendiri bisa memilih Kost Melati (Rp 490.000), Kost Mawar (Rp 710.000), atau Kost Anggrek (Rp 1.210.000) per minggu. Semua harga sudah termasuk sewa, listrik, dan makan. Bu Marni dari Kost Melati menitip pesan: jemuran di belakang, listrik jangan lupa dimatikan.',
        ],
      },
      {
        judul: 'Catatan redaksi: kapan "di" dipisah, kapan disambung',
        penulis: 'Bu Endang Sulistyowati',
        isi: [
          'Redaksi menerima banyak surat soal penulisan "di". Jawabannya mudah. Bila "di" menunjukkan tempat, tulis terpisah: di pelabuhan, di pasar, di rusun. Bila "di-" melekat pada kata kerja, tulis serangkai: dibeli, dijual, ditagih.',
          'Contoh yang benar: "Sewa dibayar di kost." Contoh yang salah: "Sewa di bayar dikost." Sekian, dan tolong jangan menelepon redaksi pada jam makan siang.',
        ],
      },
    ],
    besok: 'Senin pagi, antrean di Bursa Kerja. Siapa yang paling dulu sampai?',
  },
  {
    tanggal: '2026-10-19',
    berita: [
      {
        judul: 'Senin pagi, antrean Bursa Kerja mengular sampai teras',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Hari pertama pekan ini, Bursa Kerja dipenuhi pendatang yang baru turun dari kapal. Pak Teguh Santoso, petugas yang hafal semua lowongan, melayani satu per satu tanpa membuka daftar. "Lulusan SMA atau SMK banyak pilihannya. Mulai dari bawah, naik pelan-pelan," katanya.',
          'Pekerjaan Tier 1, seperti kuli angkut pelabuhan, tukang ojek pangkalan, atau pelayan warung pantai, bisa diambil siapa saja. Upahnya Rp 12.000 untuk setiap aksi kerja, dan satu aksi memakai 10 Tenaga.',
          'Yang ingin naik tingkat bisa ke Balai Latihan Kerja. Pekerjaan Tier 2 meminta Keahlian 3, dan Tier 3 meminta Keahlian 6.',
        ],
      },
      {
        judul: 'Tenaga habis, sabar saja: pulih satu poin tiap enam menit',
        penulis: 'Putri Ayuningtyas',
        isi: [
          'Banyak pembaca bertanya kenapa tombol kerja mati. Jawabannya ada di Tenaga. Satu aksi kerja memakai 10 Tenaga, dan Tenaga pulih satu poin setiap enam menit, termasuk saat kamu tidur atau sedang makan di warung.',
          'Artinya Tenaga yang kosong penuh lagi dalam sekitar sepuluh jam. Tidak perlu membuka layar tiap menit. Habiskan Tenaga, tinggalkan, lalu kembali.',
        ],
      },
      {
        judul: 'Mandor Sugeng punya buku catatan, isinya bukan daftar upah',
        penulis: 'Mas Dimas',
        isi: [
          'Pak Sugeng Raharjo, mandor Gudang Pelabuhan, membawa buku catatan ke mana-mana. Isinya bukan daftar upah, melainkan siapa yang rajin dan siapa yang malas. "Yang rajin saya ingat, yang malas saya juga ingat," katanya.',
          'Fotografer redaksi mencoba memotret buku itu. Buku langsung ditutup. Warga baru dianjurkan datang dengan Tenaga penuh.',
        ],
      },
    ],
    besok: 'Kabar dari laut. Penjaga mercusuar bicara soal bintang, nelayan soal cuaca.',
  },
  {
    tanggal: '2026-10-20',
    berita: [
      {
        judul: 'Penjaga mercusuar: langit cerah, ombak bersahabat',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Pak Karto Wibisono, 68 tahun, menjaga mercusuar di Pantai Weton. Ia tidak punya radio cuaca. Ia punya bintang. "Kalau bintangnya banyak dan berkedip tenang, besok ombaknya baik," katanya sambil menunjuk langit.',
          'Daeng Rahim, nelayan pemilik perahu di TPI, membenarkan. Menurutnya ramalan Pak Karto jarang meleset. "Kalau beliau bilang jangan berangkat, saya ikut tidur," ujarnya.',
          'Kepala Pelabuhan Pak Darmo Susilo menambahkan catatan resmi: kapal masuk tepat waktu di Weton. Kalau telat, biasanya karena ombak, bukan karena dirinya.',
        ],
      },
      {
        judul: 'Lelang ikan di TPI dimulai subuh, yang ragu ketinggalan',
        penulis: 'Putri Ayuningtyas',
        isi: [
          'Tempat Pelelangan Ikan Weton ramai sejak subuh. Yuyun Sulastri, pedagang ikan lelang, memimpin tawar-menawar dengan suara paling lantang. Cak Bambang, buruh bongkar ikan, memastikan semua peti sampai ke meja sambil melucu.',
          'Nasihat dari lantai lelang: kalau ragu, angkat tangan lebih cepat dari tetangga.',
        ],
      },
      {
        judul: 'Balai Kota: bonus harian Rp 20.000 bisa diambil sekali sehari',
        penulis: 'Bu Titin Hartati',
        isi: [
          'Sekretaris Balai Kota mengumumkan bahwa setiap warga bisa mengambil bonus harian Rp 20.000 lewat Beranda. Hari berganti pukul 00.00 WIB. Bonus kemarin yang belum diambil tidak bisa diambil hari ini. "Pantang terlambat," tambahnya.',
        ],
      },
    ],
    besok: 'Rabu Legi, hari pasar paling ramai. Siapkan dompet, jangan siapkan tawaran setengah harga.',
  },
  {
    tanggal: '2026-10-21',
    berita: [
      {
        judul: 'Rabu Legi, Pasar Weton ramai sampai ke parkiran',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Setiap hari Legi, Pasar Weton jadi lebih ramai dari biasanya. Pedagang kampung nelayan membawa hasil laut, pedagang perumahan membawa beras dan kain, dan Mang Oding, juru parkir, hafal semua pelat motor yang masuk.',
          'Mbok Yem, pedagang sayur berumur 63 tahun, menjaga lapaknya dengan satu aturan. "Jangan nawar separuh harga, nanti saya marah," katanya. Pembeli yang sopan, katanya lagi, tetap dilayani dengan senyum.',
          'Lapak untuk warga baru belum dibuka. Kepala Pasar Pak Ridwan menyarankan pendatang melihat-lihat dulu dan belajar harga. Ia juga mengingatkan soal kebersihan: sampah ke tempatnya, karena pasar bersih membuat pembeli betah.',
        ],
      },
      {
        judul: 'Rendang Uda Fadli habis sebelum pukul sepuluh, antrean tetap bertahan',
        penulis: 'Putri Ayuningtyas',
        isi: [
          'Uda Fadli, pemilik rumah makan Padang dekat Pasar Weton, bangga pada rendangnya, dan pembeli setuju. Rendang hari Legi habis sebelum pukul sepuluh, tetapi antrean tetap bertahan. "Orang percaya besok masih ada," katanya.',
        ],
      },
      {
        judul: 'Catatan redaksi: cara menulis uang di papan harga',
        penulis: 'Bu Endang Sulistyowati',
        isi: [
          'Tulis "Rp 12.000", bukan "Rp.12000" dan bukan "12rb". Ada spasi sesudah Rp, dan ada titik tiap tiga angka. Redaksi sudah memeriksa papan harga di Pasar Weton. Hasilnya: tiga papan salah, satu papan benar, dan satu papan ditulis dengan spidol yang kehabisan tinta.',
        ],
      },
    ],
    besok: 'Balai Latihan Kerja penuh, dan seorang siswi SMA membawa cita-cita besar.',
  },
  {
    tanggal: '2026-10-22',
    berita: [
      {
        judul: 'Balai Latihan Kerja penuh, Bu Ratna: keahlian itu modal',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Balai Latihan Kerja Weton penuh sejak pagi. Kepalanya, Bu Ratna Dewanti, berdiri di pintu dan menyapa tiap murid dengan nama. "Keahlian itu modal. Makin tinggi, makin besar upah yang bisa kamu minta," katanya.',
          'Naik satu tingkat Keahlian memakan 10 Tenaga dan sejumlah uang. Kursus pertama sekitar Rp 100.000, lalu biayanya naik tiap tingkat. Penghuni Kost Mawar dan Kost Anggrek mendapat potongan 10 persen.',
          'Saran Bu Ratna: ambil kursus saat uangmu masih aman untuk membayar tagihan mingguan. Keahlian tinggi tidak berguna kalau kamu keburu terlilit kasbon.',
        ],
      },
      {
        judul: 'Nadia, siswi kelas 12, ingin kuliah di Universitas Weton',
        penulis: 'Putri Ayuningtyas',
        isi: [
          'Di SMA Negeri 1 Weton, Nadia (17) punya cita-cita yang ia tulis di sampul bukunya: kuliah di Universitas Weton. Kepala sekolah, Pak Saiful, menyambutnya dengan sebait pantun. Redaksi tidak berani mengutipnya karena Bu Endang belum memeriksa ejaannya.',
          'Bagi pendatang yang punya cita-cita serupa, Bu Dewi Anggraini dari bagian admisi meminta bersabar. Pendaftaran mahasiswa baru belum dibuka. "Satu semester sama dengan satu minggu," katanya, "jadi siapkan uang dan waktunya."',
        ],
      },
      {
        judul: 'Dosen Informatika terlihat dengan kopi ketiga',
        penulis: 'Mas Dimas',
        isi: [
          'Dr. Kevin Hartanto terlihat lagi di kantin kampus dengan kopi ketiga hari ini. Mahasiswa menduga ia sedang menyusun soal ujian. Ia membantah. "Saya cuma haus," katanya.',
        ],
      },
    ],
    besok: 'Lahan berpagar di Kawasan Industri, dan pesan Wali Kota untuk semua warga.',
  },
  {
    tanggal: '2026-10-23',
    berita: [
      {
        judul: 'Lahan Kawasan Industri masih berpagar, pabrik pertama menunggu kota besar',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Warga yang melintas pasti pernah melihatnya: lahan luas berpagar dengan papan proyek di tengahnya. Pak Darwis, mandor proyek, menjaga pintunya. "Belum ada yang boleh masuk," katanya, "tapi pagarnya sudah rapi."',
          'Tegar, surveyor muda, memetakan lahan itu dengan semangat yang membuat rekan-rekannya kewalahan. Menurut Wali Kota Pak Khairul Wianto, pabrik pertama baru dibangun bila kota sudah cukup besar. "Kota ini dibangun bersama. Sumbanganmu, sekecil apa pun, ikut menentukan arahnya," ujarnya.',
          'Peresmian pabrik akan menjadi peristiwa besar bagi Weton. Pekerjaan baru ikut datang, tetapi biaya hidup di kota juga naik.',
        ],
      },
      {
        judul: 'Alat berat dipanaskan tiap pagi, belum ada yang digali',
        penulis: 'Mas Dimas',
        isi: [
          'Pak Ngatimin, operator alat berat di proyek lahan industri, memanaskan mesin setiap pagi walau belum ada yang perlu digali. "Biar tidak lupa caranya," katanya. Itu kalimat terpanjang yang ia ucapkan minggu ini.',
        ],
      },
    ],
    besok: 'Pekan pertama di Weton berakhir, dan tagihan pertama mengetuk pintu.',
  },
  {
    tanggal: '2026-10-24',
    berita: [
      {
        judul: 'Tujuh hari di Weton: tagihan pertama datang, ini cara menyiapkannya',
        penulis: 'Mas Bayu Pratama',
        isi: [
          'Bagi pendatang yang tiba pekan lalu, hari tagihan pertama sudah dekat. Tagihan datang setiap tujuh hari sejak kamu tiba, isinya sewa, listrik, dan makan. Bila upahmu pekan itu cukup besar, pajak penghasilan ikut ditagih.',
          'Bu Marni dari Kost Melati punya cara sendiri untuk mengingatkan: ia mengetuk pintu dua hari sebelumnya. "Biar tidak kaget, Nak," katanya. Pak Rahmat Hidayat dari Bank Weton menambahkan, kalau uangmu kurang, ada kasbon. Bunganya 10 persen seminggu.',
          'Satu catatan penting: kasbon di atas Rp 1.000.000, atau yang belum lunas lebih dari tujuh hari, disebut macet. Selama macet, Tenaga pulih dua kali lebih lambat. Lunasi secepatnya.',
        ],
      },
      {
        judul: 'Boleh pindah kost? Boleh, tapi berlakunya pekan depan',
        penulis: 'Putri Ayuningtyas',
        isi: [
          'Seorang pembaca bertanya apakah boleh pindah tempat tinggal. Mbak Laras menjawab boleh. Pindah dilakukan lewat Beranda dan berlaku mulai tagihan berikutnya. Tagihan yang sedang berjalan tetap memakai tarif tempat lama.',
          'Catatan untuk penghuni Rusunawa: bila Keahlianmu sudah mencapai 6, Pak Suwandi akan meminta kamu pindah dalam 28 hari. Rusun untuk yang baru mulai.',
        ],
      },
    ],
  },
]
