const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read directly without dotenv
const envStr = fs.readFileSync('.env', 'utf8');
const urlMatch = envStr.match(/VITE_SUPABASE_URL="(.*)"/);
const keyMatch = envStr.match(/VITE_SUPABASE_ANON_KEY="(.*)"/);
if (!urlMatch || !keyMatch) {
  console.error("Missing URL or KEY");
  process.exit(1);
}
const url = urlMatch[1];
const key = keyMatch[1];
const supabase = createClient(url, key);

async function migrate() {
  console.log('Fetching globals...');
  const { data: globals, error: gErr } = await supabase.from('production_globale').select('id, date, horaire, groupe');
  if (gErr) { console.error('Error fetching globals:', gErr); return; }

  console.log('Fetching stats_linea...');
  const { data: statsLinea, error: sErr } = await supabase.from('stats_linea').select('*');
  
  console.log('Fetching casse...');
  const { data: casse, error: cErr } = await supabase.from('casse_ceramique').select('*');

  console.log('Fetching emballage...');
  const { data: emballage, error: eErr } = await supabase.from('production_emballage').select('*');

  let updatedCount = 0;
  for (const g of globals) {
    let updateData = {};
    let hasUpdate = false;

    // Link stats linea
    const sl = statsLinea?.find(s => s.production_date === g.date && s.production_id === g.id);
    if (sl) {
      updateData.choix1_pieces = sl.choix1_pieces;
      updateData.choix1_surface_m2 = sl.choix1_surface_m2;
      updateData.choix2_pieces = sl.choix2_pieces;
      updateData.choix2_surface_m2 = sl.choix2_surface_m2;
      updateData.choix3_pieces = sl.choix3_pieces;
      updateData.choix3_surface_m2 = sl.choix3_surface_m2;
      hasUpdate = true;
    }

    // Link casse
    const ca = casse?.find(c => c.date === g.date && c.horaire === g.horaire && c.groupe === g.groupe);
    if (ca) {
      updateData.casse_presse_casse_kg = ca.presse_casse_kg;
      updateData.casse_sortie_sechoir_kg = ca.sortie_sechoir_kg;
      updateData.casse_emaillage_kg = ca.emaillage_kg;
      updateData.casse_projecta_kg = ca.projecta_kg;
      updateData.casse_entree_four_kg = ca.entree_four_kg;
      updateData.casse_cuite_kg = ca.cuite_kg;
      hasUpdate = true;
    }

    // Link emballage
    const embs = emballage?.filter(e => e.journalier_id === g.id);
    if (embs && embs.length > 0) {
      const c1 = embs.find(e => e.choice_type === '1er Choix');
      if (c1) {
        updateData.emballage_c1_palettes = c1.nb_palette;
        updateData.emballage_c1_reste_m2 = c1.reste_m2;
        updateData.emballage_c1_surface_m2 = c1.surface_totale_m2;
      }
      const c2 = embs.find(e => e.choice_type === '2ème Choix');
      if (c2) {
        updateData.emballage_c2_palettes = c2.nb_palette;
        updateData.emballage_c2_reste_m2 = c2.reste_m2;
        updateData.emballage_c2_surface_m2 = c2.surface_totale_m2;
      }
      const c3 = embs.find(e => e.choice_type === '3ème Choix');
      if (c3) {
        updateData.emballage_c3_palettes = c3.nb_palette;
        updateData.emballage_c3_reste_m2 = c3.reste_m2;
        updateData.emballage_c3_surface_m2 = c3.surface_totale_m2;
      }
      hasUpdate = true;
    }

    if (hasUpdate) {
      const { error: upErr } = await supabase.from('production_globale').update(updateData).eq('id', g.id);
      if (upErr) {
        console.error('Failed to update', g.id, upErr);
      } else {
        updatedCount++;
      }
    }
  }
  console.log('Migration complete. Updated rows:', updatedCount);
}

migrate();
