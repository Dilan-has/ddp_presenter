import { useState, useEffect, useRef } from "react";

// Helper to get animation classNames for in and out states
const getAnimClass = (transition, isOut) => {
  if (!transition || transition === "none") return "";
  if (transition === "fade") return isOut ? "animate-fade-out" : "animate-fade-in";
  if (transition === "zoom") return isOut ? "animate-zoom-out" : "animate-zoom-in";
  if (transition === "slide") return isOut ? "animate-slide-out" : "animate-slide-in";
  return isOut ? "animate-fade-out" : "animate-fade-in";
};

export default function SidebarRight({
  // Preview
  activeBackground,
  prevBackground,
  activeBgTransition,
  activeBgDuration,
  activeSlideText,
  activeSlideStyle,
  activeSlideImage,
  activeSlideImageStyle,
  activeOverlays,
  // Time/Timers
  systemTime,
  timerLabel,
  timerMinutes,
  timerSeconds,
  timerActive,
  setTimerActive,
  setTimerMinutes,
  setTimerSeconds,
  // Macros
  activeSong,
  triggerSlideLive,
  handleClearAll,
  // Inspector
  selectedSlide,
  mediaFiles = [],
  onSaveSlideText,
  onUpdateSlideImage,
  onUpdateSlideImageStyle,
  onAddTextOverlay,
  onAddImageOverlay,
  onDeleteOverlay,
  onUpdateOverlayText,
  onUpdateOverlayStyle,
  onUpdateSlideStyle
}) {
  const [inspectorText, setInspectorText] = useState("");
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  
  // Image picker modal state: null, "slide", or "overlay"
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerTab, setPickerTab] = useState("media"); // "media", "upload", "url"
  const [pickerUrlInput, setPickerUrlInput] = useState("");

  // Dual-Deck preview monitor state (Zero-glitch crossfading)
  const [monDeck1, setMonDeck1] = useState(activeBackground ? { ...activeBackground, ready: true } : { url: "", type: "none", ready: true });
  const [monDeck2, setMonDeck2] = useState({ url: "", type: "none", ready: true });
  const [activeMonDeck, setActiveMonDeck] = useState(1);
  const [isMonTransitioning, setIsMonTransitioning] = useState(false);
  const monCleanupTimerRef = useRef(null);
  const monPendingCrossfadeRef = useRef(null);
  const monWaitTimeoutRef = useRef(null);

  useEffect(() => {
    const currentMedia = activeMonDeck === 1 ? monDeck1 : monDeck2;
    if (currentMedia.url === activeBackground.url && currentMedia.type === activeBackground.type) {
      return;
    }

    if (monWaitTimeoutRef.current) clearTimeout(monWaitTimeoutRef.current);
    monPendingCrossfadeRef.current = null;

    const nextDeck = activeMonDeck === 1 ? 2 : 1;
    const isVideo = activeBackground.type === "video";
    const newMedia = {
      ...activeBackground,
      ready: !isVideo
    };

    if (nextDeck === 1) setMonDeck1(newMedia);
    else setMonDeck2(newMedia);

    const executeMonCrossfade = () => {
      if (monWaitTimeoutRef.current) {
        clearTimeout(monWaitTimeoutRef.current);
        monWaitTimeoutRef.current = null;
      }
      monPendingCrossfadeRef.current = null;

      if (nextDeck === 1) setMonDeck1(d => ({ ...d, ready: true }));
      else setMonDeck2(d => ({ ...d, ready: true }));

      setActiveMonDeck(nextDeck);
      setIsMonTransitioning(true);

      if (monCleanupTimerRef.current) clearTimeout(monCleanupTimerRef.current);
      monCleanupTimerRef.current = setTimeout(() => {
        setIsMonTransitioning(false);
        if (nextDeck === 1) setMonDeck2({ url: "", type: "none", ready: true });
        else setMonDeck1({ url: "", type: "none", ready: true });
      }, activeBgDuration * 1000 + 80);
    };

    if (isVideo) {
      monPendingCrossfadeRef.current = executeMonCrossfade;
      monWaitTimeoutRef.current = setTimeout(() => {
        if (monPendingCrossfadeRef.current) monPendingCrossfadeRef.current();
      }, 300);
    } else {
      executeMonCrossfade();
    }

    return () => {
      if (monCleanupTimerRef.current) clearTimeout(monCleanupTimerRef.current);
      if (monWaitTimeoutRef.current) clearTimeout(monWaitTimeoutRef.current);
    };
  }, [activeBackground]);

  // Sync editor states when selected slide changes
  useEffect(() => {
    if (selectedSlide) {
      setInspectorText(selectedSlide.text || "");
      setSelectedOverlayId(null);
    } else {
      setInspectorText("");
      setSelectedOverlayId(null);
    }
  }, [selectedSlide]);

  const selectedSlideOverlays = selectedSlide?.overlays || [];
  const currentSelectedOverlay = selectedSlideOverlays.find((o) => o.id === selectedOverlayId);

  const handleSelectImageForTarget = (imageUrl) => {
    if (!imageUrl) return;
    if (pickerTarget === "slide" && selectedSlide) {
      onUpdateSlideImage(selectedSlide.id, imageUrl);
    } else if (pickerTarget === "overlay" && selectedSlide) {
      onAddImageOverlay(imageUrl);
    }
    setPickerTarget(null);
    setPickerUrlInput("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: {
          "x-filename": file.name,
          "content-type": file.type
        },
        body: buffer
      });
      const data = await res.json();
      if (data.success && data.url) {
        handleSelectImageForTarget(data.url);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
    }
  };

  const currentSlideImgPos = selectedSlide?.imageStyle?.position || "center";
  const currentSlideImgFit = selectedSlide?.imageStyle?.fit || "contain";
  const currentSlideImgSize = parseInt(selectedSlide?.imageStyle?.size) || 70;

  return (
    <div className="flex shrink-0 relative">
      {/* Sidebar: Preview, Clocks, Macros */}
      <aside className="w-72 bg-surface-container-low flex flex-col flex-shrink-0 border-l border-outline-variant select-none">
        {/* Live Preview Monitor with Overlays rendering */}
        <div className="p-3 border-b border-outline-variant flex flex-col gap-2">
          <span className="text-label-caps font-label-caps uppercase text-on-surface-variant">Vista Previa</span>
          <div className="aspect-video bg-black rounded border border-outline shadow-sm relative overflow-hidden flex items-center justify-center p-3 select-none">
            
            {/* Seamless Dual-Deck Background for Live Preview Monitor */}
            {(() => {
              const renderMonLayer = (deckNum, deckData) => {
                if (!deckData || deckData.type === "none" || !deckData.url) return null;
                const isCurrent = activeMonDeck === deckNum;
                const isReady = deckData.ready !== false;
                if (!isCurrent && !isMonTransitioning && isReady) return null;

                let layerClass = "z-10 opacity-100";
                if (!isReady) {
                  layerClass = "z-0 opacity-0 pointer-events-none";
                } else if (isMonTransitioning) {
                  if (isCurrent) {
                    layerClass = `z-10 ${getAnimClass(activeBgTransition, false)}`;
                  } else {
                    layerClass = "z-0 opacity-100";
                  }
                }

                return (
                  <div
                    key={`mon-deck-${deckNum}-${deckData.url}`}
                    style={{ animationDuration: `${activeBgDuration}s` }}
                    className={`absolute inset-0 w-full h-full pointer-events-none ${layerClass}`}
                  >
                    {deckData.type === "image" && (
                      <img
                        src={deckData.url}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )}
                    {deckData.type === "video" && (
                      <video
                        src={deckData.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onPlaying={() => {
                          if (monPendingCrossfadeRef.current) {
                            monPendingCrossfadeRef.current();
                          }
                        }}
                        onCanPlay={(e) => {
                          e.target.play().catch(() => {});
                          if (monPendingCrossfadeRef.current) {
                            monPendingCrossfadeRef.current();
                          }
                        }}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )}
                  </div>
                );
              };

              return (
                <>
                  {renderMonLayer(1, monDeck1)}
                  {renderMonLayer(2, monDeck2)}
                </>
              );
            })()}

            {activeBackground.type !== "none" && (
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            )}

            {/* Slide Image Preview in Monitor */}
            {activeSlideImage && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-2 pointer-events-none">
                <img
                  src={activeSlideImage}
                  style={{
                    maxHeight: activeSlideImageStyle?.size || "70%",
                    maxWidth: activeSlideImageStyle?.size || "70%"
                  }}
                  className={`object-${activeSlideImageStyle?.fit || "contain"} rounded drop-shadow-md`}
                  alt=""
                />
              </div>
            )}

            {/* Slide text */}
            {activeSlideText && (
              <p
                style={{
                  fontSize: activeSlideStyle.fontSize ? `${parseInt(activeSlideStyle.fontSize) * 0.22}px` : undefined,
                  textAlign: activeSlideStyle.textAlign || "center"
                }}
                className={`w-full px-2 text-white font-bold font-display-live leading-tight drop-shadow-lg z-10 relative whitespace-pre-line ${
                  !activeSlideStyle.fontSize ? "text-xs" : ""
                }`}
              >
                {activeSlideText}
              </p>
            )}

            {/* Overlays */}
            {activeOverlays?.map((ov) => {
              const scaleStyle = {
                transform: "scale(0.55)",
                transformOrigin: "center center"
              };
              const customStyle = {
                position: "absolute",
                ...ov.style,
                ...scaleStyle
              };
              if (ov.type === "image") {
                return (
                  <img
                    key={ov.id}
                    src={ov.url}
                    style={customStyle}
                    alt=""
                    className="pointer-events-none object-contain"
                  />
                );
              }
              if (ov.type === "text") {
                return (
                  <div
                    key={ov.id}
                    style={customStyle}
                    className="text-white text-[11px] font-bold pointer-events-none whitespace-pre-line"
                  >
                    {ov.text}
                  </div>
                );
              }
              return null;
            })}

            <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/60 rounded px-1 text-[8px] font-bold text-white">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeSlideText || activeSlideImage || activeBackground.type !== "none" ? "bg-error animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span>ON AIR</span>
            </div>
          </div>
        </div>

        {/* Clocks & Timer controls */}
        <div className="p-3 border-b border-outline-variant flex flex-col gap-3">
          <span className="text-label-caps font-label-caps uppercase text-on-surface-variant">Relojes y Temporizadores</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container p-2 rounded flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase text-on-surface-variant mb-1 font-bold">Sistema</span>
              <span className="font-mono-label text-headline-sm text-on-surface">{systemTime}</span>
            </div>
            <div className="bg-surface-container p-2 rounded flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase text-on-surface-variant mb-1 font-bold">{timerLabel}</span>
              <span
                className={`font-mono-label text-headline-sm ${
                  timerMinutes === 0 && timerSeconds === 0 ? "text-error" : "text-tertiary-fixed"
                }`}
              >
                {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`flex-1 text-label-caps py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
                timerActive
                  ? "bg-error hover:bg-error/80 text-on-error"
                  : "bg-surface-container-highest hover:bg-primary/20 hover:text-primary text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {timerActive ? "pause" : "play_arrow"}
              </span>
              {timerActive ? "Pausa" : "Iniciar"}
            </button>
            <button
              onClick={() => {
                setTimerActive(false);
                setTimerMinutes(5);
                setTimerSeconds(0);
              }}
              className="flex-1 bg-surface-container-highest hover:bg-surface-variant text-on-surface text-label-caps py-1.5 rounded transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Reini.
            </button>
          </div>
        </div>

        {/* Quick Macros */}
        <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          <span className="text-label-caps font-label-caps uppercase text-on-surface-variant">Macros Rápidas</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                if (activeSong?.slides?.length > 0) {
                  triggerSlideLive(activeSong.slides[0], 0);
                }
              }}
              className="bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-on-surface py-2 rounded shadow-sm border border-transparent hover:border-outline-variant transition-all flex flex-col items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed" />
              Intro
            </button>
            <button
              onClick={() => {
                if (activeSong?.slides?.length > 1) {
                  triggerSlideLive(activeSong.slides[1], 1);
                }
              }}
              className="bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-on-surface py-2 rounded shadow-sm border border-transparent hover:border-outline-variant transition-all flex flex-col items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-primary" />
              Verso
            </button>
            <button
              onClick={() => {
                const coroIndex = activeSong?.slides.findIndex((s) => s.text.toLowerCase().includes("coro")) ?? -1;
                if (activeSong && coroIndex !== -1) {
                  triggerSlideLive(activeSong.slides[coroIndex], coroIndex);
                }
              }}
              className="bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-on-surface py-2 rounded shadow-sm border border-transparent hover:border-outline-variant transition-all flex flex-col items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-secondary" />
              Coro
            </button>
            <button
              onClick={handleClearAll}
              className="bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-on-surface py-2 rounded shadow-sm border border-transparent hover:border-outline-variant transition-all flex flex-col items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-outline" />
              Fondo Negro
            </button>
          </div>
        </div>
      </aside>

      {/* Selected Slide Inspector */}
      <aside className="w-64 bg-surface-container-low border-l border-outline-variant flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
        <div className="p-3 border-b border-outline-variant">
          <span className="text-label-caps font-label-caps uppercase text-on-surface-variant">Inspector de Diapositiva</span>
        </div>
        {selectedSlide ? (
          <div className="p-4 flex flex-col gap-4">
            {/* Core slide text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold">Texto Principal</label>
              <textarea
                className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-body-sm text-on-surface outline-none focus:border-primary custom-scrollbar min-h-20 resize-y"
                value={inspectorText}
                onChange={(e) => setInspectorText(e.target.value)}
              />
              <button
                onClick={() => onSaveSlideText(selectedSlide.id, inspectorText)}
                className="bg-primary hover:bg-primary/80 text-on-primary text-[11px] font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                Guardar Texto
              </button>
            </div>

            {/* Slide Image Section */}
            <div className="border-t border-outline-variant pt-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">image</span>
                  Imagen de Diapositiva
                </span>
              </div>

              {selectedSlide.imageUrl ? (
                <div className="bg-surface-container rounded p-2 border border-outline-variant flex flex-col gap-2">
                  <div className="relative aspect-video bg-black rounded overflow-hidden group">
                    <img src={selectedSlide.imageUrl} className="w-full h-full object-contain" alt="" />
                    <button
                      onClick={() => onUpdateSlideImage(selectedSlide.id, null)}
                      className="absolute top-1 right-1 bg-error/90 hover:bg-error text-white p-1 rounded-full text-xs shadow transition-all flex items-center"
                      title="Quitar Imagen"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>

                  {/* Image Layout / Disposición */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-on-surface-variant">Disposición</label>
                    <select
                      value={currentSlideImgPos}
                      onChange={(e) => onUpdateSlideImageStyle(selectedSlide.id, { position: e.target.value })}
                      className="bg-surface-container-highest border border-outline-variant rounded p-1 text-xs text-on-surface outline-none focus:border-primary"
                    >
                      <option value="center">Centrada</option>
                      <option value="left">Izquierda (con texto)</option>
                      <option value="right">Derecha (con texto)</option>
                      <option value="top">Arriba (con texto)</option>
                      <option value="bottom">Abajo (con texto)</option>
                      <option value="background">Fondo del Contenido</option>
                      <option value="only-image">Sólo Imagen (Ocultar texto)</option>
                    </select>
                  </div>

                  {/* Image Fit & Scale Slider */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-on-surface-variant">Ajuste</label>
                      <select
                        value={currentSlideImgFit}
                        onChange={(e) => onUpdateSlideImageStyle(selectedSlide.id, { fit: e.target.value })}
                        className="bg-surface-container-highest border border-outline-variant rounded p-1 text-xs text-on-surface outline-none focus:border-primary"
                      >
                        <option value="contain">Contener</option>
                        <option value="cover">Cubrir</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                        <span>Escala</span>
                        <span>{currentSlideImgSize}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={currentSlideImgSize}
                        onChange={(e) => onUpdateSlideImageStyle(selectedSlide.id, { size: e.target.value + "%" })}
                        className="accent-primary h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer mt-1"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPickerTarget("slide");
                    setPickerTab("media");
                  }}
                  className="w-full bg-surface-container hover:bg-surface-container-highest border border-dashed border-outline-variant hover:border-primary text-primary py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                  + Añadir Imagen a Diapositiva
                </button>
              )}
            </div>

            {/* Slide Overlays Editor section */}
            <div className="border-t border-outline-variant pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold">
                  Capas Sobrepuestas ({selectedSlideOverlays.length})
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAddTextOverlay(selectedSlide.id)}
                    className="bg-surface-container-highest hover:bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
                    title="Agregar texto sobrepuesto"
                  >
                    + Texto
                  </button>
                  <button
                    onClick={() => {
                      setPickerTarget("overlay");
                      setPickerTab("media");
                    }}
                    className="bg-surface-container-highest hover:bg-tertiary-fixed/20 text-tertiary-fixed text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
                    title="Agregar imagen sobrepuesta"
                  >
                    + Imagen
                  </button>
                </div>
              </div>

              {/* Overlays list */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {selectedSlideOverlays.map((ov) => (
                  <div
                    key={ov.id}
                    onClick={() => setSelectedOverlayId(ov.id)}
                    className={`flex justify-between items-center p-1.5 rounded text-xs border cursor-pointer transition-all ${
                      selectedOverlayId === ov.id
                        ? "bg-primary/10 border-primary font-bold text-primary"
                        : "bg-surface-container border-transparent hover:border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[14px]">
                        {ov.type === "image" ? "image" : "title"}
                      </span>
                      <span className="truncate">{ov.type === "image" ? "Capa de Imagen" : ov.text}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOverlay(selectedSlide.id, ov.id);
                      }}
                      className="text-error hover:text-red-400 p-0.5 flex items-center"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                ))}
                {selectedSlideOverlays.length === 0 && (
                  <span className="text-[10px] text-zinc-500 italic block text-center py-2">Sin capas sobrepuestas</span>
                )}
              </div>

              {/* Active selected overlay positioning sliders */}
              {currentSelectedOverlay && (
                <div className="bg-surface-container rounded p-2.5 space-y-3 border border-outline-variant">
                  <span className="text-[9px] uppercase font-bold text-primary block">Editar Capa Seleccionada</span>
                  
                  {currentSelectedOverlay.type === "text" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-label-caps uppercase text-on-surface-variant">Texto</label>
                      <input
                        type="text"
                        value={currentSelectedOverlay.text || ""}
                        onChange={(e) => onUpdateOverlayText(selectedSlide.id, currentSelectedOverlay.id, e.target.value)}
                        className="bg-surface-container-highest border border-outline-variant rounded p-1.5 text-xs text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {currentSelectedOverlay.type === "image" && (
                    <div className="flex flex-col gap-2">
                      <div className="aspect-video bg-black/60 rounded overflow-hidden flex items-center justify-center">
                        <img src={currentSelectedOverlay.url} className="max-h-full max-w-full object-contain" alt="" />
                      </div>
                    </div>
                  )}

                  {/* Sizing / Placement Sliders */}
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                        <span>Arriba (Y)</span>
                        <span>{currentSelectedOverlay.style?.top || "0%"}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={parseInt(currentSelectedOverlay.style?.top) || 0}
                        onChange={(e) =>
                          onUpdateOverlayStyle(selectedSlide.id, currentSelectedOverlay.id, {
                            top: e.target.value + "%"
                          })
                        }
                        className="accent-primary h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                        <span>Izquierda (X)</span>
                        <span>{currentSelectedOverlay.style?.left || "0%"}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={parseInt(currentSelectedOverlay.style?.left) || 0}
                        onChange={(e) =>
                          onUpdateOverlayStyle(selectedSlide.id, currentSelectedOverlay.id, {
                            left: e.target.value + "%"
                          })
                        }
                        className="accent-primary h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                        <span>Ancho</span>
                        <span>{currentSelectedOverlay.style?.width || "50%"}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={parseInt(currentSelectedOverlay.style?.width) || 50}
                        onChange={(e) =>
                          onUpdateOverlayStyle(selectedSlide.id, currentSelectedOverlay.id, {
                            width: e.target.value + "%"
                          })
                        }
                        className="accent-primary h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Slide Text Style & Alignment Editor */}
            <div className="border-t border-outline-variant pt-3 flex flex-col gap-2.5">
              <span className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold">
                Estilo y Posición del Texto
              </span>
              
              {/* Horizontal Alignment */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-label-caps uppercase text-on-surface-variant font-bold">
                  Alineación Horizontal
                </label>
                <div className="flex bg-surface-container-highest rounded p-1 gap-1">
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { textAlign: "left" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      selectedSlide.style?.textAlign === "left"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Izquierda"
                  >
                    <span className="material-symbols-outlined text-[16px]">format_align_left</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { textAlign: "center" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      !selectedSlide.style?.textAlign || selectedSlide.style?.textAlign === "center"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Centrado"
                  >
                    <span className="material-symbols-outlined text-[16px]">format_align_center</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { textAlign: "right" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      selectedSlide.style?.textAlign === "right"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Derecha"
                  >
                    <span className="material-symbols-outlined text-[16px]">format_align_right</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { textAlign: "justify" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      selectedSlide.style?.textAlign === "justify"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Justificado"
                  >
                    <span className="material-symbols-outlined text-[16px]">format_align_justify</span>
                  </button>
                </div>
              </div>

              {/* Vertical Alignment */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-label-caps uppercase text-on-surface-variant font-bold">
                  Posición Vertical
                </label>
                <div className="flex bg-surface-container-highest rounded p-1 gap-1">
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { verticalAlign: "flex-start" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      selectedSlide.style?.verticalAlign === "flex-start"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Arriba"
                  >
                    <span className="material-symbols-outlined text-[16px]">vertical_align_top</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { verticalAlign: "center" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      !selectedSlide.style?.verticalAlign || selectedSlide.style?.verticalAlign === "center"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Centro"
                  >
                    <span className="material-symbols-outlined text-[16px]">vertical_align_center</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { verticalAlign: "flex-end" })}
                    className={`flex-1 py-1 rounded text-xs flex items-center justify-center transition-colors ${
                      selectedSlide.style?.verticalAlign === "flex-end"
                        ? "bg-primary text-on-primary font-bold"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Abajo"
                  >
                    <span className="material-symbols-outlined text-[16px]">vertical_align_bottom</span>
                  </button>
                </div>
              </div>

              {/* Font Size Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                  <span>Tamaño de Texto</span>
                  <span>{selectedSlide.style?.fontSize || "56px"}</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="110"
                  value={parseInt(selectedSlide.style?.fontSize) || 56}
                  onChange={(e) => onUpdateSlideStyle(selectedSlide.id, { fontSize: e.target.value + "px" })}
                  className="accent-primary h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-on-surface-variant text-body-sm text-center italic mt-12">
            Seleccione una diapositiva en la grilla para ver y editar sus propiedades y capas.
          </div>
        )}
      </aside>

      {/* Image Picker Modal / Selector */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-surface border border-outline-variant rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 bg-surface-container-high border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_photo_alternate</span>
                {pickerTarget === "slide" ? "Seleccionar Imagen para Diapositiva" : "Agregar Capa de Imagen"}
              </h3>
              <button
                onClick={() => setPickerTarget(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container-highest"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Picker Tabs */}
            <div className="flex border-b border-outline-variant bg-surface-container-low px-4 gap-2">
              <button
                onClick={() => setPickerTab("media")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  pickerTab === "media"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Biblioteca de Medios
              </button>
              <button
                onClick={() => setPickerTab("upload")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  pickerTab === "upload"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Subir Archivo
              </button>
              <button
                onClick={() => setPickerTab("url")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  pickerTab === "url"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Enlace URL
              </button>
            </div>

            {/* Picker Content */}
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar min-h-64">
              {pickerTab === "media" && (
                <div>
                  {mediaFiles.filter((m) => m.type === "image").length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {mediaFiles
                        .filter((m) => m.type === "image")
                        .map((media, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectImageForTarget(media.url)}
                            className="aspect-video bg-surface-container rounded overflow-hidden border-2 border-transparent hover:border-primary cursor-pointer transition-all relative group shadow-sm"
                          >
                            <img src={media.url} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold bg-primary px-2 py-1 rounded shadow">
                                Seleccionar
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-on-surface-variant text-sm">
                      No hay imágenes en la biblioteca. Sube una o ingresa una URL.
                    </div>
                  )}
                </div>
              )}

              {pickerTab === "upload" && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-xl p-8 text-center gap-3 bg-surface-container-lowest">
                  <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                  <p className="text-xs text-on-surface-variant">Selecciona un archivo de imagen de tu equipo</p>
                  <label className="bg-primary hover:bg-primary/80 text-on-primary font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all shadow">
                    Explorar Archivo
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}

              {pickerTab === "url" && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-on-surface-variant">Ingresa la URL de la imagen:</label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={pickerUrlInput}
                    onChange={(e) => setPickerUrlInput(e.target.value)}
                    className="bg-surface-container-highest border border-outline-variant rounded p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => {
                      if (pickerUrlInput.trim()) {
                        handleSelectImageForTarget(pickerUrlInput.trim());
                      }
                    }}
                    disabled={!pickerUrlInput.trim()}
                    className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-on-primary font-bold text-xs py-2 rounded-lg transition-all"
                  >
                    Usar esta URL
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

