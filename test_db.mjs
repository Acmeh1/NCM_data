import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgobgkpeoegxhqwhvxax.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2Jna3Blb2VneGhxd2h2eGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzg5ODgsImV4cCI6MjA4ODcxNDk4OH0.3A_QOSZeNjyFSCbljCKRKryl24VNV838SQ9wgZ2PRjE'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]))
  } else {
    console.log('No data or error:', error)
  }
}
test()
