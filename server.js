import express from "express";
import cors from "cors";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// BIBLE ENDPOINTS (wldeh/bible-api integration)
const BIBLE_BOOKS = [
  // OT (39)
  { id: "génesis", name: "Génesis", testament: "OT", chaptersCount: 50, aliases: ["genesis", "gen", "gn"] },
  { id: "éxodo", name: "Éxodo", testament: "OT", chaptersCount: 40, aliases: ["exodo", "ex", "exo"] },
  { id: "levítico", name: "Levítico", testament: "OT", chaptersCount: 27, aliases: ["levitico", "lev", "lv"] },
  { id: "números", name: "Números", testament: "OT", chaptersCount: 36, aliases: ["numeros", "num", "nm"] },
  { id: "deuteronomio", name: "Deuteronomio", testament: "OT", chaptersCount: 34, aliases: ["deut", "dt"] },
  { id: "josué", name: "Josué", testament: "OT", chaptersCount: 24, aliases: ["josue", "jos"] },
  { id: "jueces", name: "Jueces", testament: "OT", chaptersCount: 21, aliases: ["jue", "jcz"] },
  { id: "rut", name: "Rut", testament: "OT", chaptersCount: 4, aliases: ["rt"] },
  { id: "1samuel", name: "1 Samuel", testament: "OT", chaptersCount: 31, aliases: ["1sam", "1sa", "1s"] },
  { id: "2samuel", name: "2 Samuel", testament: "OT", chaptersCount: 24, aliases: ["2sam", "2sa", "2s"] },
  { id: "1reyes", name: "1 Reyes", testament: "OT", chaptersCount: 22, aliases: ["1rey", "1re", "1r"] },
  { id: "2reyes", name: "2 Reyes", testament: "OT", chaptersCount: 25, aliases: ["2rey", "2re", "2r"] },
  { id: "1crónicas", name: "1 Crónicas", testament: "OT", chaptersCount: 29, aliases: ["1cronicas", "1cron", "1cr"] },
  { id: "2crónicas", name: "2 Crónicas", testament: "OT", chaptersCount: 36, aliases: ["2cronicas", "2cron", "2cr"] },
  { id: "esdras", name: "Esdras", testament: "OT", chaptersCount: 10, aliases: ["esd"] },
  { id: "nehemías", name: "Nehemías", testament: "OT", chaptersCount: 13, aliases: ["nehemias", "neh", "ne"] },
  { id: "ester", name: "Ester", testament: "OT", chaptersCount: 10, aliases: ["est"] },
  { id: "job", name: "Job", testament: "OT", chaptersCount: 42, aliases: ["jb"] },
  { id: "salmos", name: "Salmos", testament: "OT", chaptersCount: 150, aliases: ["salmo", "sal", "ps", "psalms"] },
  { id: "proverbios", name: "Proverbios", testament: "OT", chaptersCount: 31, aliases: ["prov", "prv", "pr"] },
  { id: "eclesiastés", name: "Eclesiastés", testament: "OT", chaptersCount: 12, aliases: ["eclesiastes", "ecl", "ec"] },
  { id: "cantares", name: "Cantares", testament: "OT", chaptersCount: 8, aliases: ["cantar", "cnt", "ct"] },
  { id: "isaías", name: "Isaías", testament: "OT", chaptersCount: 66, aliases: ["isaias", "isa", "is"] },
  { id: "jeremías", name: "Jeremías", testament: "OT", chaptersCount: 52, aliases: ["jeremias", "jer", "jr"] },
  { id: "lamentaciones", name: "Lamentaciones", testament: "OT", chaptersCount: 5, aliases: ["lam", "lm"] },
  { id: "ezequiel", name: "Ezequiel", testament: "OT", chaptersCount: 48, aliases: ["eze", "ez"] },
  { id: "daniel", name: "Daniel", testament: "OT", chaptersCount: 12, aliases: ["dan", "dn"] },
  { id: "oseas", name: "Oseas", testament: "OT", chaptersCount: 14, aliases: ["os"] },
  { id: "joel", name: "Joel", testament: "OT", chaptersCount: 3, aliases: ["jl"] },
  { id: "amós", name: "Amós", testament: "OT", chaptersCount: 9, aliases: ["amos", "am"] },
  { id: "abdías", name: "Abdías", testament: "OT", chaptersCount: 1, aliases: ["abdias", "abd", "ob"] },
  { id: "jonás", name: "Jonás", testament: "OT", chaptersCount: 4, aliases: ["jonas", "jon"] },
  { id: "miqueas", name: "Miqueas", testament: "OT", chaptersCount: 7, aliases: ["miq", "mic"] },
  { id: "nahúm", name: "Nahúm", testament: "OT", chaptersCount: 3, aliases: ["nahum", "nah"] },
  { id: "habacuc", name: "Habacuc", testament: "OT", chaptersCount: 3, aliases: ["hab"] },
  { id: "sofonías", name: "Sofonías", testament: "OT", chaptersCount: 3, aliases: ["sofonias", "sof"] },
  { id: "hageo", name: "Hageo", testament: "OT", chaptersCount: 2, aliases: ["hag"] },
  { id: "zacarías", name: "Zacarías", testament: "OT", chaptersCount: 14, aliases: ["zacarias", "zac"] },
  { id: "malaquías", name: "Malaquías", testament: "OT", chaptersCount: 4, aliases: ["malaquias", "mal"] },
  // NT (27)
  { id: "sanmateo", name: "Mateo", testament: "NT", chaptersCount: 28, aliases: ["mateo", "mt", "mat"] },
  { id: "sanmarcos", name: "Marcos", testament: "NT", chaptersCount: 16, aliases: ["marcos", "mr", "mc", "mark"] },
  { id: "sanlucas", name: "Lucas", testament: "NT", chaptersCount: 24, aliases: ["lucas", "lc", "luke"] },
  { id: "sanjuan", name: "Juan", testament: "NT", chaptersCount: 21, aliases: ["juan", "jn", "john"] },
  { id: "hechos", name: "Hechos", testament: "NT", chaptersCount: 28, aliases: ["hch", "hcho", "acts"] },
  { id: "romanos", name: "Romanos", testament: "NT", chaptersCount: 16, aliases: ["rom", "ro", "rm"] },
  { id: "1corintios", name: "1 Corintios", testament: "NT", chaptersCount: 16, aliases: ["1cor", "1co", "1c"] },
  { id: "2corintios", name: "2 Corintios", testament: "NT", chaptersCount: 13, aliases: ["2cor", "2co", "2c"] },
  { id: "gálatas", name: "Gálatas", testament: "NT", chaptersCount: 6, aliases: ["galatas", "gal", "ga"] },
  { id: "efesios", name: "Efesios", testament: "NT", chaptersCount: 6, aliases: ["efe", "ef"] },
  { id: "filipenses", name: "Filipenses", testament: "NT", chaptersCount: 4, aliases: ["fil", "flp"] },
  { id: "colosenses", name: "Colosenses", testament: "NT", chaptersCount: 4, aliases: ["col"] },
  { id: "1tesalonicenses", name: "1 Tesalonicenses", testament: "NT", chaptersCount: 5, aliases: ["1tes", "1ts"] },
  { id: "2tesalonicenses", name: "2 Tesalonicenses", testament: "NT", chaptersCount: 3, aliases: ["2tes", "2ts"] },
  { id: "1timoteo", name: "1 Timoteo", testament: "NT", chaptersCount: 6, aliases: ["1tim", "1tm"] },
  { id: "2timoteo", name: "2 Timoteo", testament: "NT", chaptersCount: 4, aliases: ["2tim", "2tm"] },
  { id: "tito", name: "Tito", testament: "NT", chaptersCount: 3, aliases: ["tit"] },
  { id: "filemón", name: "Filemón", testament: "NT", chaptersCount: 1, aliases: ["filemon", "flm"] },
  { id: "hebreos", name: "Hebreos", testament: "NT", chaptersCount: 13, aliases: ["heb"] },
  { id: "santiago", name: "Santiago", testament: "NT", chaptersCount: 5, aliases: ["stg", "jas"] },
  { id: "1pedro", name: "1 Pedro", testament: "NT", chaptersCount: 5, aliases: ["1ped", "1pe", "1p"] },
  { id: "2pedro", name: "2 Pedro", testament: "NT", chaptersCount: 3, aliases: ["2ped", "2pe", "2p"] },
  { id: "1juan", name: "1 Juan", testament: "NT", chaptersCount: 5, aliases: ["1jn", "1j"] },
  { id: "2juan", name: "2 Juan", testament: "NT", chaptersCount: 1, aliases: ["2jn", "2j"] },
  { id: "3juan", name: "3 Juan", testament: "NT", chaptersCount: 1, aliases: ["3jn", "3j"] },
  { id: "judas", name: "Judas", testament: "NT", chaptersCount: 1, aliases: ["jod", "jd"] },
  { id: "apocalipsis", name: "Apocalipsis", testament: "NT", chaptersCount: 22, aliases: ["apoc", "ap", "rev", "revelation"] }
];

