import { supabase } from '../../../lib/supabase';

export const GET = async () => {
  try {
    const { data: pop, error } = await supabase
      .from('populasi')
      .select('*')
      .order('tanggal', { ascending: false });

    if (error) throw error;

    const mapped = (pop || []).map(p => ({
      tanggal: p.tanggal,
      karyawanKontrak: p.karyawan_kontrak,
      ltc: p.ltc,
      outsourcing: p.outsourcing,
      satpamSupir: p.satpam_supir,
      totalKaryawan: p.total_karyawan, // Generated column
      totalLtc: p.total_ltc
    }));

    return new Response(JSON.stringify({ success: true, population: mapped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error fetching population data:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST = async ({ request }) => {
  try {
    const p = await request.json();

    if (!p.tanggal) {
      return new Response(JSON.stringify({ success: false, message: 'Tanggal populasi wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format tanggal ke YYYY-MM-DD jika input terformat DD/MM/YYYY
    let targetDate = p.tanggal;
    if (targetDate.includes('/')) {
      const parts = targetDate.split('/');
      targetDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Upsert data populasi harian (User Rule 13 / General Upsert)
    // total_karyawan adalah generated column di PostgreSQL, jadi tidak diikutkan saat insert
    const { error } = await supabase.from('populasi').upsert({
      tanggal: targetDate,
      karyawan_kontrak: parseInt(p.karyawanKontrak) || 0,
      ltc: parseInt(p.ltc) || 0,
      outsourcing: parseInt(p.outsourcing) || 0,
      satpam_supir: parseInt(p.satpamSupir) || 0,
      total_ltc: parseInt(p.totalLtc) || 0
    }, { onConflict: 'tanggal' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'Data populasi berhasil disimpan.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error in populasi POST API:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
