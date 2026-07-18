import { supabase } from '../../../lib/supabase';

export const POST = async ({ cookies }) => {
  try {
    // Hapus cookies dari browser
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0
    };

    cookies.set('sb-access-token', '', cookieOptions);
    cookies.set('sb-refresh-token', '', cookieOptions);

    // Logout dari Supabase Auth
    await supabase.auth.signOut();

    return new Response(JSON.stringify({ success: true, message: 'Berhasil keluar.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error in logout API:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