function cleanVerseText(text) {
  if (!text) return "";
  let cleaned = text;
  // Match cross-reference markers like '3.1 cp. 7.50 y 19.39.', '3.16 Ro. 5.8.', etc.
  cleaned = cleaned.replace(/(?:\d+\.\d+\s*)?(?:[1-3]?\s*[A-Z][a-z]{1,4}\.|\bcp\.)(?:\s*[\d\.\,\;\-]+|\s+y\s+|\s+e\s+)+/gi, " ");
  cleaned = cleaned.replace(/\d+\.\d+\s*/g, " ");
  return cleaned.replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
}

function resolveBook(inputStr) {
  if (!inputStr) return null;
  const cleanInput = inputStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  for (const book of BIBLE_BOOKS) {
    const cleanId = book.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanName = book.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanInput === cleanId || cleanInput === cleanName) {
      return book;
    }
    for (const alias of book.aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanInput === cleanAlias) {
        return book;
      }
    }
  }

  // Prefix match fallback
  for (const book of BIBLE_BOOKS) {
    const cleanName = book.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName.startsWith(cleanInput)) {
      return book;
    }
  }

  return null;
}

let versionsCache = null;
const chapterCache = new Map();

async function fetchRemoteChapter(version, bookFolder, chapterNum) {
  const cacheKey = `${version}:${bookFolder}:${chapterNum}`;
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey);
  }

  const url = `https://raw.githubusercontent.com/wldeh/bible-api/main/bibles/${encodeURIComponent(version)}/books/${encodeURIComponent(bookFolder)}/chapters/${encodeURIComponent(chapterNum)}.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    if (!json || !Array.isArray(json.data)) return null;

    const verses = json.data.map(v => ({
      book: v.book,
      chapter: parseInt(v.chapter, 10),
      verse: parseInt(v.verse, 10),
      text: cleanVerseText(v.text)
    }));

    chapterCache.set(cacheKey, verses);
    return verses;
  } catch (err) {
    console.error(`Error fetching chapter ${version}/${bookFolder}/${chapterNum}:`, err.message);
    return null;
  }
}

app.get("/api/bible/versions", async (req, res) => {
  if (versionsCache) {
    return res.json(versionsCache);
  }
  try {
    const response = await fetch("https://raw.githubusercontent.com/wldeh/bible-api/main/bibles/bibles.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawVersions = await response.json();
    
    // Sort versions so Spanish versions come first
    const spanishPriority = ["es-rv09", "es-bes", "es-pddpt", "es-vbl"];
    const formatted = rawVersions.map(v => ({
      id: v.id,
      name: v.version,
      language: v.language?.name || "",
      langCode: v.language?.code || "",
      localAbbr: v.localVersionAbbreviation || v.id,
      isSpanish: (v.language?.code === "spa" || v.language?.name?.toLowerCase().includes("spanish"))
    })).sort((a, b) => {
      const pA = spanishPriority.indexOf(a.id);
      const pB = spanishPriority.indexOf(b.id);
      if (pA !== -1 && pB !== -1) return pA - pB;
      if (pA !== -1) return -1;
      if (pB !== -1) return 1;
      if (a.isSpanish && !b.isSpanish) return -1;
      if (!a.isSpanish && b.isSpanish) return 1;
      return a.name.localeCompare(b.name);
    });

    versionsCache = formatted;
    res.json(versionsCache);
  } catch (err) {
    console.error("Error loading Bible versions:", err);
    // Fallback versions if offline
    res.json([
      { id: "es-rv09", name: "Reina Valera 1909", language: "Spanish", langCode: "spa", localAbbr: "RV09", isSpanish: true },
      { id: "es-bes", name: "La Biblia en Español Sencillo", language: "Spanish", langCode: "spa", localAbbr: "BES", isSpanish: true },
      { id: "es-pddpt", name: "Palabra de Dios para ti", language: "Spanish", langCode: "spa", localAbbr: "PdDpt", isSpanish: true },
      { id: "es-vbl", name: "Versión Biblia Libre", language: "Spanish", langCode: "spa", localAbbr: "VBL", isSpanish: true },
      { id: "en-kjv", name: "King James Version", language: "English", langCode: "eng", localAbbr: "KJV", isSpanish: false }
    ]);
  }
});

app.get("/api/bible/books", (req, res) => {
  res.json(BIBLE_BOOKS);
});

app.get("/api/bible/chapter", async (req, res) => {
  const { version = "es-rv09", book: bookId = "sanjuan", chapter = "1" } = req.query;
  const bookObj = resolveBook(bookId) || BIBLE_BOOKS.find(b => b.id === bookId);
  const folder = bookObj ? bookObj.id : bookId;

  const verses = await fetchRemoteChapter(version, folder, chapter);
  if (!verses) {
    return res.status(404).json({ error: "Capítulo no encontrado" });
  }

  // Ensure display book name uses canonical name if available
  const result = verses.map(v => ({
    ...v,
    book: bookObj ? bookObj.name : v.book
  }));

  res.json({
    version,
    book: bookObj ? bookObj.name : bookId,
    chapter: parseInt(chapter, 10),
    results: result
  });
});

app.get("/api/bible/search", async (req, res) => {
  const { query, version = "es-rv09" } = req.query;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  const cleanQuery = query.trim().replace(/\s+/g, " ");

  // Pattern: "Book Chapter:Verse-EndVerse" or "Book Chapter:Verse" (e.g. "Juan 3:16" or "Juan 3:16-18")
  const passageRegex = /^(.+?)\s+(\d+)[:\s]+(\d+)(?:-(\d+))?$/i;
  // Pattern: "Book Chapter" (e.g. "Juan 3" or "Salmos 23")
  const chapterRegex = /^(.+?)\s+(\d+)$/i;

  let matchPassage = cleanQuery.match(passageRegex);
  let matchChapter = cleanQuery.match(chapterRegex);

  if (matchPassage) {
    const rawBook = matchPassage[1];
    const chapterNum = matchPassage[2];
    const startVerse = parseInt(matchPassage[3], 10);
    const endVerse = matchPassage[4] ? parseInt(matchPassage[4], 10) : startVerse;

    const bookObj = resolveBook(rawBook);
    if (!bookObj) {
      return res.json({ query, version, results: [] });
    }

    const chapterVerses = await fetchRemoteChapter(version, bookObj.id, chapterNum);
    if (!chapterVerses) {
      return res.json({ query, version, results: [] });
    }

    const results = chapterVerses
      .filter(v => v.verse >= startVerse && v.verse <= endVerse)
      .map(v => ({ ...v, book: bookObj.name }));

    return res.json({ query, type: "passage", version, results });
  }

  if (matchChapter) {
    const rawBook = matchChapter[1];
    const chapterNum = matchChapter[2];

    const bookObj = resolveBook(rawBook);
    if (!bookObj) {
      return res.json({ query, version, results: [] });
    }

    const chapterVerses = await fetchRemoteChapter(version, bookObj.id, chapterNum);
    if (!chapterVerses) {
      return res.json({ query, version, results: [] });
    }

    const results = chapterVerses.map(v => ({ ...v, book: bookObj.name }));
    return res.json({ query, type: "chapter", version, results });
  }

  // Book name only (e.g. "Juan" or "Salmos") -> load Chapter 1
  const bookOnlyObj = resolveBook(cleanQuery);
  if (bookOnlyObj) {
    const chapterVerses = await fetchRemoteChapter(version, bookOnlyObj.id, 1);
    if (chapterVerses) {
      const results = chapterVerses.map(v => ({ ...v, book: bookOnlyObj.name }));
      return res.json({ query, type: "chapter", version, results });
    }
  }

  // Keyword search fallback across current sample or popular books
  const searchWord = cleanQuery.toLowerCase();
  const popularBooks = ["sanjuan", "salmos", "romanos", "sanmateo", "génesis"];
  const results = [];

  for (const bookFolder of popularBooks) {
    const bookObj = BIBLE_BOOKS.find(b => b.id === bookFolder);
    const chapterVerses = await fetchRemoteChapter(version, bookFolder, 1);
    if (chapterVerses) {
      for (const v of chapterVerses) {
        if (v.text.toLowerCase().includes(searchWord)) {
          results.push({ ...v, book: bookObj ? bookObj.name : v.book });
          if (results.length >= 50) break;
        }
      }
    }
    if (results.length >= 50) break;
  }

  return res.json({ query, type: "keyword", version, results });
});

// Serve frontend react static build in production
const distPath = path.join(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running locally on port ${PORT}`);
});
