import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const bibleDataDir = path.join(projectRoot, "bible_data");

const BIBLE_VERSIONS = [
  { id: "RVR1960", name: "Reina Valera 1960", file: "RVR1960.json", remotePath: "data/es___spa___spa/RVR1960_vid_149.json" },
  { id: "NVI", name: "Nueva Versión Internacional", file: "NVI.json", remotePath: "data/es___spa___spa/NVI_vid_128.json" },
  { id: "NTV", name: "Nueva Traducción Viviente", file: "NTV.json", remotePath: "data/es___spa___spa/NTV_vid_127.json" },
  { id: "LBLA", name: "La Biblia de las Américas", file: "LBLA.json", remotePath: "data/es___spa___spa/LBLA_vid_89.json" },
  { id: "NBLA", name: "Nueva Biblia de las Américas", file: "NBLA.json", remotePath: "data/es___spa___spa/NBLA_vid_103.json" },
  { id: "RVC", name: "Reina Valera Contemporánea", file: "RVC.json", remotePath: "data/es___spa___spa/RVC_vid_146.json" },
  { id: "RVA2015", name: "Reina Valera Actualizada 2015", file: "RVA2015.json", remotePath: "data/es___spa___spa/RVA2015_vid_1782.json" },
  { id: "DHH94I", name: "Dios Habla Hoy (con Deuterocanónicos)", file: "DHH94I.json", remotePath: "data/es___spa___spa/DHH94I_vid_52.json" },
  { id: "DHHS94", name: "Dios Habla Hoy Estándar", file: "DHHS94.json", remotePath: "data/es___spa___spa/DHHS94_vid_1846.json" },
  { id: "TLA", name: "Traducción en Lenguaje Actual", file: "TLA.json", remotePath: "data/es___spa___spa/TLA_vid_176.json" },
  { id: "TLAI", name: "Traducción en Lenguaje Actual Interconfesional", file: "TLAI.json", remotePath: "data/es___spa___spa/TLAI_vid_178.json" },
  { id: "NVI_ES", name: "Nueva Versión Internacional (Castellano)", file: "NVI_ES.json", remotePath: "data/es___spa___spa_es/NVI_vid_1637.json" }
];

async function main() {
  console.log("==================================================");
  console.log("📖 DDP Presenter - Descargador de Biblias en Español");
  console.log("Repositorio origen: mrk214/bible-data-es-spa");
  console.log("==================================================\n");

  if (!fs.existsSync(bibleDataDir)) {
    fs.mkdirSync(bibleDataDir, { recursive: true });
  }

  let downloadedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < BIBLE_VERSIONS.length; i++) {
    const v = BIBLE_VERSIONS[i];
    const targetPath = path.join(bibleDataDir, v.file);

    process.stdout.write(`[${i + 1}/${BIBLE_VERSIONS.length}] ${v.name} (${v.id})... `);

    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 1000000) {
        console.log(`✅ Ya descargada (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        skippedCount++;
        continue;
      }
    }

    try {
      const url = `https://raw.githubusercontent.com/mrk214/bible-data-es-spa/main/${v.remotePath}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      fs.writeFileSync(targetPath, text, "utf8");
      const sizeMb = (Buffer.byteLength(text, "utf8") / 1024 / 1024).toFixed(1);
      console.log(`✔ Descargada con éxito (${sizeMb} MB)`);
      downloadedCount++;
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 Proceso completado: ${downloadedCount} descargadas, ${skippedCount} existentes.`);
  console.log("Todas las versiones bíblicas están listas para uso 100% offline.");
  console.log("==================================================");
}

main().catch(console.error);
