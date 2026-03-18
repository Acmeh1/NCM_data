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
    const body = await req.json().catch(() => ({}));
    const callerUrl = body.__caller_supabase_url || Deno.env.get("SUPABASE_URL")!;
    const callerKey = body.__caller_supabase_key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(callerUrl, callerKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Fetch all tables in parallel
    const [jourRes, embRes, selRes, arrRes, statsRes] = await Promise.all([
      supabase.from("production_journalier").select("*").order("created_at"),
      supabase.from("production_emballage").select("*").order("created_at"),
      supabase.from("production_selection").select("*").order("created_at"),
      supabase.from("production_arrets_zone").select("*").order("created_at"),
      supabase.from("stats_linea").select("*").order("created_at"),
    ]);

    for (const [name, res] of [
      ["production_journalier", jourRes],
      ["production_emballage", embRes],
      ["production_selection", selRes],
      ["production_arrets_zone", arrRes],
      ["stats_linea", statsRes],
    ] as const) {
      if ((res as any).error) throw new Error(`${name}: ${(res as any).error.message}`);
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      tables: {
        production_journalier: jourRes.data || [],
        production_emballage: embRes.data || [],
        production_selection: selRes.data || [],
        production_arrets_zone: arrRes.data || [],
        stats_linea: statsRes.data || [],
      },
      counts: {
        production_journalier: (jourRes.data || []).length,
        production_emballage: (embRes.data || []).length,
        production_selection: (selRes.data || []).length,
        production_arrets_zone: (arrRes.data || []).length,
        stats_linea: (statsRes.data || []).length,
      },
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="export_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
