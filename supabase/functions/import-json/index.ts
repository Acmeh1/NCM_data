import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const callerUrl = body.__caller_supabase_url || Deno.env.get("SUPABASE_URL")!;
    const callerKey = body.__caller_supabase_key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(callerUrl, callerKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const tables = body.tables;
    if (!tables) throw new Error("Format invalide: 'tables' manquant");

    const results: Record<string, { inserted: number; errors: string[] }> = {};

    // Order matters for foreign keys: parent tables first
    const tableOrder = [
      "production_journalier",
      "production_emballage",
      "production_selection",
      "production_arrets_zone",
      "stats_linea",
    ];

    for (const tableName of tableOrder) {
      const rows = tables[tableName];
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        results[tableName] = { inserted: 0, errors: [] };
        continue;
      }

      // Remove auto-generated fields that might conflict
      const cleanRows = rows.map((row: Record<string, unknown>) => {
        const clean = { ...row };
        // Keep id to preserve foreign key relationships
        // Remove created_at only if we want fresh timestamps (keep it for migration)
        return clean;
      });

      // Insert in batches of 500 to avoid payload limits
      const batchSize = 500;
      let inserted = 0;
      const errors: string[] = [];

      for (let i = 0; i < cleanRows.length; i += batchSize) {
        const batch = cleanRows.slice(i, i + batchSize);
        const { error } = await supabase
          .from(tableName)
          .insert(batch);

        if (error) {
          errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      results[tableName] = { inserted, errors };
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
