import express from "express";
import cors from "cors";
import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import http from "http";
import os from "os";
import { WebSocketServer, WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure directories exist
const DIRECTORIES = ["library", "playlists", "media", "bibles"];
for (const dir of DIRECTORIES) {
  const fullPath = path.join(__dirname, dir);
  if (!existsSync(fullPath)) {
    await fs.mkdir(fullPath, { recursive: true });
  }
}

// Serve media folder static files
app.use("/media", express.static(path.join(__dirname, "media")));

// Helper to get all files in a folder (flat)
async function readJsonFiles(dirName) {
  const dirPath = path.join(__dirname, dirName);
  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    const results = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(dirPath, file), "utf8");
      results.push(JSON.parse(content));
    }
    return results;
  } catch (err) {
    console.error(`Error reading ${dirName}:`, err);
    return [];
  }
}

// Recursive helper to scan library folder sections and items
async function scanLibraryDir(baseDir, relativePath = "") {
  const currentDir = path.join(baseDir, relativePath);
  let results = [];
  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const relEntryPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        const subResults = await scanLibraryDir(baseDir, relEntryPath);
        results = results.concat(subResults);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const content = await fs.readFile(path.join(baseDir, relEntryPath), "utf8");
        try {
          const song = JSON.parse(content);
          const section = relativePath.replace(/\\/g, "/");
          results.push({
            id: song.id,
            title: song.title,
            author: song.author,
            slideCount: song.slides?.length || 0,
            section: section,
            filePath: relEntryPath.replace(/\\/g, "/")
          });
        } catch (e) {
          console.error("Failed to parse library song JSON:", relEntryPath, e);
        }
      }
    }
  } catch (err) {
    console.error("Error scanning library directory:", err);
  }
  return results;
}

// Helper to find a file path by song ID
async function findLibraryItemPath(id) {
  const items = await scanLibraryDir(path.join(__dirname, "library"));
  const match = items.find(item => item.id === id);
  return match ? match.filePath : null;
}

// LIBRARY ENDPOINTS
app.get("/api/library", async (req, res) => {
  const songs = await scanLibraryDir(path.join(__dirname, "library"));
  res.json(songs);
});

app.get("/api/library/songs", async (req, res) => {
  const songs = await scanLibraryDir(path.join(__dirname, "library"));
  res.json(songs);
});

app.get("/api/library/song", async (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: "Missing filePath query parameter" });
  }
  try {
    const fullPath = path.join(__dirname, "library", filePath);
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: "Song file not found" });
    }
    const content = await fs.readFile(fullPath, "utf8");
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Failed to read song file" });
  }
});

app.get("/api/library/sections", async (req, res) => {
  const libraryPath = path.join(__dirname, "library");
  try {
    const entries = await fs.readdir(libraryPath, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);
    res.json(["", ...folders]);
  } catch (err) {
    console.error("Failed to read library sections:", err);
    res.json([""]);
  }
});

app.post("/api/library/sections", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing section name" });
  }
  try {
    const fullPath = path.join(__dirname, "library", name);
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ success: true, name });
  } catch (err) {
    console.error("Failed to create section:", err);
    res.status(500).json({ error: "Could not create section folder" });
  }
});

app.delete("/api/library/sections", async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: "Missing section name parameter" });
  }
  try {
    const fullPath = path.join(__dirname, "library", name);
    if (existsSync(fullPath)) {
      await fs.rm(fullPath, { recursive: true, force: true });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete section folder:", err);
    res.status(500).json({ error: "Could not delete section folder" });
  }
});

app.get("/api/library/get", async (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: "Missing filePath query parameter" });
  }
  try {
    const fullPath = path.join(__dirname, "library", filePath);
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: "Song file not found" });
    }
    const content = await fs.readFile(fullPath, "utf8");
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Failed to read song file" });
  }
});

app.post("/api/library/save", async (req, res) => {
  const { filePath } = req.query;
  const songData = req.body;

  if (!filePath) {
    return res.status(400).json({ error: "Missing filePath query parameter" });
  }
  try {
    const fullPath = path.join(__dirname, "library", filePath);
    // Ensure parent directory exists (in case it is a new subfolder)
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(songData, null, 2), "utf8");
    res.json({ success: true, song: songData });
  } catch (err) {
    console.error("Error saving song:", err);
    res.status(500).json({ error: "Failed to save song file" });
  }
});

