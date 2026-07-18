const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = "https://xzlmrvvtjqnhlisghgyc.supabase.co";
const correctedKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA8fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";
const exactEnvKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA8fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";
// Typo fixed
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA8fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";
const exactKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA8fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw";

const supabase = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG1ydnZ0anFuaGxpc2doZ3ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQyNjAwOCwiZXhwIjoyMDk5MDAyMDA4fQ._guoZqIhigJAOd23IVOQQwu-Y8szWvH-tsFzkp5vLyw");

async function run() {
  const { data, error } = await supabase.rpc('get_triggers');
  if (error) {
    // If no RPC, let's query via postgrest if possible (or query pg_trigger view if exposed, usually not)
    console.error('Error fetching triggers via RPC:', error);
  } else {
    console.log('TRIGGERS:', data);
  }
}
run();
