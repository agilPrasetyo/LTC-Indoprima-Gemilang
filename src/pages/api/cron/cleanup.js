import { supabase } from '../../../lib/supabase';

export const GET = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const apiKeyHeader = request.headers.get('x-api-key') || '';
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const secretKey = import.meta.env.CRON_SECRET || 'IndoprimaCronSecret2026';

    // Verifikasi kunci pengaman API Key
    if (token !== secretKey && apiKeyHeader !== secretKey) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized. API Key salah atau tidak disertakan.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Panggil fungsi database cleanup_old_turnover_logs
    const { data, error } = await supabase.rpc('cleanup_old_turnover_logs');

    if (error) {
      console.error('Error running RPC cleanup_old_turnover_logs:', error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: 'Pembersihan terjadwal data turnover LTC berhasil dijalankan.', result: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error in cron cleanup API:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
