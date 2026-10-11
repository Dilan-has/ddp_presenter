import { useEffect } from "react";

const getFitClass = (fit) => {
  if (fit === "fill") return "object-fill";
  if (fit === "contain") return "object-contain";
  return "object-cover";
};

export default function CenterPanel({
  activeSong,
  activeSlideId,
  selectedSlide,
  activeBackground,
  activeBgFit = "cover",
  openSongEditor,
  setSelectedSlide,
  triggerSlideLive,
  handleAddSlideQuick,
  handleAddImageSlide,
  handleDeleteSlide,
  onOpenAddImageSlideModal,
  handleDragOver,
  handleDropBackgroundOnSlide,
  onOpenBible
}) {
  // Auto-scroll active slide into view smoothly
  useEffect(() => {
    if (!activeSlideId) return;
    const el = document.getElementById(`slide-card-${activeSlideId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSlideId]);

  const handleDropNewImageSlide = (e) => {
    e.preventDefault();
    const mediaUrl = e.dataTransfer.getData("mediaUrl");
    const mediaType = e.dataTransfer.getData("mediaType");
    if (!mediaUrl) return;
    if (mediaType === "image" && handleAddImageSlide) {
      handleAddImageSlide(mediaUrl);
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-surface min-w-0">
      <header className="h-12 bg-surface-container border-b border-outline-variant flex items-center justify-between px-4 flex-shrink-0">
        <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">
          {activeSong ? activeSong.title : "Seleccione una canción"}
        </h1>
        {activeSong && (
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant mr-1">Autor: {activeSong.author}</span>
            <button
              onClick={handleAddSlideQuick}
              className="bg-surface-container-highest hover:bg-surface-variant text-xs px-2.5 py-1 rounded text-on-surface flex items-center gap-1 font-bold transition-all border border-outline-variant"
              title="Añadir diapositiva de texto"
            >
              <span className="material-symbols-outlined text-sm text-primary">add</span>
              + Texto
            </button>
            <button
              onClick={() => onOpenAddImageSlideModal ? onOpenAddImageSlideModal() : handleAddImageSlide && handleAddImageSlide()}
              className="bg-surface-container-highest hover:bg-surface-variant text-xs px-2.5 py-1 rounded text-on-surface flex items-center gap-1 font-bold transition-all border border-outline-variant"
              title="Añadir diapositiva que sea sólo imagen sin texto"
            >
              <span className="material-symbols-outlined text-sm text-tertiary-fixed">add_photo_alternate</span>
              + Solo Imagen
            </button>
            <button
              onClick={openSongEditor}
              className="bg-surface-container-highest hover:bg-primary hover:text-on-primary text-xs px-2.5 py-1 rounded text-on-surface flex items-center gap-1 font-bold transition-all"
              title="Abrir editor de diseño / reflujo de texto completo para esta canción"
            >
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Editor Rápido
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-surface-dim">
        {activeSong ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
            {activeSong.slides.map((slide, index) => {
              const isLive = activeSlideId === slide.id;
              const isSelected = selectedSlide?.id === slide.id;

              return (
                <div
                  key={slide.id}
                  id={`slide-card-${slide.id}`}
                  onClick={() => {
                    if (document.activeElement && typeof document.activeElement.blur === "function") {
                      document.activeElement.blur();
                    }
                    setSelectedSlide(slide);
                    triggerSlideLive(slide, index);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropBackgroundOnSlide(e, index)}
                  className={`group relative flex flex-col cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {isLive && (
                    <div className="absolute -top-2.5 right-2 bg-error text-on-error font-label-caps text-[9px] px-1.5 py-0.5 rounded shadow-sm z-20 uppercase animate-pulse">
                      VIVO
                    </div>
                  )}

                  <div className="absolute -top-2 -left-2 flex items-center gap-1 z-10">
                    <span className="text-[10px] font-mono-label text-on-surface-variant bg-surface-container-highest px-1 rounded-sm">
                      {slide.label || `S${index + 1}`}
                    </span>
                    {slide.imageUrl && (
                      <span className="text-[10px] text-primary bg-primary/20 p-0.5 rounded flex items-center" title="Tiene Imagen de Diapositiva">
                        <span className="material-symbols-outlined text-[12px]">image</span>
                      </span>
                    )}
                    {(!slide.text || slide.imageStyle?.position === "only-image") && slide.imageUrl && (
                      <span className="text-[9px] font-bold text-tertiary-fixed bg-tertiary-fixed/20 px-1 py-0.2 rounded flex items-center gap-0.5" title="Diapositiva de Solo Imagen">
                        <span>SOLO IMAGEN</span>
                      </span>
                    )}
                  </div>

                  <div
                    className={`aspect-video bg-black rounded flex items-center justify-center p-3 overflow-hidden relative shadow-sm transition-all border-2 ${
                      isLive
                        ? "border-error ring-2 ring-error/30"
                        : isSelected
                        ? "border-primary"
                        : "border-transparent group-hover:border-outline-variant"
                    }`}
                  >
                    {/* Delete slide button on hover */}
                    {handleDeleteSlide && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(slide.id);
                        }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all bg-red-600/90 hover:bg-red-600 text-white rounded p-1 shadow-lg z-30 flex items-center justify-center hover:scale-110 active:scale-95"
                        title="Eliminar diapositiva"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">delete</span>
                      </button>
                    )}

                    {/* Background preview */}
                    {slide.backgroundUrl && (
                      <div className="absolute inset-0 z-0">
                        {slide.backgroundType === "image" ? (
                          <img src={slide.backgroundUrl} className={`w-full h-full ${getFitClass(slide.backgroundFit || activeBgFit)}`} alt="" />
                        ) : (
                          <video src={slide.backgroundUrl} className={`w-full h-full ${getFitClass(slide.backgroundFit || activeBgFit)}`} muted />
                        )}
                        <div className="absolute inset-0 bg-black/50" />
                      </div>
                    )}
                    {!slide.backgroundUrl && activeBackground.url && (
                      <div className="absolute inset-0 z-0 opacity-20">
                        {activeBackground.type === "image" ? (
                          <img src={activeBackground.url} className={`w-full h-full ${getFitClass(activeBgFit)}`} alt="" />
                        ) : (
                          <video src={activeBackground.url} className={`w-full h-full ${getFitClass(activeBgFit)}`} muted />
                        )}
                        <div className="absolute inset-0 bg-black/50" />
                      </div>
                    )}

                    {/* Slide main Image preview */}
                    {slide.imageUrl && (
                      <div className={`absolute inset-0 z-5 flex items-center justify-center pointer-events-none ${
                        slide.imageStyle?.fit === "fill" || slide.imageStyle?.position === "background" || slide.imageStyle?.position === "only-image" ? "p-0" : "p-1"
                      }`}>
                        <img
                          src={slide.imageUrl}
                          style={{
                            maxHeight: slide.imageStyle?.fit === "fill" || slide.imageStyle?.position === "background" ? "100%" : (slide.imageStyle?.size || "70%"),
                            maxWidth: slide.imageStyle?.fit === "fill" || slide.imageStyle?.position === "background" ? "100%" : (slide.imageStyle?.size || "70%"),
                            width: slide.imageStyle?.fit === "fill" || slide.imageStyle?.position === "background" ? "100%" : "auto",
                            height: slide.imageStyle?.fit === "fill" || slide.imageStyle?.position === "background" ? "100%" : "auto",
                            opacity: slide.imageStyle?.position === "background" ? 0.85 : 1
                          }}
                          className={`w-full h-full ${
                            slide.imageStyle?.fit === "fill"
                              ? "object-fill rounded-none"
                              : slide.imageStyle?.fit === "cover"
                              ? "object-cover rounded"
                              : "object-contain rounded"
                          } ${slide.imageStyle?.fit !== "fill" ? "drop-shadow-md" : ""}`}
                          alt=""
                        />
                      </div>
                    )}

                    {slide.text && slide.imageStyle?.position !== "only-image" && (
                      <p
                        style={{
                          fontSize: slide.style?.fontSize ? `${parseInt(slide.style.fontSize) * 0.18}px` : undefined,
                          textAlign: slide.style?.textAlign || "center"
                        }}
                        className={`w-full px-1 text-white font-bold font-display-live leading-tight drop-shadow-md z-10 relative pointer-events-none whitespace-pre-line ${
                          !slide.style?.fontSize ? "text-[10px] sm:text-xs" : ""
                        }`}
                      >
                        {slide.text}
                      </p>
                    )}

                    {!slide.imageUrl && !slide.text && (
                      <div className="z-10 flex flex-col items-center justify-center gap-1 text-on-surface-variant/70 pointer-events-none p-1 text-center">
                        <span className="material-symbols-outlined text-xl text-tertiary-fixed">add_photo_alternate</span>
                        <span className="text-[9px] font-bold">Solo Imagen</span>
                        <span className="text-[8px] text-zinc-500">Seleccionar imagen</span>
                      </div>
                    )}

                    {/* Render miniature overlays in slide grid box */}
                    {slide.overlays?.map((ov) => {
                      const scaleStyle = {
                        transform: "scale(0.35)",
                        transformOrigin: "top left",
                        opacity: 0.8
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
                            className="pointer-events-none"
                          />
                        );
                      }
                      if (ov.type === "text") {
                        return (
                          <div
                            key={ov.id}
                            style={customStyle}
                            className="text-white font-bold pointer-events-none overflow-hidden truncate max-w-full leading-none"
                          >
                            {ov.text}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Slide Card - Text */}
            <button
              onClick={handleAddSlideQuick}
              className="aspect-video bg-surface-container-highest hover:bg-surface-variant rounded border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-1 transition-all text-on-surface-variant hover:text-on-surface cursor-pointer group hover:border-primary"
              title="Agregar una diapositiva nueva de texto"
            >
              <span className="material-symbols-outlined text-[24px] text-primary group-hover:scale-110 transition-transform">
                title
              </span>
              <span className="text-[11px] font-bold">+ Diapositiva Texto</span>
            </button>

            {/* Quick Add Slide Card - Only Image */}
            <button
              onClick={() => onOpenAddImageSlideModal ? onOpenAddImageSlideModal() : handleAddImageSlide && handleAddImageSlide()}
              onDragOver={handleDragOver}
              onDrop={handleDropNewImageSlide}
              className="aspect-video bg-surface-container-highest hover:bg-surface-variant rounded border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-1 transition-all text-on-surface-variant hover:text-on-surface cursor-pointer group hover:border-tertiary-fixed"
              title="Agregar diapositiva de solo imagen sin texto (haz clic o arrastra una imagen aquí)"
            >
              <span className="material-symbols-outlined text-[24px] text-tertiary-fixed group-hover:scale-110 transition-transform">
                add_photo_alternate
              </span>
              <span className="text-[11px] font-bold text-tertiary-fixed">+ Solo Imagen</span>
              <span className="text-[9px] text-on-surface-variant/70 italic">Click o arrastra imagen</span>
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-24 gap-3">
            <span className="material-symbols-outlined text-6xl text-outline">auto_awesome_motion</span>
            <p className="text-sm font-medium">No hay diapositivas cargadas. Elige una canción de la biblioteca.</p>
            {onOpenBible && (
              <button
                onClick={onOpenBible}
                className="bg-surface-container-highest hover:bg-primary hover:text-on-primary text-xs px-3.5 py-1.5 rounded-lg text-on-surface flex items-center gap-1.5 font-bold transition-all border border-outline-variant shadow-sm"
              >
                <span className="material-symbols-outlined text-base text-primary group-hover:text-inherit">menu_book</span>
                Explorar Biblia en Diapositivas
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
