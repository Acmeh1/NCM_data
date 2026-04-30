import { createClient } from '@supabase/supabase-client'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function checkSchema() {
  const { data, error } = await supabase
    .from('fichRH')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error(error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]))
  } else {
    console.log('No data found in fichRH')
  }
}

checkSchema()
