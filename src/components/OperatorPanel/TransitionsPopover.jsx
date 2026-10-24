import * as Popover from "@radix-ui/react-popover";

const TRANSITIONS = [
  { value: "none", label: "Ninguna" },
  { value: "fade", label: "Disolvencia" },
  { value: "zoom", label: "Zoom" },
  { value: "slide", label: "Desplazamiento" },
];

const DURATIONS = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0];

function Row({ icon, label, accent, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`panel-title ${accent}`}>
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function TransitionPicker({ value, onChange, duration, onDuration }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="segmented w-full">
        {TRANSITIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={value === t.value}
            onClick={() => onChange(t.value)}
            className="segmented-item flex-1 px-1.5"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDuration(d)}
            className={`chip font-mono ${duration === d ? "chip-active" : ""}`}
          >
            {d.toFixed(1)}s
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TransitionsPopover({
  slideTransition,
  onSlideTransition,
  slideDuration,
  onSlideDuration,
  bgTransition,
  onBgTransition,
  bgDuration,
  onBgDuration,
  bgFit,
  onBgFit,
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="btn btn-secondary"
          title="Transiciones y ajuste de fondo"
        >
          <span className="material-symbols-outlined text-[16px]">animation</span>
          Transiciones
          <span className="material-symbols-outlined text-[16px] opacity-60">expand_more</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={8}
          className="popover w-[360px] p-4 flex flex-col gap-4 z-[100] animate-fade-in"
        >
          <Row icon="notes" label="Transición de texto" accent="!text-primary">
            <TransitionPicker
              value={slideTransition}
              onChange={onSlideTransition}
              duration={slideDuration}
              onDuration={onSlideDuration}
            />
          </Row>
          <div className="h-px bg-outline-variant/60" />
          <Row icon="image" label="Transición de fondo" accent="!text-tertiary-fixed">
            <TransitionPicker
              value={bgTransition}
              onChange={onBgTransition}
              duration={bgDuration}
              onDuration={onBgDuration}
            />
          </Row>
          <div className="h-px bg-outline-variant/60" />
          <Row icon="fit_screen" label="Ajuste de fondo" accent="">
            <div className="segmented w-full">
              {[
                { value: "fill", label: "Exacto" },
                { value: "cover", label: "Rellenar" },
                { value: "contain", label: "Completo" },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={bgFit === o.value}
                  onClick={() => onBgFit(o.value)}
                  className="segmented-item flex-1"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Row>
          <Popover.Arrow className="fill-surface-container-high" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
