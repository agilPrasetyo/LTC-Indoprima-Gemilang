const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = "https://xzlmrvvtjqnhlisghgyc.supabase.co";
const exactEnvKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA8fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";
const correctedKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA4fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";

const supabase = createClient(supabaseUrl, correctedKey);

async function run() {
  console.log('Attempting to create admin@indoprima.com...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@indoprima.com',
    password: 'admin123',
    email_confirm: true,
    user_metadata: { role: 'ADMIN', name: 'Admin Utama' }
  });
  if (error) {
    console.error('CREATE ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}
run();
