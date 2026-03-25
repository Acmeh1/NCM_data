import fs from 'fs';
const path = 'c:/Users/max/Downloads/REF_CATA/appsmith-spark-68-main/src/data/REF_PRODUIT.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const newProduct = {
    "CATEGORIE": "SOL",
    "Cartons_Palette": "36",
    "Couleur": "BEIGE",
    "Finition": "MONO",
    "Format_Nominal": "60*60",
    "ID_Modele": "",
    "Largeur_cm": "60",
    "Longueur_cm": "60",
    "M2_Carton": "1.44",
    "M2_PALETTE": "51.84",
    "Nom_Commercial": "ELMAR",
    "Pcs_Carton": "4",
    "Surface_CAR_m2": "0.36",
    "Type_Decor": ""
};

// Find the index of ELMAR 45*45 (MOD-052)
const index = data.findIndex(p => p.Nom_Commercial === 'ELMAR' && p.ID_Modele === 'MOD-052');
if (index !== -1) {
    data.splice(index + 1, 0, newProduct);
    fs.writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
    console.log('Product added successfully');
} else {
    console.log('ELMAR MOD-052 not found');
}
