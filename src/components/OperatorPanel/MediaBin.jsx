import { useRef } from "react";

export default function MediaBin({
  mediaFiles,
  activeBackground,
  selectedSlide,
  triggerBackgroundLive,
  handleAddImageOverlay,
  handleSetSlideImage,
  onUploadSuccess
}) {
  const fileInputRef = useRef(null);

  const triggerFileUpload = () => {
    fileInputRef.current.click();
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
      if (data.success) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  return (
    <div className="h-44 bg-surface-container-low flex flex-col flex-shrink-0 border-t border-outline-variant">
      {/* Media Tabs */}
      <div className="flex items-center px-2 bg-surface-container-lowest border-b border-outline-variant">
        <button className="px-3 py-1.5 text-body-sm font-bold text-primary border-b-2 border-primary">
          Buzón de Medios (Fondos, Imágenes y Capas)
        </button>

        {selectedSlide && (
          <span className="text-[10px] text-zinc-500 italic ml-4">
            Tip: Pasa el cursor por un medio para asignarlo a la diapositiva seleccionada como imagen o capa.
          </span>
        )}

        <div className="flex-1" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*"
          style={{ display: "none" }}
        />
      </div>

      {/* Media Scroll List */}
      <div className="flex-1 flex overflow-x-auto p-3 gap-3 items-start custom-scrollbar">
        {/* Media files mapping */}
        {mediaFiles.map((media, i) => {
          const isActive = activeBackground.url === media.url;
          return (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("mediaUrl", media.url);
                e.dataTransfer.setData("mediaType", media.type);
              }}
              className="flex flex-col gap-1 shrink-0 w-32 group cursor-pointer relative"
            >
              <div
                onClick={() => triggerBackgroundLive(media)}
                className={`aspect-video bg-surface-container rounded relative overflow-hidden border-2 transition-all ${
                  isActive
                    ? "border-primary shadow-md"
                    : "border-transparent group-hover:border-outline-variant"
                }`}
              >
                {media.type === "image" ? (
                  <img src={media.url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <video src={media.url} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1 backdrop-blur-sm flex items-center">
                  <span className="material-symbols-outlined text-[10px] text-white">
                    {media.type === "image" ? "image" : "movie"}
                  </span>
                </div>

                {/* Media action overlay options */}
                {selectedSlide && media.type === "image" && (
                  <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handleSetSlideImage) handleSetSlideImage(selectedSlide.id, media.url);
                      }}
                      className="bg-primary text-on-primary text-[8px] px-1 py-0.5 rounded font-bold shadow"
                      title="Establecer como Imagen Principal de la Diapositiva"
                    >
                      + Imagen
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddImageOverlay(media);
                      }}
                      className="bg-tertiary-fixed text-on-tertiary-fixed text-[8px] px-1 py-0.5 rounded font-bold shadow"
                      title="Agregar como Capa Sobrepuesta"
                    >
                      + Capa
                    </button>
                  </div>
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded" />
              </div>
              <span className="text-[10px] text-on-surface truncate px-1">
                {media.filename}
              </span>
            </div>
          );
        })}

        {/* Add media trigger */}
        <button
          onClick={triggerFileUpload}
          className="shrink-0 w-32 aspect-video bg-surface-container-highest hover:bg-surface-variant rounded border border-dashed border-outline-variant flex flex-col items-center justify-center gap-1 transition-colors text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span className="text-[10px] font-bold">Añadir Medios</span>
        </button>
      </div>
    </div>
  );
}
