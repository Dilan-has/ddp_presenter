import { useState, useEffect, useRef } from "react";
import { sendProjectionMessage, onProjectionMessage } from "../../utils/networkSync";

export default function RemoteControl() {
  const [liveState, setLiveState] = useState({
    slideText: "",
    slideImage: null,
    background: { type: "none", url: null },
    isBlackout: false,
    activeSlideId: null
  });

  const [activeTab, setActiveTab] = useState("slides"); // "slides" | "songs" | "backgrounds" | "bible"
  const [showMonitor, setShowMonitor] = useState(true);

  // Songs
  const [songs, setSongs] = useState([]);
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [activeSong, setActiveSong] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(-1);
  const [loadingSongs, setLoadingSongs] = useState(false);

  // Backgrounds / Media
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaFilter, setMediaFilter] = useState("all");
  const [bgFit, setBgFit] = useState("cover");
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Bible
  const [bibleVersions, setBibleVersions] = useState([]);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState("RVR1960");
  const [bibleBooks, setBibleBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState("génesis");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [chapterVerses, setChapterVerses] = useState([]);
  const [bibleFilter, setBibleFilter] = useState("");
  const [loadingBible, setLoadingBible] = useState(false);

  const activeSlideRef = useRef(null);

  // Subscribe to projection events
  useEffect(() => {
    const unsubscribe = onProjectionMessage((msg) => {
      if (!msg) return;

      if (msg.type === "INIT_STATE") {
        const s = msg.state;
        if (s) {
          setLiveState({
            slideText: s.slideText || "",
            slideImage: s.slideImage || null,
            background: s.background || { type: "none", url: null },
            isBlackout: Boolean(s.isBlackout),
            activeSlideId: s.activeSlideId
          });
          if (s.bgFit) setBgFit(s.bgFit);
        }
      } else if (msg.type === "TRIGGER_SLIDE" || msg.type === "UPDATE_SLIDE") {
        setLiveState((prev) => ({
          ...prev,
          slideText: msg.slideText ?? prev.slideText,
          slideImage: msg.slideImage ?? prev.slideImage,
          activeSlideId: msg.slideId ?? prev.activeSlideId,
          isBlackout: false
        }));
      } else if (msg.type === "UPDATE_BACKGROUND") {
        const bgObj = msg.background || (msg.mediaUrl ? { url: msg.mediaUrl, type: msg.mediaType || "image" } : null);
        if (bgObj) {
          setLiveState((prev) => ({
            ...prev,
            background: bgObj
          }));
        }
        if (msg.bgFit || msg.fit) setBgFit(msg.bgFit || msg.fit);
      } else if (msg.type === "CLEAR_ALL") {
        setLiveState({
          slideText: "",
          slideImage: null,
          background: { type: "none", url: null },
          isBlackout: false,
          activeSlideId: null
        });
      } else if (msg.type === "CLEAR_TEXT") {
        setLiveState((prev) => ({
          ...prev,
          slideText: "",
          slideImage: null,
          activeSlideId: null
        }));
      } else if (msg.type === "CLEAR_BACKGROUND") {
        setLiveState((prev) => ({
          ...prev,
          background: { type: "none", url: null }
        }));
      } else if (msg.type === "BLACKOUT") {
        setLiveState((prev) => ({
          ...prev,
          isBlackout: Boolean(msg.enabled)
        }));
      }
    });

    return unsubscribe;
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchSongs();
    fetchMediaFiles();
    fetchBibleVersions();
    fetchBibleBooks("RVR1960");
  }, []);

  // SONGS
  const fetchSongs = async () => {
    setLoadingSongs(true);
    try {
      const res = await fetch("/api/library");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSongs(data);
          if (data.length > 0 && !activeSong) {
            loadSongDetails(data[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error loading songs:", err);
    } finally {
      setLoadingSongs(false);
    }
  };

  const loadSongDetails = async (songSummary) => {
    if (!songSummary || !songSummary.filePath) return;
    try {
      const res = await fetch(`/api/library/get?filePath=${encodeURIComponent(songSummary.filePath)}`);
      if (res.ok) {
        const fullSong = await res.json();
        if (fullSong && typeof fullSong === "object") {
          setActiveSong({
            ...fullSong,
            filePath: songSummary.filePath,
            slides: fullSong.slides || []
          });
          setCurrentSlideIndex(-1);
          setActiveTab("slides");
        }
      }
    } catch (err) {
      console.error("Error loading song details:", err);
    }
  };

  // MEDIA
  const fetchMediaFiles = async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMediaFiles(data);
        }
      }
    } catch (err) {
      console.error("Error loading media files:", err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleSelectBackground = (media) => {
    sendProjectionMessage({
      type: "UPDATE_BACKGROUND",
      background: { url: media.url, type: media.type },
      mediaUrl: media.url,
      mediaType: media.type,
      bgFit: bgFit,
      fit: bgFit,
      transition: "fade",
      duration: 0.8
    });

    setLiveState((prev) => ({
      ...prev,
      background: { url: media.url, type: media.type }
    }));
  };

  const handleClearBackground = () => {
    sendProjectionMessage({ type: "CLEAR_BACKGROUND" });
    setLiveState((prev) => ({
      ...prev,
      background: { type: "none", url: null }
    }));
  };

  // BIBLE
  const fetchBibleVersions = async () => {
    try {
      const res = await fetch("/api/bible/versions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBibleVersions(data);
        }
      }
    } catch (err) {
      console.error("Error loading bible versions:", err);
    }
  };

  const fetchBibleBooks = async (version = selectedBibleVersion) => {
    try {
      const res = await fetch(`/api/bible/books?version=${encodeURIComponent(version)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBibleBooks(data);
          if (data.length > 0) {
            setSelectedBook((prev) => {
              const exists = data.some((b) => b.id === prev);
              return exists ? prev : data[0].id;
            });
          }
        }
      }
    } catch (err) {
      console.error("Error loading bible books:", err);
    }
  };

  const loadBibleChapter = async (bookId, chapterNum, version = selectedBibleVersion) => {
    if (!bookId) return;
    setLoadingBible(true);
    try {
      const res = await fetch(
        `/api/bible/chapter?version=${encodeURIComponent(version)}&book=${encodeURIComponent(bookId)}&chapter=${chapterNum}`
      );
      if (res.ok) {
        const data = await res.json();
        const verses = data.results || data.verses || [];
        setChapterVerses(verses);
      } else {
        setChapterVerses([]);
      }
    } catch (err) {
      console.error("Error loading chapter:", err);
      setChapterVerses([]);
    } finally {
      setLoadingBible(false);
    }
  };

  useEffect(() => {
    if (activeTab === "bible" && selectedBook) {
      loadBibleChapter(selectedBook, selectedChapter, selectedBibleVersion);
    }
  }, [activeTab, selectedBook, selectedChapter, selectedBibleVersion]);

  const handleSelectBook = (bookId) => {
    setSelectedBook(bookId);
    const bookObj = bibleBooks.find((b) => b.id === bookId);
    const maxCh = bookObj?.chaptersCount || 50;
    if (selectedChapter > maxCh) {
      setSelectedChapter(1);
    }
  };

  const handleSelectVersion = (versionId) => {
    setSelectedBibleVersion(versionId);
    fetchBibleBooks(versionId);
  };

  // TRIGGER SLIDE
  const handleTriggerSlide = (slide, index) => {
    if (!slide) return;
    setCurrentSlideIndex(index);

    // Send both UPDATE_SLIDE and TRIGGER_SLIDE for full compatibility
    const slidePayload = {
      type: "UPDATE_SLIDE",
      slideId: slide.id,
      slideText: slide.text || "",
      slideImage: slide.imageUrl || null,
      slideImageStyle: slide.imageStyle || {},
      overlays: slide.overlays || [],
      slideStyle: slide.style || {},
      transition: "fade",
      duration: 0.4
    };

    sendProjectionMessage(slidePayload);

    if (slide.backgroundUrl) {
      sendProjectionMessage({
        type: "UPDATE_BACKGROUND",
        background: { url: slide.backgroundUrl, type: slide.backgroundType || "image" },
        mediaUrl: slide.backgroundUrl,
        mediaType: slide.backgroundType || "image",
        bgFit: slide.backgroundFit || bgFit,
        transition: "fade",
        duration: 0.8
      });
      setLiveState((prev) => ({
        ...prev,
        background: { url: slide.backgroundUrl, type: slide.backgroundType || "image" }
      }));
    }

    setLiveState((prev) => ({
      ...prev,
      slideText: slide.text || "",
      slideImage: slide.imageUrl || null,
      activeSlideId: slide.id,
      isBlackout: false
    }));
  };

  const handleNextSlide = () => {
    if (!activeSong?.slides || activeSong.slides.length === 0) return;
    const nextIdx = currentSlideIndex + 1;
    if (nextIdx < activeSong.slides.length) {
      handleTriggerSlide(activeSong.slides[nextIdx], nextIdx);
    }
  };

  const handlePrevSlide = () => {
    if (!activeSong?.slides || activeSong.slides.length === 0) return;
    const prevIdx = currentSlideIndex - 1;
    if (prevIdx >= 0) {
      handleTriggerSlide(activeSong.slides[prevIdx], prevIdx);
    }
  };

  const handleClearText = () => {
    sendProjectionMessage({ type: "CLEAR_TEXT" });
    setLiveState((prev) => ({ ...prev, slideText: "", slideImage: null, activeSlideId: null }));
  };

  const handleToggleBlackout = () => {
    const nextBlackout = !liveState.isBlackout;
    sendProjectionMessage({ type: "BLACKOUT", enabled: nextBlackout });
    setLiveState((p) => ({ ...p, isBlackout: nextBlackout }));
  };

  const handleClearAll = () => {
    sendProjectionMessage({ type: "CLEAR_ALL" });
    setLiveState({
      slideText: "",
      slideImage: null,
      background: { type: "none", url: null },
      isBlackout: false,
      activeSlideId: null
    });
  };

  const handleTriggerVerse = (verse) => {
    const bookObj = bibleBooks.find((b) => b.id === selectedBook || b.name === verse.book);
    const bookName = verse.book || bookObj?.name || selectedBook;
    const chapterNum = verse.chapter || selectedChapter;
    const ref = `${bookName} ${chapterNum}:${verse.verse}`;
    const text = `"${verse.text}"\n\n${ref}`;
    const slideId = `bible-remote-${verse.verse}`;

    const slidePayload = {
      type: "UPDATE_SLIDE",
      slideId,
      slideText: text,
      slideImage: null,
      slideImageStyle: {},
      overlays: [],
      slideStyle: {
        fontSize: "44px",
        textAlign: "center",
        verticalAlign: "center",
        fontWeight: "bold",
        lineHeight: 1.3
      },
      transition: "fade",
      duration: 0.4
    };

    sendProjectionMessage(slidePayload);
    sendProjectionMessage({ ...slidePayload, type: "TRIGGER_SLIDE" });

    setLiveState((prev) => ({
      ...prev,
      slideText: text,
      slideImage: null,
      activeSlideId: slideId,
      isBlackout: false
    }));
  };

  // Filtered lists
  const filteredSongs = songs.filter((s) => {
    if (!songSearchQuery.trim()) return true;
    const q = songSearchQuery.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.section?.toLowerCase().includes(q);
  });

  const filteredMedia = mediaFiles.filter((m) => {
    if (mediaFilter === "all") return true;
    return m.type === mediaFilter;
  });

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col select-none font-sans overflow-hidden">
      {/* Top Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-2.5 flex items-center justify-between shrink-0 z-30 shadow">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tight">DDP Remote</span>
          {activeSong && (
            <span className="text-[11px] font-semibold text-primary truncate max-w-[140px] sm:max-w-[200px]">
              • {activeSong.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowMonitor(!showMonitor)}
            className={`p-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
              showMonitor ? "bg-zinc-800 border-zinc-700 text-zinc-200" : "bg-transparent border-transparent text-zinc-500"
            }`}
            title="Alternar Monitor en Vivo"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
          </button>

          <a
            href="/"
            className="p-1.5 bg-zinc-800 active:bg-zinc-700 rounded-lg text-zinc-300 font-medium text-xs flex items-center"
            title="Ir a Pantalla Completa de Escritorio"
          >
            <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
          </a>
        </div>
      </header>

      {/* Collapsible Compact Live Monitor */}
      {showMonitor && (
        <div className="bg-zinc-900/90 border-b border-zinc-800 p-2.5 shrink-0 transition-all">
          <div className="aspect-[16/7] bg-black rounded-lg border border-zinc-800 relative overflow-hidden flex items-center justify-center p-2.5 text-center shadow-inner">
            {/* Background preview */}
            {liveState.background?.url && (
              <div className="absolute inset-0 z-0">
                {liveState.background.type === "video" ? (
                  <video
                    src={liveState.background.url}
                    className="w-full h-full object-cover opacity-50"
                    autoPlay
                    muted
                    loop
                  />
                ) : (
                  <img
                    src={liveState.background.url}
                    alt=""
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
              </div>
            )}

            {/* Slide image preview */}
            {liveState.slideImage && (
              <img
                src={liveState.slideImage}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none p-1.5 z-5"
              />
            )}

            {/* Slide text */}
            {liveState.slideText && (
              <p className="text-white text-xs sm:text-sm font-bold relative z-10 drop-shadow-md whitespace-pre-line line-clamp-3 leading-snug">
                {liveState.slideText}
              </p>
            )}

            {!liveState.slideText && !liveState.slideImage && !liveState.background?.url && (
              <span className="text-zinc-600 text-[11px] italic">Pantalla en reposo</span>
            )}

            {/* Blackout Indicator */}
            {liveState.isBlackout && (
              <div className="absolute inset-0 bg-black z-20 flex items-center justify-center">
                <span className="text-xs font-bold text-red-500 tracking-wider">● BLACKOUT ACTIVO</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Center Content Area */}
      <main className="flex-1 overflow-y-auto p-3 overscroll-contain">
        {/* TAB 1: SLIDES */}
        {activeTab === "slides" && (
          <div className="flex flex-col gap-2 pb-24">
            {activeSong ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                  <span className="font-semibold text-white truncate max-w-[200px]">{activeSong.title}</span>
                  <span>{activeSong.slides?.length || 0} diapositivas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeSong.slides?.map((slide, idx) => {
                    const isLive = liveState.activeSlideId === slide.id;
                    const isCurrent = currentSlideIndex === idx;

                    return (
                      <button
                        key={slide.id || idx}
                        onClick={() => handleTriggerSlide(slide, idx)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-1 active:scale-[0.98] ${
                          isLive
                            ? "bg-red-950/50 border-red-500 ring-2 ring-red-500/60 shadow-lg"
                            : isCurrent
                            ? "bg-primary/20 border-primary shadow"
                            : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isLive ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {slide.label || `S${idx + 1}`}
                          </span>
                          {isLive && (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                              ● EN VIVO
                            </span>
                          )}
                        </div>

                        {slide.imageUrl && (
                          <div className="w-full h-16 bg-black rounded overflow-hidden mt-1">
                            <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {slide.text ? (
                          <p className="text-xs text-zinc-200 font-medium line-clamp-2 mt-1 leading-snug">
                            {slide.text}
                          </p>
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic mt-1">Solo imagen</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-2 text-zinc-500 text-xs">
                <span className="material-symbols-outlined text-4xl text-zinc-600">queue_music</span>
                <p className="text-sm font-semibold text-zinc-400">Sin canción seleccionada</p>
                <p>Elige una canción en la pestaña "Canciones" para comenzar.</p>
                <button
                  onClick={() => setActiveTab("songs")}
                  className="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl text-xs mt-2 active:scale-95 transition-transform"
                >
                  Ver Lista de Canciones
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SONGS */}
        {activeTab === "songs" && (
          <div className="flex flex-col gap-2.5 pb-24">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por título o sección..."
                value={songSearchQuery}
                onChange={(e) => setSongSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 pl-9 text-xs text-white placeholder-zinc-500 outline-none focus:border-primary"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-3 text-zinc-500 text-base pointer-events-none">
                search
              </span>
              {songSearchQuery && (
                <button
                  onClick={() => setSongSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Biblioteca ({filteredSongs.length})</span>
              <button
                onClick={fetchSongs}
                className="text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 text-[10px]"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                <span>Recargar</span>
              </button>
            </div>

            {loadingSongs ? (
              <div className="text-center py-12 text-zinc-500 text-xs animate-pulse">Cargando canciones...</div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredSongs.map((song) => {
                  const isSelected = activeSong?.filePath === song.filePath;
                  return (
                    <button
                      key={song.filePath || song.id}
                      onClick={() => loadSongDetails(song)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                        isSelected
                          ? "bg-primary/20 border-primary text-white font-bold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{song.title}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                          <span>{song.section || "General"}</span>
                          <span>•</span>
                          <span>{song.slideCount || 0} diapositivas</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-primary text-base">arrow_forward</span>
                    </button>
                  );
                })}

                {filteredSongs.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No se encontraron canciones con ese nombre.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BACKGROUNDS */}
        {activeTab === "backgrounds" && (
          <div className="flex flex-col gap-3 pb-24">
            {/* Filter buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                <button
                  onClick={() => setMediaFilter("all")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                    mediaFilter === "all" ? "bg-primary text-on-primary" : "text-zinc-400"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setMediaFilter("image")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                    mediaFilter === "image" ? "bg-primary text-on-primary" : "text-zinc-400"
                  }`}
                >
                  Fotos
                </button>
                <button
                  onClick={() => setMediaFilter("video")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                    mediaFilter === "video" ? "bg-primary text-on-primary" : "text-zinc-400"
                  }`}
                >
                  Videos
                </button>
              </div>

              {liveState.background?.url && (
                <button
                  onClick={handleClearBackground}
                  className="py-1 px-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded-lg text-[10px] font-bold text-red-300 flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                  <span>Quitar Fondo</span>
                </button>
              )}
            </div>

            {/* Media Grid */}
            {loadingMedia ? (
              <div className="text-center py-12 text-zinc-500 text-xs animate-pulse">Cargando fondos...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredMedia.map((media) => {
                  const isActive = liveState.background?.url === media.url;
                  return (
                    <button
                      key={media.filename}
                      onClick={() => handleSelectBackground(media)}
                      className={`aspect-video rounded-xl overflow-hidden border-2 relative group text-left transition-all active:scale-95 bg-black ${
                        isActive
                          ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      {media.type === "image" ? (
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={media.url} className="w-full h-full object-cover" muted />
                      )}

                      {isActive && (
                        <div className="absolute top-1 right-1 bg-emerald-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded shadow">
                          EN PANTALLA
                        </div>
                      )}

                      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1 flex items-center text-[10px] text-white">
                        <span className="material-symbols-outlined text-[11px] mr-0.5">
                          {media.type === "image" ? "image" : "movie"}
                        </span>
                        <span className="text-[8px]">{media.type === "image" ? "Foto" : "Video"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BIBLE */}
        {activeTab === "bible" && (() => {
          const activeBookObj = bibleBooks.find((b) => b.id === selectedBook);
          const totalChapters = activeBookObj?.chaptersCount || 50;
          const filteredVerses = chapterVerses.filter((v) => {
            if (!bibleFilter.trim()) return true;
            const q = bibleFilter.toLowerCase().trim();
            return String(v.verse) === q || v.text.toLowerCase().includes(q);
          });

          return (
            <div className="flex flex-col gap-3 pb-24">
              {/* Version & Book Selector */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-primary">auto_stories</span>
                    Versión
                  </label>
                  <select
                    value={selectedBibleVersion}
                    onChange={(e) => handleSelectVersion(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white outline-none mt-1 font-semibold truncate"
                  >
                    {bibleVersions.length > 0 ? (
                      bibleVersions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.localAbbr || v.id} ({v.name?.slice(0, 18)})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="RVR1960">RVR1960 - Reina Valera</option>
                        <option value="NVI">NVI - Nueva Versión Int.</option>
                        <option value="NTV">NTV - Nueva Trad. Viviente</option>
                        <option value="LBLA">LBLA - Las Américas</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-amber-400">book</span>
                    Libro
                  </label>
                  <select
                    value={selectedBook}
                    onChange={(e) => handleSelectBook(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white outline-none mt-1 font-semibold truncate"
                  >
                    {bibleBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chapter Selector with Quick Steppers */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-bold text-zinc-200">
                    {activeBookObj?.name || "Libro"} - Capítulo {selectedChapter}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Total: {totalChapters} {totalChapters === 1 ? "capítulo" : "capítulos"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
                    disabled={selectedChapter <= 1}
                    className="h-10 w-11 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg flex items-center justify-center text-white border border-zinc-700/80 transition-transform active:scale-95"
                    title="Capítulo anterior"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>

                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(parseInt(e.target.value) || 1)}
                    className="flex-1 h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-xs font-bold text-white outline-none text-center"
                  >
                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                      <option key={ch} value={ch}>
                        Capítulo {ch}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setSelectedChapter((c) => Math.min(totalChapters, c + 1))}
                    disabled={selectedChapter >= totalChapters}
                    className="h-10 w-11 bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg flex items-center justify-center text-white border border-zinc-700/80 transition-transform active:scale-95"
                    title="Capítulo siguiente"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Verses Filter Input */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filtrar versículo o texto del capítulo..."
                  value={bibleFilter}
                  onChange={(e) => setBibleFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-primary transition-colors"
                />
                {bibleFilter && (
                  <button
                    onClick={() => setBibleFilter("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Verses List */}
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between text-[11px] px-1 text-zinc-400">
                  <span className="font-semibold text-zinc-300">Versículos (Toca para proyectar)</span>
                  <span className="font-mono text-[10px]">
                    {filteredVerses.length} {filteredVerses.length === 1 ? "versículo" : "versículos"}
                  </span>
                </div>

                {loadingBible ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2 text-zinc-400 text-xs animate-pulse">
                    <span className="material-symbols-outlined text-2xl text-primary animate-spin">sync</span>
                    <span>Cargando versículos de la Biblia...</span>
                  </div>
                ) : filteredVerses.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-500 text-xs">
                    {bibleFilter ? "No hay versículos que coincidan con la búsqueda." : "No hay versículos disponibles."}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredVerses.map((v) => {
                      const isLive =
                        liveState.activeSlideId === `bible-remote-${v.verse}` ||
                        (liveState.slideText && liveState.slideText.includes(v.text));

                      return (
                        <button
                          key={v.verse}
                          onClick={() => handleTriggerVerse(v)}
                          className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 active:scale-[0.98] ${
                            isLive
                              ? "bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/60 shadow-lg text-white"
                              : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isLive ? "bg-emerald-500 text-black font-extrabold" : "bg-zinc-800 text-primary"
                              }`}
                            >
                              v{v.verse}
                            </span>
                            {isLive && (
                              <span className="text-[10px] font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                EN PANTALLA
                              </span>
                            )}
                          </div>
                          <span className="leading-relaxed mt-0.5">{v.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      {/* Floating Bottom Presentation Controller (Thumb Reachable) */}
      <footer className="bg-zinc-900 border-t border-zinc-800 p-2 shrink-0 z-30 shadow-2xl flex flex-col gap-1.5">
        {/* Big Previous / Next buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePrevSlide}
            className="h-12 bg-zinc-800 active:bg-zinc-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-zinc-700 shadow active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>ANTERIOR</span>
          </button>

          <button
            onClick={handleNextSlide}
            className="h-12 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-emerald-500 shadow active:scale-95 transition-transform"
          >
            <span>SIGUIENTE</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>

        {/* Quick Actions Strip */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/80">
          <button
            onClick={handleClearText}
            className="flex-1 py-1.5 px-1 bg-zinc-800/80 active:bg-zinc-700 text-[10px] font-semibold text-zinc-200 rounded-lg flex items-center justify-center gap-1 border border-zinc-700/60"
          >
            <span className="material-symbols-outlined text-xs text-amber-400">format_clear</span>
            <span>Texto</span>
          </button>

          <button
            onClick={handleClearBackground}
            className="flex-1 py-1.5 px-1 bg-zinc-800/80 active:bg-zinc-700 text-[10px] font-semibold text-zinc-200 rounded-lg flex items-center justify-center gap-1 border border-zinc-700/60"
          >
            <span className="material-symbols-outlined text-xs text-blue-400">hide_image</span>
            <span>Fondo</span>
          </button>

          <button
            onClick={handleToggleBlackout}
            className={`flex-1 py-1.5 px-1 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1 border ${
              liveState.isBlackout
                ? "bg-red-600 text-white border-red-500 animate-pulse"
                : "bg-zinc-800/80 text-zinc-200 border-zinc-700/60"
            }`}
          >
            <span className="material-symbols-outlined text-xs text-red-400">dark_mode</span>
            <span>Blackout</span>
          </button>

          <button
            onClick={handleClearAll}
            className="py-1.5 px-2 bg-red-950/80 active:bg-red-900 text-red-300 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-0.5 border border-red-800/80"
          >
            <span className="material-symbols-outlined text-xs">close</span>
            <span>Todo</span>
          </button>
        </div>

        {/* Bottom Tab Bar */}
        <nav className="flex items-center justify-around pt-1 border-t border-zinc-800">
          <button
            onClick={() => setActiveTab("slides")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
              activeTab === "slides" ? "text-primary" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="material-symbols-outlined text-base">slideshow</span>
            <span>Diapos</span>
          </button>

          <button
            onClick={() => setActiveTab("songs")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
              activeTab === "songs" ? "text-primary" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="material-symbols-outlined text-base">queue_music</span>
            <span>Canciones</span>
          </button>

          <button
            onClick={() => setActiveTab("backgrounds")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
              activeTab === "backgrounds" ? "text-primary" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="material-symbols-outlined text-base">wallpaper</span>
            <span>Fondos</span>
          </button>

          <button
            onClick={() => setActiveTab("bible")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
              activeTab === "bible" ? "text-primary" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            <span>Biblia</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
