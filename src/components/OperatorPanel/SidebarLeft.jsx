import { useState } from "react";

export default function SidebarLeft({
  songs,
  sections,
  playlists,
  activeSong,
  activePlaylist,
  activeTab,
  onSelectSong,
  onSelectPlaylist,
  onCreateSection,
  onCreatePlaylist,
  onCreateSongInSection,
  onDeleteSection,
  onDeleteSong,
  onDeletePlaylist,
  onDeletePlaylistItem,
  playlistTargetForAdd,
  setPlaylistTargetForAdd,
  onAddSongToPlaylist,
  // Bible support
  bibleQuery,
  setBibleQuery,
  bibleResults,
  bibleVersions = [],
  selectedBibleVersion = "RVR1960",
  setSelectedBibleVersion,
  bibleBooks = [],
  selectedBookId = "sanjuan",
  setSelectedBookId,
  selectedChapter = 1,
  setSelectedChapter,
  isLoadingBible = false,
  onLoadChapter,
  onBibleSearch,
  onTriggerBibleVerseLive,
  onAddVerseToPresentation
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddPlaylistInput, setShowAddPlaylistInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [collapsedLibraryHeader, setCollapsedLibraryHeader] = useState(false);
  const [collapsedPlaylistHeader, setCollapsedPlaylistHeader] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedPlaylists, setCollapsedPlaylists] = useState({});

  // Bible UI local state
  const [bibleTabMode, setBibleTabMode] = useState("browse"); // "browse" | "search"
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState([]);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [testamentFilter, setTestamentFilter] = useState("ALL"); // "ALL" | "OT" | "NT"
  const [bibleSidebarView, setBibleSidebarView] = useState("books"); // "books" | "verses"

  const activeBookObj = bibleBooks.find((b) => b.id === selectedBookId) || bibleBooks[0] || { chaptersCount: 21, name: "Juan", id: "sanjuan" };

  const filteredBooks = bibleBooks.filter((b) => {
    if (testamentFilter !== "ALL" && b.testament !== testamentFilter) return false;
    if (!bookSearchQuery.trim()) return true;
    const q = bookSearchQuery.toLowerCase().trim();
    return b.name.toLowerCase().includes(q) || (b.aliases && b.aliases.some((a) => a.toLowerCase().includes(q)));
  });

  const handleBookChange = (newBookId) => {
    setSelectedBookId(newBookId);
    setSelectedChapter(1);
    setSelectedVerseNumbers([]);
    if (onLoadChapter) {
      onLoadChapter(selectedBibleVersion, newBookId, 1);
    }
  };

  const handleChapterChange = (newChapterNum) => {
    const num = parseInt(newChapterNum, 10);
    setSelectedChapter(num);
    setSelectedVerseNumbers([]);
    if (onLoadChapter) {
      onLoadChapter(selectedBibleVersion, selectedBookId, num);
    }
  };

  const handleVersionChange = (newVersionId) => {
    setSelectedBibleVersion(newVersionId);
    setSelectedVerseNumbers([]);
    if (bibleTabMode === "browse" && onLoadChapter) {
      onLoadChapter(newVersionId, selectedBookId, selectedChapter);
    } else if (bibleTabMode === "search" && bibleQuery.trim()) {
      onBibleSearch(null);
    }
  };

  const toggleVerseSelection = (verseNum) => {
    setSelectedVerseNumbers((prev) =>
      prev.includes(verseNum)
        ? prev.filter((v) => v !== verseNum)
        : [...prev, verseNum].sort((a, b) => a - b)
    );
  };

  const handleCreateSectionSubmit = (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    onCreateSection(newSectionName.trim());
    setNewSectionName("");
    setShowAddSectionInput(false);
  };

  const handleCreatePlaylistSubmit = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setShowAddPlaylistInput(false);
  };

  // Filter songs by search query
  const filteredSongs = songs.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-64 bg-surface-container-low flex flex-col flex-shrink-0 border-r border-outline-variant select-none">
      {activeTab === "production-interface" ? (
        <>
          {/* Section Creation input toggle */}
          <div className="p-2 border-b border-outline-variant space-y-2">
            <div className="relative flex items-center bg-surface-container-highest rounded px-2 py-1">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-2">search</span>
              <input
                className="w-full bg-transparent border-none outline-none text-body-sm text-on-surface placeholder:text-outline"
                placeholder="Buscar en biblioteca..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">Estructura</span>
              <button
                onClick={() => setShowAddSectionInput(!showAddSectionInput)}
                className="text-primary hover:text-primary-fixed-dim text-xs font-bold flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-xs">create_new_folder</span>
                Crear Sección
              </button>
            </div>

            {showAddSectionInput && (
              <form onSubmit={handleCreateSectionSubmit} className="flex gap-1.5 mt-1.5">
                <input
                  type="text"
                  placeholder="Nueva Sección..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="flex-1 bg-surface-container-highest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface outline-none"
                />
                <button
                  type="submit"
                  className="bg-primary text-on-primary font-bold text-xs px-2.5 rounded hover:bg-primary/80"
                >
                  Crear
                </button>
              </form>
            )}
          </div>

          {/* Folders & Songs navigation */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
            {/* Biblioteca Section */}
            <div>
              <button
                onClick={() => setCollapsedLibraryHeader(!collapsedLibraryHeader)}
                className="w-full flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant uppercase mb-2 px-2 hover:text-on-surface transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">folder_open</span>
                  <span>Biblioteca</span>
                </div>
                <span className="material-symbols-outlined text-xs">
                  {collapsedLibraryHeader ? "chevron_right" : "expand_more"}
                </span>
              </button>

              {!collapsedLibraryHeader &&
                sections.map((section) => {
                  const sectionName = section || "General (Raíz)";
                  const isCollapsed = collapsedSections[section] !== false;
                  const sectionSongs = filteredSongs.filter((s) => s.section === section);

                  return (
                    <div key={section} className="mb-2">
                      {/* Section Header folder trigger */}
                      <div className="group flex items-center justify-between px-2 py-1 rounded hover:bg-surface-container-high text-xs text-on-surface font-bold text-left transition-colors">
                        <button
                          onClick={() =>
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [section]: !isCollapsed
                            }))
                          }
                          className="flex-1 flex items-center gap-1.5 text-on-surface-variant text-left truncate"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isCollapsed ? "folder" : "folder_open"}
                          </span>
                          <span className="truncate">{sectionName}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const title = window.prompt(
                                `Nombre de la nueva presentación para la sección "${sectionName}":`
                              );
                              if (title && title.trim()) {
                                onCreateSongInSection(section, title.trim());
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary-fixed-dim p-0.5 flex items-center"
                            title="Crear presentación en esta sección"
                          >
                            <span className="material-symbols-outlined text-xs">note_add</span>
                          </button>
                          {section !== "" && (
                            <button
                              onClick={(e) => onDeleteSection(e, section)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-red-400 p-0.5 flex items-center"
                              title="Eliminar carpeta y su contenido"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          )}
                          <span
                            onClick={() =>
                              setCollapsedSections((prev) => ({
                                ...prev,
                                [section]: !isCollapsed
                              }))
                            }
                            className="material-symbols-outlined text-xs cursor-pointer"
                          >
                            {isCollapsed ? "chevron_right" : "expand_more"}
                          </span>
                        </div>
                      </div>

                      {/* Song list inside folder */}
                      {!isCollapsed && (
                        <ul className="pl-4 mt-1 space-y-[1px] border-l border-outline-variant ml-3.5">
                          {sectionSongs.map((song) => (
                            <li
                              key={song.id}
                              className="group flex items-center justify-between rounded hover:bg-surface-container-high px-2 py-0.5"
                            >
                              <button
                                onClick={() => onSelectSong(song)}
                                className={`flex-1 flex items-center text-xs text-on-surface text-left transition-colors truncate ${
                                  activeSong?.id === song.id ? "font-bold text-primary" : ""
                                }`}
                              >
                                <span
                                  className={`material-symbols-outlined text-[12px] mr-2 ${
                                    activeSong?.id === song.id
                                      ? "text-primary"
                                      : "text-on-surface-variant"
                                  }`}
                                >
                                  music_note
                                </span>
                                <span className="truncate">{song.title}</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                {playlistTargetForAdd && (
                                  <button
                                    onClick={() => onAddSongToPlaylist(playlistTargetForAdd, song.id)}
                                    className="text-primary hover:text-primary-fixed-dim p-0.5 flex items-center"
                                    title={`Agregar a "${playlistTargetForAdd.name}"`}
                                  >
                                    <span className="material-symbols-outlined text-xs">playlist_add_check</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => onDeleteSong(e, song)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-red-400 p-0.5 flex items-center"
                                  title="Eliminar canción de la biblioteca"
                                >
                                  <span className="material-symbols-outlined text-xs">delete</span>
                                </button>
                              </div>
                            </li>
                          ))}
                          {sectionSongs.length === 0 && (
                            <li className="text-[10px] text-zinc-500 italic p-2">Vacío</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Playlists Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <button
                  onClick={() => setCollapsedPlaylistHeader(!collapsedPlaylistHeader)}
                  className="flex-1 flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant uppercase hover:text-on-surface transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">queue_music</span>
                    <span>Listas de Reproducción</span>
                  </div>
                  <span className="material-symbols-outlined text-xs">
                    {collapsedPlaylistHeader ? "chevron_right" : "expand_more"}
                  </span>
                </button>
                <button
                  onClick={() => setShowAddPlaylistInput(!showAddPlaylistInput)}
                  className="text-primary hover:text-primary-fixed-dim text-xs font-bold flex items-center gap-0.5 ml-2"
                  title="Crear nueva lista de reproducción"
                >
                  <span className="material-symbols-outlined text-xs">playlist_add</span>
                </button>
              </div>

              {showAddPlaylistInput && (
                <form onSubmit={handleCreatePlaylistSubmit} className="flex gap-1.5 px-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nueva Lista..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="flex-1 bg-surface-container-highest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-on-primary font-bold text-xs px-2.5 rounded hover:bg-primary/80"
                  >
                    Crear
                  </button>
                </form>
              )}

              {!collapsedPlaylistHeader &&
                playlists.map((pl) => {
                  const isCollapsed = collapsedPlaylists[pl.id] !== false;
                  return (
                    <div key={pl.id} className="mb-2">
                      <div className="group flex items-center justify-between rounded hover:bg-surface-container-high px-2 py-1">
                        <button
                          onClick={() => {
                            onSelectPlaylist(pl);
                            setCollapsedPlaylists((prev) => ({
                              ...prev,
                              [pl.id]: !isCollapsed
                            }));
                          }}
                          className={`flex-1 flex items-center text-xs text-on-surface font-bold text-left transition-all ${
                            activePlaylist?.id === pl.id ? "text-primary" : ""
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px] mr-2 text-on-surface-variant">
                            queue_music
                          </span>
                          <span className="truncate">{pl.name}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playlistTargetForAdd?.id === pl.id) {
                                setPlaylistTargetForAdd(null);
                              } else {
                                setPlaylistTargetForAdd(pl);
                              }
                            }}
                            className={`transition-opacity text-primary hover:text-primary-fixed-dim p-0.5 flex items-center ${
                              playlistTargetForAdd?.id === pl.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                            title={playlistTargetForAdd?.id === pl.id ? "Asignación activa" : "Agregar canción a esta lista"}
                          >
                            <span className={`material-symbols-outlined text-xs ${playlistTargetForAdd?.id === pl.id ? "text-emerald-400 font-bold" : ""}`}>
                              {playlistTargetForAdd?.id === pl.id ? "check_circle" : "playlist_add"}
                            </span>
                          </button>
                          <button
                            onClick={(e) => onDeletePlaylist(e, pl)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-red-400 p-0.5 flex items-center"
                            title="Eliminar lista de reproducción"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                          <span
                            onClick={() =>
                              setCollapsedPlaylists((prev) => ({
                                ...prev,
                                [pl.id]: !isCollapsed
                              }))
                            }
                            className="material-symbols-outlined text-xs cursor-pointer text-on-surface-variant"
                          >
                            {isCollapsed ? "chevron_right" : "expand_more"}
                          </span>
                        </div>
                      </div>

                      {/* Song items inside playlist */}
                      {!isCollapsed && (
                        <ul className="pl-4 mt-1 space-y-[1px] border-l border-outline-variant ml-3.5">
                          {pl.items.map((item, itemIdx) => {
                            const song = songs.find((s) => s.id === item.id);
                            const title = song ? song.title : item.id;
                            const isItemActive = activeSong?.id === item.id;

                            return (
                              <li
                                key={`${item.id}-${itemIdx}`}
                                className="group flex items-center justify-between rounded hover:bg-surface-container-high px-2 py-0.5"
                              >
                                <button
                                  onClick={() => {
                                    if (song) onSelectSong(song);
                                  }}
                                  className={`flex-1 flex items-center text-[11px] text-on-surface text-left transition-colors truncate ${
                                    isItemActive ? "font-bold text-primary" : ""
                                  }`}
                                >
                                  <span
                                    className={`material-symbols-outlined text-[12px] mr-2 ${
                                      isItemActive ? "text-primary" : "text-on-surface-variant"
                                    }`}
                                  >
                                    music_note
                                  </span>
                                  <span className="truncate">{title}</span>
                                </button>
                                <button
                                  onClick={(e) => onDeletePlaylistItem(e, pl, itemIdx)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-red-400 p-0.5 flex items-center"
                                  title="Quitar de la lista de reproducción"
                                >
                                  <span className="material-symbols-outlined text-xs">remove_circle</span>
                                </button>
                              </li>
                            );
                          })}
                          {pl.items.length === 0 && (
                            <li className="text-[10px] text-zinc-500 italic p-2">Vacío</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      ) : (
        /* Biblia Section */
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-container-low">
          {/* Header & Version Selector */}
          <div className="p-3 border-b border-outline-variant space-y-2 bg-surface-container-low">
            <div className="flex justify-between items-center">
              <span className="text-label-caps font-label-caps uppercase text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                Biblia Digital
              </span>
              {/* Mode switch */}
              <div className="flex bg-surface-container-highest rounded p-0.5 text-[10px]">
                <button
                  onClick={() => {
                    setBibleTabMode("browse");
                    setSelectedVerseNumbers([]);
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    bibleTabMode === "browse"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Navegar
                </button>
                <button
                  onClick={() => {
                    setBibleTabMode("search");
                    setSelectedVerseNumbers([]);
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    bibleTabMode === "search"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Buscar
                </button>
              </div>
            </div>

            {/* Version Select */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-on-surface-variant font-medium">Traducción / Versión:</label>
              <select
                value={selectedBibleVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface outline-none cursor-pointer font-bold"
              >
                {bibleVersions.length > 0 ? (
                  bibleVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      📖 {v.name} ({v.localAbbr || v.id})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="RVR1960">📖 Reina Valera 1960 (RVR1960)</option>
                    <option value="NVI">📖 Nueva Versión Internacional (NVI)</option>
                    <option value="NTV">📖 Nueva Traducción Viviente (NTV)</option>
                    <option value="LBLA">📖 La Biblia de las Américas (LBLA)</option>
                    <option value="NBLA">📖 Nueva Biblia de las Américas (NBLA)</option>
                    <option value="RVC">📖 Reina Valera Contemporánea (RVC)</option>
                    <option value="RVA2015">📖 Reina Valera Actualizada (RVA2015)</option>
                    <option value="DHH94I">📖 Dios Habla Hoy (DHH94I)</option>
                    <option value="TLA">📖 Traducción en Lenguaje Actual (TLA)</option>
                  </>
                )}
              </select>
            </div>

            {/* Browse Controls */}
            {bibleTabMode === "browse" ? (
              <div className="flex flex-col gap-2 pt-1">
                {/* Book Search Input */}
                <div className="relative flex items-center bg-surface-container-highest rounded px-2 py-1 border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant mr-1.5">search</span>
                  <input
                    type="text"
                    placeholder="Filtrar libros..."
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-on-surface placeholder:text-outline"
                  />
                  {bookSearchQuery && (
                    <button
                      onClick={() => setBookSearchQuery("")}
                      className="text-zinc-400 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  )}
                </div>

                {/* Testament Tabs */}
                <div className="flex bg-surface-container-highest rounded p-0.5 text-[9px] font-bold">
                  <button
                    onClick={() => setTestamentFilter("ALL")}
                    className={`flex-1 py-0.5 rounded transition-all text-center ${
                      testamentFilter === "ALL" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Todos ({bibleBooks.length || 66})
                  </button>
                  <button
                    onClick={() => setTestamentFilter("OT")}
                    className={`flex-1 py-0.5 rounded transition-all text-center ${
                      testamentFilter === "OT" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    A.T. (39)
                  </button>
                  <button
                    onClick={() => setTestamentFilter("NT")}
                    className={`flex-1 py-0.5 rounded transition-all text-center ${
                      testamentFilter === "NT" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    N.T. (27)
                  </button>
                </div>

                {/* View switcher: Libros vs Versículos */}
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant pt-0.5">
                  <span className="font-bold uppercase tracking-wider">Ver en panel:</span>
                  <div className="flex bg-surface-container-highest rounded p-0.5 gap-0.5">
                    <button
                      onClick={() => setBibleSidebarView("books")}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        bibleSidebarView === "books" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                      }`}
                      title="Explorar libros y capítulos"
                    >
                      Libros
                    </button>
                    <button
                      onClick={() => setBibleSidebarView("verses")}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        bibleSidebarView === "verses" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                      }`}
                      title="Ver lista de versículos"
                    >
                      Versículos
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Search Form */
              <form onSubmit={onBibleSearch} className="flex flex-col gap-1.5 pt-1">
                <div className="relative flex items-center bg-surface-container-highest rounded px-2 py-1 border border-outline-variant">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant mr-2">search</span>
                  <input
                    className="w-full bg-transparent border-none outline-none text-xs text-on-surface placeholder:text-outline"
                    placeholder="Juan 3:16, Salmos 23, amor..."
                    type="text"
                    value={bibleQuery}
                    onChange={(e) => setBibleQuery(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingBible}
                  className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-on-primary font-bold text-xs py-1.5 rounded transition-all text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">search</span>
                  Buscar Pasaje / Palabra
                </button>
              </form>
            )}
          </div>

          {/* Multiselect Action Bar (if verses are selected) */}
          {selectedVerseNumbers.length > 0 && (
            <div className="bg-primary-container text-on-primary-container px-3 py-2 border-b border-outline-variant flex items-center justify-between text-xs animate-fadeIn">
              <div className="font-bold flex items-center gap-1 truncate">
                <span className="material-symbols-outlined text-xs">check_box</span>
                <span>
                  {selectedVerseNumbers.length}{" "}
                  {selectedVerseNumbers.length === 1 ? "versículo" : "versículos"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const selectedObjects = bibleResults.filter((v) =>
                      selectedVerseNumbers.includes(v.verse)
                    );
                    onTriggerBibleVerseLive(selectedObjects);
                  }}
                  className="bg-error hover:bg-error/80 text-on-error font-bold text-[10px] px-2 py-0.5 rounded shadow-sm"
                  title="Proyectar selección en vivo"
                >
                  VIVO ({selectedVerseNumbers.length})
                </button>
                <button
                  onClick={() => {
                    const selectedObjects = bibleResults.filter((v) =>
                      selectedVerseNumbers.includes(v.verse)
                    );
                    onAddVerseToPresentation(selectedObjects);
                  }}
                  className="bg-primary text-on-primary hover:bg-primary/80 font-bold text-[10px] px-2 py-0.5 rounded shadow-sm"
                  title="Agregar selección a diapositivas"
                >
                  + Diapo
                </button>
                <button
                  onClick={() => setSelectedVerseNumbers([])}
                  className="text-on-primary-container hover:text-on-surface p-0.5"
                  title="Deseleccionar"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Body: Either Books/Chapters Browser OR Verses List */}
          {bibleTabMode === "browse" && bibleSidebarView === "books" ? (
            <div className="flex-1 flex flex-col overflow-hidden p-2">
              {/* Active Book info & Chapters quick grid */}
              <div className="p-2 bg-surface-container rounded border border-outline-variant mb-2 flex-shrink-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-xs text-primary flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                    {activeBookObj.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono flex-shrink-0">
                    Cap. {selectedChapter} / {activeBookObj.chaptersCount || 21}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
                  {Array.from(
                    { length: activeBookObj.chaptersCount || 21 },
                    (_, i) => i + 1
                  ).map((num) => (
                    <button
                      key={num}
                      onClick={() => handleChapterChange(num)}
                      className={`h-6 text-[11px] font-mono font-bold rounded flex items-center justify-center transition-all ${
                        selectedChapter === num
                          ? "bg-primary text-on-primary shadow-sm scale-105"
                          : "bg-surface-container-highest hover:bg-surface-variant text-on-surface"
                      }`}
                      title={`Capítulo ${num}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Books List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredBooks.map((b) => {
                  const isSelected = selectedBookId === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleBookChange(b.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                        isSelected
                          ? "bg-primary text-on-primary font-bold shadow-sm"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span
                        className={`text-[10px] font-mono ml-1 flex-shrink-0 ${
                          isSelected ? "text-on-primary/80" : "text-zinc-500"
                        }`}
                      >
                        {b.chaptersCount} cap.
                      </span>
                    </button>
                  );
                })}
                {filteredBooks.length === 0 && (
                  <p className="text-zinc-500 text-xs italic text-center p-4">
                    No se encontraron libros
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Verses List / Search Results */
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1.5">
              {isLoadingBible ? (
                <div className="flex flex-col items-center justify-center p-8 text-on-surface-variant gap-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-primary">sync</span>
                  <span className="text-xs font-medium">Cargando escritura...</span>
                </div>
              ) : bibleResults.length > 0 ? (
                bibleResults.map((v, i) => {
                  const isSelected = selectedVerseNumbers.includes(v.verse);
                  return (
                    <div
                      key={`${v.book}-${v.chapter}-${v.verse}-${i}`}
                      className={`p-2 rounded border transition-all text-body-sm group relative cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-surface-container hover:bg-surface-container-high border-transparent hover:border-outline-variant"
                      }`}
                      onClick={() => toggleVerseSelection(v.verse)}
                    >
                      <div className="flex justify-between items-center text-primary font-bold text-[11px] mb-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="w-3.5 h-3.5 accent-primary cursor-pointer rounded"
                          />
                          <span>
                            {v.book} {v.chapter}:{v.verse}
                          </span>
                        </div>

                        <div
                          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onTriggerBibleVerseLive(v)}
                            className="bg-error hover:bg-error/80 text-on-error font-bold text-[9px] px-1.5 py-0.5 rounded shadow-sm"
                            title="Proyectar este versículo en vivo"
                          >
                            VIVO
                          </button>
                          <button
                            onClick={() => onAddVerseToPresentation(v)}
                            className="bg-surface-container-highest hover:bg-primary hover:text-on-primary font-bold text-[9px] px-1.5 py-0.5 rounded text-on-surface transition-colors"
                            title="Agregar este versículo como diapositiva"
                          >
                            + Diapo
                          </button>
                        </div>
                      </div>
                      <p className="text-on-surface-variant leading-relaxed text-xs pl-5">
                        "{v.text}"
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-on-surface-variant text-center mt-8 text-xs p-4 italic">
                  {bibleTabMode === "browse"
                    ? "Selecciona un libro y capítulo para leer."
                    : "Ingresa una referencia (ej. Juan 3:16) o palabra para buscar."}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
