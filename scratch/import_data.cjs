const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');

// IMPORTANT: Replace with your actual table name and file path
const TABLE_NAME = 'your_table_name_here';
const FILE_PATH = './your_data.csv'; // can be .csv, .xlsx, .xls

// Supabase Connection (Using the URL and Key from your .env file)
// Since you provided the direct Postgres string, you *could* use the 'pg' library,
// but since @supabase/supabase-js is already installed in your project, it's easier to use this!
const SUPABASE_URL = "https://brbrlbhmwpekdipwfxci.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyYnJsYmhtd3Bla2RpcHdmeGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNjc0NTAsImV4cCI6MjA4Nzg0MzQ1MH0.u0K8GF15zbpMjbUurQDvvepOfH9IBS8ugjmJAHgk-Ys"; // (From your .env publishable key)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importData() {
  console.log(`Reading file from ${FILE_PATH}...`);
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ File not found: ${FILE_PATH}`);
    return;
  }

  // 1. Read the Excel or CSV file
  const workbook = xlsx.readFile(FILE_PATH);
  const sheetName = workbook.SheetNames[0]; // Get the first sheet
  const worksheet = workbook.Sheets[sheetName];
  
  // 2. Convert to JSON array
  // Make sure the column names in your CSV exactly match the column names in your Supabase table
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${data.length} rows to import.`);
  if (data.length === 0) {
    console.log("No data found to import.");
    return;
  }

  // 3. Upload to Supabase in batches of 1000 to avoid limits
  const BATCH_SIZE = 1000;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    console.log(`Importing batch ${i} to ${i + batch.length}...`);
    
    const { error } = await supabase
      .from(TABLE_NAME)
      .insert(batch);
      
    if (error) {
      console.error(`❌ Error importing batch:`, error.message);
      console.error(`Details:`, error);
      return;
    }
  }

  console.log(`✅ Successfully imported all ${data.length} rows to ${TABLE_NAME}!`);
}

importData().catch(console.error);
