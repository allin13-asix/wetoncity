/** Galat yang boleh dilihat pemain: kode untuk mesin, pesan Indonesia polos untuk orang. */
export class Galat extends Error {
  kode: string
  status: number

  constructor(kode: string, pesan: string, status = 400) {
    super(pesan)
    this.kode = kode
    this.status = status
  }
}
