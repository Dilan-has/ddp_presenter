import { useState, useEffect } from "react";

export default function ReflowEditor({
  activeSong,
  sections,
  onSave,
  onCancel
}) {
  const [reflowTitle, setReflowTitle] = useState("");
  const [reflowAuthor, setReflowAuthor] = useState("");
  const [reflowSection, setReflowSection] = useState("");
  const [reflowText, setReflowText] = useState("");
  const [reflowSplitRule, setReflowSplitRule] = useState("paragraph");
  const [reflowFontSize, setReflowFontSize] = useState("56px");
  const [reflowTextAlign, setReflowTextAlign] = useState("center");

  // Populate data when editing an active song
  useEffect(() => {
    if (activeSong) {
      setReflowTitle(activeSong.title || "");
      setReflowAuthor(activeSong.author || "");
      setReflowSection(activeSong.section || "");
      setReflowText(
        activeSong.slides ? activeSong.slides.map((s) => s.text).join("\n\n") : ""
      );
    } else {
      setReflowTitle("");
      setReflowAuthor("");
      setReflowSection("");
      setReflowText("");
    }
  }, [activeSong]);

  const getGeneratedSlidesFromReflow = () => {
    if (!reflowText.trim()) return [];

    let blocks = [];
    if (reflowSplitRule === "paragraph") {
      blocks = reflowText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    } else if (reflowSplitRule === "2lines") {
      const lines = reflowText.split("\n").map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i += 2) {
        blocks.push(lines.slice(i, i + 2).join("\n"));
      }
    } else if (reflowSplitRule === "4lines") {
      const lines = reflowText.split("\n").map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i += 4) {
        blocks.push(lines.slice(i, i + 4).join("\n"));
      }
    }

    return blocks.map((blockText, idx) => {
      const existing = activeSong?.slides?.[idx];
      return {
        id: existing?.id || `slide-${Date.now()}-${idx + 1}`,
        label: `S${idx + 1}`,
        text: blockText,
        imageUrl: existing?.imageUrl || null,
        imageStyle: existing?.imageStyle || null,
        backgroundUrl: existing?.backgroundUrl || null,
        backgroundType: existing?.backgroundType || null,
        overlays: existing?.overlays || [],
        style: existing?.style || {
          fontSize: reflowFontSize,
          textAlign: reflowTextAlign,
          verticalAlign: "center"
        }
      };
    });
  };

  const handleSave = (returnToProduction) => {
    if (!reflowTitle.trim()) {
      alert("Por favor ingresa un título para la canción.");
      return;
    }
    const generatedSlides = getGeneratedSlidesFromReflow();
    onSave({
      title: reflowTitle,
      author: reflowAuthor,
      section: reflowSection,
      slides: generatedSlides
    }, returnToProduction);
  };

  const slides = getGeneratedSlidesFromReflow();

  return (
    <div className="flex-1 flex flex-col bg-surface-dim overflow-hidden p-6 gap-4">
      {/* Editor Header Toolbar */}
      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col flex-1 max-w-xs">
            <label className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold mb-1">Título de Canción</label>
            <input 
              type="text"
              value={reflowTitle}
              onChange={(e) => setReflowTitle(e.target.value)}
              placeholder="Ej. Cuán Grande Es Dios"
              className="bg-surface-container-highest border border-outline-variant rounded px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary font-bold"
            />
          </div>

          <div className="flex flex-col flex-1 max-w-xs">
            <label className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold mb-1">Autor / Artista</label>
            <input 
              type="text"
              value={reflowAuthor}
              onChange={(e) => setReflowAuthor(e.target.value)}
              placeholder="Ej. Chris Tomlin"
              className="bg-surface-container-highest border border-outline-variant rounded px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col flex-1 max-w-xs">
            <label className="text-[10px] font-label-caps uppercase text-on-surface-variant font-bold mb-1">Sección (Carpeta)</label>
            <select 
              value={reflowSection}
              onChange={(e) => setReflowSection(e.target.value)}
              className="bg-surface-container-highest border border-outline-variant rounded px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary cursor-pointer font-bold"
            >
              {sections.map((sec) => (
                <option key={sec} value={sec}>{sec || "General (Raíz)"}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            className="bg-surface-container-highest hover:bg-surface-variant text-on-surface font-bold text-body-sm px-4 py-2 rounded transition-all flex items-center gap-1.5 cursor-pointer border border-outline-variant"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Guardar
          </button>
          <button
            onClick={() => handleSave(true)}
            className="bg-primary hover:bg-primary/80 text-on-primary font-bold text-body-sm px-4 py-2 rounded transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Guardar y Proyectar
          </button>
          <button
            onClick={onCancel}
            className="bg-error-container hover:bg-error-container/80 text-error font-bold text-body-sm px-4 py-2 rounded transition-all flex items-center gap-1.5 cursor-pointer border border-error/20"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* 2 Column Body Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Column: Raw Lyrics Editor */}
        <div className="w-1/2 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3 overflow-hidden shadow-sm">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <span className="text-label-caps font-label-caps uppercase text-on-surface font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary">edit_note</span>
              Texto Completo (Copiar y Pegar Canción)
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase">Dividir Diapos por:</span>
              <select 
                value={reflowSplitRule}
                onChange={(e) => setReflowSplitRule(e.target.value)}
                className="bg-surface-container-highest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface outline-none cursor-pointer font-bold"
              >
                <option value="paragraph">Párrafos (Línea en blanco)</option>
                <option value="2lines">Cada 2 líneas</option>
                <option value="4lines">Cada 4 líneas</option>
              </select>
            </div>
          </div>

          <textarea 
            value={reflowText}
            onChange={(e) => setReflowText(e.target.value)}
            placeholder="Pega aquí el texto completo de tu canción..."
            className="flex-1 bg-surface-container-highest border border-outline-variant rounded p-3 text-body-sm font-mono text-on-surface outline-none focus:border-primary custom-scrollbar resize-none leading-relaxed"
          />

          <div className="flex justify-between text-[11px] text-on-surface-variant font-bold">
            <span>{reflowText.split(/\r\n|\r|\n/).length} líneas detectadas</span>
            <span>{slides.length} diapositivas listas</span>
          </div>
        </div>

        {/* Right Column: Live Slides Preview & Global Formatting */}
        <div className="w-1/2 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3 overflow-hidden shadow-sm">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <span className="text-label-caps font-label-caps uppercase text-on-surface font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-tertiary-fixed">auto_awesome_motion</span>
              Vista Previa de Diapositivas Generadas
            </span>

            {/* Formatting Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setReflowTextAlign("left")}
                  className={`p-1 rounded text-xs transition-colors ${reflowTextAlign === "left" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"}`}
                  title="Izquierda"
                >
                  <span className="material-symbols-outlined text-xs">format_align_left</span>
                </button>
                <button 
                  onClick={() => setReflowTextAlign("center")}
                  className={`p-1 rounded text-xs transition-colors ${reflowTextAlign === "center" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"}`}
                  title="Centrado"
                >
                  <span className="material-symbols-outlined text-xs">format_align_center</span>
                </button>
                <button 
                  onClick={() => setReflowTextAlign("right")}
                  className={`p-1 rounded text-xs transition-colors ${reflowTextAlign === "right" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"}`}
                  title="Derecha"
                >
                  <span className="material-symbols-outlined text-xs">format_align_right</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-on-surface-variant font-bold">Tamaño:</span>
                <input 
                  type="range"
                  min="24"
                  max="90"
                  value={parseInt(reflowFontSize) || 56}
                  onChange={(e) => setReflowFontSize(e.target.value + "px")}
                  className="w-20 accent-primary h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono text-primary font-bold">{reflowFontSize}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
            <div className="grid grid-cols-2 gap-3 auto-rows-max">
              {slides.map((slide, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-[10px] font-mono text-on-surface-variant mb-1 font-bold">
                    {slide.label}
                  </span>
                  <div className="aspect-video bg-black rounded p-3 flex items-center justify-center relative overflow-hidden border border-outline-variant shadow-sm">
                    <p 
                      style={{
                        fontSize: `${parseInt(slide.style.fontSize) * 0.18}px`,
                        textAlign: slide.style.textAlign
                      }}
                      className="w-full text-white font-bold font-display-live leading-tight drop-shadow-md z-10 relative whitespace-pre-line pointer-events-none"
                    >
                      {slide.text}
                    </p>
                  </div>
                </div>
              ))}
              {slides.length === 0 && (
                <div className="col-span-2 py-16 text-center text-on-surface-variant text-body-sm italic">
                  Escribe o pega texto en el panel izquierdo para generar diapositivas dinámicamente.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
