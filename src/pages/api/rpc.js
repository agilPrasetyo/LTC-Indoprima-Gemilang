import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Pastikan selalu menggunakan client terisolasi untuk operasi Admin Service Role (Bypass RLS)
function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function verifyUserSession(cookies) {
  try {
    const token = cookies.get('sb-access-token')?.value;
    if (!token) return { isAuthenticated: false };

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAuthenticated: false };

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const rawRole = profile?.role || user.user_metadata?.role || 'VISITOR';
    const roleUpper = String(rawRole).toUpperCase();

    return {
      isAuthenticated: true,
      user,
      profile,
      role: roleUpper
    };
  } catch (err) {
    return { isAuthenticated: false };
  }
}

export async function POST({ request, cookies }) {
  try {
    const payload = await request.json();
    const action = payload.action;
    const args = payload.args || [];

    // --- PEMBACAAN DATA: LANGSUNG DARI SUPABASE ---
    if (action === 'getDashboardStats' || action === 'getStats') {
      const stats = await getStatsFromSupabase();
      return new Response(JSON.stringify(stats), { status: 200 });
    }

    if (action === 'getStudentDailyLogs' || action === 'getStudentLogs') {
      const noreg = args[0];
      const logs = await getStudentLogsFromSupabase(noreg);
      return new Response(JSON.stringify(logs), { status: 200 });
    }

    // --- MANAJEMEN PENERBITAN SERTIFIKAT SISWA ---
    if (action === 'getSertifikatList') {
      const list = await getSertifikatListFromSupabase();
      return new Response(JSON.stringify(list), { status: 200 });
    }

    if (action === 'getSertifikatByNoreg') {
      const noreg = args[0];
      const cert = await getSertifikatFromSupabase(noreg);
      return new Response(JSON.stringify(cert), { status: 200 });
    }

    if (action === 'saveSertifikat') {
      const payload = args[0];
      const res = await saveSertifikatToSupabase(payload);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'login') {
      const username = args[0];
      const password = args[1];
      const auth = await handleLogin(username, password);
      if (auth.success && auth.session) {
        const { access_token, refresh_token } = auth.session;
        const cookieOptions = {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7 // 7 hari
        };
        cookies.set('sb-access-token', access_token, cookieOptions);
        cookies.set('sb-refresh-token', refresh_token, cookieOptions);
        delete auth.session; // Remove from payload for security
      }
      return new Response(JSON.stringify(auth), { status: 200 });
    }

    if (action === 'getHariKerja') {
      const year = args[0];
      const month = args[1];
      try {
        const { data, error } = await supabase
          .from('hari_kerja')
          .select('hk')
          .eq('tahun', year)
          .eq('bulan', month)
          .maybeSingle();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, hk: data ? data.hk : null }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 200 });
      }
    }

    // --- VERIFIKASI SESI COOKIE DENGAN SUPABASE AUTH ---
    const authSession = await verifyUserSession(cookies);

    // Verifikasi Otorisasi Peran (Role-Based Access Control)
    const isAdmin = authSession.isAuthenticated && authSession.role === 'ADMIN';
    const isSiswa = authSession.isAuthenticated && authSession.role === 'SISWA';

    if (action === 'saveHariKerja') {
      const year = parseInt(args[0]);
      const month = parseInt(args[1]);
      const hk = parseInt(args[2]);
      try {
        const { error } = await supabase
          .from('hari_kerja')
          .upsert({ tahun: year, bulan: month, hk }, { onConflict: 'tahun,bulan' });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, hk }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
      }
    }

    // --- MANAJEMEN PENGGUNA (USER MANAGEMENT) DIRECT TO SUPABASE ---
    if (action === 'getUsersList') {
      const users = await getUsersListFromSupabase();
      return new Response(JSON.stringify(users), { status: 200 });
    }

    if (action === 'createUser') {
      if (!isAdmin) return new Response(JSON.stringify({ success: false, message: 'Akses ditolak: Hanya Admin yang dapat membuat akun.' }), { status: 403 });
      const res = await createUserInSupabase(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'updateUser') {
      if (!isAdmin) return new Response(JSON.stringify({ success: false, message: 'Akses ditolak: Hanya Admin yang dapat memperbarui akun.' }), { status: 403 });
      const res = await updateUserInSupabase(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'deleteUserById') {
      if (!isAdmin) return new Response(JSON.stringify({ success: false, message: 'Akses ditolak: Hanya Admin yang dapat menghapus akun.' }), { status: 403 });
      const res = await deleteUserFromSupabase(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    // --- MANAJEMEN PAS FOTO SISWA (SUPABASE STORAGE, MAX 25KB) ---
    if (action === 'uploadFotoSiswa') {
      const { noreg, photoBase64 } = args[0] || {};
      if (!noreg || !photoBase64) {
        return new Response(JSON.stringify({ success: false, message: 'NoReg dan file foto wajib disertakan.' }), { status: 400 });
      }

      // Bersihkan prefix data URL (misal: data:image/jpeg;base64, dll)
      const base64Data = photoBase64.includes(',') ? photoBase64.split(',')[1] : photoBase64;
      const buffer = Buffer.from(base64Data, 'base64');

      // Validasi ketat batas ukuran maksimal 25 KB (25,600 bytes)
      if (buffer.length > 25600) {
        return new Response(JSON.stringify({
          success: false,
          message: `Ukuran foto (${(buffer.length / 1024).toFixed(1)} KB) melebihi batas maksimal 25 KB.`
        }), { status: 400 });
      }

      const adminClient = getAdminClient();
      const filename = `${String(noreg).trim()}.jpg`;
      const { data: upData, error: uploadErr } = await adminClient.storage
        .from('foto-siswa')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadErr) {
        console.error('[uploadFotoSiswa Error]:', uploadErr);
        return new Response(JSON.stringify({ success: false, message: uploadErr.message }), { status: 500 });
      }

      const { data: urlData } = adminClient.storage.from('foto-siswa').getPublicUrl(filename);
      return new Response(JSON.stringify({ success: true, url: urlData.publicUrl }), { status: 200 });
    }

    if (action === 'deleteFotoSiswa') {
      const { noreg } = args[0] || {};
      if (!noreg) {
        return new Response(JSON.stringify({ success: false, message: 'NoReg wajib disertakan.' }), { status: 400 });
      }
      const adminClient = getAdminClient();
      const filename = `${String(noreg).trim()}.jpg`;
      const { error: delErr } = await adminClient.storage.from('foto-siswa').remove([filename]);
      if (delErr) {
        return new Response(JSON.stringify({ success: false, message: delErr.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }


    // --- MANAJEMEN SISTEM QUIZ LTC INDOPRIMA GEMILANG ---
    if (action === 'getQuizData') {
      const res = await handleGetQuizData();
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'saveQuizSection') {
      const res = await handleSaveQuizSection(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'deleteQuizSection') {
      const res = await handleDeleteQuizSection(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'saveQuizQuestion') {
      const res = await handleSaveQuizQuestion(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'deleteQuizQuestion') {
      const res = await handleDeleteQuizQuestion(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'saveQuizSchedule') {
      const res = await handleSaveQuizSchedule(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'deleteQuizSchedule') {
      const res = await handleDeleteQuizSchedule(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'submitQuizAnswer') {
      const res = await handleSubmitQuizAnswer(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'grantQuizRemedial') {
      const res = await handleGrantQuizRemedial(args[0]);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'getStudentActiveQuizzes') {
      const noreg = args[0];
      const res = await handleGetStudentActiveQuizzes(noreg);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    if (action === 'syncQuizToCertificate') {
      const noreg = args[0];
      const res = await handleSyncQuizToCertificate(noreg);
      return new Response(JSON.stringify(res), { status: 200 });
    }

    // --- PENULISAN DATA: LANGSUNG KE SUPABASE ---
    await handleLocalSupabaseWrite(action, args);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
  }
}

// STORAGE LOKAL FALLBACK UNTUK SERTIFIKAT JIKA TABEL SUPABASE BELUM DIJALANKAN
const LOCAL_CERT_FILE = path.resolve(process.cwd(), 'src/data/sertifikat_storage.json');

function normalizeCertRecord(raw) {
  if (!raw) return null;
  const basic = Number(raw.basic_theory ?? raw.nilai_basic_theory ?? 0);
  const vocational = Number(raw.vocational_theory ?? raw.nilai_vocational ?? 0);
  const perf = Number(raw.performance ?? raw.nilai_performance ?? 0);
  const userObs = Number(raw.user_observation ?? raw.nilai_user_observation ?? 0);
  const subKinerja = Number(raw.kinerja_subtotal ?? raw.subtotal_kinerja ?? 0);
  const bmk = Number(raw.bmk ?? raw.nilai_bmk ?? 0);
  const subBmk = Number(raw.bmk_subtotal ?? raw.subtotal_bmk ?? 0);
  const att = Number(raw.attendance ?? raw.nilai_attendance ?? 0);
  const attit = Number(raw.attitude ?? raw.nilai_attitude ?? 0);
  const subSikap = Number(raw.sikap_subtotal ?? raw.subtotal_sikap ?? 0);
  const lap = Number(raw.laporan ?? raw.nilai_laporan_akhir ?? 0);
  const subLap = Number(raw.laporan_subtotal ?? raw.subtotal_laporan ?? (lap * 0.1));
  const tglTerbit = raw.tanggal_terbit ?? raw.tanggal_cetak ?? '';

  return {
    ...raw,
    noreg: String(raw.noreg || '').trim(),
    nomor_sertifikat: raw.nomor_sertifikat || '',
    tempat_tanggal_lahir: raw.tempat_tanggal_lahir || '',
    periode_pelatihan: raw.periode_pelatihan || '',
    tanggal_terbit: tglTerbit,
    tanggal_cetak: tglTerbit,
    basic_theory: basic,
    nilai_basic_theory: basic,
    vocational_theory: vocational,
    nilai_vocational: vocational,
    performance: perf,
    nilai_performance: perf,
    user_observation: userObs,
    nilai_user_observation: userObs,
    kinerja_subtotal: subKinerja,
    subtotal_kinerja: subKinerja,
    bmk: bmk,
    nilai_bmk: bmk,
    bmk_subtotal: subBmk,
    subtotal_bmk: subBmk,
    attendance: att,
    nilai_attendance: att,
    attitude: attit,
    nilai_attitude: attit,
    sikap_subtotal: subSikap,
    subtotal_sikap: subSikap,
    laporan: lap,
    nilai_laporan_akhir: lap,
    laporan_subtotal: subLap,
    subtotal_laporan: subLap,
    nilai_akhir: Number(raw.nilai_akhir ?? 0),
    predikat: raw.predikat || 'A'
  };
}

function readLocalCertStorage() {
  try {
    if (fs.existsSync(LOCAL_CERT_FILE)) {
      const raw = fs.readFileSync(LOCAL_CERT_FILE, 'utf-8');
      return JSON.parse(raw) || {};
    }
  } catch (e) {
    console.warn('[readLocalCertStorage] Warning:', e.message);
  }
  return {};
}

function writeLocalCertStorage(data) {
  try {
    const dir = path.dirname(LOCAL_CERT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_CERT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[writeLocalCertStorage] Warning:', e.message);
  }
}

async function getSertifikatListFromSupabase() {
  const localMap = readLocalCertStorage();
  const mergedMap = { ...localMap };
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient.from('sertifikat').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach(item => {
        if (item && item.noreg) mergedMap[String(item.noreg).trim()] = item;
      });
    }
  } catch (err) {
    console.warn('[getSertifikatListFromSupabase] Notice:', err.message);
  }
  const list = Object.values(mergedMap).map(normalizeCertRecord).filter(Boolean);
  return { success: true, data: list };
}

async function getSertifikatFromSupabase(noreg) {
  const cleanNoreg = String(noreg || '').trim();
  const localMap = readLocalCertStorage();
  let found = localMap[cleanNoreg] || null;
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('sertifikat')
      .select('*')
      .eq('noreg', cleanNoreg)
      .maybeSingle();
    if (!error && data) {
      found = { ...found, ...data };
    }
  } catch (err) {
    // fallback to local
  }
  return { success: true, data: normalizeCertRecord(found) };
}

async function saveSertifikatToSupabase(payload) {
  if (!payload || !payload.noreg) {
    return { success: false, message: 'Data sertifikat tidak valid (NoReg kosong).' };
  }
  const cleanNoreg = String(payload.noreg).trim();
  const normalized = normalizeCertRecord({ ...payload, noreg: cleanNoreg });

  // 1. Selalu simpan ke local storage sebagai backup aman
  const localMap = readLocalCertStorage();
  localMap[cleanNoreg] = {
    ...normalized,
    updated_at: new Date().toISOString()
  };
  writeLocalCertStorage(localMap);

  // 2. Coba simpan ke Supabase (jika tabel sudah ada)
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('sertifikat')
      .upsert({
        noreg: cleanNoreg,
        nomor_sertifikat: normalized.nomor_sertifikat,
        tempat_tanggal_lahir: normalized.tempat_tanggal_lahir,
        periode_pelatihan: normalized.periode_pelatihan,
        tanggal_cetak: normalized.tanggal_cetak,
        nilai_basic_theory: normalized.nilai_basic_theory,
        nilai_vocational: normalized.nilai_vocational,
        nilai_performance: normalized.nilai_performance,
        nilai_user_observation: normalized.nilai_user_observation,
        subtotal_kinerja: normalized.subtotal_kinerja,
        nilai_bmk: normalized.nilai_bmk,
        subtotal_bmk: normalized.subtotal_bmk,
        nilai_attendance: normalized.nilai_attendance,
        nilai_attitude: normalized.nilai_attitude,
        subtotal_sikap: normalized.subtotal_sikap,
        nilai_laporan_akhir: normalized.nilai_laporan_akhir,
        subtotal_laporan: normalized.subtotal_laporan,
        nilai_akhir: normalized.nilai_akhir,
        predikat: normalized.predikat,
        updated_at: new Date().toISOString()
      }, { onConflict: 'noreg' });

    if (error) {
      console.warn('[saveSertifikatToSupabase] Supabase notice:', error.message);
      return { success: true, savedLocally: true, message: 'Data sertifikat tersimpan aman di sistem lokal!', data: normalized };
    }
    return { success: true, savedLocally: false, message: 'Data sertifikat berhasil disimpan ke database!', data: normalized };
  } catch (err) {
    console.warn('[saveSertifikatToSupabase] Notice:', err.message);
    return { success: true, savedLocally: true, message: 'Data sertifikat tersimpan aman di sistem lokal.', data: normalized };
  }
}

// =======================================================
// STORAGE & LOGIKA SISTEM QUIZ LTC INDOPRIMA GEMILANG (SUPABASE + LOCAL FALLBACK)
// =======================================================
const LOCAL_QUIZ_FILE = path.resolve(process.cwd(), 'src/data/quiz_storage.json');

function readLocalQuizStorage() {
  try {
    if (fs.existsSync(LOCAL_QUIZ_FILE)) {
      const raw = fs.readFileSync(LOCAL_QUIZ_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        sections: parsed.sections || [],
        questions: parsed.questions || [],
        quizzes: parsed.quizzes || [],
        submissions: parsed.submissions || []
      };
    }
  } catch (e) {
    console.warn('[readLocalQuizStorage] Warning:', e.message);
  }
  return { sections: [], questions: [], quizzes: [], submissions: [] };
}

function writeLocalQuizStorage(data) {
  try {
    const dir = path.dirname(LOCAL_QUIZ_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_QUIZ_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[writeLocalQuizStorage] Warning:', e.message);
  }
}

async function getQuizDataFromStorage() {
  const localData = readLocalQuizStorage();
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('quiz_storage')
      .select('data, updated_at')
      .eq('id', 'main')
      .maybeSingle();

    if (!error && data && data.data) {
      return {
        sections: Array.isArray(data.data.sections) ? data.data.sections : localData.sections,
        questions: Array.isArray(data.data.questions) ? data.data.questions : localData.questions,
        quizzes: Array.isArray(data.data.quizzes) ? data.data.quizzes : localData.quizzes,
        submissions: Array.isArray(data.data.submissions) ? data.data.submissions : localData.submissions,
        updated_at: data.updated_at
      };
    }

    // Jika tabel ada tapi belum ada row 'main', inisialisasi / seed dari data lokal
    if (!error && !data) {
      try {
        await adminClient.from('quiz_storage').upsert({
          id: 'main',
          data: localData,
          updated_at: new Date().toISOString()
        });
      } catch (seedErr) {
        console.warn('[getQuizDataFromStorage] Seed initial quiz notice:', seedErr.message);
      }
    }
  } catch (e) {
    console.warn('[getQuizDataFromStorage] Supabase notice (fallback to local):', e.message);
  }
  return localData;
}

async function saveQuizDataToStorage(store) {
  // 1. Selalu coba simpan ke file lokal (aman saat dev, catch error saat serverless)
  writeLocalQuizStorage(store);

  // 2. Simpan ke Supabase tabel quiz_storage (agar tersimpan permanen di cloud Vercel)
  try {
    const adminClient = getAdminClient();
    const { error } = await adminClient
      .from('quiz_storage')
      .upsert({
        id: 'main',
        data: store,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[saveQuizDataToStorage] Supabase note:', error.message);
    }
  } catch (e) {
    console.warn('[saveQuizDataToStorage] Supabase exception:', e.message);
  }
  return store;
}

async function handleGetQuizData() {
  const data = await getQuizDataFromStorage();
  return { success: true, data };
}

async function handleSaveQuizSection(sec) {
  if (!sec || !sec.name) return { success: false, message: 'Nama section wajib diisi.' };
  const store = await getQuizDataFromStorage();
  const id = sec.id || `sec-${Date.now()}`;
  const idx = store.sections.findIndex(s => s.id === id);
  const newSec = {
    id,
    name: String(sec.name).trim(),
    description: String(sec.description || '').trim()
  };
  if (idx >= 0) {
    store.sections[idx] = newSec;
  } else {
    store.sections.push(newSec);
  }
  await saveQuizDataToStorage(store);
  return { success: true, section: newSec, data: store };
}

async function handleDeleteQuizSection(secId) {
  const store = await getQuizDataFromStorage();
  store.sections = store.sections.filter(s => s.id !== secId);
  store.questions = store.questions.filter(q => q.section_id !== secId);
  store.quizzes = store.quizzes.filter(q => q.section_id !== secId);
  await saveQuizDataToStorage(store);
  return { success: true, data: store };
}

async function handleSaveQuizQuestion(payload) {
  const store = await getQuizDataFromStorage();
  const items = Array.isArray(payload) ? payload : [payload];
  let addedCount = 0;

  items.forEach(q => {
    if (!q || !q.question || !q.section_id) return;
    const qId = q.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newQ = {
      id: qId,
      section_id: q.section_id,
      question: String(q.question).trim(),
      options: {
        A: String(q.options?.A || q.optionA || '').trim(),
        B: String(q.options?.B || q.optionB || '').trim(),
        C: String(q.options?.C || q.optionC || '').trim(),
        D: String(q.options?.D || q.optionD || '').trim()
      },
      correct_answer: String(q.correct_answer || q.kunci || 'A').toUpperCase().trim()
    };
    const idx = store.questions.findIndex(x => x.id === qId);
    if (idx >= 0) {
      store.questions[idx] = newQ;
    } else {
      store.questions.push(newQ);
    }
    addedCount++;
  });

  await saveQuizDataToStorage(store);
  return { success: true, count: addedCount, data: store };
}

async function handleDeleteQuizQuestion(qId) {
  const store = await getQuizDataFromStorage();
  store.questions = store.questions.filter(q => q.id !== qId);
  await saveQuizDataToStorage(store);
  return { success: true, data: store };
}

async function handleSaveQuizSchedule(quiz) {
  if (!quiz || !quiz.title || !quiz.section_id) {
    return { success: false, message: 'Judul dan Section wajib dipilih.' };
  }
  const store = await getQuizDataFromStorage();
  const id = quiz.id || `quiz-${Date.now()}`;
  const newQuiz = {
    id,
    title: String(quiz.title).trim(),
    section_id: quiz.section_id,
    kelas_level: parseInt(quiz.kelas_level) || 1,
    start_time: quiz.start_time,
    end_time: quiz.end_time,
    duration_minutes: parseInt(quiz.duration_minutes) || 45,
    kkm: parseInt(quiz.kkm) || 75,
    participants: Array.isArray(quiz.participants) ? quiz.participants : [],
    status: quiz.status || 'scheduled',
    created_at: quiz.created_at || new Date().toISOString()
  };

  const idx = store.quizzes.findIndex(q => q.id === id);
  if (idx >= 0) {
    store.quizzes[idx] = newQuiz;
  } else {
    store.quizzes.push(newQuiz);
  }
  await saveQuizDataToStorage(store);
  return { success: true, quiz: newQuiz, data: store };
}

async function handleDeleteQuizSchedule(quizId) {
  const store = await getQuizDataFromStorage();
  store.quizzes = store.quizzes.filter(q => q.id !== quizId);
  await saveQuizDataToStorage(store);
  return { success: true, data: store };
}

async function handleSubmitQuizAnswer(payload) {
  const { quiz_id, noreg, nama, answers } = payload;
  const store = await getQuizDataFromStorage();
  const quiz = store.quizzes.find(q => q.id === quiz_id);
  if (!quiz) return { success: false, message: 'Quiz tidak ditemukan.' };

  const questions = store.questions.filter(q => q.section_id === quiz.section_id);
  if (questions.length === 0) return { success: false, message: 'Tidak ada soal dalam kuis ini.' };

  let correctCount = 0;
  questions.forEach(q => {
    const userAns = String(answers[q.id] || '').toUpperCase().trim();
    if (userAns === String(q.correct_answer).toUpperCase().trim()) {
      correctCount++;
    }
  });

  const score = Math.round((correctCount / questions.length) * 1000) / 10;
  const kkm = quiz.kkm || 75;

  const prevSubs = store.submissions.filter(s => s.quiz_id === quiz_id && String(s.noreg) === String(noreg));
  const attempt = prevSubs.length + 1;
  const isRemedial = attempt > 1;

  const newSub = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    quiz_id,
    noreg: String(noreg).trim(),
    nama: String(nama).trim(),
    kelas_level: quiz.kelas_level || 1,
    section_name: (store.sections.find(s => s.id === quiz.section_id)?.name) || 'Teori',
    attempt,
    score,
    correct_count: correctCount,
    total_questions: questions.length,
    is_remedial: isRemedial,
    remedial_granted: false,
    submitted_at: new Date().toISOString()
  };

  store.submissions.push(newSub);
  await saveQuizDataToStorage(store);

  return {
    success: true,
    score,
    correctCount,
    totalQuestions: questions.length,
    kkm,
    isPassed: score >= kkm,
    attempt
  };
}

async function handleGrantQuizRemedial(payload) {
  const { quiz_id, noreg } = payload;
  const store = await getQuizDataFromStorage();
  let updated = false;
  for (let i = store.submissions.length - 1; i >= 0; i--) {
    const sub = store.submissions[i];
    if (sub.quiz_id === quiz_id && String(sub.noreg) === String(noreg)) {
      sub.remedial_granted = true;
      updated = true;
      break;
    }
  }
  await saveQuizDataToStorage(store);
  return { success: true, updated };
}

// Helper konversi datetime string WIB ke objek Date yang valid lintas timezone server (Vercel UTC)
function parseWibDate(dtStr) {
  if (!dtStr) return null;
  let str = String(dtStr).trim();
  if (!str) return null;
  if (!str.includes('Z') && !str.match(/[+-]\d{2}(:\d{2})?$/)) {
    if (str.length === 16) {
      str += ':00+07:00';
    } else if (str.length === 19) {
      str += '+07:00';
    } else if (str.length === 10) {
      str += 'T00:00:00+07:00';
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function handleGetStudentActiveQuizzes(noreg) {
  const cleanNoreg = String(noreg || '').trim().toUpperCase();
  const store = await getQuizDataFromStorage();
  const now = new Date();

  const available = [];
  store.quizzes.forEach(quiz => {
    const rawParticipants = Array.isArray(quiz.participants) ? quiz.participants : [];
    const participants = rawParticipants.map(p => String(p).trim().toUpperCase()).filter(p => p.length > 0);
    const isParticipant = participants.length === 0 || participants.includes(cleanNoreg);
    if (!isParticipant) return;

    const subs = store.submissions.filter(s => s.quiz_id === quiz.id && String(s.noreg) === cleanNoreg);
    const hasSubmitted = subs.length > 0;
    const lastSub = hasSubmitted ? subs[subs.length - 1] : null;
    const remedialGranted = lastSub ? !!lastSub.remedial_granted : false;

    const start = parseWibDate(quiz.start_time);
    const end = parseWibDate(quiz.end_time);
    // Beri toleransi 1 menit (60000ms) untuk mencegah delay clock antar client dan server
    const isTimeActive = (!start || now.getTime() >= (start.getTime() - 60000)) && (!end || now <= end);
    const isManuallyActive = quiz.status === 'active';

    if (!isTimeActive && !isManuallyActive && !remedialGranted) return;

    const canTake = !hasSubmitted || remedialGranted;
    const qCount = store.questions.filter(q => q.section_id === quiz.section_id).length;

    available.push({
      id: quiz.id,
      title: quiz.title,
      section_id: quiz.section_id,
      section_name: (store.sections.find(s => s.id === quiz.section_id)?.name) || 'Teori',
      kelas_level: quiz.kelas_level,
      duration_minutes: quiz.duration_minutes,
      kkm: quiz.kkm || 75,
      total_questions: qCount,
      start_time: quiz.start_time,
      end_time: quiz.end_time,
      has_submitted: hasSubmitted,
      remedial_granted: remedialGranted,
      last_score: lastSub ? lastSub.score : null,
      can_take: canTake,
      attempt: subs.length + (canTake && hasSubmitted ? 1 : 0)
    });
  });

  return { success: true, data: available };
}

async function handleSyncQuizToCertificate(noreg) {
  const cleanNoreg = String(noreg || '').trim();
  const store = await getQuizDataFromStorage();

  const studentSubs = store.submissions.filter(s => String(s.noreg) === cleanNoreg);
  if (studentSubs.length === 0) {
    return { success: false, message: 'Belum ada riwayat nilai quiz untuk siswa ini.' };
  }

  // Nilai tertinggi per tingkat kelas
  const classScores = {};
  studentSubs.forEach(s => {
    const lvl = s.kelas_level || 1;
    if (classScores[lvl] === undefined || s.score > classScores[lvl]) {
      classScores[lvl] = s.score;
    }
  });

  const levels = Object.keys(classScores);
  if (levels.length === 0) {
    return { success: false, message: 'Nilai quiz tidak valid.' };
  }

  const sum = levels.reduce((acc, lvl) => acc + classScores[lvl], 0);
  const avgTheory = Math.round((sum / levels.length) * 10) / 10;

  const certStore = readLocalCertStorage();
  if (!certStore[cleanNoreg]) {
    certStore[cleanNoreg] = { noreg: cleanNoreg };
  }
  certStore[cleanNoreg].basic_theory = avgTheory;
  certStore[cleanNoreg].updated_at = new Date().toISOString();
  writeLocalCertStorage(certStore);

  // Jika fungsi penyimpanan sertifikat Supabase ada, sinkronkan juga
  try {
    await saveSertifikatToSupabase(certStore[cleanNoreg]);
  } catch (syncErr) {
    console.warn('[handleSyncQuizToCertificate] Sync notice:', syncErr.message);
  }

  return {
    success: true,
    basic_theory: avgTheory,
    breakdown: classScores,
    message: `Nilai Basic Theory ${avgTheory} berhasil disinkronkan ke sertifikat!`
  };
}

// HELPER PAGINASI UNTUK MENGAMBIL SELURUH BARIS DATA TANPA BATASAN 1000 ROWS SUPABASE
async function fetchAllRowsFromSupabase(tableName) {
  let allData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + step - 1);
    if (error || !data || data.length === 0) break;
    allData.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return allData;
}

// FUNGSI UTAMA UNTUK MENGAMBIL STATS DARI SUPABASE
async function getStatsFromSupabase() {
  const siswa = await fetchAllRowsFromSupabase('siswa');
  const mLogs = await fetchAllRowsFromSupabase('manpower_log');
  const turnover = await fetchAllRowsFromSupabase('turnover');
  const keuangan = await fetchAllRowsFromSupabase('keuangan');
  const cost = await fetchAllRowsFromSupabase('cost');
  const absensi = await fetchAllRowsFromSupabase('absensi');
  const populasi = await fetchAllRowsFromSupabase('populasi');

  let safetyRecords = [];
  try {
    const safety = await fetchAllRowsFromSupabase('safety_log');
    safetyRecords = (safety || []).map(s => ({
      id: s.id,
      noreg: s.noreg,
      nama: s.nama,
      kelas: s.kelas,
      bagian: s.bagian,
      spv: s.spv,
      jenisKecelakaan: s.jenis_kecelakaan,
      kategori: s.kategori,
      tanggal: s.tanggal,
      keterangan: s.keterangan
    }));
  } catch (err) {
    console.warn('tabel safety_log belum dibuat:', err?.message);
  }

  const logsByStudent = {};
  mLogs?.forEach(log => {
    if (!logsByStudent[log.noreg]) logsByStudent[log.noreg] = [];
    
    let rawDate = log.tanggal_record || '';
    if (rawDate && rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    logsByStudent[log.noreg].push({
      dateStr: rawDate,
      plan: log.plan,
      actual: log.aktual,
      reject: log.reject,
      percent: log.persentase !== null ? parseFloat(log.persentase) : null,
      hadir: log.hadir,
      keterangan: log.keterangan,
      shift: log.shift,
      bagian: log.bagian,
      nomor_mesin: log.nomor_mesin,
      model: log.model,
      nama_spv: log.nama_spv
    });
  });

  function computeKelasFromMasuk(masukStr, targetDateStr) {
    if (!masukStr) return 'Kelas 1';
    const start = new Date(masukStr);
    if (isNaN(start.getTime())) return 'Kelas 1';
    let end = targetDateStr ? new Date(targetDateStr) : new Date();
    if (isNaN(end.getTime())) end = new Date();
    let bulan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) bulan--;
    if (bulan < 0) bulan = 0;
    let num = bulan + 1;
    if (num > 5) num = 5;
    return `Kelas ${num}`;
  }

  const siswaList = (siswa || []).map(s => {
    const daily = logsByStudent[s.noreg] || [];
    const hasHadir = daily.some(r => r.hadir !== "");
    const computedKelas = computeKelasFromMasuk(s.tanggal_masuk, s.status === 'TURNOVER' ? s.tanggal_keluar : null);
    return {
      id: s.noreg,
      namaLengkap: s.nama_lengkap,
      nama: s.nama_lengkap,
      kelas: computedKelas,
      departemen: s.departemen,
      bagian: s.departemen || '', // compatibility fallback
      section: s.section || '',
      hk: s.hk || '',
      hariKerja: s.hk || '',
      spv: s.nama_spv || '',
      masuk: s.tanggal_masuk,
      keluar: s.tanggal_keluar,
      tanggalKeluar: s.tanggal_keluar,
      asalDaerah: s.asal_daerah || '',
      daerahAsal: s.asal_daerah || '',
      asal: s.asal_daerah || '',
      asalSekolah: s.asal_sekolah || '',
      sekolah: s.asal_sekolah || '',
      tempatLahir: s.tempat_lahir || '',
      tanggalLahir: s.tanggal_lahir || '',
      tglLahir: s.tanggal_lahir || '',
      alamat: s.alamat || s.alamat_lengkap || '',
      telepon: s.telepon || s.no_telp || s.noTelp || s.hp || '',
      noTelp: s.telepon || s.no_telp || s.noTelp || s.hp || '',
      distribusi: s.distribusi || '',
      status: s.status === 'TURNOVER' ? "Terminasi" : "Aktif",
      dailyRecords: daily,
      perfLabel: hasHadir ? "Hadir" : "Plan"
    };
  });

  // Ensure TEST-001 test student is always present for testing simulation
  if (!siswaList.some(s => s.id === 'TEST-001')) {
    siswaList.push({
      id: 'TEST-001',
      namaLengkap: 'SISWA TESTING (SIMULASI)',
      nama: 'SISWA TESTING (SIMULASI)',
      kelas: 'Kelas 4',
      departemen: 'PRODUKSI',
      bagian: 'PRODUKSI',
      section: 'GRINDING',
      hk: '6 HARI',
      hariKerja: '6 HARI',
      spv: "MOHAMMAT YASIR MA'ARIF",
      masuk: '2026-05-01',
      keluar: null,
      tanggalKeluar: null,
      asalDaerah: 'SURABAYA',
      daerahAsal: 'SURABAYA',
      asal: 'SURABAYA',
      asalSekolah: 'SMK TESTING',
      sekolah: 'SMK TESTING',
      distribusi: '2026-08-01',
      status: 'Aktif',
      dailyRecords: logsByStudent['TEST-001'] || [],
      perfLabel: 'Hadir'
    });
  }

  function computeTurnoverKelas(masukStr, targetDateStr) {
    return computeKelasFromMasuk(masukStr, targetDateStr);
  }

  const totalSiswa = siswaList.filter(s => s.status === "Aktif").length;
  
  // Proteksi deduplikasi: pastikan setiap noreg hanya memiliki 1 catatan turnover unik (ambil yang terbaru)
  const seenTurnoverNoreg = new Set();
  const sortedTurnover = [...(turnover || [])].sort((a, b) => (b.id || 0) - (a.id || 0));
  const uniqueTurnover = [];
  for (const t of sortedTurnover) {
    const key = String(t.noreg || '').trim();
    if (!key || seenTurnoverNoreg.has(key)) continue;
    seenTurnoverNoreg.add(key);
    uniqueTurnover.push(t);
  }

  const turnoverList = uniqueTurnover.map(t => {
    const student = siswaList.find(s => s.id === t.noreg);
    const masukDate = t.tanggal_masuk || (student ? student.masuk : null);
    const keluarDate = t.tanggal_keluar || (student ? student.keluar : null);
    const kelasVal = computeTurnoverKelas(masukDate, keluarDate);

    return {
      id: t.noreg,
      nama: t.nama_lengkap ? t.nama_lengkap.toUpperCase() : (student ? student.namaLengkap : ''),
      namaLengkap: t.nama_lengkap ? t.nama_lengkap.toUpperCase() : (student ? student.namaLengkap : ''),
      bagian: t.section ? t.section.toUpperCase() : (t.departemen ? t.departemen.toUpperCase() : (student ? (student.section || student.departemen) : '')),
      departemen: t.departemen || (student ? student.departemen : ''),
      section: t.section || (student ? student.section : ''),
      kelas: kelasVal,
      masuk: masukDate,
      keluar: keluarDate,
      tanggalKeluar: keluarDate,
      pengganti: t.pengganti,
      keterangan: t.keterangan ? t.keterangan.toUpperCase() : '',
      alasan: t.alasan ? t.alasan.toUpperCase() : '',
      asal: t.asal_daerah ? t.asal_daerah.toUpperCase() : (student ? student.asalDaerah : ''),
      wilayah: t.asal_daerah ? t.asal_daerah.toUpperCase() : (student ? student.asalDaerah : ''),
      asalDaerah: t.asal_daerah ? t.asal_daerah.toUpperCase() : (student ? student.asalDaerah : ''),
      sekolah: t.asal_sekolah ? t.asal_sekolah.toUpperCase() : (student ? student.asalSekolah : ''),
      asalSekolah: t.asal_sekolah ? t.asal_sekolah.toUpperCase() : (student ? student.asalSekolah : ''),
      tempatLahir: t.tempat_lahir || (student ? student.tempatLahir : ''),
      tanggalLahir: t.tanggal_lahir || (student ? student.tanggalLahir : ''),
      alamat: t.alamat || (student ? student.alamat : ''),
      telepon: t.telepon || t.no_telp || (student ? (student.telepon || student.noTelp) : ''),
      noTelp: t.telepon || t.no_telp || (student ? (student.telepon || student.noTelp) : '')
    };
  });

  let graduates = 0, resignVal = 0, indisVal = 0;
  turnoverList.forEach(t => {
    const statusStr = String(t.alasan || t.alasanDetail || t.alasan_detail || t.keterangan || '').toLowerCase();
    if (statusStr.includes("lulus")) graduates++;
    else if (statusStr.includes("resign")) resignVal++;
    else if (statusStr.includes("indisipliner") || statusStr.includes("indisiplin")) indisVal++;
  });

  let income = 0, expense = 0;
  const financeRecords = (keuangan || []).map(f => {
    const amt = parseFloat(f.jumlah);
    if (f.tipe === 'Pemasukan') income += amt;
    else expense += amt;
    return { id: f.trans_id, tipe: f.tipe, kat: f.kategori, jumlah: amt, tanggal: f.tanggal, ket: f.keterangan };
  });

  const absensiRecords = (absensi || []).map((a, index) => {
    const isOff = a.status === 'Off' || a.status === 'Libur' || 
                  (a.keterangan && (a.keterangan.toUpperCase().includes('OFF') || a.keterangan.toUpperCase().includes('LIBUR')));
    return {
      rowIndex: index + 2,
      id: a.id,
      tanggal: a.tanggal,
      noreg: a.noreg,
      nama: siswaList.find(s => s.id === a.noreg)?.nama || '',
      status: isOff ? 'Off' : a.status,
      keterangan: a.keterangan
    };
  });

  return {
    success: true,
    version: "v6.3-supabase",
    lastSyncAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    siswa: siswaList,
    turnover: turnoverList,
    cards: {
      totalSiswa,
      siswaBaru: siswaList.filter(s => s.status === "Aktif" && new Date(s.masuk) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
      lulus: graduates,
      turnoverDetails: { resign: resignVal, lulus: graduates, indisipliner: indisVal }
    },
    finance: { income, expense, balance: income - expense },
    recent: financeRecords,
    costRates: (cost || []).map(c => ({ kelas: c.keterangan, uangSaku: parseFloat(c.uang_saku), transport: parseFloat(c.transport) })),
    absensi: absensiRecords,
    safety: safetyRecords,
    populasi: (populasi || []).map(p => ({
      tanggal: p.tanggal,
      kontrak: p.karyawan_kontrak,
      ltc: p.ltc,
      outsourcing: p.outsourcing,
      satpamSupir: p.satpam_supir,
      totalKaryawan: p.total_karyawan,
      totalLtc: p.total_ltc,
      order: p.no_order !== undefined && p.no_order !== null ? p.no_order : (p.order_val !== undefined && p.order_val !== null ? p.order_val : (p.order !== undefined && p.order !== null ? p.order : null))
    })),
    monthYear: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
  };
}

async function getStudentLogsFromSupabase(noreg) {
  const { data: logs } = await supabase.from('manpower_log').select('*').eq('noreg', noreg).order('tanggal_record', { ascending: false });
  const { data: absensi } = await supabase.from('absensi').select('*').eq('noreg', noreg).order('tanggal', { ascending: false });
  return {
    success: true,
    logs: (logs || []).map(log => ({
      dateStr: log.tanggal_record,
      plan: log.plan,
      actual: log.aktual,
      reject: log.reject,
      percent: log.persentase !== null ? parseFloat(log.persentase) : null,
      hadir: log.hadir,
      keterangan: log.keterangan,
      shift: log.shift || '',
      bagian: log.bagian || '',
      nomorMesin: log.nomor_mesin || '',
      model: log.model || '',
      namaSpv: log.nama_spv || ''
    })),
    absensi: (absensi || []).map(a => {
      const isOff = a.status === 'Off' || a.status === 'Libur' || 
                    (a.keterangan && (a.keterangan.toUpperCase().includes('OFF') || a.keterangan.toUpperCase().includes('LIBUR')));
      return {
        tanggal: a.tanggal,
        status: isOff ? 'Off' : a.status,
        keterangan: a.keterangan || ''
      };
    }),
    perfLabel: "Plan"
  };
}

async function handleLogin(username, password) {
  // Login dengan lookup noreg/email
  let targetEmail = typeof username === 'string' ? username.trim() : '';
  const isEmail = targetEmail.includes('@');

  if (!isEmail && targetEmail) {
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .ilike('noreg', targetEmail)
      .maybeSingle();
    
    if (profile && profile.email) {
      targetEmail = profile.email;
    } else {
      targetEmail = `${targetEmail.toLowerCase()}@indoprima.com`;
    }
  }

  // Gunakan authClient terpisah agar TIDAK mengotori sesi admin service_role!
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Coba login langsung terlebih dahulu (99% kasus akan langsung sukses)
  let { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
    email: targetEmail,
    password: password
  });

  // 2. Jika gagal dan merupakan user default, jalankan auto-seeded (Self-Healing)
  if (authErr && (
    (targetEmail === 'admin@indoprima.com' && password === 'admin123') ||
    (targetEmail === 'visitor@indoprima.com' && password === 'visitor123') ||
    ((targetEmail === 'student@indoprima.com' || targetEmail === 'student@indoprima.com') && password === 'student123') ||
    (targetEmail === '2601176' && password === 'siswa123') ||
    ((targetEmail === 'test@indoprima.com' || (typeof targetEmail === 'string' && targetEmail.toUpperCase() === 'TEST-001')) && 
     (password === 'testing123' || password === 'test123' || (typeof password === 'string' && password.toUpperCase() === 'TEST-001IPG')))
  )) {
    console.log(`[Self-Healing RPC] Memicu auto-seed untuk user default: ${targetEmail}`);

    if (targetEmail === 'admin@indoprima.com' && password === 'admin123') {
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users?.find(u => u.email === 'admin@indoprima.com');
      let authId = existing?.id;
      if (!existing) {
        const { data: newAuth } = await supabase.auth.admin.createUser({
          email: 'admin@indoprima.com',
          password: 'admin123',
          email_confirm: true,
          user_metadata: { role: 'ADMIN', name: 'Admin Utama' }
        });
        if (newAuth?.user) authId = newAuth.user.id;
      }
      if (authId) {
        const { data: dbProfile } = await supabase.from('users').select('id').eq('id', authId).single();
        if (!dbProfile) {
          await supabase.from('users').insert({
            id: authId,
            email: 'admin@indoprima.com',
            nama_lengkap: 'Admin Utama',
            role: 'ADMIN'
          });
        }
      }
    } else if (targetEmail === 'visitor@indoprima.com' && password === 'visitor123') {
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users?.find(u => u.email === 'visitor@indoprima.com');
      let authId = existing?.id;
      if (!existing) {
        const { data: newAuth } = await supabase.auth.admin.createUser({
          email: 'visitor@indoprima.com',
          password: 'visitor123',
          email_confirm: true,
          user_metadata: { role: 'VISITOR', name: 'Visitor Dashboard' }
        });
        if (newAuth?.user) authId = newAuth.user.id;
      }
      if (authId) {
        const { data: dbProfile } = await supabase.from('users').select('id').eq('id', authId).single();
        if (!dbProfile) {
          await supabase.from('users').insert({
            id: authId,
            email: 'visitor@indoprima.com',
            nama_lengkap: 'Visitor Dashboard',
            role: 'VISITOR'
          });
        }
      }
    } else if ((targetEmail === 'student@indoprima.com' || targetEmail === '2601176') && (password === 'student123' || password === 'siswa123')) {
      targetEmail = 'student@indoprima.com';
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users?.find(u => u.email === 'student@indoprima.com');
      let authId = existing?.id;
      if (!existing) {
        const { data: newAuth } = await supabase.auth.admin.createUser({
          email: 'student@indoprima.com',
          password: 'student123',
          email_confirm: true,
          user_metadata: { role: 'SISWA', name: 'Ahmad Subarjo' }
        });
        if (newAuth?.user) authId = newAuth.user.id;
      }
      if (authId) {
        const { data: dbProfile } = await supabase.from('users').select('id').eq('id', authId).single();
        if (!dbProfile) {
          await supabase.from('users').insert({
            id: authId,
            noreg: '2601176',
            email: 'student@indoprima.com',
            nama_lengkap: 'Ahmad Subarjo',
            role: 'SISWA'
          });
        }
      }
    } else if ((targetEmail === 'test@indoprima.com' || (typeof targetEmail === 'string' && targetEmail.toUpperCase() === 'TEST-001')) && 
               (password === 'testing123' || password === 'test123' || (typeof password === 'string' && password.toUpperCase() === 'TEST-001IPG'))) {
      targetEmail = 'test@indoprima.com';
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users?.find(u => u.email === 'test@indoprima.com');
      let authId = existing?.id;
      if (!existing) {
        const { data: newAuth } = await supabase.auth.admin.createUser({
          email: 'test@indoprima.com',
          password: password,
          email_confirm: true,
          user_metadata: { role: 'SISWA', name: 'SISWA TESTING (SIMULASI)' }
        });
        if (newAuth?.user) authId = newAuth.user.id;
      } else {
        await supabase.auth.admin.updateUserById(authId, { password: password });
      }
      if (authId) {
        const { data: dbProfile } = await supabase.from('users').select('id').eq('id', authId).single();
        if (!dbProfile) {
          await supabase.from('users').insert({
            id: authId,
            noreg: 'TEST-001',
            email: 'test@indoprima.com',
            nama_lengkap: 'SISWA TESTING (SIMULASI)',
            role: 'SISWA'
          });
        }
      }
    }

    // Coba login ulang setelah seeding
    const retryResult = await authClient.auth.signInWithPassword({
      email: targetEmail,
      password: password
    });
    authData = retryResult.data;
    authErr = retryResult.error;
  }

  if (authErr || !authData?.user) {
    return { success: false, message: 'Kredensial tidak ditemukan atau password salah.' };
  }

  const { data: user } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
  if (user) {
    const rawRole = user.role || 'Visitor';
    const normalizedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    
    let studentDetails = {};
    if (normalizedRole === 'Siswa' && user.noreg) {
      try {
        const { data: s } = await supabase.from('siswa').select('kelas,tanggal_masuk,tanggal_keluar,section,departemen,nama_spv').eq('noreg', user.noreg).maybeSingle();
        if (s) {
          studentDetails = {
            kelas: s.kelas || 'Kelas 1',
            masuk: s.tanggal_masuk || '2026-05-01',
            tanggalMasuk: s.tanggal_masuk || '2026-05-01',
            keluar: s.tanggal_keluar || null,
            tanggalKeluar: s.tanggal_keluar || null,
            section: s.section || 'GRINDING',
            departemen: s.departemen || 'PRODUKSI',
            spv: s.nama_spv || "MOHAMMAT YASIR MA'ARIF"
          };
        }
      } catch (err) {
        console.warn('Error fetching student profile:', err.message);
      }

      if (user.noreg === 'TEST-001' && !studentDetails.masuk) {
        studentDetails = {
          kelas: 'Kelas 1',
          masuk: '2026-05-01',
          tanggalMasuk: '2026-05-01',
          keluar: null,
          tanggalKeluar: null,
          section: 'GRINDING',
          departemen: 'PRODUKSI',
          spv: "MOHAMMAT YASIR MA'ARIF"
        };
      }
    }

    return { 
      success: true, 
      session: authData.session,
      user: { 
        namaLengkap: user.nama_lengkap, 
        role: normalizedRole, 
        nomorRegistrasi: user.noreg || '',
        noreg: user.noreg || '',
        ...studentDetails
      } 
    };
  }
  return { success: false, message: 'Kredensial profil tidak ditemukan.' };
}

// HELPER USER MANAGEMENT DI SUPABASE
async function getUsersListFromSupabase() {
  try {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (users || []).map(u => {
      const rawRole = u.role || 'Siswa';
      const normalizedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
      let passwordHint = '-';
      if (normalizedRole === 'Siswa' && u.noreg) passwordHint = `${u.noreg}IPG`;
      else if (normalizedRole === 'Admin') passwordHint = 'admin123';
      else if (normalizedRole === 'Visitor') passwordHint = 'visitor123';

      return {
        id: u.id ? String(u.id) : '',
        namaLengkap: u.nama_lengkap || '',
        email: u.email || '',
        role: normalizedRole,
        nomorRegistrasi: u.noreg || '',
        password: passwordHint
      };
    });
  } catch (error) {
    console.error('Error fetching users from Supabase:', error);
    return [];
  }
}

async function createUserInSupabase(u) {
  try {
    const email = u.email || (u.nomorRegistrasi ? `${u.nomorRegistrasi}@indoprima.com` : '');
    const password = u.password || (u.nomorRegistrasi ? `${u.nomorRegistrasi}IPG` : 'default123');

    let authId;
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role: u.role ? u.role.toUpperCase() : 'SISWA', name: u.namaLengkap ? u.namaLengkap.toUpperCase() : '' }
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const existing = usersList?.users?.find(usr => usr.email === email);
        if (existing) {
          authId = existing.id;
        } else {
          throw authErr;
        }
      } else {
        throw authErr;
      }
    } else {
      authId = authUser.user.id;
    }

    // Simpan di public.users
    const { error: userDbErr } = await supabase.from('users').upsert({
      id: authId,
      nama_lengkap: u.namaLengkap ? u.namaLengkap.toUpperCase() : '',
      email: email,
      role: u.role ? u.role.toUpperCase() : 'SISWA',
      noreg: u.nomorRegistrasi || null
    });

    if (userDbErr) throw userDbErr;

    return { success: true };
  } catch (error) {
    console.error('Error creating user in Supabase:', error);
    return { success: false, message: error.message };
  }
}

async function updateUserInSupabase(u) {
  try {
    const newNoReg = u.nomorRegistrasi ? u.nomorRegistrasi.trim() : null;
    const newName = u.namaLengkap ? u.namaLengkap.toUpperCase().trim() : '';

    // Ambil data profil lama sebelum update
    const { data: oldUser } = await supabase.from('users').select('*').eq('id', u.id).single();
    const oldNoReg = oldUser?.noreg;

    const updateData = {
      nama_lengkap: newName,
      email: u.email,
      role: u.role ? u.role.toUpperCase() : 'SISWA',
      noreg: newNoReg
    };

    const { error } = await supabase.from('users').update(updateData).eq('id', u.id);
    if (error) throw error;

    // Update Auth Supabase (Email & Password)
    const authUpdate = {};
    if (u.email) authUpdate.email = u.email;
    if (u.password) authUpdate.password = u.password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: passErr } = await supabase.auth.admin.updateUserById(u.id, authUpdate);
      if (passErr) console.warn('Gagal memperbarui Auth user:', passErr.message);
    }

    // PENTING: Jika NoReg diubah di Manajemen Akun, sinkronkan otomatis ke tabel siswa, absensi, dan manpower_log
    if (oldNoReg && newNoReg && oldNoReg !== newNoReg) {
      await supabase.from('siswa').update({ noreg: newNoReg, nama_lengkap: newName }).eq('noreg', oldNoReg);
      await supabase.from('absensi').update({ noreg: newNoReg, nama_lengkap: newName }).eq('noreg', oldNoReg);
      await supabase.from('manpower_log').update({ noreg: newNoReg, nama_lengkap: newName }).eq('noreg', oldNoReg);
      await supabase.from('safety_log').update({ noreg: newNoReg, nama: newName }).eq('noreg', oldNoReg);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user in Supabase:', error);
    return { success: false, message: error.message };
  }
}

async function deleteUserFromSupabase(userId) {
  try {
    // Hapus dari Supabase Auth
    await supabase.auth.admin.deleteUser(userId);
    // Hapus dari public.users
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting user from Supabase:', error);
    return { success: false, message: error.message };
  }
}

// TULIS DATA KE SUPABASE LOKAL
async function handleLocalSupabaseWrite(action, args) {
  if (action === 'saveSiswa') {
    const s = args[0];
    const newNoReg = s.NoReg ? s.NoReg.trim() : '';
    const oldNoReg = s.OldNoReg ? s.OldNoReg.trim() : newNoReg;
    const nameUpper = s.NamaLengkap ? s.NamaLengkap.toUpperCase().trim() : '';

    // PENTING: Jika NoReg diubah saat Edit Informasi Siswa
    if (oldNoReg && newNoReg && oldNoReg !== newNoReg) {
      // 1. Update NoReg di tabel siswa
      const updatePayload = {
        noreg: newNoReg,
        nama_lengkap: nameUpper,
        kelas: s.Kelas,
        departemen: s.Departemen ? s.Departemen.toUpperCase() : (s.Bagian ? s.Bagian.toUpperCase() : null),
        section: s.Section ? s.Section.toUpperCase() : '',
        hk: s.HK ? s.HK.toUpperCase() : (s.HariKerja ? s.HariKerja.toUpperCase() : '6 HARI'),
        nama_spv: s.NamaSPV ? s.NamaSPV.toUpperCase() : null,
        tanggal_masuk: s.TanggalMasuk,
        tanggal_keluar: s.TanggalKeluar || null,
        asal_daerah: s.AsalDaerah ? s.AsalDaerah.toUpperCase() : null,
        asal_sekolah: s.AsalSekolah ? s.AsalSekolah.toUpperCase() : null,
        distribusi: s.Distribusi
      };
      if (s.TempatLahir !== undefined) updatePayload.tempat_lahir = s.TempatLahir ? s.TempatLahir.toUpperCase() : null;
      if (s.TanggalLahir !== undefined) updatePayload.tanggal_lahir = s.TanggalLahir || null;
      if (s.Alamat !== undefined) updatePayload.alamat = s.Alamat || null;
      if (s.Telepon !== undefined || s.NoTelp !== undefined) updatePayload.no_telp = s.Telepon || s.NoTelp || null;

      let { error: siswaErr } = await supabase.from('siswa').update(updatePayload).eq('noreg', oldNoReg);
      if (siswaErr && (siswaErr.message.includes('tanggal_lahir') || siswaErr.message.includes('tempat_lahir') || siswaErr.message.includes('alamat') || siswaErr.message.includes('no_telp'))) {
        if (siswaErr.message.includes('tempat_lahir')) delete updatePayload.tempat_lahir;
        if (siswaErr.message.includes('tanggal_lahir')) delete updatePayload.tanggal_lahir;
        if (siswaErr.message.includes('alamat')) delete updatePayload.alamat;
        if (siswaErr.message.includes('no_telp')) delete updatePayload.no_telp;
        const fbRes = await supabase.from('siswa').update(updatePayload).eq('noreg', oldNoReg);
        siswaErr = fbRes.error;
      }

      if (siswaErr) throw siswaErr;

      // 2. Cascade Update ke Manajemen Akun (public.users & Auth)
      const newEmail = `${newNoReg.toLowerCase()}@indoprima.com`;
      const newPassword = `${newNoReg}IPG`;

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('noreg', oldNoReg)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from('users')
          .update({
            noreg: newNoReg,
            email: newEmail,
            nama_lengkap: nameUpper
          })
          .eq('id', existingUser.id);

        await supabase.auth.admin.updateUserById(existingUser.id, {
          email: newEmail,
          password: newPassword
        }).catch(err => console.warn('Auth update error:', err));
      } else {
        let authId;
        const { data: newAuth } = await supabase.auth.admin.createUser({
          email: newEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { role: 'SISWA', name: nameUpper }
        }).catch(err => ({ error: err }));

        if (newAuth?.user) {
          authId = newAuth.user.id;
          await supabase.from('users').upsert({
            id: authId,
            noreg: newNoReg,
            email: newEmail,
            nama_lengkap: nameUpper,
            role: 'SISWA'
          }, { onConflict: 'id' });
        }
      }

      // 3. Cascade Update ke tabel terkait (absensi, manpower_log, safety_log)
      await supabase.from('absensi').update({ noreg: newNoReg, nama_lengkap: nameUpper }).eq('noreg', oldNoReg);
      await supabase.from('manpower_log').update({ noreg: newNoReg, nama_lengkap: nameUpper }).eq('noreg', oldNoReg);
      await supabase.from('safety_log').update({ noreg: newNoReg, nama: nameUpper }).eq('noreg', oldNoReg);

      // 4. Cascade Update file foto di storage jika ada
      try {
        const oldFile = `${oldNoReg}.jpg`;
        const newFile = `${newNoReg}.jpg`;
        const { data: downloadData } = await supabase.storage.from('foto-siswa').download(oldFile);
        if (downloadData) {
          const arrayBuf = await downloadData.arrayBuffer();
          await supabase.storage.from('foto-siswa').upload(newFile, Buffer.from(arrayBuf), { contentType: 'image/jpeg', upsert: true });
          await supabase.storage.from('foto-siswa').remove([oldFile]);
        }
      } catch (errFoto) {
        console.warn('Gagal migrasi file foto:', errFoto.message);
      }

    } else {
      // Upsert biasa jika NoReg tidak berubah atau siswa baru
      const { data: dupCheck } = await supabase
        .from('siswa')
        .select('noreg')
        .eq('nama_lengkap', nameUpper)
        .eq('status', 'AKTIF')
        .neq('noreg', newNoReg)
        .limit(1);

      if (dupCheck && dupCheck.length > 0) {
        throw new Error(`Siswa dengan nama "${nameUpper}" sudah terdaftar sebagai siswa AKTIF dengan NoReg ${dupCheck[0].noreg}!`);
      }
      
      const upsertPayload = {
        noreg: newNoReg,
        nama_lengkap: nameUpper,
        kelas: s.Kelas,
        departemen: s.Departemen ? s.Departemen.toUpperCase() : (s.Bagian ? s.Bagian.toUpperCase() : null),
        section: s.Section ? s.Section.toUpperCase() : '',
        hk: s.HK ? s.HK.toUpperCase() : (s.HariKerja ? s.HariKerja.toUpperCase() : '6 HARI'),
        nama_spv: s.NamaSPV ? s.NamaSPV.toUpperCase() : null,
        tanggal_masuk: s.TanggalMasuk,
        tanggal_keluar: s.TanggalKeluar || null,
        asal_daerah: s.AsalDaerah ? s.AsalDaerah.toUpperCase() : null,
        asal_sekolah: s.AsalSekolah ? s.AsalSekolah.toUpperCase() : null,
        distribusi: s.Distribusi,
        status: 'AKTIF'
      };
      if (s.TempatLahir !== undefined) upsertPayload.tempat_lahir = s.TempatLahir ? s.TempatLahir.toUpperCase() : null;
      if (s.TanggalLahir !== undefined) upsertPayload.tanggal_lahir = s.TanggalLahir || null;
      if (s.Alamat !== undefined) upsertPayload.alamat = s.Alamat || null;
      if (s.Telepon !== undefined || s.NoTelp !== undefined) upsertPayload.no_telp = s.Telepon || s.NoTelp || null;

      let { error: upErr } = await supabase.from('siswa').upsert(upsertPayload);
      if (upErr && (upErr.message.includes('tanggal_lahir') || upErr.message.includes('tempat_lahir') || upErr.message.includes('alamat') || upErr.message.includes('no_telp'))) {
        if (upErr.message.includes('tempat_lahir')) delete upsertPayload.tempat_lahir;
        if (upErr.message.includes('tanggal_lahir')) delete upsertPayload.tanggal_lahir;
        if (upErr.message.includes('alamat')) delete upsertPayload.alamat;
        if (upErr.message.includes('no_telp')) delete upsertPayload.no_telp;
        const fbRes = await supabase.from('siswa').upsert(upsertPayload);
        upErr = fbRes.error;
      }
      if (upErr) throw upErr;

      const { data: existingUser } = await supabase.from('users').select('id').eq('noreg', newNoReg).maybeSingle();
      if (!existingUser) {
        const email = `${newNoReg.toLowerCase()}@indoprima.com`;
        const password = `${newNoReg}IPG`;
        let authId;
        const { data: authUser } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { role: 'SISWA', name: nameUpper }
        }).catch(err => ({ error: err }));
        if (authUser?.user) {
          authId = authUser.user.id;
          await supabase.from('users').upsert({
            id: authId,
            noreg: newNoReg,
            email: email,
            nama_lengkap: nameUpper,
            role: 'SISWA'
          }, { onConflict: 'id' });
        }
      } else {
        await supabase.from('users').update({
          nama_lengkap: nameUpper
        }).eq('noreg', newNoReg);
      }
    }

  } else if (action === 'deleteSiswa') {
    const noreg = args[0];
    const alasan = args[1];
    const keterangan = args[2];
    
    const { data: student } = await supabase.from('siswa').select('*').eq('noreg', noreg).single();
    if (student) {
      // 1. Tulis ke turnover (hapus record lama jika ada untuk mencegah duplikasi)
      await supabase.from('turnover').delete().eq('noreg', student.noreg);
      await supabase.from('turnover').insert({
        noreg: student.noreg,
        nama_lengkap: student.nama_lengkap ? student.nama_lengkap.toUpperCase() : '',
        departemen: student.departemen ? student.departemen.toUpperCase() : null,
        section: student.section ? student.section.toUpperCase() : '',
        tanggal_masuk: student.tanggal_masuk,
        tanggal_keluar: new Date().toISOString().split('T')[0],
        alasan: alasan ? alasan.toUpperCase() : 'DIKELUARKAN',
        keterangan: keterangan ? keterangan.toUpperCase() : '',
        asal_daerah: student.asal_daerah ? student.asal_daerah.toUpperCase() : null,
        asal_sekolah: student.asal_sekolah ? student.asal_sekolah.toUpperCase() : null
      });

      // 2. Ubah status menjadi TURNOVER & set tanggal_keluar
      await supabase.from('siswa').update({
        status: 'TURNOVER',
        tanggal_keluar: new Date().toISOString().split('T')[0]
      }).eq('noreg', noreg);

      // 3. Nonaktifkan login siswa langsung
      const { data: profile } = await supabase.from('users').select('id').eq('noreg', noreg).single();
      if (profile?.id) {
        await supabase.auth.admin.deleteUser(profile.id);
        await supabase.from('users').delete().eq('id', profile.id);
      }
    }

  } else if (action === 'saveManpowerLog') {
    const l = args[0];
    // Ambil nama lengkap siswa dari tabel siswa berdasarkan NoReg untuk dicatat ke log
    const { data: studentData } = await supabase
      .from('siswa')
      .select('nama_lengkap')
      .eq('noreg', l.NoReg)
      .single();
    const studentName = studentData ? studentData.nama_lengkap : null;

    const planNum = Math.max(0, parseInt(String(l.Plan || 0).replace(/[^0-9]/g, ''), 10) || 0);
    const aktualNum = Math.max(0, parseInt(String(l.Aktual || 0).replace(/[^0-9]/g, ''), 10) || 0);
    const rejectNum = Math.max(0, parseInt(String(l.Reject || 0).replace(/[^0-9]/g, ''), 10) || 0);

    let persentase = null;
    if (planNum > 0) {
      persentase = (aktualNum / planNum) * 100;
    } else if (l.Persentase !== undefined && l.Persentase !== null && l.Persentase !== '') {
      persentase = parseFloat(l.Persentase);
    }

    let dbDate = l.TanggalRecord || '';
    if (dbDate && dbDate.includes('/')) {
      const parts = dbDate.split('/');
      if (parts.length === 3) {
        dbDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Jika tanggal diubah saat mode edit, bersihkan record lama pada tanggal sebelumnya
    const origDate = l.OriginalTanggalRecord || l.OldTanggal || '';
    if (origDate) {
      let origDbDate = origDate;
      if (origDate.includes('/')) {
        const p = origDate.split('/');
        if (p.length === 3) origDbDate = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      if (origDbDate && origDbDate !== dbDate) {
        let origDbDMY = origDate;
        if (origDate.includes('-')) {
          const p = origDate.split('-');
          if (p.length === 3) origDbDMY = `${p[2]}/${p[1]}/${p[0]}`;
        }
        await supabase.from('manpower_log').delete().eq('noreg', l.NoReg).or(`tanggal_record.eq.${origDbDMY},tanggal_record.eq.${origDbDate}`);
        await supabase.from('absensi').delete().eq('noreg', l.NoReg).eq('tanggal', origDbDate);
      }
    }

    await supabase.from('manpower_log').upsert({
      noreg: l.NoReg,
      nama_lengkap: studentName,
      tanggal_record: dbDate,
      plan: planNum,
      aktual: aktualNum,
      reject: rejectNum,
      persentase: persentase,
      hadir: l.Hadir ? l.Hadir.toUpperCase() : '✔',
      keterangan: l.Keterangan ? l.Keterangan.toUpperCase() : '',
      shift: l.Shift ? l.Shift.toUpperCase() : null,
      bagian: l.Bagian ? l.Bagian.toUpperCase() : null,
      nomor_mesin: l.NomorMesin ? l.NomorMesin.toUpperCase() : null,
      model: l.Model ? l.Model.toUpperCase() : null,
      nama_spv: l.NamaSPV ? l.NamaSPV.toUpperCase() : null
    }, { onConflict: 'noreg,tanggal_record' });

    // Sync directly to the absensi table for dashboard alignment
    const hadirVal = l.Hadir ? l.Hadir.toUpperCase() : '✔';
    const ketUpper = (l.Keterangan || '').toUpperCase();
    const isOff = hadirVal === 'OFF' || hadirVal === 'LIBUR' || 
                  ketUpper.includes('OFF') || ketUpper.includes('LIBUR') || 
                  ketUpper.includes('GANTI JAM') || ketUpper.includes('PINDAH SHIFT') || 
                  ketUpper.includes('PINDAH HARI') || ketUpper.includes('OVER JAM');

    let statusAbsen = 'Hadir';
    if (isOff) {
      statusAbsen = 'Ijin'; // Map 'Off' to 'Ijin' for DB check constraint, with 'OFF' in keterangan
    } else if (hadirVal === 'IJIN') {
      statusAbsen = 'Ijin';
    } else if (hadirVal === 'SAKIT') {
      statusAbsen = 'Sakit';
    } else if (hadirVal === 'ABSEN' || hadirVal === 'ALPHA') {
      statusAbsen = 'Alpha';
    }

    let ketToSave = l.Keterangan ? l.Keterangan.toUpperCase() : '';
    if (isOff && !ketToSave.includes('OFF') && !ketToSave.includes('LIBUR')) {
      ketToSave = ketToSave ? `OFF - ${ketToSave}` : 'OFF';
    }

    await supabase.from('absensi').upsert({
      noreg: l.NoReg,
      tanggal: dbDate,
      status: statusAbsen,
      keterangan: ketToSave
    }, { onConflict: 'noreg,tanggal' });

  } else if (action === 'deleteAbsensi') {
    const noreg = args[0];
    const tanggal = args[1]; // "2026-07-31" or "31/07/2026"

    let dbDateYMD = tanggal;
    let dbDateDMY = tanggal;
    if (tanggal && tanggal.includes('/')) {
      const p = tanggal.split('/');
      dbDateYMD = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    } else if (tanggal && tanggal.includes('-')) {
      const p = tanggal.split('-');
      dbDateDMY = `${p[2]}/${p[1]}/${p[0]}`;
    }

    await supabase.from('absensi').delete().eq('noreg', noreg).eq('tanggal', dbDateYMD);
    await supabase.from('manpower_log').delete().eq('noreg', noreg).or(`tanggal_record.eq.${dbDateDMY},tanggal_record.eq.${dbDateYMD}`);

  } else if (action === 'deleteManpowerLog') {
    const noreg = args[0];
    const tanggal = args[1]; // "31/07/2026" or "2026-07-31"

    let dbDateYMD = tanggal;
    let dbDateDMY = tanggal;
    if (tanggal && tanggal.includes('/')) {
      const p = tanggal.split('/');
      dbDateYMD = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    } else if (tanggal && tanggal.includes('-')) {
      const p = tanggal.split('-');
      dbDateDMY = `${p[2]}/${p[1]}/${p[0]}`;
    }

    await supabase.from('manpower_log').delete().eq('noreg', noreg).or(`tanggal_record.eq.${dbDateDMY},tanggal_record.eq.${dbDateYMD}`);
    await supabase.from('absensi').delete().eq('noreg', noreg).eq('tanggal', dbDateYMD);

  } else if (action === 'saveTransaksiKeuangan') {
    const t = args[0];
    const normalizedTipe = t.tipe && t.tipe.toLowerCase() === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    
    await supabase.from('keuangan').upsert({
      trans_id: t.transId || 'TX-' + Date.now(),
      tipe: normalizedTipe,
      kategori: t.kat ? t.kat.toUpperCase() : (t.kategori ? t.kategori.toUpperCase() : null),
      jumlah: t.jumlah,
      tanggal: t.tanggal,
      keterangan: t.ket ? t.ket.toUpperCase() : (t.keterangan ? t.keterangan.toUpperCase() : '')
    });

  } else if (action === 'deleteTransaksiKeuangan') {
    await supabase.from('keuangan').delete().eq('trans_id', args[0]);

  } else if (action === 'saveTurnoverRecord') {
    const t = args[0];
    const isEdit = !!t.isEdit;
    const editId = t.editId || t.NoReg;

    // Helper: normalize date to YYYY-MM-DD for PostgreSQL date column
    const toISODate = (val) => {
      if (!val) return null;
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      // DD/MM/YYYY format
      const parts = val.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return null;
    };

    if (isEdit && editId) {
      await supabase.from('turnover').delete().eq('noreg', editId);
    } else if (t.NoReg) {
      await supabase.from('turnover').delete().eq('noreg', t.NoReg);
    }

    const { error: insertErr } = await supabase.from('turnover').insert({
      noreg: t.NoReg,
      nama_lengkap: t.NamaLengkap ? t.NamaLengkap.toUpperCase() : '',
      departemen: t.Departemen ? t.Departemen.toUpperCase() : (t.Bagian ? t.Bagian.toUpperCase() : null),
      section: t.Section ? t.Section.toUpperCase() : (t.Bagian ? t.Bagian.toUpperCase() : ''),
      asal_daerah: t.AsalDaerah || t.Kota ? (t.AsalDaerah || t.Kota).toUpperCase() : null,
      asal_sekolah: t.AsalSekolah || t.Sekolah ? (t.AsalSekolah || t.Sekolah).toUpperCase() : null,
      tanggal_masuk: toISODate(t.TanggalMasuk),
      tanggal_keluar: toISODate(t.TanggalKeluar),
      alasan: t.Alasan ? t.Alasan.toUpperCase() : '',
      keterangan: t.Keterangan ? t.Keterangan.toUpperCase() : '',
      sync_at: new Date()
    });

    if (insertErr) {
      throw new Error(insertErr.message);
    }

  } else if (action === 'deleteTurnoverRecord') {
    await supabase.from('turnover').delete().eq('noreg', args[0]);

  } else if (action === 'saveAbsensi') {
    const a = args[0];
    const toProperStatus = (st) => {
      if (!st) return 'Hadir';
      const sLower = st.trim().toLowerCase();
      if (sLower === 'alpha') return 'Alpha';
      if (sLower === 'ijin') return 'Ijin';
      if (sLower === 'sakit') return 'Sakit';
      if (sLower === 'off' || sLower === 'libur') return 'Ijin'; // Map 'Off' to 'Ijin' for DB check constraint compatibility
      return 'Hadir';
    };

    const statusVal = toProperStatus(a.status);
    let ketVal = a.keterangan ? a.keterangan.trim().toUpperCase() : '';
    
    if (a.status === 'Off' || a.status === 'Libur') {
      if (!ketVal.includes('OFF') && !ketVal.includes('LIBUR')) {
        ketVal = ketVal ? `OFF - ${ketVal}` : 'OFF';
      }
    } else {
      if (ketVal === 'OFF' || ketVal === 'LIBUR') {
        ketVal = '';
      } else if (ketVal.startsWith('OFF - ')) {
        ketVal = ketVal.substring(6).trim();
      }
    }

    const { error: upsertErr } = await supabase.from('absensi').upsert({
      noreg: a.noreg,
      tanggal: a.tanggal,
      status: statusVal,
      keterangan: ketVal
    }, { onConflict: 'noreg,tanggal' });

    if (upsertErr) {
      console.error('Error saving absensi:', upsertErr);
      return new Response(JSON.stringify({ success: false, message: upsertErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } else if (action === 'deleteAbsensi') {
    await supabase.from('absensi').delete().eq('id', args[0]);

  } else if (action === 'saveSafetyRecord') {
    const s = args[0];
    const payload = {
      noreg: s.noreg,
      nama: s.nama,
      kelas: s.kelas,
      bagian: s.bagian,
      spv: s.spv,
      jenis_kecelakaan: s.jenisKecelakaan,
      kategori: s.kategori,
      tanggal: s.tanggal,
      keterangan: s.keterangan
    };
    if (s.id) payload.id = s.id;

    const { error: sErr } = await supabase.from('safety_log').upsert(payload);
    if (sErr) throw new Error(sErr.message);

  } else if (action === 'deleteSafetyRecord') {
    const { error: dErr } = await supabase.from('safety_log').delete().eq('id', args[0]);
    if (dErr) throw new Error(dErr.message);

  } else if (action === 'savePopulasi') {
    const p = args[0];

    const rawDate = p.tanggal;
    let cleanDate = rawDate;
    if (rawDate && typeof rawDate === 'string') {
      const partsSlash = rawDate.trim().split('/');
      if (partsSlash.length === 3) {
        if (partsSlash[0].length === 4) {
          cleanDate = `${partsSlash[0]}-${partsSlash[1].padStart(2,'0')}-${partsSlash[2].padStart(2,'0')}`;
        } else {
          cleanDate = `${partsSlash[2]}-${partsSlash[1].padStart(2,'0')}-${partsSlash[0].padStart(2,'0')}`;
        }
      }
    }

    let finalLtc = 0;
    const manualLtc = parseInt(p.ltc !== undefined ? p.ltc : p.totalLtc);
    if (!isNaN(manualLtc) && manualLtc > 0) {
      finalLtc = manualLtc;
    } else {
      // Hitung otomatis jumlah siswa aktif berdasarkan tanggal acuan
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const dateParts = cleanDate ? cleanDate.split('-') : [];
      const recYear = parseInt(dateParts[0]) || currentYear;
      const recMonth = parseInt(dateParts[1]) || currentMonth;

      const isPastMonth = (recYear < currentYear) || (recYear === currentYear && recMonth < currentMonth);

      if (isPastMonth) {
        // Untuk bulan yang sudah berlalu: acuan tanggal terakhir bulan tersebut (30/31)
        const lastDayNum = new Date(recYear, recMonth, 0).getDate();
        const lastDayStr = `${recYear}-${String(recMonth).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

        const [{ data: siswaList }, { data: turnoverList }] = await Promise.all([
          supabase.from('siswa').select('noreg, tanggal_masuk, tanggal_keluar').neq('noreg', 'TEST-001'),
          supabase.from('turnover').select('noreg, tanggal_masuk, tanggal_keluar').neq('noreg', 'TEST-001')
        ]);

        const studentsMap = new Map();
        (siswaList || []).forEach(s => {
          studentsMap.set(s.noreg, { masuk: s.tanggal_masuk, keluar: s.tanggal_keluar });
        });
        (turnoverList || []).forEach(t => {
          if (!studentsMap.has(t.noreg)) {
            studentsMap.set(t.noreg, { masuk: t.tanggal_masuk, keluar: t.tanggal_keluar });
          } else {
            const e = studentsMap.get(t.noreg);
            if (t.tanggal_keluar && !e.keluar) e.keluar = t.tanggal_keluar;
            if (t.tanggal_masuk && !e.masuk) e.masuk = t.tanggal_masuk;
          }
        });

        let activeCount = 0;
        studentsMap.forEach(s => {
          if (s.masuk && s.masuk > lastDayStr) return;
          if (s.keluar && s.keluar < lastDayStr) return;
          activeCount++;
        });
        finalLtc = activeCount;
      } else {
        // Bulan berjalan / sekarang: hitung siswa berstatus AKTIF
        const { count } = await supabase
          .from('siswa')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'AKTIF')
          .neq('noreg', 'TEST-001');
        finalLtc = count || 29;
      }
    }

    const populasiObj = {
      tanggal: cleanDate,
      karyawan_kontrak: p.kontrak,
      ltc: finalLtc,
      outsourcing: p.outsourcing,
      satpam_supir: p.satpamSupir,
      total_ltc: finalLtc
    };

    let success = false;
    if (p.order !== undefined && p.order !== null && !isNaN(p.order)) {
      const res1 = await supabase.from('populasi').upsert({
        ...populasiObj,
        no_order: p.order
      }, { onConflict: 'tanggal' });

      if (!res1.error) {
        success = true;
      } else {
        const res2 = await supabase.from('populasi').upsert({
          ...populasiObj,
          order_val: p.order
        }, { onConflict: 'tanggal' });

        if (!res2.error) {
          success = true;
        } else {
          const res3 = await supabase.from('populasi').upsert({
            ...populasiObj,
            order: p.order
          }, { onConflict: 'tanggal' });

          if (!res3.error) {
            success = true;
          }
        }
      }
    }

    if (!success) {
      const { error: fallbackErr } = await supabase.from('populasi').upsert(populasiObj, { onConflict: 'tanggal' });
      if (fallbackErr) {
        throw new Error(fallbackErr.message);
      }
    }

  } else if (action === 'deletePopulasi') {
    await supabase.from('populasi').delete().eq('tanggal', args[0]);
  }
}