app.delete("/api/library/delete", async (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: "Missing filePath query parameter" });
  }
  try {
    const fullPath = path.join(__dirname, "library", filePath);
    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting library item:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

app.get("/api/library/:id", async (req, res) => {
  const { id } = req.params;
  const relPath = await findLibraryItemPath(id);
  const targetPath = relPath 
    ? path.join(__dirname, "library", relPath) 
    : path.join(__dirname, "library", `${id}.json`);

  if (!existsSync(targetPath)) {
    return res.status(404).json({ error: "Song not found" });
  }
  try {
    const content = await fs.readFile(targetPath, "utf8");
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Failed to read song" });
  }
});

app.post("/api/library/:id", async (req, res) => {
  const { id } = req.params;
  const songData = req.body;
  if (!songData.id) songData.id = id;

  const relPath = await findLibraryItemPath(id);
  const targetPath = relPath 
    ? path.join(__dirname, "library", relPath) 
    : path.join(__dirname, "library", `${id}.json`);

  try {
    await fs.writeFile(targetPath, JSON.stringify(songData, null, 2), "utf8");
    res.json({ success: true, song: songData });
  } catch (err) {
    res.status(500).json({ error: "Failed to save song" });
  }
});

// PLAYLISTS ENDPOINTS
app.get("/api/playlists", async (req, res) => {
  const playlists = await readJsonFiles("playlists");
  res.json(playlists);
});

app.get("/api/playlists/:id", async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, "playlists", `${id}.json`);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: "Playlist not found" });
  }
  const content = await fs.readFile(filePath, "utf8");
  res.json(JSON.parse(content));
});

