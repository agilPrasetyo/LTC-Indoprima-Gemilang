import { createClient } from "@supabase/supabase-js";
var supabase = createClient("https://xpoddtzxsopwzojycmwx.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwb2RkdHp4c29wd3pvanljbXd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY4MTIxMSwiZXhwIjoyMDk5MjU3MjExfQ.JLUA8DnaCpIYmdgCb7990yBKgKXQ0uJveZ8hd2893Mo", { auth: {
	autoRefreshToken: false,
	persistSession: false
} });
//#endregion
export { supabase as t };
