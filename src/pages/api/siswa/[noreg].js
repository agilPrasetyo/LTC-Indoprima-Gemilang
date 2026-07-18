import { supabase } from '../../../lib/supabase';

export const PUT = async ({ params, request }) => {
  try {
    const { noreg } = params;
    const s = await request.json();

    if (!noreg || !s.NamaLengkap || !s.TanggalMasuk || !s.Distribusi || !s.Section) {
      return new Response(JSON.stringify({ success: false, message: 'NoReg, Nama, Tanggal Masuk, Distribusi, dan Section wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Update data di tabel public.siswa
    const { error: siswaErr } = await supabase
      .from('siswa')
      .update({
        nama_lengkap: s.NamaLengkap.toUpperCase(),
        departemen: s.Departemen ? s.Departemen.toUpperCase() : null,
        section: s.Section.toUpperCase(),
        hk: s.HK ? s.HK.toUpperCase() : '6 HARI',
        tanggal_masuk: s.TanggalMasuk,
        distribusi: s.Distribusi,
        tanggal_keluar: s.TanggalKeluar || null,
        nama_spv: s.NamaSPV ? s.NamaSPV.toUpperCase() : null,
        asal_daerah: s.AsalDaerah ? s.AsalDaerah.toUpperCase() : null,
        asal_sekolah: s.AsalSekolah ? s.AsalSekolah.toUpperCase() : null
      })
      .eq('noreg', noreg);

    if (siswaErr) throw siswaErr;

    // 2. Update nama_lengkap di tabel public.users
    const { error: userErr } = await supabase
      .from('users')
      .update({
        nama_lengkap: s.NamaLengkap.toUpperCase()
      })
      .eq('noreg', noreg);

    if (userErr) {
      console.warn('Gagal memperbarui nama lengkap di profil login user:', userErr.message);
    }

    return new Response(JSON.stringify({ success: true, message: 'Profil siswa berhasil diperbarui.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error updating student:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE = async ({ params, request }) => {
  try {
    const { noreg } = params;
    const { alasan, keterangan, pengganti } = await request.json();

    if (!noreg || !alasan || !keterangan) {
      return new Response(JSON.stringify({ success: false, message: 'NoReg, Alasan, dan Keterangan wajib disertakan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Ambil data siswa sebelum ditransisikan ke turnover
    const { data: s, error: fetchErr } = await supabase
      .from('siswa')
      .select('*')
      .eq('noreg', noreg)
      .single();

    if (fetchErr || !s) {
      return new Response(JSON.stringify({ success: false, message: 'Data siswa tidak ditemukan.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Tulis rekam data siswa ke public.turnover
    const { error: turnoverErr } = await supabase.from('turnover').insert({
      noreg: s.noreg,
      nama_lengkap: s.nama_lengkap.toUpperCase(),
      departemen: s.departemen ? s.departemen.toUpperCase() : null,
      section: s.section.toUpperCase(),
      tanggal_masuk: s.tanggal_masuk,
      tanggal_keluar: new Date().toISOString().split('T')[0],
      pengganti: pengganti ? pengganti.toUpperCase() : null,
      keterangan: keterangan.toUpperCase(),
      alasan: alasan.toUpperCase(),
      asal_daerah: s.asal_daerah ? s.asal_daerah.toUpperCase() : null,
      asal_sekolah: s.asal_sekolah ? s.asal_sekolah.toUpperCase() : null
    });

    if (turnoverErr) throw turnoverErr;

    // 3. Perbarui status siswa menjadi TURNOVER di public.siswa
    const { error: updateErr } = await supabase
      .from('siswa')
      .update({
        status: 'TURNOVER',
        tanggal_keluar: new Date().toISOString().split('T')[0]
      })
      .eq('noreg', noreg);

    if (updateErr) throw updateErr;

    // 4. Nonaktifkan/hapus akun login di Supabase Auth & public.users
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('noreg', noreg)
      .single();

    if (profile?.id) {
      // Hapus dari Supabase Auth
      const { error: authDelErr } = await supabase.auth.admin.deleteUser(profile.id);
      if (authDelErr) {
        console.warn('Gagal menghapus kredensial login Supabase Auth:', authDelErr.message);
      }
      // Hapus dari tabel public.users
      const { error: profileDelErr } = await supabase
        .from('users')
        .delete()
        .eq('id', profile.id);
      if (profileDelErr) {
        console.warn('Gagal menghapus profil tabel public.users:', profileDelErr.message);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Siswa berhasil ditransisikan ke status TURNOVER.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error processing student turnover:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
