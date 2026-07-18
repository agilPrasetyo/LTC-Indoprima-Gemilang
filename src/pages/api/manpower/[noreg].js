import { supabase } from '../../../lib/supabase';

export const GET = async ({ params }) => {
  try {
    const { noreg } = params;

    if (!noreg) {
      return new Response(JSON.stringify({ success: false, message: 'NoReg wajib disertakan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: logs, error } = await supabase
      .from('manpower_log')
      .select('*')
      .eq('noreg', noreg)
      .order('tanggal_record', { ascending: false });

    if (error) throw error;

    const mapped = (logs || []).map(l => ({
      dateStr: l.tanggal_record,
      plan: l.plan,
      actual: l.aktual,
      reject: l.reject,
      percent: l.persentase !== null ? parseFloat(l.persentase) : null,
      hadir: l.hadir,
      keterangan: l.keterangan || '',
      shift: l.shift || '-',
      bagian: l.bagian || '-',
      nomorMesin: l.nomor_mesin || '-',
      model: l.model || '-',
      namaSpv: l.nama_spv || '-'
    }));

    return new Response(JSON.stringify({ success: true, logs: mapped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error fetching student manpower logs:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
