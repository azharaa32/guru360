"""Tukar teks MySG (hasil `pdftotext -layout`) kepada JSON senarai tugas untuk Guru360.

Guna:  pdftotext -layout MySG-Sekolah-Rendah-KPM.pdf mysg.txt
       python3 scripts/mysg.py mysg.txt src/data/mysg-rendah.json

Dokumen PDF itu sendiri tidak disimpan dalam repositori.
"""
import json
import re
import sys

KEPALA = re.compile(r'^\s*((?:HR|PR|JR)\d+)(?: – ((?:HR|PR|JR)\d+))? \| (.+?)\s*$')
BUTIR = re.compile(r'^(\s*)(\d{1,2}\.(?=\s)|\d{1,2}(?:\.\d{1,2}){1,2}\.?(?=\s{2,}))\s+(\S.*)$')
SUB = re.compile(r'^(\s*)(?:\(?([a-z]|[ivx]{1,5})[.)])\s+(\S.*)$')
KUMPULAN = re.compile(r'^\s*\(([A-Z]\d{0,2}|\d{1,2})\)\s+(\S.*)$')
HURUF_BESAR = re.compile(r'^[^a-z]{4,}')
TAJUK_BESAR = re.compile(r'^\s*(TUGAS UTAMA \((?:UMUM|KHUSUS)\))\s*$')
SUBJAWATAN = re.compile(r'^\s*(HR\d+)\s*[–-]\s*(GURU .+?)\s*$')
MUKA = re.compile(r'^\s*\d{1,3}\s*$')
RUMI = re.compile(r'^\s*[ivxl]{1,6}\.\s')
# Baris yang menandakan bahagian itu sudah tamat (tajuk bab atau komponen berikutnya).
TAMAT = re.compile(r'^\s*(BAB \d|KOMPONEN [A-Z]|[PJ]\s{3,}(PORTFOLIO|JAWATANKUASA)|\d\.\d(\.\d)?\s+-\s*[A-Z]|\d\.\d(\.\d)?\s+[A-Z][A-Z ]{6,}$|\d\.\d(\.\d)?\s*$|LAMPIRAN|PENUTUP\s*$|GLOSARI|SENARAI SINGKATAN)')


def sambung(a, b):
    b = b.strip()
    if not a:
        return b
    return a + b if a.endswith('-') and not a.endswith(' -') else a + ' ' + b


def kemas(s):
    s = re.sub(r'\s+', ' ', s).strip()
    return s.replace(' ,', ',').replace(' .', '.')


def urai(blok):
    kumpulan = []          # [{tajuk, tugas: [str]}]
    semasa = None
    butir = None           # teks butir sedang dibina
    subs = []
    rujukan = False
    kosong = 0
    inden_butir = 0

    def tutup_butir():
        nonlocal butir, subs
        if butir is not None and semasa is not None:
            teks = kemas(butir)
            if len(teks) < 15 and not subs:  # subtajuk bernombor (cth. '2.1 Hal Ehwal Murid'), bukan tugas
                butir, subs = None, []
                return
            if subs:
                teks += '\n' + '\n'.join(f'{chr(97 + i)}) {kemas(s)}' for i, s in enumerate(subs))
            semasa['tugas'].append(teks)
        butir, subs = None, []

    def kumpulan_baharu(tajuk):
        nonlocal semasa
        tutup_butir()
        semasa = {'tajuk': kemas(tajuk), 'tugas': []}
        kumpulan.append(semasa)

    for baris in blok:
        baris = baris.replace('\f', '')
        if MUKA.match(baris):
            continue
        if not baris.strip():
            kosong += 1
            continue
        selepas_kosong, kosong = kosong, 0
        t = baris.strip()
        if TAMAT.match(baris):
            break
        if t == 'RUJUKAN':
            tutup_butir()
            rujukan = True
            continue
        m_b, m_k, m_t, m_j = BUTIR.match(baris), KUMPULAN.match(baris), TAJUK_BESAR.match(baris), SUBJAWATAN.match(baris)
        if rujukan:
            # Rujukan tamat apabila tajuk bermula, atau selepas baris kosong diikuti teks yang bukan rujukan.
            if not (m_k or m_t or m_j or (selepas_kosong and not RUMI.match(baris))):
                continue
            rujukan = False
        kumpulan_sah = m_k and (m_k.group(1)[0].isalpha() or HURUF_BESAR.match(m_k.group(2)))
        if m_t:
            kumpulan_baharu(m_t.group(1))
        elif m_j:
            kumpulan_baharu(f'{m_j.group(1)} – {m_j.group(2)}')
        elif kumpulan_sah:
            kumpulan_baharu(f'({m_k.group(1)}) {m_k.group(2)}')
        elif m_b:
            if semasa is None:
                kumpulan_baharu('')
            tutup_butir()
            inden_butir = len(m_b.group(1))
            butir = m_b.group(3)
        elif butir is not None:
            m_s = SUB.match(baris)
            if m_s and len(m_s.group(1)) > inden_butir:
                subs.append(m_s.group(3))
            elif subs:
                subs[-1] = sambung(subs[-1], t)
            else:
                butir = sambung(butir, t)
        elif semasa is not None and not semasa['tugas'] and semasa['tajuk'] and t.upper() == t and len(t) < 80:
            semasa['tajuk'] = kemas(semasa['tajuk'] + ' ' + t)  # tajuk kumpulan dua baris
        # selain itu: perenggan pengenalan, diabaikan
    tutup_butir()
    return [k for k in kumpulan if k['tugas']]


def main(masuk, keluar):
    L = open(masuk, encoding='utf-8').read().split('\n')
    kepala = [(i, m) for i, l in enumerate(L) if i > 300 and (m := KEPALA.match(l))]
    hasil = []
    for k, (i, m) in enumerate(kepala):
        akhir = kepala[k + 1][0] if k + 1 < len(kepala) else len(L)
        kod, hingga, nama = m.group(1), m.group(2), kemas(m.group(3))
        jenis = {'HR': 'berjawatan', 'PR': 'tanpa_jawatan', 'JR': 'jawatankuasa'}[kod[:2]]
        hasil.append({'kod': kod + (f'–{hingga}' if hingga else ''), 'nama': nama, 'jenis': jenis, 'kumpulan': urai(L[i + 1:akhir])})
    # Portfolio yang berkongsi senarai tugas dengan portfolio berikutnya (tajuk berturut-turut).
    for a, b in zip(hasil, hasil[1:]):
        if not a['kumpulan']:
            a['kumpulan'] = b['kumpulan']
            a['kongsi'] = b['kod']
    json.dump({'sumber': 'MySG: Garis Panduan Tadbir Urus Sekolah Rendah KPM', 'peringkat': 'rendah', 'portfolio': hasil}, open(keluar, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for p in hasil:
        print(f"{p['kod']:10} {p['nama'][:48]:48} kumpulan={len(p['kumpulan']):2} tugas={sum(len(g['tugas']) for g in p['kumpulan']):3}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
