import { useState, useEffect, useRef } from "react";

// Helper to get animation classNames for in and out states
const getAnimClass = (transition, isOut) => {
  if (!transition || transition === "none") return "";
  if (transition === "fade") return isOut ? "animate-fade-out" : "animate-fade-in";
  if (transition === "zoom") return isOut ? "animate-zoom-out" : "animate-zoom-in";
  if (transition === "slide") return isOut ? "animate-slide-out" : "animate-slide-in";
  return isOut ? "animate-fade-out" : "animate-fade-in";
};

const getFitClass = (fit) => {
  if (fit === "fill") return "object-fill";
  if (fit === "contain") return "object-contain";
  return "object-cover";
};

export default function SidebarRight({
  // Preview
  activeBackground,
  prevBackground,
  activeBgTransition,
  activeBgDuration,
  activeBgFit = "cover",
  onUpdateBgFit,
  onUpdateSlideBackgroundFit,
  onRemoveSlideBackground,
  openImagePickerTrigger = 0,
  onAddImageSlide,
  onDeleteMedia,
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
  
  // Image picker modal state: null, "slide", "overlay", or "new-image-slide"
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerTab, setPickerTab] = useState("media"); // "media", "upload", "url"
  const [pickerUrlInput, setPickerUrlInput] = useState("");

  // Respond to external trigger to open image picker for a new slide
  useEffect(() => {
    if (openImagePickerTrigger > 0) {
      setPickerTarget("new-image-slide");
      setPickerTab("media");
    }
  }, [openImagePickerTrigger]);

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
    if (pickerTarget === "new-image-slide") {
      if (onAddImageSlide) onAddImageSlide(imageUrl);
    } else if (pickerTarget === "slide" && selectedSlide) {
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
                        className={`w-full h-full ${getFitClass(activeBgFit || deckData.fit)} pointer-events-none`}
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
                        className={`w-full h-full ${getFitClass(activeBgFit || deckData.fit)} pointer-events-none`}
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



            {/* Slide Image Preview in Monitor */}
            {activeSlideImage && (
              <div className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${
                activeSlideImageStyle?.fit === "fill" || activeSlideImageStyle?.position === "background" || activeSlideImageStyle?.position === "only-image" ? "p-0" : "p-2"
              }`}>
                <img
                  src={activeSlideImage}
                  style={{
                    maxHeight: activeSlideImageStyle?.fit === "fill" || activeSlideImageStyle?.position === "background" ? "100%" : (activeSlideImageStyle?.size || "70%"),
                    maxWidth: activeSlideImageStyle?.fit === "fill" || activeSlideImageStyle?.position === "background" ? "100%" : (activeSlideImageStyle?.size || "70%"),
                    width: activeSlideImageStyle?.fit === "fill" || activeSlideImageStyle?.position === "background" ? "100%" : "auto",
                    height: activeSlideImageStyle?.fit === "fill" || activeSlideImageStyle?.position === "background" ? "100%" : "auto",
                    opacity: activeSlideImageStyle?.position === "background" ? 0.85 : 1
                  }}
                  className={`w-full h-full ${
                    activeSlideImageStyle?.fit === "fill"
                      ? "object-fill rounded-none"
                      : activeSlideImageStyle?.fit === "cover"
                      ? "object-cover rounded"
                      : "object-contain rounded"
                  } ${activeSlideImageStyle?.fit !== "fill" ? "drop-shadow-md" : ""}`}
                  alt=""
                />
              </div>
            )}

            {/* Slide text */}
            {activeSlideText && (
              <div className={`w-full z-10 relative flex ${
                activeSlideStyle.layout === "lower-third" || activeSlideStyle.verticalAlign === "flex-end" ? "mt-auto pb-1" :
                activeSlideStyle.layout === "top-banner" || activeSlideStyle.verticalAlign === "flex-start" ? "mb-auto pt-1" : "my-auto"
              }`}>
                <p
                  style={{
                    fontSize: activeSlideStyle.fontSize ? `${parseInt(activeSlideStyle.fontSize) * 0.22}px` : undefined,
                    textAlign: activeSlideStyle.textAlign || "center"
                  }}
                  className={`w-full text-white font-bold font-display-live leading-tight drop-shadow-lg whitespace-pre-line ${
                    activeSlideStyle.layout === "lower-third" ? "bg-black/75 px-2 py-1 rounded text-[10px] border-t border-primary/50" :
                    activeSlideStyle.layout === "top-banner" ? "bg-black/75 px-2 py-1 rounded text-[10px] border-b border-primary/50" :
                    activeSlideStyle.fullWidth || activeSlideStyle.layout === "full" ? "px-1 text-[11px]" : "px-2 text-xs"
                  }`}
                >
                  {activeSlideText}
                </p>
              </div>
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

          {/* Background Fit / Ajuste de Fondo en Pantalla */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/60">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-label-caps uppercase text-on-surface-variant font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary">aspect_ratio</span>
                Ajuste de Fondo a Pantalla
              </span>
              <span className="text-[9px] font-mono text-primary font-bold">
                {activeBgFit === "fill" ? "Exacto (100%)" : activeBgFit === "cover" ? "Rellenar" : "Proporcional"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-surface-container-highest p-1 rounded">
              <button
                type="button"
                onClick={() => onUpdateBgFit && onUpdateBgFit("fill")}
                className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                  activeBgFit === "fill"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface hover:bg-surface-container-high"
                }`}
                title="Ajustar exacto a pantalla (100% de la pantalla sin cortes ni bordes negros)"
              >
                <span className="material-symbols-outlined text-[13px]">fullscreen</span>
                <span>Exacto</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateBgFit && onUpdateBgFit("cover")}
                className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                  activeBgFit === "cover"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface hover:bg-surface-container-high"
                }`}
                title="Rellenar pantalla (recorta bordes proporcionalmente)"
              >
                <span className="material-symbols-outlined text-[13px]">crop</span>
                <span>Rellenar</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateBgFit && onUpdateBgFit("contain")}
                className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                  activeBgFit === "contain"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface hover:bg-surface-container-high"
                }`}
                title="Ajustar proporcional (completo con barras)"
              >
                <span className="material-symbols-outlined text-[13px]">fit_screen</span>
                <span>Completo</span>
              </button>
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
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold">Texto Principal</label>
                {(!selectedSlide.text || selectedSlide.imageStyle?.position === "only-image") && selectedSlide.imageUrl && (
                  <span className="text-[9px] font-bold text-tertiary-fixed bg-tertiary-fixed/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">photo</span>
                    Solo Imagen
                  </span>
                )}
              </div>
              <textarea
                className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-body-sm text-on-surface outline-none focus:border-primary custom-scrollbar min-h-20 resize-y"
                value={inspectorText}
                placeholder={selectedSlide.imageUrl ? "(Diapositiva de solo imagen sin texto)" : "Escribe el texto de la diapositiva..."}
                onChange={(e) => setInspectorText(e.target.value)}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => onSaveSlideText(selectedSlide.id, inspectorText)}
                  className="flex-1 bg-primary hover:bg-primary/80 text-on-primary text-[11px] font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  Guardar Texto
                </button>
                {selectedSlide.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectorText("");
                      onSaveSlideText(selectedSlide.id, "");
                      onUpdateSlideImageStyle(selectedSlide.id, { position: "only-image", fit: "fill", size: "100%" });
                    }}
                    className="bg-surface-container-highest hover:bg-surface-variant text-on-surface text-[10px] font-bold px-2 py-1.5 rounded transition-all border border-outline-variant flex items-center gap-1"
                    title="Borrar el texto y dejar esta diapositiva como Solo Imagen a pantalla completa"
                  >
                    <span className="material-symbols-outlined text-[13px] text-tertiary-fixed">hide_source</span>
                    <span>Dejar Solo Imagen</span>
                  </button>
                )}
              </div>
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

                  {/* Image Fit & Scale */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-on-surface-variant">Ajuste de Imagen</label>
                        <span className="text-[9px] font-mono text-primary font-bold">
                          {currentSlideImgFit === "fill" ? "Exacto (100%)" : currentSlideImgFit === "cover" ? "Rellenar" : "Contener"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-surface-container-highest p-1 rounded">
                        <button
                          type="button"
                          onClick={() => onUpdateSlideImageStyle(selectedSlide.id, { fit: "fill", size: "100%" })}
                          className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                            currentSlideImgFit === "fill"
                              ? "bg-primary text-on-primary shadow-sm"
                              : "text-on-surface hover:bg-surface-container-high"
                          }`}
                          title="Ajustar exacto a pantalla (ocupa 100% sin barras ni recorte)"
                        >
                          <span className="material-symbols-outlined text-[13px]">fullscreen</span>
                          <span>Exacto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateSlideImageStyle(selectedSlide.id, { fit: "cover" })}
                          className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                            currentSlideImgFit === "cover"
                              ? "bg-primary text-on-primary shadow-sm"
                              : "text-on-surface hover:bg-surface-container-high"
                          }`}
                          title="Rellenar pantalla (recorta bordes proporcionalmente)"
                        >
                          <span className="material-symbols-outlined text-[13px]">crop</span>
                          <span>Rellenar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateSlideImageStyle(selectedSlide.id, { fit: "contain" })}
                          className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                            currentSlideImgFit === "contain"
                              ? "bg-primary text-on-primary shadow-sm"
                              : "text-on-surface hover:bg-surface-container-high"
                          }`}
                          title="Contener proporcional (completo con barras)"
                        >
                          <span className="material-symbols-outlined text-[13px]">fit_screen</span>
                          <span>Contener</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                        <span>Escala de Imagen</span>
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

                    <button
                      type="button"
                      onClick={() => onUpdateSlideImageStyle(selectedSlide.id, { fit: "fill", size: "100%", position: currentSlideImgPos === "background" ? "background" : "only-image" })}
                      className="bg-surface-container-highest hover:bg-primary/20 hover:text-primary text-on-surface text-[10px] font-bold py-1.5 px-2 rounded border border-outline-variant flex items-center justify-center gap-1 transition-all"
                      title="Hacer que la imagen ocupe exactamente toda la pantalla"
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary">aspect_ratio</span>
                      <span>Ocupar exactamente toda la pantalla</span>
                    </button>
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

              {/* Dedicated Slide Background Section if slide has background */}
              {selectedSlide.backgroundUrl && (
                <div className="bg-surface-container rounded p-2 border border-outline-variant flex flex-col gap-2 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-primary">wallpaper</span>
                      Fondo Propio de Diapositiva
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveSlideBackground && onRemoveSlideBackground(selectedSlide.id)}
                      className="text-error hover:text-red-400 p-0.5"
                      title="Quitar Fondo Propio"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>

                  <div className="relative aspect-video bg-black rounded overflow-hidden">
                    {selectedSlide.backgroundType === "video" ? (
                      <video src={selectedSlide.backgroundUrl} className={`w-full h-full ${getFitClass(selectedSlide.backgroundFit || activeBgFit)}`} muted />
                    ) : (
                      <img src={selectedSlide.backgroundUrl} className={`w-full h-full ${getFitClass(selectedSlide.backgroundFit || activeBgFit)}`} alt="" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-on-surface-variant">Ajuste de Fondo</label>
                      <span className="text-[9px] font-mono text-primary font-bold">
                        {(selectedSlide.backgroundFit || activeBgFit) === "fill" ? "Exacto (100%)" : (selectedSlide.backgroundFit || activeBgFit) === "cover" ? "Rellenar" : "Proporcional"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-surface-container-highest p-1 rounded">
                      <button
                        type="button"
                        onClick={() => onUpdateSlideBackgroundFit && onUpdateSlideBackgroundFit(selectedSlide.id, "fill")}
                        className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                          (selectedSlide.backgroundFit || activeBgFit) === "fill"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "text-on-surface hover:bg-surface-container-high"
                        }`}
                        title="Ajustar exacto a pantalla"
                      >
                        <span className="material-symbols-outlined text-[13px]">fullscreen</span>
                        <span>Exacto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateSlideBackgroundFit && onUpdateSlideBackgroundFit(selectedSlide.id, "cover")}
                        className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                          (selectedSlide.backgroundFit || activeBgFit) === "cover"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "text-on-surface hover:bg-surface-container-high"
                        }`}
                        title="Rellenar proporcional"
                      >
                        <span className="material-symbols-outlined text-[13px]">crop</span>
                        <span>Rellenar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateSlideBackgroundFit && onUpdateSlideBackgroundFit(selectedSlide.id, "contain")}
                        className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                          (selectedSlide.backgroundFit || activeBgFit) === "contain"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "text-on-surface hover:bg-surface-container-high"
                        }`}
                        title="Ajustar completo con barras"
                      >
                        <span className="material-symbols-outlined text-[13px]">fit_screen</span>
                        <span>Completo</span>
                      </button>
                    </div>
                  </div>
                </div>
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

              {/* Screen Layout / Width Accommodation */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-label-caps uppercase text-on-surface-variant font-bold">
                  Acomodo / Ancho en Pantalla
                </label>
                <div className="grid grid-cols-2 gap-1 bg-surface-container-highest rounded p-1">
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { layout: "full", fullWidth: true })}
                    className={`py-1.5 px-2 rounded text-[11px] flex items-center justify-center gap-1 transition-colors ${
                      selectedSlide.style?.layout === "full" || selectedSlide.style?.fullWidth
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="A lo largo de toda la pantalla (Ancho completo 98%)"
                  >
                    <span className="material-symbols-outlined text-[15px]">width_full</span>
                    <span>A lo largo (100%)</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { layout: "standard", fullWidth: false })}
                    className={`py-1.5 px-2 rounded text-[11px] flex items-center justify-center gap-1 transition-colors ${
                      (!selectedSlide.style?.layout || selectedSlide.style?.layout === "standard") && !selectedSlide.style?.fullWidth
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Estándar (Caja centrada 85%)"
                  >
                    <span className="material-symbols-outlined text-[15px]">crop_16_9</span>
                    <span>Estándar (85%)</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { layout: "lower-third", fullWidth: true, verticalAlign: "flex-end" })}
                    className={`py-1.5 px-2 rounded text-[11px] flex items-center justify-center gap-1 transition-colors ${
                      selectedSlide.style?.layout === "lower-third"
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Cintillo Inferior (A lo largo abajo)"
                  >
                    <span className="material-symbols-outlined text-[15px]">call_to_action</span>
                    <span>Cintillo Abajo</span>
                  </button>
                  <button
                    onClick={() => onUpdateSlideStyle(selectedSlide.id, { layout: "top-banner", fullWidth: true, verticalAlign: "flex-start" })}
                    className={`py-1.5 px-2 rounded text-[11px] flex items-center justify-center gap-1 transition-colors ${
                      selectedSlide.style?.layout === "top-banner"
                        ? "bg-primary text-on-primary font-bold shadow-sm"
                        : "text-on-surface hover:bg-surface-container-high"
                    }`}
                    title="Cintillo Superior (A lo largo arriba)"
                  >
                    <span className="material-symbols-outlined text-[15px]">vertical_align_top</span>
                    <span>Cintillo Arriba</span>
                  </button>
                </div>
              </div>
              
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
                {pickerTarget === "new-image-slide"
                  ? "Añadir Nueva Diapositiva de Solo Imagen"
                  : pickerTarget === "slide"
                  ? "Seleccionar Imagen para Diapositiva"
                  : "Agregar Capa de Imagen"}
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
                            {onDeleteMedia && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteMedia(media);
                                }}
                                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all bg-red-600/90 hover:bg-red-600 text-white rounded p-1 shadow-md z-20 flex items-center justify-center hover:scale-110 active:scale-95"
                                title={`Eliminar ${media.filename}`}
                              >
                                <span className="material-symbols-outlined text-[13px] leading-none">delete</span>
                              </button>
                            )}
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

