import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: emballage, count: emballageCount } = await supabase
    .from('production_emballage')
    .select('*', { count: 'exact', head: true });
    
  const { data: journalier, count: journalierCount } = await supabase
    .from('production_journalier')
    .select('*', { count: 'exact', head: true });

  console.log(`production_emballage count: ${emballageCount}`);
  console.log(`production_journalier count: ${journalierCount}`);
}

run();
