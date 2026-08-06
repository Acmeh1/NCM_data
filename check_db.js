import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('production_globale').select('*').eq('date', '2026-05-01');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}
run();
