import { useState, useEffect } from "react";

export default function BibleCenterPanel({
  bibleResults = [],
  bibleBooks = [],
  selectedBookId = "sanjuan",
  selectedChapter = 1,
  selectedBibleVersion = "RVR1960",
  bibleVersions = [],
  isLoadingBible = false,
  activeSlideId,
  selectedSlide,
  activeBackground = { url: "", type: "none" },
  onSelectBook,
  onSelectChapter,
  onSelectVersion,
  onTriggerBibleVerseLive,
  setSelectedSlide,
  onAddVerseToPresentation,
  handleDragOver,
  handleDropBackgroundOnSlide,
  onCreatePresentationFromChapter,
  onLoadInProduction,
  bibleLayout = "full",
  onUpdateBibleLayout,
  bibleTextAlign = "center",
  onUpdateBibleTextAlign,
  bibleFontSize = "",
  onUpdateBibleFontSize,
  bibleVerticalAlign = "center",
  onUpdateBibleVerticalAlign,
  activeBgFit = "cover"
}) {
  const [verseFilter, setVerseFilter] = useState("");
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState([]);

  // Auto-scroll active slide into view smoothly
  useEffect(() => {
    if (!activeSlideId) return;
    const el = document.getElementById(`slide-card-${activeSlideId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSlideId]);

  const activeBookObj = bibleBooks.find((b) => b.id === selectedBookId) || null;
  const totalChapters = activeBookObj?.chaptersCount || 50;

  // Filter verses if filter query is provided
  const filteredVerses = bibleResults.filter((v) => {
    if (!verseFilter.trim()) return true;
    const q = verseFilter.toLowerCase().trim();
    // Match verse number (e.g. "16") or verse text
    return v.verse.toString() === q || v.text.toLowerCase().includes(q);
  });

  const toggleVerseSelection = (verseNum, e) => {
    if (e) e.stopPropagation();
    setSelectedVerseNumbers((prev) =>
      prev.includes(verseNum)
        ? prev.filter((v) => v !== verseNum)
        : [...prev, verseNum].sort((a, b) => a - b)
    );
  };

  const selectAllVerses = () => {
    if (selectedVerseNumbers.length === bibleResults.length) {
      setSelectedVerseNumbers([]);
    } else {
      setSelectedVerseNumbers(bibleResults.map((v) => v.verse));
    }
  };

  const getPassageRef = (nums) => {
    if (nums.length === 0 || !activeBookObj) return "";
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const bookName = activeBookObj.name;
    return min === max
      ? `${bookName} ${selectedChapter}:${min}`
      : `${bookName} ${selectedChapter}:${min}-${max}`;
  };

  const activeVersionObj = bibleVersions.find((v) => v.id === selectedBibleVersion);
  const versionBadge = activeVersionObj?.localAbbr || activeVersionObj?.name?.slice(0, 10) || selectedBibleVersion.toUpperCase();

  return (
    <main className="flex-1 flex flex-col bg-surface min-w-0">
      {/* 1. Header Toolbar */}
      <header className="bg-surface-container border-b border-outline-variant px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-headline-sm text-lg md:text-xl font-bold text-on-surface truncate">
                {activeBookObj ? `${activeBookObj.name} ${selectedChapter}` : "Módulo de Biblia"}
              </h1>
              <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded shadow-sm">
                {versionBadge}
              </span>
              {activeBookObj && (
                <span className="text-[11px] text-on-surface-variant font-mono hidden md:inline">
                  ({filteredVerses.length} {filteredVerses.length === 1 ? "diapositiva" : "diapositivas"})
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant truncate">
              {activeVersionObj?.name || "Versión de la Biblia"} {activeBookObj ? `• ${activeBookObj.testament === "OT" ? "Antiguo Testamento" : "Nuevo Testamento"}` : "• Selecciona un libro para comenzar"}
            </p>
          </div>
        </div>

        {/* Center / Navigation Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Version Selector */}
          <select
            value={selectedBibleVersion || "RVR1960"}
            onChange={(e) => onSelectVersion && onSelectVersion(e.target.value)}
            className="bg-surface-container-highest border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface outline-none cursor-pointer font-bold hover:border-primary transition-colors max-w-[130px] truncate"
            title="Cambiar versión bíblica"
          >
            {bibleVersions.length > 0 ? (
              bibleVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.localAbbr || v.id} - {v.name}
                </option>
              ))
            ) : (
              <>
                <option value="RVR1960">RVR1960 - Reina Valera 1960</option>
                <option value="NVI">NVI - Nueva Versión Internacional</option>
                <option value="NTV">NTV - Nueva Traducción Viviente</option>
                <option value="LBLA">LBLA - La Biblia de las Américas</option>
                <option value="NBLA">NBLA - Nueva Biblia de las Américas</option>
                <option value="RVC">RVC - Reina Valera Contemporánea</option>
                <option value="TLA">TLA - Traducción en Lenguaje Actual</option>
              </>
            )}
          </select>

          {/* Quick Book Selector */}
          <select
            value={selectedBookId || ""}
            onChange={(e) => onSelectBook && onSelectBook(e.target.value)}
            className="bg-surface-container-highest border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface outline-none cursor-pointer font-bold hover:border-primary transition-colors max-w-[140px] truncate"
            title="Cambiar libro de la Biblia"
          >
            <option value="">-- Elige un libro --</option>
            <optgroup label="Antiguo Testamento">
              {bibleBooks
                .filter((b) => b.testament === "OT")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Nuevo Testamento">
              {bibleBooks
                .filter((b) => b.testament === "NT")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </optgroup>
          </select>

          {/* Chapter Stepper Buttons (only when a book is selected) */}
          {activeBookObj && (
            <div className="flex items-center bg-surface-container-highest rounded border border-outline-variant p-0.5">
              <button
                onClick={() => onSelectChapter && onSelectChapter(selectedChapter - 1)}
                disabled={selectedChapter <= 1 || isLoadingBible}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Capítulo anterior"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>

              <select
                value={selectedChapter}
                onChange={(e) => onSelectChapter && onSelectChapter(parseInt(e.target.value, 10))}
                disabled={isLoadingBible}
                className="bg-transparent border-none outline-none px-2 py-0.5 text-xs text-on-surface font-mono font-bold cursor-pointer"
                title="Seleccionar capítulo"
              >
                {Array.from({ length: totalChapters }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Cap. {num}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onSelectChapter && onSelectChapter(selectedChapter + 1)}
                disabled={selectedChapter >= totalChapters || isLoadingBible}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Capítulo siguiente"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}

          {/* Quick Filter */}
          <div className="relative flex items-center bg-surface-container-highest rounded px-2 py-1 border border-outline-variant text-xs">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant mr-1.5">filter_list</span>
            <input
              type="text"
              placeholder="Filtrar v. o texto..."
              value={verseFilter}
              onChange={(e) => setVerseFilter(e.target.value)}
              className="w-24 sm:w-28 md:w-32 bg-transparent border-none outline-none text-xs text-on-surface placeholder:text-outline"
            />
            {verseFilter && (
              <button
                onClick={() => setVerseFilter("")}
                className="text-on-surface-variant hover:text-on-surface ml-1"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            )}
          </div>

          {/* Acomodo de Texto en Pantalla */}
          <div className="flex items-center bg-surface-container-highest rounded border border-outline-variant p-0.5" title="Acomodo del texto en pantalla">
            <span className="material-symbols-outlined text-[15px] text-primary ml-1 mr-0.5">
              {bibleLayout === "full" ? "width_full" : bibleLayout === "lower-third" ? "call_to_action" : bibleLayout === "top-banner" ? "vertical_align_top" : "crop_16_9"}
            </span>
            <select
              value={bibleLayout || "full"}
              onChange={(e) => onUpdateBibleLayout && onUpdateBibleLayout(e.target.value)}
              className="bg-transparent border-none outline-none px-1.5 py-0.5 text-xs text-on-surface font-bold cursor-pointer"
              title="Acomodar texto en pantalla"
            >
              <option value="full">↔️ A lo largo (Ancho completo)</option>
              <option value="standard">🔲 Estándar (Centrado 85%)</option>
              <option value="lower-third">⬇️ Cintillo Inferior (Abajo)</option>
              <option value="top-banner">⬆️ Cintillo Superior (Arriba)</option>
            </select>
          </div>

          {/* Posición Vertical */}
          <div className="flex items-center bg-surface-container-highest rounded border border-outline-variant p-0.5" title="Posición vertical del texto">
            <button
              onClick={() => onUpdateBibleVerticalAlign && onUpdateBibleVerticalAlign("flex-start")}
              className={`p-1 rounded transition-colors ${bibleVerticalAlign === "flex-start" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              title="Posición: Arriba"
            >
              <span className="material-symbols-outlined text-[15px]">vertical_align_top</span>
            </button>
            <button
              onClick={() => onUpdateBibleVerticalAlign && onUpdateBibleVerticalAlign("center")}
              className={`p-1 rounded transition-colors ${(!bibleVerticalAlign || bibleVerticalAlign === "center") ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              title="Posición: Centro"
            >
              <span className="material-symbols-outlined text-[15px]">vertical_align_center</span>
            </button>
            <button
              onClick={() => onUpdateBibleVerticalAlign && onUpdateBibleVerticalAlign("flex-end")}
              className={`p-1 rounded transition-colors ${bibleVerticalAlign === "flex-end" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              title="Posición: Abajo"
            >
              <span className="material-symbols-outlined text-[15px]">vertical_align_bottom</span>
            </button>
          </div>

          {/* Alineación Horizontal */}
          <div className="flex items-center bg-surface-container-highest rounded border border-outline-variant p-0.5">
            <button
              onClick={() => onUpdateBibleTextAlign && onUpdateBibleTextAlign("left")}
              className={`p-1 rounded transition-colors ${bibleTextAlign === "left" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              title="Alinear texto a la izquierda"
            >
              <span className="material-symbols-outlined text-[15px]">format_align_left</span>
            </button>
            <button
              onClick={() => onUpdateBibleTextAlign && onUpdateBibleTextAlign("center")}
              className={`p-1 rounded transition-colors ${(!bibleTextAlign || bibleTextAlign === "center") ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              title="Centrar texto"
            >
              <span className="material-symbols-outlined text-[15px]">format_align_center</span>
            </button>
            <button
              onClick={() => onUpdateBibleTextAlign && onUpdateBibleTextAlign("justify")}
              className={`p-1 rounded transition-colors ${bibleTextAlign === "justify" ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              title="Justificar texto a lo largo"
            >
              <span className="material-symbols-outlined text-[15px]">format_align_justify</span>
            </button>
          </div>

          {/* Ajuste de Tamaño de Letra */}
          <div className="hidden sm:flex items-center bg-surface-container-highest rounded border border-outline-variant p-0.5">
            <button
              onClick={() => {
                const cur = parseInt(bibleFontSize) || 60;
                const next = Math.max(32, cur - 6);
                onUpdateBibleFontSize && onUpdateBibleFontSize(`${next}px`);
              }}
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
              title="Reducir tamaño de letra"
            >
              <span className="material-symbols-outlined text-[14px]">text_decrease</span>
            </button>
            <span className="text-[11px] font-mono font-bold px-1 text-on-surface-variant min-w-[32px] text-center">
              {bibleFontSize ? bibleFontSize.replace("px", "") : "Auto"}
            </span>
            <button
              onClick={() => {
                const cur = parseInt(bibleFontSize) || 60;
                const next = Math.min(110, cur + 6);
                onUpdateBibleFontSize && onUpdateBibleFontSize(`${next}px`);
              }}
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
              title="Aumentar tamaño de letra"
            >
              <span className="material-symbols-outlined text-[14px]">text_increase</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onCreatePresentationFromChapter && (
              <button
                onClick={onCreatePresentationFromChapter}
                className="bg-surface-container-highest hover:bg-primary hover:text-on-primary text-xs px-2.5 py-1 rounded text-on-surface flex items-center gap-1 font-bold transition-all border border-outline-variant"
                title="Guardar este capítulo completo como una canción/presentación en la biblioteca"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                <span className="hidden xl:inline">Guardar</span>
              </button>
            )}

            {onLoadInProduction && (
              <button
                onClick={onLoadInProduction}
                className="bg-primary hover:bg-primary/90 text-on-primary text-xs px-2.5 py-1 rounded flex items-center gap-1 font-bold shadow-sm transition-all"
                title="Cargar y proyectar este capítulo directamente en la pestaña de Producción"
              >
                <span className="material-symbols-outlined text-[14px]">play_circle</span>
                <span className="hidden md:inline">Cargar Diapos</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Quick Horizontal Chapter Pills Bar (only when a book is selected) */}
      {activeBookObj && (
        <div className="bg-surface-container-low border-b border-outline-variant px-4 py-1.5 flex items-center gap-1 overflow-x-auto custom-scrollbar select-none">
          <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider mr-1 flex-shrink-0">
            Capítulos:
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalChapters }, (_, i) => i + 1).map((num) => {
              const isCurrent = num === selectedChapter;
              return (
                <button
                  key={num}
                  onClick={() => onSelectChapter && onSelectChapter(num)}
                  disabled={isLoadingBible}
                  className={`min-w-[28px] h-6 px-1.5 text-xs font-mono rounded flex items-center justify-center font-bold transition-all flex-shrink-0 ${
                    isCurrent
                      ? "bg-primary text-on-primary shadow-sm scale-105"
                      : "bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Multi-Select Floating / Sticky Action Bar */}
      {selectedVerseNumbers.length > 0 && (
        <div className="bg-primary text-on-primary px-4 py-2 flex items-center justify-between text-xs font-bold shadow-md z-30 transition-all">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_box</span>
            <span>
              {selectedVerseNumbers.length}{" "}
              {selectedVerseNumbers.length === 1 ? "versículo seleccionado" : "versículos seleccionados"}
              : <span className="underline decoration-white/40 ml-1">{getPassageRef(selectedVerseNumbers)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const selectedObjs = bibleResults.filter((v) =>
                  selectedVerseNumbers.includes(v.verse)
                );
                const currentStyle = {
                  textAlign: bibleTextAlign || "center",
                  fontSize: bibleFontSize || undefined,
                  fullWidth: bibleLayout === "full" || bibleLayout === "lower-third" || bibleLayout === "top-banner",
                  layout: bibleLayout || "full",
                  verticalAlign: bibleLayout === "lower-third" ? "flex-end" : bibleLayout === "top-banner" ? "flex-start" : (bibleVerticalAlign || "center")
                };
                onTriggerBibleVerseLive(selectedObjs, currentStyle);
              }}
              className="bg-error hover:bg-error/90 text-on-error px-3 py-1 rounded shadow flex items-center gap-1 transition-all uppercase tracking-wider text-[11px]"
              title="Proyectar selección combinada en la pantalla principal"
            >
              <span className="material-symbols-outlined text-[14px]">sensors</span>
              VIVO ({selectedVerseNumbers.length})
            </button>

            {onAddVerseToPresentation && (
              <button
                onClick={() => {
                  const selectedObjs = bibleResults.filter((v) =>
                    selectedVerseNumbers.includes(v.verse)
                  );
                  onAddVerseToPresentation(selectedObjs);
                  setSelectedVerseNumbers([]);
                }}
                className="bg-surface-container-lowest text-on-surface hover:bg-white px-2.5 py-1 rounded shadow text-[11px] flex items-center gap-1 transition-all"
                title="Añadir a la canción activa como diapositiva"
              >
                <span className="material-symbols-outlined text-[14px]">add_to_photos</span>
                + Diapo
              </button>
            )}

            <button
              onClick={() => setSelectedVerseNumbers([])}
              className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
              title="Deseleccionar todos"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Slides Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-surface-dim">
        {!selectedBookId ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto my-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-sm border border-primary/20">
              <span className="material-symbols-outlined text-4xl">menu_book</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Módulo de Biblia Digital</h2>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed max-w-md">
              Selecciona un libro en el panel lateral o elige uno de los accesos directos a continuación para ver sus versículos organizados en diapositivas:
            </p>

            <div className="w-full space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">
                  Nuevo Testamento
                </span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {[
                    { id: "mateo", name: "Mateo" },
                    { id: "marcos", name: "Marcos" },
                    { id: "lucas", name: "Lucas" },
                    { id: "sanjuan", name: "Juan" },
                    { id: "hechos", name: "Hechos" },
                    { id: "romanos", name: "Romanos" },
                    { id: "1corintios", name: "1 Corintios" },
                    { id: "apocalipsis", name: "Apocalipsis" }
                  ].map((book) => (
                    <button
                      key={book.id}
                      onClick={() => onSelectBook && onSelectBook(book.id)}
                      className="bg-surface-container-highest hover:bg-primary hover:text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface border border-outline-variant hover:border-primary transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                      {book.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">
                  Antiguo Testamento
                </span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {[
                    { id: "génesis", name: "Génesis" },
                    { id: "éxodo", name: "Éxodo" },
                    { id: "salmos", name: "Salmos" },
                    { id: "proverbios", name: "Proverbios" },
                    { id: "isaías", name: "Isaías" }
                  ].map((book) => (
                    <button
                      key={book.id}
                      onClick={() => onSelectBook && onSelectBook(book.id)}
                      className="bg-surface-container-highest hover:bg-primary hover:text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface border border-outline-variant hover:border-primary transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                      {book.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : isLoadingBible ? (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant gap-3 py-24">
            <span className="material-symbols-outlined text-5xl animate-spin text-primary">sync</span>
            <p className="text-sm font-medium">Cargando diapositivas de {activeBookObj?.name || ""} {selectedChapter}...</p>
          </div>
        ) : filteredVerses.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max">
            {filteredVerses.map((v, index) => {
              const slideId = `bible-${v.book}-${v.chapter}-${v.verse}`;
              const isLive = activeSlideId === slideId;
              const isSelected = selectedSlide?.id === slideId;
              const isChecked = selectedVerseNumbers.includes(v.verse);

              const slideData = {
                id: slideId,
                label: `v.${v.verse}`,
                text: `"${v.text}"\n\n${v.book} ${v.chapter}:${v.verse}`,
                overlays: [],
                style: {
                  textAlign: bibleTextAlign || "center",
                  fontSize: bibleFontSize || undefined,
                  fullWidth: bibleLayout === "full" || bibleLayout === "lower-third" || bibleLayout === "top-banner",
                  layout: bibleLayout || "full",
                  verticalAlign: bibleLayout === "lower-third" ? "flex-end" : bibleLayout === "top-banner" ? "flex-start" : (bibleVerticalAlign || "center")
                }
              };

              return (
                <div
                  key={slideId}
                  id={`slide-card-${slideId}`}
                  onClick={() => {
                    if (document.activeElement && typeof document.activeElement.blur === "function") {
                      document.activeElement.blur();
                    }
                    setSelectedSlide(slideData);
                    onTriggerBibleVerseLive(v, slideData.style);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropBackgroundOnSlide && handleDropBackgroundOnSlide(e, index)}
                  className={`group relative flex flex-col cursor-pointer transition-all rounded select-none ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {/* LIVE Badge */}
                  {isLive && (
                    <div className="absolute -top-2.5 right-2 bg-error text-on-error font-label-caps text-[9px] px-1.5 py-0.5 rounded shadow-sm z-20 uppercase animate-pulse font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      VIVO
                    </div>
                  )}

                  {/* Top-Left Labels */}
                  <div className="absolute -top-2 -left-2 flex items-center gap-1 z-10">
                    <span className="text-[10px] font-mono-label text-white bg-primary px-1.5 py-0.5 rounded-sm font-bold shadow-sm">
                      v. {v.verse}
                    </span>
                    <span className="text-[9px] font-sans font-medium text-on-surface-variant bg-surface-container-highest px-1 rounded-sm shadow-sm hidden sm:inline">
                      {v.book} {v.chapter}:{v.verse}
                    </span>
                  </div>

                  {/* Multi-Select Checkbox (Top Right, if not live) */}
                  {!isLive && (
                    <div
                      className={`absolute top-2 right-2 z-20 transition-opacity ${
                        isChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => toggleVerseSelection(v.verse, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="w-4 h-4 accent-primary cursor-pointer rounded drop-shadow"
                      />
                    </div>
                  )}

                  {/* Slide Visual Card (16:9 Aspect Ratio) */}
                  <div
                    className={`aspect-video bg-zinc-950 rounded flex flex-col items-center justify-between p-3 overflow-hidden relative shadow-md transition-all border-2 ${
                      isLive
                        ? "border-error ring-2 ring-error/40 shadow-error/20"
                        : isSelected
                        ? "border-primary"
                        : isChecked
                        ? "border-primary/60 bg-primary/5"
                        : "border-zinc-800 group-hover:border-zinc-500 group-hover:shadow-lg"
                    }`}
                  >
                    {/* Background Preview */}
                    {activeBackground.url ? (
                      <div className="absolute inset-0 z-0 opacity-25 group-hover:opacity-35 transition-opacity">
                        {activeBackground.type === "image" ? (
                          <img src={activeBackground.url} className={`w-full h-full ${activeBgFit === "fill" ? "object-fill" : activeBgFit === "contain" ? "object-contain" : "object-cover"}`} alt="" />
                        ) : (
                          <video src={activeBackground.url} className={`w-full h-full ${activeBgFit === "fill" ? "object-fill" : activeBgFit === "contain" ? "object-contain" : "object-cover"}`} muted />
                        )}
                        <div className="absolute inset-0 bg-black/60" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 to-black/80 z-0" />
                    )}

                    {/* Subtle Verse Number Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <span className="text-zinc-800/40 font-mono font-black text-6xl select-none">
                        {v.verse}
                      </span>
                    </div>

                    {/* Scripture Text Body */}
                    <div className={`relative z-10 w-full flex-1 flex flex-col pointer-events-none px-1 ${
                      bibleLayout === "lower-third" || bibleVerticalAlign === "flex-end" ? "justify-end pb-1" :
                      bibleLayout === "top-banner" || bibleVerticalAlign === "flex-start" ? "justify-start pt-1" : "justify-center"
                    } ${
                      bibleTextAlign === "left" ? "text-left items-start" :
                      bibleTextAlign === "justify" ? "text-justify items-stretch" : "text-center items-center"
                    }`}>
                      {v.heading && (
                        <span className="text-[9px] sm:text-[10px] text-tertiary-fixed font-bold uppercase tracking-wider mb-0.5 line-clamp-1 drop-shadow opacity-95">
                          — {v.heading} —
                        </span>
                      )}
                      <p 
                        style={{ textAlign: bibleTextAlign || "center" }}
                        className={`w-full text-white font-display-live font-bold drop-shadow-md leading-tight text-[11px] sm:text-xs md:text-[13px] ${
                          bibleLayout === "lower-third" ? "line-clamp-3 bg-black/75 px-1.5 py-0.5 rounded border-t border-primary/40" :
                          bibleLayout === "top-banner" ? "line-clamp-3 bg-black/75 px-1.5 py-0.5 rounded border-b border-primary/40" :
                          bibleLayout === "full" ? "px-0.5 line-clamp-5 tracking-tight" : "max-w-[92%] line-clamp-4 mx-auto"
                        }`}
                      >
                        "{v.text}"
                      </p>
                    </div>

                    {/* Slide Reference Footer */}
                    <div className="relative z-10 w-full flex justify-between items-center pt-1 border-t border-white/10 pointer-events-none">
                      <span className="text-[10px] font-bold text-tertiary-fixed tracking-wide drop-shadow">
                        {v.book} {v.chapter}:{v.verse}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400">
                        {versionBadge}
                      </span>
                    </div>

                    {/* Quick Hover Controls Overlay */}
                    <div
                      className="absolute inset-0 z-20 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all p-2 backdrop-blur-[1px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setSelectedSlide(slideData);
                          onTriggerBibleVerseLive(v, slideData.style);
                        }}
                        className="bg-error hover:bg-red-600 text-on-error font-bold text-xs px-2.5 py-1 rounded shadow-md flex items-center gap-1 uppercase tracking-wider transition-transform active:scale-95"
                        title="Proyectar este versículo en vivo"
                      >
                        <span className="material-symbols-outlined text-[14px]">sensors</span>
                        VIVO
                      </button>

                      {onAddVerseToPresentation && (
                        <button
                          onClick={() => onAddVerseToPresentation(v)}
                          className="bg-surface-container-highest hover:bg-primary hover:text-on-primary font-bold text-xs px-2 py-1 rounded text-on-surface shadow transition-colors flex items-center gap-1"
                          title="Añadir como diapositiva a la canción activa"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          Diapo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-24 gap-3">
            <span className="material-symbols-outlined text-6xl text-outline">search_off</span>
            <p className="text-base font-medium">No se encontraron versículos</p>
            {verseFilter && (
              <button
                onClick={() => setVerseFilter("")}
                className="text-xs text-primary hover:underline font-bold"
              >
                Limpiar filtro "{verseFilter}"
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
