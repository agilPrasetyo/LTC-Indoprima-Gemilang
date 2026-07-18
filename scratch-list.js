const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = "https://xzlmrvvtjqnhlisghgyc.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA8fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";

// Typo fixed: exp timestamp has 2099002008
const correctedKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA4fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";

const supabase = createClient(supabaseUrl, correctedKey);

async function check() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
  } else {
    console.log('USERS IN AUTH:', JSON.stringify(data.users.map(u => ({ email: u.email, id: u.id, metadata: u.user_metadata })), null, 2));
  }
}
check();