app.post("/api/playlists/:id", async (req, res) => {
  const { id } = req.params;
  const playlistData = req.body;
  
  if (!playlistData.id) playlistData.id = id;
  
  const filePath = path.join(__dirname, "playlists", `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(playlistData, null, 2), "utf8");
  res.json({ success: true, playlist: playlistData });
});

app.delete("/api/playlists/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const filePath = path.join(__dirname, "playlists", `${id}.json`);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting playlist:", err);
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// MEDIA ENDPOINTS
app.get("/api/media", async (req, res) => {
  const mediaPath = path.join(__dirname, "media");
  try {
    const files = await fs.readdir(mediaPath);
    const results = files.map(file => {
      const ext = path.extname(file).toLowerCase();
      let type = "other";
      if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
        type = "image";
      } else if ([".mp4", ".mkv", ".webm", ".mov"].includes(ext)) {
        type = "video";
      } else if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) {
        type = "audio";
      }
      
      return {
        filename: file,
        url: `/media/${file}`,
        type
      };
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Could not read media folder" });
  }
});

app.post("/api/media/upload", express.raw({ type: "*/*", limit: "2048mb" }), async (req, res) => {
  const filename = req.headers["x-filename"];
  if (!filename) {
    return res.status(400).json({ error: "Missing x-filename header" });
  }
  try {
    const filePath = path.join(__dirname, "media", filename);
    await fs.writeFile(filePath, req.body);
    res.json({ success: true, filename, url: `/media/${filename}` });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to save file" });
  }
});

app.delete("/api/media/:filename", async (req, res) => {
  const filename = req.params.filename;
  if (!filename) {
    return res.status(400).json({ error: "Missing filename parameter" });
  }
  try {
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, "media", safeFilename);
    await fs.unlink(filePath);
    res.json({ success: true, filename: safeFilename });
  } catch (err) {
    console.error("Delete media error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// BIBLE ENGINE (mrk214/bible-data-es-spa integration)
const BIBLE_VERSIONS = [
  { id: "RVR1960", name: "Reina Valera 1960", localAbbr: "RVR1960", file: "RVR1960.json", remotePath: "data/es___spa___spa/RVR1960_vid_149.json", isSpanish: true },
  { id: "NVI", name: "Nueva Versión Internacional", localAbbr: "NVI", file: "NVI.json", remotePath: "data/es___spa___spa/NVI_vid_128.json", isSpanish: true },
  { id: "NTV", name: "Nueva Traducción Viviente", localAbbr: "NTV", file: "NTV.json", remotePath: "data/es___spa___spa/NTV_vid_127.json", isSpanish: true },
  { id: "LBLA", name: "La Biblia de las Américas", localAbbr: "LBLA", file: "LBLA.json", remotePath: "data/es___spa___spa/LBLA_vid_89.json", isSpanish: true },
  { id: "NBLA", name: "Nueva Biblia de las Américas", localAbbr: "NBLA", file: "NBLA.json", remotePath: "data/es___spa___spa/NBLA_vid_103.json", isSpanish: true },
  { id: "RVC", name: "Reina Valera Contemporánea", localAbbr: "RVC", file: "RVC.json", remotePath: "data/es___spa___spa/RVC_vid_146.json", isSpanish: true },
  { id: "RVA2015", name: "Reina Valera Actualizada 2015", localAbbr: "RVA2015", file: "RVA2015.json", remotePath: "data/es___spa___spa/RVA2015_vid_1782.json", isSpanish: true },
  { id: "DHH94I", name: "Dios Habla Hoy (con Deuterocanónicos)", localAbbr: "DHH94I", file: "DHH94I.json", remotePath: "data/es___spa___spa/DHH94I_vid_52.json", isSpanish: true },
  { id: "DHHS94", name: "Dios Habla Hoy Estándar", localAbbr: "DHHS94", file: "DHHS94.json", remotePath: "data/es___spa___spa/DHHS94_vid_1846.json", isSpanish: true },
  { id: "TLA", name: "Traducción en Lenguaje Actual", localAbbr: "TLA", file: "TLA.json", remotePath: "data/es___spa___spa/TLA_vid_176.json", isSpanish: true },
  { id: "TLAI", name: "Traducción en Lenguaje Actual Interconfesional", localAbbr: "TLAI", file: "TLAI.json", remotePath: "data/es___spa___spa/TLAI_vid_178.json", isSpanish: true },
  { id: "NVI_ES", name: "Nueva Versión Internacional (Castellano)", localAbbr: "NVI-ES", file: "NVI_ES.json", remotePath: "data/es___spa___spa_es/NVI_vid_1637.json", isSpanish: true }
];

const BIBLE_BOOKS = [
  // OT (39)
  { id: "génesis", usfm: "GEN", name: "Génesis", testament: "OT", chaptersCount: 50, aliases: ["genesis", "gen", "gn"] },
  { id: "éxodo", usfm: "EXO", name: "Éxodo", testament: "OT", chaptersCount: 40, aliases: ["exodo", "ex", "exo"] },
  { id: "levítico", usfm: "LEV", name: "Levítico", testament: "OT", chaptersCount: 27, aliases: ["levitico", "lev", "lv"] },
  { id: "números", usfm: "NUM", name: "Números", testament: "OT", chaptersCount: 36, aliases: ["numeros", "num", "nm"] },
  { id: "deuteronomio", usfm: "DEU", name: "Deuteronomio", testament: "OT", chaptersCount: 34, aliases: ["deut", "dt"] },
  { id: "josué", usfm: "JOS", name: "Josué", testament: "OT", chaptersCount: 24, aliases: ["josue", "jos"] },
  { id: "jueces", usfm: "JDG", name: "Jueces", testament: "OT", chaptersCount: 21, aliases: ["jue", "jcz"] },
  { id: "rut", usfm: "RUT", name: "Rut", testament: "OT", chaptersCount: 4, aliases: ["rt"] },
  { id: "1samuel", usfm: "1SA", name: "1 Samuel", testament: "OT", chaptersCount: 31, aliases: ["1sam", "1sa", "1s"] },
  { id: "2samuel", usfm: "2SA", name: "2 Samuel", testament: "OT", chaptersCount: 24, aliases: ["2sam", "2sa", "2s"] },
  { id: "1reyes", usfm: "1KI", name: "1 Reyes", testament: "OT", chaptersCount: 22, aliases: ["1rey", "1re", "1r"] },
  { id: "2reyes", usfm: "2KI", name: "2 Reyes", testament: "OT", chaptersCount: 25, aliases: ["2rey", "2re", "2r"] },
  { id: "1crónicas", usfm: "1CH", name: "1 Crónicas", testament: "OT", chaptersCount: 29, aliases: ["1cronicas", "1cron", "1cr"] },
  { id: "2crónicas", usfm: "2CH", name: "2 Crónicas", testament: "OT", chaptersCount: 36, aliases: ["2cronicas", "2cron", "2cr"] },
  { id: "esdras", usfm: "EZR", name: "Esdras", testament: "OT", chaptersCount: 10, aliases: ["esd"] },
  { id: "nehemías", usfm: "NEH", name: "Nehemías", testament: "OT", chaptersCount: 13, aliases: ["nehemias", "neh", "ne"] },
  { id: "ester", usfm: "EST", name: "Ester", testament: "OT", chaptersCount: 10, aliases: ["est"] },
  { id: "job", usfm: "JOB", name: "Job", testament: "OT", chaptersCount: 42, aliases: ["jb"] },
  { id: "salmos", usfm: "PSA", name: "Salmos", testament: "OT", chaptersCount: 150, aliases: ["salmo", "sal", "ps", "psalms", "psa"] },
  { id: "proverbios", usfm: "PRO", name: "Proverbios", testament: "OT", chaptersCount: 31, aliases: ["prov", "prv", "pr", "pro"] },
  { id: "eclesiastés", usfm: "ECC", name: "Eclesiastés", testament: "OT", chaptersCount: 12, aliases: ["eclesiastes", "ecl", "ec", "ecc"] },
  { id: "cantares", usfm: "SNG", name: "Cantares", testament: "OT", chaptersCount: 8, aliases: ["cantar", "cnt", "ct", "sng"] },
  { id: "isaías", usfm: "ISA", name: "Isaías", testament: "OT", chaptersCount: 66, aliases: ["isaias", "isa", "is"] },
  { id: "jeremías", usfm: "JER", name: "Jeremías", testament: "OT", chaptersCount: 52, aliases: ["jeremias", "jer", "jr"] },
  { id: "lamentaciones", usfm: "LAM", name: "Lamentaciones", testament: "OT", chaptersCount: 5, aliases: ["lam", "lm"] },
  { id: "ezequiel", usfm: "EZK", name: "Ezequiel", testament: "OT", chaptersCount: 48, aliases: ["eze", "ez", "ezk"] },
  { id: "daniel", usfm: "DAN", name: "Daniel", testament: "OT", chaptersCount: 12, aliases: ["dan", "dn"] },
  { id: "oseas", usfm: "HOS", name: "Oseas", testament: "OT", chaptersCount: 14, aliases: ["os", "hos"] },
  { id: "joel", usfm: "JOL", name: "Joel", testament: "OT", chaptersCount: 3, aliases: ["jl", "jol"] },
  { id: "amós", usfm: "AMO", name: "Amós", testament: "OT", chaptersCount: 9, aliases: ["amos", "am", "amo"] },
  { id: "abdías", usfm: "OBA", name: "Abdías", testament: "OT", chaptersCount: 1, aliases: ["abdias", "abd", "ob", "oba"] },
  { id: "jonás", usfm: "JON", name: "Jonás", testament: "OT", chaptersCount: 4, aliases: ["jonas", "jon"] },
  { id: "miqueas", usfm: "MIC", name: "Miqueas", testament: "OT", chaptersCount: 7, aliases: ["miq", "mic"] },
  { id: "nahúm", usfm: "NAM", name: "Nahúm", testament: "OT", chaptersCount: 3, aliases: ["nahum", "nah", "nam"] },
  { id: "habacuc", usfm: "HAB", name: "Habacuc", testament: "OT", chaptersCount: 3, aliases: ["hab"] },
  { id: "sofonías", usfm: "ZEP", name: "Sofonías", testament: "OT", chaptersCount: 3, aliases: ["sofonias", "sof", "zep"] },
  { id: "hageo", usfm: "HAG", name: "Hageo", testament: "OT", chaptersCount: 2, aliases: ["hag"] },
  { id: "zacarías", usfm: "ZEC", name: "Zacarías", testament: "OT", chaptersCount: 14, aliases: ["zacarias", "zac", "zec"] },
  { id: "malaquías", usfm: "MAL", name: "Malaquías", testament: "OT", chaptersCount: 4, aliases: ["malaquias", "mal"] },
  // NT (27)
  { id: "sanmateo", usfm: "MAT", name: "Mateo", testament: "NT", chaptersCount: 28, aliases: ["mateo", "mt", "mat", "sanmateo"] },
  { id: "sanmarcos", usfm: "MRK", name: "Marcos", testament: "NT", chaptersCount: 16, aliases: ["marcos", "mr", "mc", "mark", "mrk", "sanmarcos"] },
  { id: "sanlucas", usfm: "LUK", name: "Lucas", testament: "NT", chaptersCount: 24, aliases: ["lucas", "lc", "luke", "luk", "sanlucas"] },
  { id: "sanjuan", usfm: "JHN", name: "Juan", testament: "NT", chaptersCount: 21, aliases: ["juan", "jn", "john", "jhn", "sanjuan"] },
  { id: "hechos", usfm: "ACT", name: "Hechos", testament: "NT", chaptersCount: 28, aliases: ["hch", "hcho", "acts", "act"] },
  { id: "romanos", usfm: "ROM", name: "Romanos", testament: "NT", chaptersCount: 16, aliases: ["rom", "ro", "rm"] },
  { id: "1corintios", usfm: "1CO", name: "1 Corintios", testament: "NT", chaptersCount: 16, aliases: ["1cor", "1co", "1c"] },
  { id: "2corintios", usfm: "2CO", name: "2 Corintios", testament: "NT", chaptersCount: 13, aliases: ["2cor", "2co", "2c"] },
  { id: "gálatas", usfm: "GAL", name: "Gálatas", testament: "NT", chaptersCount: 6, aliases: ["galatas", "gal", "ga"] },
  { id: "efesios", usfm: "EPH", name: "Efesios", testament: "NT", chaptersCount: 6, aliases: ["efe", "ef", "eph"] },
  { id: "filipenses", usfm: "PHP", name: "Filipenses", testament: "NT", chaptersCount: 4, aliases: ["fil", "flp", "php"] },
  { id: "colosenses", usfm: "COL", name: "Colosenses", testament: "NT", chaptersCount: 4, aliases: ["col"] },
  { id: "1tesalonicenses", usfm: "1TH", name: "1 Tesalonicenses", testament: "NT", chaptersCount: 5, aliases: ["1tes", "1ts", "1th"] },
  { id: "2tesalonicenses", usfm: "2TH", name: "2 Tesalonicenses", testament: "NT", chaptersCount: 3, aliases: ["2tes", "2ts", "2th"] },
  { id: "1timoteo", usfm: "1TI", name: "1 Timoteo", testament: "NT", chaptersCount: 6, aliases: ["1tim", "1tm", "1ti"] },
  { id: "2timoteo", usfm: "2TI", name: "2 Timoteo", testament: "NT", chaptersCount: 4, aliases: ["2tim", "2tm", "2ti"] },
  { id: "tito", usfm: "TIT", name: "Tito", testament: "NT", chaptersCount: 3, aliases: ["tit"] },
  { id: "filemón", usfm: "PHM", name: "Filemón", testament: "NT", chaptersCount: 1, aliases: ["filemon", "flm", "phm"] },
  { id: "hebreos", usfm: "HEB", name: "Hebreos", testament: "NT", chaptersCount: 13, aliases: ["heb"] },
  { id: "santiago", usfm: "JAS", name: "Santiago", testament: "NT", chaptersCount: 5, aliases: ["stg", "jas"] },
  { id: "1pedro", usfm: "1PE", name: "1 Pedro", testament: "NT", chaptersCount: 5, aliases: ["1ped", "1pe", "1p"] },
  { id: "2pedro", usfm: "2PE", name: "2 Pedro", testament: "NT", chaptersCount: 3, aliases: ["2ped", "2pe", "2p"] },
  { id: "1juan", usfm: "1JN", name: "1 Juan", testament: "NT", chaptersCount: 5, aliases: ["1jn", "1j"] },
  { id: "2juan", usfm: "2JN", name: "2 Juan", testament: "NT", chaptersCount: 1, aliases: ["2jn", "2j"] },
  { id: "3juan", usfm: "3JN", name: "3 Juan", testament: "NT", chaptersCount: 1, aliases: ["3jn", "3j"] },
  { id: "judas", usfm: "JUD", name: "Judas", testament: "NT", chaptersCount: 1, aliases: ["jod", "jd", "jud"] },
  { id: "apocalipsis", usfm: "REV", name: "Apocalipsis", testament: "NT", chaptersCount: 22, aliases: ["apoc", "ap", "rev", "revelation"] },
  // Deuterocanónicos (present in DHH94I and TLAI)
  { id: "tobit", usfm: "TOB", name: "Tobit", testament: "DC", chaptersCount: 14, aliases: ["tob", "tobias"] },
  { id: "judit", usfm: "JDT", name: "Judit", testament: "DC", chaptersCount: 16, aliases: ["jdt", "judith"] },
  { id: "ester_dc", usfm: "ESG", name: "Ester (Griego)", testament: "DC", chaptersCount: 16, aliases: ["esg"] },
  { id: "sabiduria", usfm: "WIS", name: "Sabiduría", testament: "DC", chaptersCount: 19, aliases: ["wis", "sab"] },
  { id: "eclesiastico", usfm: "SIR", name: "Eclesiástico", testament: "DC", chaptersCount: 51, aliases: ["sir", "eclo", "siracida"] },
  { id: "baruc", usfm: "BAR", name: "Baruc", testament: "DC", chaptersCount: 6, aliases: ["bar"] },
  { id: "daniel_dc", usfm: "DAG", name: "Daniel (Griego)", testament: "DC", chaptersCount: 14, aliases: ["dag"] },
  { id: "1macabeos", usfm: "1MA", name: "1 Macabeos", testament: "DC", chaptersCount: 16, aliases: ["1ma", "1mac"] },
  { id: "2macabeos", usfm: "2MA", name: "2 Macabeos", testament: "DC", chaptersCount: 15, aliases: ["2ma", "2mac"] }
];

function resolveBook(inputStr) {
  if (!inputStr) return null;
  const cleanInput = inputStr.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const book of BIBLE_BOOKS) {
    if (book.usfm.toLowerCase() === cleanInput) return book;
    const cleanId = book.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanName = book.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanInput === cleanId || cleanInput === cleanName) return book;
    for (const alias of book.aliases) {
      if (cleanInput === alias.toLowerCase().replace(/[^a-z0-9]/g, "")) return book;
    }
  }

  for (const book of BIBLE_BOOKS) {
    const cleanName = book.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName.startsWith(cleanInput)) return book;
  }

  return null;
}

// In-memory version caching & in-flight downloads
const loadedVersions = new Map();
const downloadingVersions = new Map();

async function getBibleVersionData(versionId = "RVR1960") {
  const versionObj = BIBLE_VERSIONS.find(v => v.id.toLowerCase() === versionId.toLowerCase()) || BIBLE_VERSIONS[0];
  const targetId = versionObj.id;

  if (loadedVersions.has(targetId)) {
    return { version: versionObj, data: loadedVersions.get(targetId) };
  }

  const dirPath = path.join(__dirname, "bible_data");
  const filePath = path.join(dirPath, versionObj.file);

  // 1. If file already exists locally on disk, load and parse it
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      loadedVersions.set(targetId, parsed);
      return { version: versionObj, data: parsed };
    } catch (err) {
      console.error(`Error loading Bible version file ${filePath}:`, err);
    }
  }

  // 2. If already being downloaded by another concurrent request, await that promise
  if (downloadingVersions.has(targetId)) {
    try {
      const parsed = await downloadingVersions.get(targetId);
      return { version: versionObj, data: parsed };
    } catch (err) {
      console.error(`Error waiting for download of ${targetId}:`, err);
    }
  }

  // 3. Auto-download on demand from GitHub repository
  console.log(`[Bible Engine] Versión "${versionObj.name}" (${versionObj.id}) no encontrada localmente.`);
  console.log(`[Bible Engine] Descargando automáticamente de GitHub (mrk214/bible-data-es-spa)...`);

  const downloadPromise = (async () => {
    try {
      const rawUrl = `https://raw.githubusercontent.com/mrk214/bible-data-es-spa/main/${versionObj.remotePath}`;
      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} al descargar de ${rawUrl}`);
      }

      const text = await response.text();
      const parsed = JSON.parse(text);

      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
      }

      await fs.writeFile(filePath, text, "utf8");
      loadedVersions.set(targetId, parsed);
      console.log(`[Bible Engine] ✔ Versión "${versionObj.name}" descargada y guardada localmente en ${versionObj.file}`);
      return parsed;
    } catch (err) {
      console.error(`[Bible Engine] Error descargando versión ${versionObj.id}:`, err.message);
      return null;
    } finally {
      downloadingVersions.delete(targetId);
    }
  })();

  downloadingVersions.set(targetId, downloadPromise);
  const data = await downloadPromise;
  return { version: versionObj, data };
}

function parseChapterVerses(chapterObj, bookName, chapterNum) {
  const verses = [];
  let currentHeading = "";

  for (const item of (chapterObj.items || [])) {
    if (["heading1", "heading2", "section1", "section2"].includes(item.type)) {
      currentHeading = item.lines ? item.lines.join(" ").trim() : "";
      continue;
    }

    if (item.type === "verse") {
      const verseNum = item.verse_numbers && item.verse_numbers.length > 0 ? item.verse_numbers[0] : verses.length + 1;
      const text = item.lines ? item.lines.join(" ").trim() : "";

      verses.push({
        book: bookName,
        chapter: chapterNum,
        verse: verseNum,
        text: text,
        heading: currentHeading || null
      });

      currentHeading = "";
    }
  }

  return verses;
}

app.get("/api/bible/versions", (req, res) => {
  res.json(BIBLE_VERSIONS.map(v => ({
    id: v.id,
    name: v.name,
    localAbbr: v.localAbbr,
    isSpanish: v.isSpanish
  })));
});

app.get("/api/bible/books", async (req, res) => {
  const { version = "RVR1960" } = req.query;
  const versionInfo = await getBibleVersionData(version);

  if (!versionInfo.data || !versionInfo.data.books) {
    // Fallback to standard 66 books if version file is unavailable
    return res.json(BIBLE_BOOKS.filter(b => b.testament !== "DC"));
  }

  // Deduplicate and map books present in this specific version
  const booksInVersion = versionInfo.data.books.map((b) => {
    const canonical = resolveBook(b.usfm) || {
      id: b.usfm.toLowerCase(),
      name: b.human,
      usfm: b.usfm,
      testament: "OT"
    };

    // Deduplicate chapter count by usfm
    const seenChapters = new Set();
    b.chapters.forEach(c => seenChapters.add(c.usfm));

    return {
      id: canonical.id,
      name: canonical.name,
      usfm: b.usfm,
      testament: canonical.testament,
      chaptersCount: seenChapters.size,
      aliases: canonical.aliases || []
    };
  });

  res.json(booksInVersion);
});

app.get("/api/bible/chapter", async (req, res) => {
  const { version = "RVR1960", book: bookParam = "sanjuan", chapter: chapterParam = "1" } = req.query;
  const versionInfo = await getBibleVersionData(version);

  if (!versionInfo.data || !versionInfo.data.books) {
    return res.status(500).json({ error: `Versión bíblica ${version} no disponible` });
  }

  const resolvedBook = resolveBook(bookParam);
  if (!resolvedBook) {
    return res.status(404).json({ error: `Libro "${bookParam}" no encontrado` });
  }

  const bookData = versionInfo.data.books.find(
    (b) => b.usfm.toUpperCase() === resolvedBook.usfm.toUpperCase()
  );

  if (!bookData) {
    return res.status(404).json({
      error: `El libro ${resolvedBook.name} no está presente en la versión ${versionInfo.version.name}`
    });
  }

  const chapterNum = parseInt(chapterParam, 10) || 1;
  const chapterData = bookData.chapters.find((c) => {
    const parts = c.usfm.split(".");
    return parseInt(parts[1], 10) === chapterNum;
  }) || bookData.chapters[chapterNum - 1];

  if (!chapterData) {
    return res.status(404).json({ error: `Capítulo ${chapterNum} no encontrado en ${resolvedBook.name}` });
  }

  const verses = parseChapterVerses(chapterData, resolvedBook.name, chapterNum);

  res.json({
    version: versionInfo.version.id,
    versionName: versionInfo.version.name,
    book: resolvedBook.name,
    bookId: resolvedBook.id,
    usfm: resolvedBook.usfm,
    chapter: chapterNum,
    results: verses
  });
});

app.get("/api/bible/search", async (req, res) => {
  const { query, version = "RVR1960" } = req.query;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  const versionInfo = await getBibleVersionData(version);
  if (!versionInfo.data || !versionInfo.data.books) {
    return res.status(500).json({ error: `Versión bíblica ${version} no disponible` });
  }

  const cleanQuery = query.trim().replace(/\s+/g, " ");

  // Pattern 1: Passage reference (e.g. "Juan 3:16" or "Juan 3:16-18")
  const passageRegex = /^(.+?)\s+(\d+)[:\s]+(\d+)(?:-(\d+))?$/i;
  // Pattern 2: Chapter reference (e.g. "Juan 3" or "Salmos 23")
  const chapterRegex = /^(.+?)\s+(\d+)$/i;

  const matchPassage = cleanQuery.match(passageRegex);
  const matchChapter = cleanQuery.match(chapterRegex);

  if (matchPassage) {
    const rawBook = matchPassage[1];
    const chapterNum = parseInt(matchPassage[2], 10);
    const startVerse = parseInt(matchPassage[3], 10);
    const endVerse = matchPassage[4] ? parseInt(matchPassage[4], 10) : startVerse;

    const bookObj = resolveBook(rawBook);
    if (!bookObj) {
      return res.json({ query, version: versionInfo.version.id, results: [] });
    }

    const bookData = versionInfo.data.books.find(
      (b) => b.usfm.toUpperCase() === bookObj.usfm.toUpperCase()
    );
    if (!bookData) {
      return res.json({ query, version: versionInfo.version.id, results: [] });
    }

    const chapterData = bookData.chapters.find((c) => {
      const parts = c.usfm.split(".");
      return parseInt(parts[1], 10) === chapterNum;
    }) || bookData.chapters[chapterNum - 1];

    if (!chapterData) {
      return res.json({ query, version: versionInfo.version.id, results: [] });
    }

    const allVerses = parseChapterVerses(chapterData, bookObj.name, chapterNum);
    const results = allVerses.filter((v) => v.verse >= startVerse && v.verse <= endVerse);

    return res.json({ query, type: "passage", version: versionInfo.version.id, results });
  }

  if (matchChapter) {
    const rawBook = matchChapter[1];
    const chapterNum = parseInt(matchChapter[2], 10);

    const bookObj = resolveBook(rawBook);
    if (!bookObj) {
      return res.json({ query, version: versionInfo.version.id, results: [] });
    }

    const bookData = versionInfo.data.books.find(
      (b) => b.usfm.toUpperCase() === bookObj.usfm.toUpperCase()
    );
    if (!bookData) {
      return res.json({ query, version: versionInfo.version.id, results: [] });
    }

    const chapterData = bookData.chapters.find((c) => {
      const parts = c.usfm.split(".");
      return parseInt(parts[1], 10) === chapterNum;
    }) || bookData.chapters[chapterNum - 1];

    if (!chapterData) {
      return res.json({ query, version: versionInfo.version.id, results: [] });
    }

    const results = parseChapterVerses(chapterData, bookObj.name, chapterNum);
    return res.json({ query, type: "chapter", version: versionInfo.version.id, results });
  }

  // Pattern 3: Book name only (e.g. "Juan" or "Salmos") -> load Chapter 1
  const bookOnlyObj = resolveBook(cleanQuery);
  if (bookOnlyObj) {
    const bookData = versionInfo.data.books.find(
      (b) => b.usfm.toUpperCase() === bookOnlyObj.usfm.toUpperCase()
    );
    if (bookData && bookData.chapters.length > 0) {
      const results = parseChapterVerses(bookData.chapters[0], bookOnlyObj.name, 1);
      return res.json({ query, type: "chapter", version: versionInfo.version.id, results });
    }
  }

  // Pattern 4: Full text keyword search across all verses in the version
  const searchWord = cleanQuery.toLowerCase();
  const results = [];

  for (const b of versionInfo.data.books) {
    const bObj = resolveBook(b.usfm) || { name: b.human, id: b.usfm.toLowerCase() };
    for (const c of b.chapters) {
      const chNum = parseInt(c.usfm.split(".")[1] || "1", 10);
      for (const it of c.items) {
        if (it.type === "verse" && it.lines) {
          const text = it.lines.join(" ");
          if (text.toLowerCase().includes(searchWord)) {
            results.push({
              book: bObj.name,
              bookId: bObj.id,
              chapter: chNum,
              verse: it.verse_numbers && it.verse_numbers.length > 0 ? it.verse_numbers[0] : 1,
              text: text.trim()
            });
            if (results.length >= 60) break;
          }
        }
      }
      if (results.length >= 60) break;
    }
    if (results.length >= 60) break;
  }

  return res.json({ query, type: "keyword", version: versionInfo.version.id, results });
});

// PROJECTION REAL-TIME STATE & WEBSOCKET SYNC
let projectionState = {
  activeSlideId: null,
  activeSongId: null,
  slideText: "",
  overlays: [],
  slideStyle: {
    fontSize: "56px",
    textAlign: "center",
    verticalAlign: "center",
  },
  slideImage: null,
  slideImageStyle: {
    position: "center",
    fit: "contain",
    size: "70%",
  },
  slideTransition: "fade",
  slideDuration: 0.5,
  background: { type: "none", url: null },
  bgTransition: "fade",
  bgDuration: 1.0,
  bgFit: "cover",
  isBlackout: false,
  isClearText: false,
  timer: {
    active: false,
    label: "",
    minutes: 0,
    seconds: 0
  }
};

app.get("/api/projection/state", (req, res) => {
  res.json(projectionState);
});

wss.on("connection", (ws) => {
  // Send current state to newly connected client
  ws.send(JSON.stringify({ type: "INIT_STATE", state: projectionState }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!msg || !msg.type) return;

      // Update in-memory state based on message type
      if (msg.type === "TRIGGER_SLIDE" || msg.type === "UPDATE_SLIDE") {
        projectionState.activeSlideId = msg.slideId ?? projectionState.activeSlideId;
        projectionState.activeSongId = msg.songId ?? projectionState.activeSongId;
        projectionState.slideText = msg.slideText ?? projectionState.slideText;
        projectionState.overlays = msg.overlays ?? projectionState.overlays;
        projectionState.slideStyle = msg.slideStyle ?? projectionState.slideStyle;
        projectionState.slideImage = msg.slideImage ?? projectionState.slideImage;
        projectionState.slideImageStyle = msg.slideImageStyle ?? projectionState.slideImageStyle;
        projectionState.slideTransition = msg.transition ?? projectionState.slideTransition;
        projectionState.slideDuration = msg.duration ?? projectionState.slideDuration;
        projectionState.isClearText = false;
        projectionState.isBlackout = false;
      } else if (msg.type === "UPDATE_BACKGROUND") {
        if (msg.background) {
          projectionState.background = msg.background;
        } else if (msg.mediaUrl) {
          projectionState.background = { url: msg.mediaUrl, type: msg.mediaType || "image" };
        }
        projectionState.bgTransition = msg.bgTransition ?? msg.transition ?? projectionState.bgTransition;
        projectionState.bgDuration = msg.duration ?? projectionState.bgDuration;
        projectionState.bgFit = msg.bgFit ?? msg.fit ?? projectionState.bgFit;
      } else if (msg.type === "CLEAR_ALL") {
        projectionState.slideText = "";
        projectionState.overlays = [];
        projectionState.slideImage = null;
        projectionState.background = { type: "none", url: null };
        projectionState.isClearText = true;
      } else if (msg.type === "CLEAR_TEXT") {
        projectionState.slideText = "";
        projectionState.overlays = [];
        projectionState.slideImage = null;
        projectionState.isClearText = true;
      } else if (msg.type === "CLEAR_BACKGROUND") {
        projectionState.background = { type: "none", url: null };
      } else if (msg.type === "BLACKOUT") {
        projectionState.isBlackout = Boolean(msg.enabled);
      } else if (msg.type === "UPDATE_TIMER") {
        projectionState.timer = {
          active: msg.active,
          label: msg.label,
          minutes: msg.minutes,
          seconds: msg.seconds
        };
      }

      // Broadcast to ALL connected clients
      const payload = JSON.stringify(msg);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    } catch (err) {
      console.error("[WebSocket] Error processing message:", err);
    }
  });
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Serve frontend react static build in production
const distPath = path.join(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

server.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`  DDP PRESENTER - SERVIDOR ACTIVO`);
  console.log(`  Local:           http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(`  En Red (LAN):    http://${ip}:${PORT}`);
    console.log(`  Vite Dev LAN:    http://${ip}:5173`);
    console.log(`  Control Remoto:  http://${ip}:5173/remote`);
  });
  console.log(`======================================================\n`);

  // Proactively ensure default Bible version (RVR1960) is loaded or downloaded
  getBibleVersionData("RVR1960").catch((err) => {
    console.error("[Bible Engine] Error preloading RVR1960 on startup:", err.message);
  });
});
