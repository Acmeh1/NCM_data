import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const callerUrl = body.__caller_supabase_url || Deno.env.get("SUPABASE_URL")!;
    const callerKey = body.__caller_supabase_key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(callerUrl, callerKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
    // Cloud client for storage upload
    const cloudUrl = Deno.env.get("SUPABASE_URL")!;
    const cloudServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cloudClient = createClient(cloudUrl, cloudServiceKey);

    // Fetch all data
    const [jourRes, embRes, selRes, arrRes, statsRes] = await Promise.all([
      supabase.from("production_journalier").select("*").order("created_at"),
      supabase.from("production_emballage").select("*").order("created_at"),
      supabase.from("production_selection").select("*").order("created_at"),
      supabase.from("production_arrets_zone").select("*").order("created_at"),
      supabase.from("stats_linea").select("*").order("created_at"),
    ]);

    if (jourRes.error) throw new Error("Fetch journalier: " + jourRes.error.message);
    if (embRes.error) throw new Error("Fetch emballage: " + embRes.error.message);
    if (selRes.error) throw new Error("Fetch selection: " + selRes.error.message);
    if (arrRes.error) throw new Error("Fetch arrets_zone: " + arrRes.error.message);
    if (statsRes.error) throw new Error("Fetch stats_linea: " + statsRes.error.message);

    // Create in-memory SQLite database
    const db = new DB();

    db.execute(`PRAGMA foreign_keys = OFF`);
    db.execute(`
      CREATE TABLE production_journalier (
        id TEXT PRIMARY KEY,
        date TEXT,
        horaire TEXT,
        heure_debut TEXT,
        heure_fin TEXT,
        groupe TEXT,
        chef_equipe TEXT,
        modele TEXT,
        couleur TEXT,
        format TEXT,
        choix_1_m2 REAL DEFAULT 0,
        choix_2_m2 REAL DEFAULT 0,
        choix_3_m2 REAL DEFAULT 0,
        total_m2 REAL DEFAULT 0,
        pressage_m2 REAL DEFAULT 0,
        emaillage_m2 REAL DEFAULT 0,
        cycle_min REAL DEFAULT 0,
        nb_pieces_four REAL DEFAULT 0,
        surface_car_m2 REAL DEFAULT 0,
        cuisson_m2 REAL DEFAULT 0,
        four_minutes_vides REAL DEFAULT 0,
        four_consommation_kwh REAL DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE production_emballage (
        id TEXT PRIMARY KEY,
        journalier_id TEXT,
        choice_type TEXT,
        nb_palette REAL DEFAULT 0,
        surface_par_palette REAL DEFAULT 0,
        surface_totale_m2 REAL DEFAULT 0,
        reste_m2 REAL DEFAULT 0,
        date TEXT,
        created_at TEXT
      );

      CREATE TABLE production_selection (
        id TEXT PRIMARY KEY,
        journalier_id TEXT REFERENCES production_journalier(id),
        date TEXT,
        groupe TEXT,
        horaire TEXT,
        heure_debut TEXT,
        heure_fin TEXT,
        chef_equipe TEXT,
        modele TEXT,
        couleur TEXT,
        format TEXT,
        zone_presse REAL DEFAULT 0,
        zone_projecta REAL DEFAULT 0,
        zone_four REAL DEFAULT 0,
        choix_1_m2 REAL DEFAULT 0,
        choix_1_taux REAL DEFAULT 0,
        choix_2_m2 REAL DEFAULT 0,
        choix_2_taux REAL DEFAULT 0,
        choix_3_m2 REAL DEFAULT 0,
        choix_3_taux REAL DEFAULT 0,
        calibre_taux REAL DEFAULT 0,
        calibre_cause TEXT,
        planeite_taux REAL DEFAULT 0,
        planeite_cause TEXT,
        operateur_aspect_taux REAL DEFAULT 0,
        operateur_aspect_cause TEXT,
        tonalite_taux REAL DEFAULT 0,
        tonalite_cause TEXT,
        duree_vide_maintenance REAL DEFAULT 0,
        intervention_maintenance TEXT,
        duree_vide_production REAL DEFAULT 0,
        intervention_production TEXT,
        created_at TEXT
      );

      CREATE TABLE production_arrets_zone (
        id TEXT PRIMARY KEY,
        selection_id TEXT REFERENCES production_selection(id),
        zone TEXT,
        intervention_cause TEXT,
        duree_min REAL DEFAULT 0,
        vide_four INTEGER DEFAULT 0,
        date TEXT,
        created_at TEXT
      );

      CREATE TABLE stats_linea (
        id TEXT PRIMARY KEY,
        production_id TEXT REFERENCES production_journalier(id),

        choix1_pieces REAL DEFAULT 0,
        choix1_surface_m2 REAL DEFAULT 0,
        choix1_pourcentage REAL DEFAULT 0,
        choix2_pieces REAL DEFAULT 0,
        choix2_surface_m2 REAL DEFAULT 0,
        choix2_pourcentage REAL DEFAULT 0,
        choix3_pieces REAL DEFAULT 0,
        choix3_surface_m2 REAL DEFAULT 0,
        choix3_pourcentage REAL DEFAULT 0,
        total_pieces REAL DEFAULT 0,
        total_surface_m2 REAL DEFAULT 0,

        choix1_operateur_pieces REAL DEFAULT 0,
        choix1_operateur_pourcentage REAL DEFAULT 0,
        choix1_planar_pieces REAL DEFAULT 0,
        choix1_planar_pourcentage REAL DEFAULT 0,
        choix1_calibre_pieces REAL DEFAULT 0,
        choix1_calibre_pourcentage REAL DEFAULT 0,

        choix2_operateur_pieces REAL DEFAULT 0,
        choix2_operateur_pourcentage REAL DEFAULT 0,
        choix2_planar_pieces REAL DEFAULT 0,
        choix2_planar_pourcentage REAL DEFAULT 0,
        choix2_calibre_pieces REAL DEFAULT 0,
        choix2_calibre_pourcentage REAL DEFAULT 0,

        choix3_operateur_pieces REAL DEFAULT 0,
        choix3_operateur_pourcentage REAL DEFAULT 0,
        choix3_planar_pieces REAL DEFAULT 0,
        choix3_planar_pourcentage REAL DEFAULT 0,
        choix3_calibre_pieces REAL DEFAULT 0,
        choix3_calibre_pourcentage REAL DEFAULT 0,

        minutes_absence_alimentation REAL DEFAULT 0,
        minutes_urgence_manuelle REAL DEFAULT 0,
        minutes_machine_saturee REAL DEFAULT 0,
        minutes_total_machine REAL DEFAULT 0,

        vitesse_moyenne_pieces_min REAL DEFAULT 0,
        machine_allumee REAL DEFAULT 0,
        machine_en_marche REAL DEFAULT 0,
        production_reelle_m2 REAL DEFAULT 0,

        date TEXT,
        created_at TEXT
      );
    `);

    // Insert journalier data
    const stmtJ = db.prepareQuery(
      `INSERT INTO production_journalier (
        id, date, horaire, heure_debut, heure_fin, groupe, chef_equipe, modele, couleur, format,
        choix_1_m2, choix_2_m2, choix_3_m2, total_m2, pressage_m2, emaillage_m2, cycle_min,
        nb_pieces_four, surface_car_m2, cuisson_m2, four_minutes_vides, four_consommation_kwh, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of jourRes.data || []) {
      stmtJ.execute([
        r.id,
        r.date,
        r.horaire,
        r.heure_debut,
        r.heure_fin,
        r.groupe,
        r.chef_equipe,
        r.modele,
        r.couleur,
        r.format,
        r.choix_1_m2 ?? 0,
        r.choix_2_m2 ?? 0,
        r.choix_3_m2 ?? 0,
        r.total_m2 ?? 0,
        r.pressage_m2 ?? 0,
        r.emaillage_m2 ?? 0,
        r.cycle_min ?? 0,
        r.nb_pieces_four ?? 0,
        r.surface_car_m2 ?? 0,
        r.cuisson_m2 ?? 0,
        r.four_minutes_vides ?? 0,
        r.four_consommation_kwh ?? 0,
        r.created_at,
      ]);
    }
    stmtJ.finalize();

    // Insert emballage data
    const stmtE = db.prepareQuery(
      `INSERT INTO production_emballage (id, journalier_id, choice_type, nb_palette, surface_par_palette, surface_totale_m2, reste_m2, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of embRes.data || []) {
      stmtE.execute([r.id, r.journalier_id, r.choice_type, r.nb_palette, r.surface_par_palette, r.surface_totale_m2, r.reste_m2, r.date ?? null, r.created_at]);
    }
    stmtE.finalize();

    // Insert selection data
    const stmtS = db.prepareQuery(
      `INSERT INTO production_selection (
        id, journalier_id, date, groupe, horaire, heure_debut, heure_fin, chef_equipe, modele, couleur, format,
        zone_presse, zone_projecta, zone_four,
        choix_1_m2, choix_1_taux, choix_2_m2, choix_2_taux, choix_3_m2, choix_3_taux,
        calibre_taux, calibre_cause, planeite_taux, planeite_cause,
        operateur_aspect_taux, operateur_aspect_cause, tonalite_taux, tonalite_cause,
        duree_vide_maintenance, intervention_maintenance,
        duree_vide_production, intervention_production,
        created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of selRes.data || []) {
      stmtS.execute([
        r.id,
        r.journalier_id ?? null,
        r.date,
        r.groupe,
        r.horaire,
        r.heure_debut,
        r.heure_fin,
        r.chef_equipe,
        r.modele,
        r.couleur,
        r.format,
        r.zone_presse ?? 0,
        r.zone_projecta ?? 0,
        r.zone_four ?? 0,
        r.choix_1_m2 ?? 0,
        r.choix_1_taux ?? 0,
        r.choix_2_m2 ?? 0,
        r.choix_2_taux ?? 0,
        r.choix_3_m2 ?? 0,
        r.choix_3_taux ?? 0,
        r.calibre_taux ?? 0,
        r.calibre_cause ?? null,
        r.planeite_taux ?? 0,
        r.planeite_cause ?? null,
        r.operateur_aspect_taux ?? 0,
        r.operateur_aspect_cause ?? null,
        r.tonalite_taux ?? 0,
        r.tonalite_cause ?? null,
        r.duree_vide_maintenance ?? 0,
        r.intervention_maintenance ?? null,
        r.duree_vide_production ?? 0,
        r.intervention_production ?? null,
        r.created_at,
      ]);
    }
    stmtS.finalize();

    // Insert arrets_zone data
    const stmtA = db.prepareQuery(
      `INSERT INTO production_arrets_zone (
        id, selection_id, zone, intervention_cause, duree_min, vide_four, date, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of arrRes.data || []) {
      stmtA.execute([
        r.id,
        r.selection_id,
        r.zone,
        r.intervention_cause ?? null,
        r.duree_min ?? 0,
        r.vide_four ? 1 : 0,
        r.date ?? null,
        r.created_at,
      ]);
    }
    stmtA.finalize();

    // Insert stats_linea data
    const stmtStats = db.prepareQuery(
      `INSERT INTO stats_linea (
        id, production_id,
        choix1_pieces, choix1_surface_m2, choix1_pourcentage,
        choix2_pieces, choix2_surface_m2, choix2_pourcentage,
        choix3_pieces, choix3_surface_m2, choix3_pourcentage,
        total_pieces, total_surface_m2,
        choix1_operateur_pieces, choix1_operateur_pourcentage,
        choix1_planar_pieces, choix1_planar_pourcentage,
        choix1_calibre_pieces, choix1_calibre_pourcentage,
        choix2_operateur_pieces, choix2_operateur_pourcentage,
        choix2_planar_pieces, choix2_planar_pourcentage,
        choix2_calibre_pieces, choix2_calibre_pourcentage,
        choix3_operateur_pieces, choix3_operateur_pourcentage,
        choix3_planar_pieces, choix3_planar_pourcentage,
        choix3_calibre_pieces, choix3_calibre_pourcentage,
        minutes_absence_alimentation,
        minutes_urgence_manuelle, minutes_machine_saturee, minutes_total_machine,
        vitesse_moyenne_pieces_min, machine_allumee, machine_en_marche,
        production_reelle_m2,
        date, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of statsRes.data || []) {
      stmtStats.execute([
        r.id,
        r.production_id,
        r.choix1_pieces ?? 0,
        r.choix1_surface_m2 ?? 0,
        r.choix1_pourcentage ?? 0,
        r.choix2_pieces ?? 0,
        r.choix2_surface_m2 ?? 0,
        r.choix2_pourcentage ?? 0,
        r.choix3_pieces ?? 0,
        r.choix3_surface_m2 ?? 0,
        r.choix3_pourcentage ?? 0,
        r.total_pieces ?? 0,
        r.total_surface_m2 ?? 0,
        r.choix1_operateur_pieces ?? 0,
        r.choix1_operateur_pourcentage ?? 0,
        r.choix1_planar_pieces ?? 0,
        r.choix1_planar_pourcentage ?? 0,
        r.choix1_calibre_pieces ?? 0,
        r.choix1_calibre_pourcentage ?? 0,
        r.choix2_operateur_pieces ?? 0,
        r.choix2_operateur_pourcentage ?? 0,
        r.choix2_planar_pieces ?? 0,
        r.choix2_planar_pourcentage ?? 0,
        r.choix2_calibre_pieces ?? 0,
        r.choix2_calibre_pourcentage ?? 0,
        r.choix3_operateur_pieces ?? 0,
        r.choix3_operateur_pourcentage ?? 0,
        r.choix3_planar_pieces ?? 0,
        r.choix3_planar_pourcentage ?? 0,
        r.choix3_calibre_pieces ?? 0,
        r.choix3_calibre_pourcentage ?? 0,
        r.minutes_absence_alimentation ?? 0,
        r.minutes_urgence_manuelle ?? 0,
        r.minutes_machine_saturee ?? 0,
        r.minutes_total_machine ?? 0,
        r.vitesse_moyenne_pieces_min ?? 0,
        r.machine_allumee ?? 0,
        r.machine_en_marche ?? 0,
        r.production_reelle_m2 ?? 0,
        r.date ?? null,
        r.created_at,
      ]);
    }
    stmtStats.finalize();

    // Export SQLite to bytes
    const dbBytes = db.serialize();
    db.close();

    // Generate filename
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fileName = `production_mirror_${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}.db`;

    // Upload to storage bucket
    const { error: uploadError } = await cloudClient.storage
      .from("database-backups")
      .upload(fileName, dbBytes, {
        contentType: "application/x-sqlite3",
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.includes("already exists") || uploadError.message?.includes("Duplicate")) {
        await cloudClient.storage.from("database-backups").upload(fileName, dbBytes, {
          contentType: "application/x-sqlite3",
          upsert: true,
        });
      } else {
        throw new Error("Upload: " + uploadError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        file: fileName,
        journalier_count: (jourRes.data || []).length,
        emballage_count: (embRes.data || []).length,
        selection_count: (selRes.data || []).length,
        arrets_zone_count: (arrRes.data || []).length,
        stats_linea_count: (statsRes.data || []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SQLite mirror error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
