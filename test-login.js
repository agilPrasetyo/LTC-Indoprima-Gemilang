import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const username = 'admin@indoprima.com';
  const password = 'admin123';
  
  // Test direct query
  const res1 = await supabase.from('users').select('*').eq('email', username).eq('password', password);
  console.log("Direct Email Query:", res1.data, res1.error);
  
  // Test OR query
  const res2 = await supabase.from('users').select('*').or(`email.eq.${username},noreg.eq.${username}`).eq('password', password);
  console.log("OR Query:", res2.data, res2.error);
}

test();
