import { useState, useEffect, useRef } from "react";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRight";
import CenterPanel from "./CenterPanel";
import MediaBin from "./MediaBin";
import ReflowEditor from "./ReflowEditor";

// Initialize BroadcastChannel for local multiscreen synchronization
const projectionChannel = new BroadcastChannel("ddp_projection");

export default function OperatorPanel() {
  const [activeTab, setActiveTab] = useState("production-interface");
  
  // Transitions & Duration states
  const [activeSlideTransition, setActiveSlideTransition] = useState("fade");
  const [activeSlideDuration, setActiveSlideDuration] = useState(0.8);
  const [activeBgTransition, setActiveBgTransition] = useState("fade");
  const [activeBgDuration, setActiveBgDuration] = useState(1.0);

  // Data states
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  
  // Library sections structure
  const [sections, setSections] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedPlaylists, setCollapsedPlaylists] = useState({});
  const [collapsedLibraryHeader, setCollapsedLibraryHeader] = useState(true);
  const [collapsedPlaylistHeader, setCollapsedPlaylistHeader] = useState(true);

  // Add items modal & inputs
  const [playlistTargetForAdd, setPlaylistTargetForAdd] = useState(null);

  const [activeSong, setActiveSong] = useState(null);
  const [activePlaylist, setActivePlaylist] = useState(null);
  
  // Output references
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [activeSlideText, setActiveSlideText] = useState("");
  const [activeSlideImage, setActiveSlideImage] = useState(null);
  const [activeSlideImageStyle, setActiveSlideImageStyle] = useState({});
  const [activeOverlays, setActiveOverlays] = useState([]);
  const [activeBackground, setActiveBackground] = useState({ url: "", type: "none" });
  const [prevBackground, setPrevBackground] = useState(null);
  const bgAnimTimeoutRef = useRef(null);
  const [activeSlideStyle, setActiveSlideStyle] = useState({});
  
  // Inspector selections
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  // Bible state
  const [bibleQuery, setBibleQuery] = useState("");
  const [bibleResults, setBibleResults] = useState([]);
  const [bibleVersions, setBibleVersions] = useState([]);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState("es-rv09");
  const [bibleBooks, setBibleBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("sanjuan");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [isLoadingBible, setIsLoadingBible] = useState(false);

  // Timer states
  const [systemTime, setSystemTime] = useState("00:00:00");
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerLabel, setTimerLabel] = useState("Faltan");

  // Projection windows references
  const liveWindowRef = useRef(null);
  const stageWindowRef = useRef(null);
  const [masterVolume, setMasterVolume] = useState(80);

  // System clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toTimeString().split(" ")[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer countdown loop
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds((s) => s - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes((m) => m - 1);
          setTimerSeconds(59);
        } else {
          setTimerActive(false);
          clearInterval(interval);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerMinutes, timerSeconds]);

  // Sync Timer changes to BroadcastChannel
  useEffect(() => {
    const formatVal = `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`;
    projectionChannel.postMessage({
      type: "UPDATE_TIMER",
      timerVal: formatVal,
      timerLbl: timerLabel,
    });
  }, [timerMinutes, timerSeconds, timerLabel]);

  // Load backend files
  useEffect(() => {
    fetchSongs();
    fetchSections();
    fetchPlaylists();
    fetchMediaFiles();
    fetchBibleVersions();
    fetchBibleBooks();
    loadBibleChapter("es-rv09", "sanjuan", 1);

    // Listen to current state requests from newly opened outputs
    const handleRequest = (e) => {
      if (e.data.type === "REQUEST_CURRENT_STATE") {
        projectionChannel.postMessage({
          type: "UPDATE_SLIDE",
          slideText: activeSlideText,
          slideImage: activeSlideImage,
          slideImageStyle: activeSlideImageStyle,
          overlays: activeOverlays,
          slideStyle: activeSlideStyle,
          transition: activeSlideTransition,
          duration: activeSlideDuration
        });
        projectionChannel.postMessage({
          type: "UPDATE_BACKGROUND",
          mediaUrl: activeBackground.url,
          mediaType: activeBackground.type,
          transition: activeBgTransition,
          duration: activeBgDuration
        });
        projectionChannel.postMessage({
          type: "UPDATE_VOLUME",
          volume: masterVolume / 100
        });
      }
    };

    projectionChannel.addEventListener("message", handleRequest);

    // Global keyboard hotkeys handler
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.key) {
        case "F1":
          e.preventDefault();
          handleClearAll();
          break;
        case "F2":
          e.preventDefault();
          handleClearText();
          break;
        case "F3":
          e.preventDefault();
          handleClearBackground();
          break;
        case "F4":
          e.preventDefault();
          alert("Audio Silenciado");
          break;
        case "ArrowRight":
          e.preventDefault();
          navigateSlide(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigateSlide(-1);
          break;
        case "Escape":
          e.preventDefault();
          handleClearAll();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      projectionChannel.removeEventListener("message", handleRequest);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSlideText, activeOverlays, activeBackground, activeSong, activeSlideId, activeSlideTransition, activeSlideDuration, activeBgTransition, activeBgDuration]);

  // Fetch Library items
  const fetchSongs = async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      setSongs(data);
      
      // Auto load first song if none loaded
      if (data.length > 0 && !activeSong) {
        fetchSongDetails(data[0]);
      }
    } catch (err) {
      console.error("Error loading library songs:", err);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/library/sections");
      const data = await res.json();
      setSections(data);
    } catch (err) {
      console.error("Error loading library sections:", err);
    }
  };

  const fetchSongDetails = async (song) => {
    try {
      const res = await fetch(`/api/library/get?filePath=${encodeURIComponent(song.filePath)}`);
      const data = await res.json();
      setActiveSong({ ...data, filePath: song.filePath, section: song.section });
      setSelectedSlide(null);
      setSelectedOverlayId(null);
    } catch (err) {
      console.error("Error loading song details:", err);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error("Error loading playlists:", err);
    }
  };

  const fetchMediaFiles = async () => {
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      setMediaFiles(data);
    } catch (err) {
      console.error("Error loading media files:", err);
    }
  };

  const handleCreateSection = async (name) => {
    try {
      const res = await fetch("/api/library/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        fetchSongs();
        fetchSections();
      }
    } catch (err) {
      console.error("Failed to create section:", err);
    }
  };

  const handleCreatePlaylist = async (name) => {
    const newPlaylist = {
      id: `pl_${Date.now()}`,
      name,
      items: []
    };
    try {
      const res = await fetch(`/api/playlists/${newPlaylist.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlaylist)
      });
      if (res.ok) {
        await fetchPlaylists();
        setCollapsedPlaylistHeader(false);
        setCollapsedPlaylists(prev => ({ ...prev, [newPlaylist.id]: false }));
      }
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  };

  const handleCreateSongInSection = async (section, title) => {
    const fileId = title.toLowerCase().replace(/[^a-z0-9]/g, "_") || `item_${Date.now()}`;
    const filePath = section ? `${section}/${fileId}.json` : `${fileId}.json`;

    const newSongData = {
      id: fileId,
      title,
      author: "Desconocido",
      slides: [
        {
          id: `slide-${Date.now()}-1`,
          label: "V1",
          text: "Escribe aquí la letra...",
          overlays: []
        }
      ]
    };

    try {
      const res = await fetch(`/api/library/save?filePath=${encodeURIComponent(filePath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSongData)
      });
      if (res.ok) {
        await fetchSongs();
        setCollapsedSections(prev => ({ ...prev, [section]: false }));
        setCollapsedLibraryHeader(false);
        fetchSongDetails({ filePath, section });
      }
    } catch (err) {
      console.error("Failed to create presentation in section:", err);
    }
  };

  const handleAddSongToPlaylist = async (playlist, songId) => {
    const updatedItems = [...playlist.items, { type: "presentation", id: songId }];
    const updatedPlaylist = { ...playlist, items: updatedItems };

    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlaylist)
      });
      if (res.ok) {
        await fetchPlaylists();
        if (activePlaylist?.id === playlist.id) {
          setActivePlaylist(updatedPlaylist);
        }
        setPlaylistTargetForAdd(null);
      }
    } catch (err) {
      console.error("Failed to add song to playlist:", err);
    }
  };

  const handleDeleteSection = async (e, section) => {
    e.stopPropagation();
    if (!section) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar la sección (carpeta) "${section}"? Se borrarán de forma permanente todas las canciones dentro de ella.`)) return;

    try {
      const res = await fetch(`/api/library/sections?name=${encodeURIComponent(section)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchSongs();
        fetchSections();
      }
    } catch (err) {
      console.error("Failed to delete section folder:", err);
    }
  };

  const handleDeleteSong = async (e, song) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de que quieres eliminar la canción "${song.title}"?`)) return;

    try {
      const res = await fetch(`/api/library/delete?filePath=${encodeURIComponent(song.filePath)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (activeSong?.id === song.id) {
          setActiveSong(null);
          setSelectedSlide(null);
          handleClearAll();
        }
        fetchSongs();
      }
    } catch (err) {
      console.error("Failed to delete song:", err);
    }
  };

  const handleDeletePlaylist = async (e, playlist) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de que quieres eliminar la lista de reproducción "${playlist.name}"?`)) return;

    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (activePlaylist?.id === playlist.id) {
          setActivePlaylist(null);
        }
        fetchPlaylists();
      }
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  const handleDeletePlaylistItem = async (e, playlist, itemIndex) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de que deseas quitar este elemento de la lista de reproducción?`)) return;

    const updatedItems = playlist.items.filter((_, idx) => idx !== itemIndex);
    const updatedPlaylist = { ...playlist, items: updatedItems };

    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlaylist)
      });
      if (res.ok) {
        fetchPlaylists();
        if (activePlaylist?.id === playlist.id) {
          setActivePlaylist(updatedPlaylist);
        }
      }
    } catch (err) {
      console.error("Failed to delete playlist item:", err);
    }
  };

  const handleClearAll = () => {
    setActiveSlideText("");
    setActiveSlideId(null);
    setActiveOverlays([]);
    setActiveBackground({ url: "", type: "none" });
    projectionChannel.postMessage({ type: "CLEAR_ALL" });
  };

  const handleClearText = () => {
    setActiveSlideText("");
    setActiveSlideId(null);
    setActiveOverlays([]);
    projectionChannel.postMessage({ type: "CLEAR_TEXT" });
  };

  const handleClearBackground = () => {
    setActiveBackground({ url: "", type: "none" });
    projectionChannel.postMessage({ type: "CLEAR_BACKGROUND" });
  };

  const openLiveOutputWindow = () => {
    if (liveWindowRef.current && !liveWindowRef.current.closed) {
      liveWindowRef.current.focus();
    } else {
      const width = window.screen.availWidth || 1920;
      const height = window.screen.availHeight || 1080;
      liveWindowRef.current = window.open(
        "/output/live",
        "live_output",
        `width=${width},height=${height},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
      );
    }
  };

  const toggleLiveFullscreen = () => {
    projectionChannel.postMessage({ type: "TOGGLE_FULLSCREEN" });
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setMasterVolume(val);
    projectionChannel.postMessage({
      type: "UPDATE_VOLUME",
      volume: val / 100
    });
  };

  const openStageOutputWindow = () => {
    if (stageWindowRef.current && !stageWindowRef.current.closed) {
      stageWindowRef.current.focus();
    } else {
      stageWindowRef.current = window.open(
        "/output/stage",
        "stage_output",
        "width=1024,height=576,menubar=no,toolbar=no,location=no,status=no"
      );
    }
  };

  const fetchBibleVersions = async () => {
    try {
      const res = await fetch("/api/bible/versions");
      const data = await res.json();
      setBibleVersions(data || []);
    } catch (err) {
      console.error("Error fetching Bible versions:", err);
    }
  };

  const fetchBibleBooks = async () => {
    try {
      const res = await fetch("/api/bible/books");
      const data = await res.json();
      setBibleBooks(data || []);
    } catch (err) {
      console.error("Error fetching Bible books:", err);
    }
  };

  const loadBibleChapter = async (version = selectedBibleVersion, bookId = selectedBookId, chapterNum = selectedChapter) => {
    setIsLoadingBible(true);
    try {
      const res = await fetch(`/api/bible/chapter?version=${encodeURIComponent(version)}&book=${encodeURIComponent(bookId)}&chapter=${encodeURIComponent(chapterNum)}`);
      const data = await res.json();
      setBibleResults(data.results || []);
    } catch (err) {
      console.error("Error loading Bible chapter:", err);
    } finally {
      setIsLoadingBible(false);
    }
  };

  const handleBibleSearch = async (e, customQuery) => {
    if (e) e.preventDefault();
    const q = customQuery !== undefined ? customQuery : bibleQuery;
    if (!q || !q.trim()) return;

    setIsLoadingBible(true);
    try {
      const res = await fetch(`/api/bible/search?version=${encodeURIComponent(selectedBibleVersion)}&query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBibleResults(data.results || []);
    } catch (err) {
      console.error("Error searching Bible:", err);
    } finally {
      setIsLoadingBible(false);
    }
  };

  const addVerseToPresentation = (input) => {
    if (!activeSong) return;

    let label = "";
    let text = "";
    if (Array.isArray(input)) {
      if (input.length === 0) return;
      const first = input[0];
      const last = input[input.length - 1];
      const ref = first.verse === last.verse 
        ? `${first.book} ${first.chapter}:${first.verse}`
        : `${first.book} ${first.chapter}:${first.verse}-${last.verse}`;
      label = `B${first.verse}-${last.verse}`;
      const body = input.map(v => `${v.verse}. ${v.text}`).join("\n\n");
      text = `${body}\n\n${ref}`;
    } else {
      label = `B${input.verse}`;
      text = `"${input.text}"\n\n${input.book} ${input.chapter}:${input.verse}`;
    }

    const newSlide = {
      id: `slide-bible-${Date.now()}`,
      label,
      text,
      overlays: []
    };

    const updatedSong = {
      ...activeSong,
      slides: [...activeSong.slides, newSlide]
    };

    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);
  };

  const saveSlideEdits = (slideId, newText) => {
    if (!activeSong) return;

    const updatedSlides = activeSong.slides.map(s => {
      if (s.id === slideId) {
        return { ...s, text: newText };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);
    
    // Update live if slide is currently on projection
    if (slideId === activeSlideId) {
      setActiveSlideText(newText);
      projectionChannel.postMessage({
        type: "UPDATE_SLIDE",
        slideText: newText,
        overlays: activeOverlays,
        slideStyle: activeSlideStyle,
        transition: activeSlideTransition,
        duration: activeSlideDuration
      });
    }
  };

  const handleAddSlideQuick = () => {
    if (!activeSong) return;

    const newSlide = {
      id: `slide-${Date.now()}`,
      label: `S${activeSong.slides.length + 1}`,
      text: "Nueva diapositiva",
      overlays: [],
      style: {
        fontSize: "56px",
        textAlign: "center",
        verticalAlign: "center"
      }
    };

    const updatedSong = {
      ...activeSong,
      slides: [...activeSong.slides, newSlide]
    };

    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);
    setSelectedSlide(newSlide);
  };

  const updateSlideStyle = (slideId, newStyles) => {
    if (!activeSong) return;

    const updatedSlides = activeSong.slides.map(s => {
      if (s.id === slideId) {
        const currentStyle = s.style || {};
        return { ...s, style: { ...currentStyle, ...newStyles } };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    const updatedSelected = updatedSlides.find(s => s.id === slideId);
    setSelectedSlide(updatedSelected);

    if (slideId === activeSlideId) {
      setActiveSlideStyle(updatedSelected.style || {});
      projectionChannel.postMessage({
        type: "UPDATE_SLIDE",
        slideText: updatedSelected.text,
        overlays: updatedSelected.overlays || [],
        slideStyle: updatedSelected.style || {},
        transition: activeSlideTransition,
        duration: activeSlideDuration
      });
    }
  };

  const openSongEditor = () => {
    setActiveTab("song-editor");
  };

  const handleSaveReflowSong = async (songData, returnToProduction = true) => {
    const fileId = activeSong?.id || songData.title.toLowerCase().replace(/[^a-z0-9]/g, "_") || `song_${Date.now()}`;
    const filePath = songData.section ? `${songData.section}/${fileId}.json` : `${fileId}.json`;

    const fullSongData = {
      id: fileId,
      filePath,
      ...songData
    };

    try {
      await fetch(`/api/library/save?filePath=${encodeURIComponent(filePath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullSongData)
      });

      await fetchSongs();
      setActiveSong(fullSongData);
      setSelectedSlide(fullSongData.slides[0] || null);

      if (returnToProduction) {
        setActiveTab("production-interface");
      } else {
        alert("Canción guardada con éxito.");
      }
    } catch (err) {
      console.error("Error saving reflow song:", err);
      alert("Error al guardar la canción.");
    }
  };

  const handleAddTextOverlay = (slideId) => {
    if (!activeSong) return;
    
    const newOverlay = {
      id: `text-ov-${Date.now()}`,
      type: "text",
      text: "Nueva Capa de Texto",
      style: {
        top: "10%",
        left: "10%",
        width: "80%",
        fontSize: "24px",
        color: "#ffffff"
      }
    };

    const updatedSlides = activeSong.slides.map(s => {
      if (s.id === slideId) {
        const ovs = s.overlays || [];
        return { ...s, overlays: [...ovs, newOverlay] };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);
    
    setSelectedSlide(updatedSlides.find(s => s.id === slideId));
    setSelectedOverlayId(newOverlay.id);
  };

  const updateSlideImage = (slideId, imageUrl, imageStyle = null) => {
    if (!activeSong) return;

    const defaultImageStyle = {
      fit: "contain",
      position: "center",
      size: "70%"
    };

    const updatedSlides = activeSong.slides.map((s) => {
      if (s.id === slideId) {
        return {
          ...s,
          imageUrl: imageUrl,
          imageStyle: imageStyle || s.imageStyle || defaultImageStyle
        };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    const updatedSelected = updatedSlides.find((s) => s.id === slideId);
    setSelectedSlide(updatedSelected);

    if (slideId === activeSlideId) {
      setActiveSlideImage(imageUrl);
      setActiveSlideImageStyle(updatedSelected?.imageStyle || {});
      projectionChannel.postMessage({
        type: "UPDATE_SLIDE",
        slideText: updatedSelected.text,
        slideImage: imageUrl,
        slideImageStyle: updatedSelected.imageStyle || {},
        overlays: updatedSelected.overlays || [],
        slideStyle: updatedSelected.style || {},
        transition: activeSlideTransition,
        duration: activeSlideDuration
      });
    }
  };

  const updateSlideImageStyle = (slideId, newStyles) => {
    if (!activeSong) return;

    const updatedSlides = activeSong.slides.map((s) => {
      if (s.id === slideId) {
        const currentImgStyle = s.imageStyle || { fit: "contain", position: "center", size: "70%" };
        return { ...s, imageStyle: { ...currentImgStyle, ...newStyles } };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    const updatedSelected = updatedSlides.find((s) => s.id === slideId);
    setSelectedSlide(updatedSelected);

    if (slideId === activeSlideId) {
      setActiveSlideImageStyle(updatedSelected?.imageStyle || {});
      projectionChannel.postMessage({
        type: "UPDATE_SLIDE",
        slideText: updatedSelected.text,
        slideImage: updatedSelected.imageUrl || null,
        slideImageStyle: updatedSelected.imageStyle || {},
        overlays: updatedSelected.overlays || [],
        slideStyle: updatedSelected.style || {},
        transition: activeSlideTransition,
        duration: activeSlideDuration
      });
    }
  };

  const handleAddImageOverlay = (mediaOrUrl) => {
    if (!activeSong || !selectedSlide) return;

    const imgUrl = typeof mediaOrUrl === "string" ? mediaOrUrl : mediaOrUrl.url;
    if (!imgUrl) return;

    const newOverlay = {
      id: `img-ov-${Date.now()}`,
      type: "image",
      url: imgUrl,
      style: {
        top: "20%",
        left: "20%",
        width: "30%",
        height: "auto"
      }
    };

    const updatedSlides = activeSong.slides.map((s) => {
      if (s.id === selectedSlide.id) {
        const ovs = s.overlays || [];
        return { ...s, overlays: [...ovs, newOverlay] };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    setSelectedSlide(updatedSlides.find((s) => s.id === selectedSlide.id));
    setSelectedOverlayId(newOverlay.id);
  };

  const handleDeleteOverlay = (slideId, overlayId) => {
    if (!activeSong) return;

    const updatedSlides = activeSong.slides.map(s => {
      if (s.id === slideId) {
        const ovs = s.overlays || [];
        return { ...s, overlays: ovs.filter(o => o.id !== overlayId) };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    setSelectedSlide(updatedSlides.find(s => s.id === slideId));
    setSelectedOverlayId(null);
  };

  const updateOverlayStyle = (slideId, overlayId, newStyles) => {
    if (!activeSong) return;

    const updatedSlides = activeSong.slides.map(s => {
      if (s.id === slideId) {
        const ovs = s.overlays.map(o => {
          if (o.id === overlayId) {
            return { ...o, style: { ...o.style, ...newStyles } };
          }
          return o;
        });
        return { ...s, overlays: ovs };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    setSelectedSlide(updatedSlides.find(s => s.id === slideId));
  };

  const updateOverlayText = (slideId, overlayId, newText) => {
    if (!activeSong) return;

    const updatedSlides = activeSong.slides.map(s => {
      if (s.id === slideId) {
        const ovs = s.overlays.map(o => {
          if (o.id === overlayId) {
            return { ...o, text: newText };
          }
          return o;
        });
        return { ...s, overlays: ovs };
      }
      return s;
    });

    const updatedSong = { ...activeSong, slides: updatedSlides };
    setActiveSong(updatedSong);
    saveSongToServer(updatedSong);

    setSelectedSlide(updatedSlides.find(s => s.id === slideId));
  };

  const saveSongToServer = async (song) => {
    try {
      await fetch(`/api/library/save?filePath=${encodeURIComponent(song.filePath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(song)
      });
    } catch (err) {
      console.error("Error saving song to server:", err);
    }
  };

  const navigateSlide = (direction) => {
    if (!activeSong?.slides) return;
    const currentIndex = activeSong.slides.findIndex(s => s.id === activeSlideId);
    
    let nextIndex = 0;
    if (currentIndex === -1) {
      nextIndex = 0;
    } else {
      nextIndex = currentIndex + direction;
    }

    if (nextIndex >= 0 && nextIndex < activeSong.slides.length) {
      const nextSlide = activeSong.slides[nextIndex];
      triggerSlideLive(nextSlide, nextIndex);
    }
  };

  const triggerSlideLive = (slide, index) => {
    setActiveSlideId(slide.id);
    setActiveSlideText(slide.text);
    setActiveSlideImage(slide.imageUrl || null);
    setActiveSlideImageStyle(slide.imageStyle || {});
    setActiveOverlays(slide.overlays || []);
    setActiveSlideStyle(slide.style || {});
    
    let nextText = "---";
    if (activeSong?.slides && index !== undefined) {
      const nextSlide = activeSong.slides[index + 1];
      if (nextSlide) nextText = nextSlide.text;
    }

    projectionChannel.postMessage({
      type: "UPDATE_SLIDE",
      slideText: slide.text,
      slideImage: slide.imageUrl || null,
      slideImageStyle: slide.imageStyle || {},
      overlays: slide.overlays || [],
      slideStyle: slide.style || {},
      nextSlideText: nextText,
      transition: activeSlideTransition,
      duration: activeSlideDuration
    });
  };

  const triggerBibleVerseLive = (input) => {
    let formattedText = "";
    let id = "";
    if (Array.isArray(input)) {
      if (input.length === 0) return;
      const first = input[0];
      const last = input[input.length - 1];
      const ref = first.verse === last.verse 
        ? `${first.book} ${first.chapter}:${first.verse}`
        : `${first.book} ${first.chapter}:${first.verse}-${last.verse}`;
      
      const body = input.map(v => `${v.verse}. ${v.text}`).join("\n\n");
      formattedText = `${body}\n\n${ref}`;
      id = `bible-${first.book}-${first.chapter}-${first.verse}-${last.verse}`;
    } else {
      formattedText = `"${input.text}"\n\n${input.book} ${input.chapter}:${input.verse}`;
      id = `bible-${input.book}-${input.chapter}-${input.verse}`;
    }

    setActiveSlideText(formattedText);
    setActiveSlideId(id);
    setActiveOverlays([]);
    
    projectionChannel.postMessage({
      type: "UPDATE_SLIDE",
      slideText: formattedText,
      overlays: [],
      nextSlideText: "",
      transition: activeSlideTransition,
      duration: activeSlideDuration
    });
  };

  const triggerBackgroundLive = (media) => {
    if (bgAnimTimeoutRef.current) clearTimeout(bgAnimTimeoutRef.current);
    setPrevBackground(activeBackground);
    setActiveBackground(media);
    bgAnimTimeoutRef.current = setTimeout(() => {
      setPrevBackground(null);
    }, activeBgDuration * 1000 + 100);

    projectionChannel.postMessage({
      type: "UPDATE_BACKGROUND",
      mediaUrl: media.url,
      mediaType: media.type,
      transition: activeBgTransition,
      duration: activeBgDuration
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropBackgroundOnSlide = (e, slideIndex) => {
    e.preventDefault();
    const mediaUrl = e.dataTransfer.getData("mediaUrl");
    const mediaType = e.dataTransfer.getData("mediaType");
    if (!mediaUrl) return;

    if (activeSong) {
      const updatedSlides = [...activeSong.slides];
      updatedSlides[slideIndex] = {
        ...updatedSlides[slideIndex],
        backgroundUrl: mediaUrl,
        backgroundType: mediaType
      };
      
      const updatedSong = { ...activeSong, slides: updatedSlides };
      setActiveSong(updatedSong);
      saveSongToServer(updatedSong);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md overflow-hidden h-screen flex flex-col">
      {/* 1. Header Toolbar */}
      <header className="h-12 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-container-padding z-50">
        <div className="flex items-center gap-4 text-on-surface-variant font-label-caps text-label-caps">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[16px]">settings_input_component</span>
          </div>
          <nav className="flex gap-4">
            <button 
              onClick={() => setActiveTab("production-interface")} 
              className={`hover:text-on-surface transition-colors uppercase ${activeTab === "production-interface" ? "text-primary font-bold" : ""}`}
            >
              Producción
            </button>
            <button 
              onClick={() => setActiveTab("bibles-tab")} 
              className={`hover:text-on-surface transition-colors uppercase ${activeTab === "bibles-tab" ? "text-primary font-bold" : ""}`}
            >
              Biblia
            </button>
            <button 
              onClick={openSongEditor} 
              className={`hover:text-on-surface transition-colors uppercase ${activeTab === "song-editor" ? "text-primary font-bold" : ""}`}
            >
              Editor de Canción
            </button>
          </nav>
        </div>

        {/* Transition & Duration Controls */}
        <div className="flex items-center gap-3 bg-surface-container rounded-lg px-2.5 py-1 border border-outline-variant">
          {/* Slide Transition */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">notes</span>
              Texto:
            </span>
            <select 
              value={activeSlideTransition} 
              onChange={(e) => setActiveSlideTransition(e.target.value)}
              className="bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-xs text-on-surface outline-none cursor-pointer font-bold"
            >
              <option value="none">Ninguna</option>
              <option value="fade">Disolvencia</option>
              <option value="zoom">Zoom</option>
              <option value="slide">Desplazamiento</option>
            </select>
            <select 
              value={activeSlideDuration} 
              onChange={(e) => setActiveSlideDuration(parseFloat(e.target.value))}
              className="bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-xs text-on-surface outline-none cursor-pointer font-mono font-bold"
              title="Duración de transición de texto"
            >
              <option value={0.2}>0.2s</option>
              <option value={0.4}>0.4s</option>
              <option value={0.6}>0.6s</option>
              <option value={0.8}>0.8s</option>
              <option value={1.2}>1.2s</option>
              <option value={1.5}>1.5s</option>
              <option value={2.0}>2.0s</option>
            </select>
          </div>

          <div className="w-[1px] h-4 bg-outline-variant" />

          {/* Background Transition */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-tertiary-fixed uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">image</span>
              Fondo:
            </span>
            <select 
              value={activeBgTransition} 
              onChange={(e) => setActiveBgTransition(e.target.value)}
              className="bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-xs text-on-surface outline-none cursor-pointer font-bold"
            >
              <option value="none">Ninguna</option>
              <option value="fade">Disolvencia</option>
              <option value="zoom">Zoom</option>
              <option value="slide">Desplazamiento</option>
            </select>
            <select 
              value={activeBgDuration} 
              onChange={(e) => setActiveBgDuration(parseFloat(e.target.value))}
              className="bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-xs text-on-surface outline-none cursor-pointer font-mono font-bold"
              title="Duración de transición de fondo"
            >
              <option value={0.2}>0.2s</option>
              <option value={0.4}>0.4s</option>
              <option value={0.6}>0.6s</option>
              <option value={0.8}>0.8s</option>
              <option value={1.0}>1.0s</option>
              <option value={1.2}>1.2s</option>
              <option value={1.5}>1.5s</option>
              <option value={2.0}>2.0s</option>
            </select>
          </div>
        </div>

        {/* Emergencies controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearAll} 
            className="bg-error hover:bg-error-container hover:text-on-error-container text-on-error font-bold text-label-caps font-label-caps uppercase px-3 py-1 rounded shadow transition-all"
            title="Limpiar todo (Letra y Fondo) (F1 / ESC)"
          >
            Borrar Todo
          </button>
          <button 
            onClick={handleClearText} 
            className="px-3 py-1 text-label-caps font-label-caps uppercase text-on-surface-variant hover:bg-surface-container-highest rounded transition-all"
            title="Borrar solo texto / letra (F2)"
          >
            Borrar Diapo
          </button>
          <button 
            onClick={handleClearBackground} 
            className="px-3 py-1 text-label-caps font-label-caps uppercase text-on-surface-variant hover:bg-surface-container-highest rounded transition-all"
            title="Borrar solo fondo multimedia (F3)"
          >
            Borrar Medios
          </button>
        </div>

        {/* Output switches */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={openLiveOutputWindow}
              className="flex flex-col items-end group"
              title="Abrir pantalla de salida principal en máxima resolución"
            >
              <span className="text-[9px] font-label-caps uppercase text-on-surface-variant leading-none group-hover:text-primary">Salida Principal (4K/HD)</span>
              <span className={`text-[10px] font-bold uppercase leading-tight ${liveWindowRef.current && !liveWindowRef.current.closed ? "text-tertiary-fixed animate-pulse" : "text-zinc-500"}`}>
                {liveWindowRef.current && !liveWindowRef.current.closed ? "CONECTADO" : "ACTIVAR"}
              </span>
            </button>
            <button
              onClick={toggleLiveFullscreen}
              className="p-1.5 hover:bg-surface-container-highest rounded text-on-surface-variant hover:text-primary transition-all"
              title="Alternar Pantalla Completa en Salida Principal"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>
            <button 
              onClick={openStageOutputWindow}
              className="flex flex-col items-end group"
              title="Abrir monitor de escenario"
            >
              <span className="text-[9px] font-label-caps uppercase text-on-surface-variant leading-none group-hover:text-primary">Monitor Escenario</span>
              <span className={`text-[10px] font-bold uppercase leading-tight ${stageWindowRef.current && !stageWindowRef.current.closed ? "text-primary" : "text-zinc-500"}`}>
                {stageWindowRef.current && !stageWindowRef.current.closed ? "CONECTADO" : "ACTIVAR"}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2" title={`Volumen de Medios en Salida: ${masterVolume}%`}>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              {masterVolume === 0 ? "volume_off" : masterVolume < 50 ? "volume_down" : "volume_up"}
            </span>
            <input 
              className="w-20 h-1 bg-outline-variant rounded-full appearance-none cursor-pointer accent-primary" 
              type="range" 
              min="0" 
              max="100" 
              value={masterVolume}
              onChange={handleVolumeChange}
            />
            <span className="text-[10px] font-mono text-zinc-400 w-6">{masterVolume}%</span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Body */}
      {activeTab === "song-editor" ? (
        <ReflowEditor
          activeSong={activeSong}
          sections={sections}
          onSave={handleSaveReflowSong}
          onCancel={() => setActiveTab("production-interface")}
        />
      ) : (
        <>
          <div className="flex-1 flex overflow-hidden bg-surface-dim">
            <SidebarLeft
              songs={songs}
              sections={sections}
              playlists={playlists}
              activeSong={activeSong}
              activePlaylist={activePlaylist}
              activeTab={activeTab}
              onSelectSong={fetchSongDetails}
              onSelectPlaylist={setActivePlaylist}
              onCreateSection={handleCreateSection}
              onCreatePlaylist={handleCreatePlaylist}
              onCreateSongInSection={handleCreateSongInSection}
              onDeleteSection={handleDeleteSection}
              onDeleteSong={handleDeleteSong}
              onDeletePlaylist={handleDeletePlaylist}
              onDeletePlaylistItem={handleDeletePlaylistItem}
              playlistTargetForAdd={playlistTargetForAdd}
              setPlaylistTargetForAdd={setPlaylistTargetForAdd}
              onAddSongToPlaylist={handleAddSongToPlaylist}
              bibleQuery={bibleQuery}
              setBibleQuery={setBibleQuery}
              bibleResults={bibleResults}
              bibleVersions={bibleVersions}
              selectedBibleVersion={selectedBibleVersion}
              setSelectedBibleVersion={setSelectedBibleVersion}
              bibleBooks={bibleBooks}
              selectedBookId={selectedBookId}
              setSelectedBookId={setSelectedBookId}
              selectedChapter={selectedChapter}
              setSelectedChapter={setSelectedChapter}
              isLoadingBible={isLoadingBible}
              onLoadChapter={loadBibleChapter}
              onBibleSearch={handleBibleSearch}
              onTriggerBibleVerseLive={triggerBibleVerseLive}
              onAddVerseToPresentation={addVerseToPresentation}
            />

            <CenterPanel
              activeSong={activeSong}
              activeSlideId={activeSlideId}
              selectedSlide={selectedSlide}
              activeBackground={activeBackground}
              openSongEditor={openSongEditor}
              setSelectedSlide={setSelectedSlide}
              triggerSlideLive={triggerSlideLive}
              handleAddSlideQuick={handleAddSlideQuick}
              handleDragOver={handleDragOver}
              handleDropBackgroundOnSlide={handleDropBackgroundOnSlide}
            />

            <SidebarRight
              activeBackground={activeBackground}
              prevBackground={prevBackground}
              activeBgTransition={activeBgTransition}
              activeBgDuration={activeBgDuration}
              activeSlideText={activeSlideText}
              activeSlideStyle={activeSlideStyle}
              activeSlideImage={activeSlideImage}
              activeSlideImageStyle={activeSlideImageStyle}
              activeOverlays={activeOverlays}
              systemTime={systemTime}
              timerLabel={timerLabel}
              timerMinutes={timerMinutes}
              timerSeconds={timerSeconds}
              timerActive={timerActive}
              setTimerActive={setTimerActive}
              setTimerMinutes={setTimerMinutes}
              setTimerSeconds={setTimerSeconds}
              activeSong={activeSong}
              triggerSlideLive={triggerSlideLive}
              handleClearAll={handleClearAll}
              selectedSlide={selectedSlide}
              mediaFiles={mediaFiles}
              onSaveSlideText={saveSlideEdits}
              onUpdateSlideImage={updateSlideImage}
              onUpdateSlideImageStyle={updateSlideImageStyle}
              onAddTextOverlay={handleAddTextOverlay}
              onAddImageOverlay={handleAddImageOverlay}
              onDeleteOverlay={handleDeleteOverlay}
              onUpdateOverlayText={updateOverlayText}
              onUpdateOverlayStyle={updateOverlayStyle}
              onUpdateSlideStyle={updateSlideStyle}
            />
          </div>

          <MediaBin
            mediaFiles={mediaFiles}
            activeBackground={activeBackground}
            selectedSlide={selectedSlide}
            triggerBackgroundLive={triggerBackgroundLive}
            handleAddImageOverlay={handleAddImageOverlay}
            handleSetSlideImage={updateSlideImage}
            onUploadSuccess={fetchMediaFiles}
          />
        </>
      )}
    </div>
  );
}
