const fs = require('fs');
const path = require('path');
const { createClient } = require('./node_modules/@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const url = envVars['PUBLIC_SUPABASE_URL'];
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(url, key);

async function checkColumns() {
  const { data, error } = await supabase
    .from('manpower_log')
    .select('*')
    .not('plan', 'is', null)
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample rows where plan is not null:', data);
  }
}

checkColumns();
