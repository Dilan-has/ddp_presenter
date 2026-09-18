export default function CenterPanel({
  activeSong,
  activeSlideId,
  selectedSlide,
  activeBackground,
  openSongEditor,
  setSelectedSlide,
  triggerSlideLive,
  handleAddSlideQuick,
  handleDragOver,
  handleDropBackgroundOnSlide
}) {
  return (
    <main className="flex-1 flex flex-col bg-surface min-w-0">
      <header className="h-12 bg-surface-container border-b border-outline-variant flex items-center justify-between px-4 flex-shrink-0">
        <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">
          {activeSong ? activeSong.title : "Seleccione una canción"}
        </h1>
        {activeSong && (
          <div className="flex items-center gap-3">
            <span className="text-body-sm text-on-surface-variant">Autor: {activeSong.author}</span>
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
                  onClick={() => {
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
                    {/* Background preview */}
                    {slide.backgroundUrl && (
                      <div className="absolute inset-0 z-0">
                        {slide.backgroundType === "image" ? (
                          <img src={slide.backgroundUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <video src={slide.backgroundUrl} className="w-full h-full object-cover" muted />
                        )}
                        <div className="absolute inset-0 bg-black/50" />
                      </div>
                    )}
                    {!slide.backgroundUrl && activeBackground.url && (
                      <div className="absolute inset-0 z-0 opacity-20">
                        {activeBackground.type === "image" ? (
                          <img src={activeBackground.url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <video src={activeBackground.url} className="w-full h-full object-cover" muted />
                        )}
                        <div className="absolute inset-0 bg-black/50" />
                      </div>
                    )}

                    {/* Slide main Image preview */}
                    {slide.imageUrl && (
                      <div className="absolute inset-0 z-5 flex items-center justify-center p-1 pointer-events-none">
                        <img
                          src={slide.imageUrl}
                          className="max-h-full max-w-full object-contain rounded drop-shadow-md"
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

            {/* Quick Add Slide Card */}
            <button
              onClick={handleAddSlideQuick}
              className="aspect-video bg-surface-container-highest hover:bg-surface-variant rounded border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-1 transition-all text-on-surface-variant hover:text-on-surface cursor-pointer group hover:border-primary"
              title="Agregar una diapositiva nueva al instante"
            >
              <span className="material-symbols-outlined text-[28px] text-primary group-hover:scale-110 transition-transform">
                add_circle
              </span>
              <span className="text-[11px] font-bold">Añadir Diapositiva</span>
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-24">
            <span className="material-symbols-outlined text-6xl mb-2">auto_awesome_motion</span>
            <p>No hay diapositivas cargadas. Elige una canción de la biblioteca.</p>
          </div>
        )}
      </div>
    </main>
  );
}
