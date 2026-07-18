import { supabase } from '../../../lib/supabase';

export const POST = async ({ request }) => {
  try {
    const { noregs, tanggal, status, keterangan } = await request.json();

    if (!noregs || !Array.isArray(noregs) || noregs.length === 0 || !tanggal || !status) {
      return new Response(JSON.stringify({ success: false, message: 'Daftar NoReg (array), Tanggal, dan Status wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format tanggal ke YYYY-MM-DD jika input terformat DD/MM/YYYY
    let targetDate = tanggal;
    if (targetDate.includes('/')) {
      const p = targetDate.split('/');
      targetDate = `${p[2]}-${p[1]}-${p[0]}`;
    }

    const toProperStatus = (st) => {
      if (!st) return 'Hadir';
      const sLower = st.trim().toLowerCase();
      if (sLower === 'alpha') return 'Alpha';
      if (sLower === 'ijin') return 'Ijin';
      if (sLower === 'sakit') return 'Sakit';
      return 'Hadir';
    };

    const payload = noregs.map(noreg => ({
      noreg,
      tanggal: targetDate,
      status: toProperStatus(status),
      keterangan: keterangan ? keterangan.toUpperCase() : ''
    }));

    // Simpan absensi secara massal (bulk upsert)
    // Jika data absensi untuk noreg & tanggal tersebut sudah ada, maka langsung ditimpa (User Rule 13)
    const { error } = await supabase
      .from('absensi')
      .upsert(payload, { onConflict: 'noreg,tanggal' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: `Absensi massal berhasil disimpan untuk ${noregs.length} siswa.` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error in bulk absensi API:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
