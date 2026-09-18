import { useState, useEffect } from "react";

// Initialize BroadcastChannel for local multiscreen synchronization
const projectionChannel = new BroadcastChannel("ddp_projection");

export default function StageOutput() {
  const [slideText, setSlideText] = useState("");
  const [slideImage, setSlideImage] = useState(null);
  const [nextSlideText, setNextSlideText] = useState("");
  const [timerText, setTimerText] = useState("00:00");
  const [timerLabel, setTimerLabel] = useState("Faltan");
  const [systemTime, setSystemTime] = useState("00:00:00");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toTimeString().split(" ")[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      const { type, slideText, slideImage, nextSlideText, timerVal, timerLbl } = e.data;
      switch (type) {
        case "UPDATE_SLIDE":
          setSlideText(slideText);
          setSlideImage(slideImage || null);
          if (nextSlideText !== undefined) {
            setNextSlideText(nextSlideText);
          }
          break;
        case "UPDATE_NEXT_SLIDE":
          setNextSlideText(nextSlideText);
          break;
        case "UPDATE_TIMER":
          setTimerText(timerVal);
          if (timerLbl) setTimerLabel(timerLbl);
          break;
        case "CLEAR_TEXT":
        case "CLEAR_ALL":
          setSlideText("");
          setSlideImage(null);
          setNextSlideText("");
          break;
        default:
          break;
      }
    };

    projectionChannel.addEventListener("message", handleMessage);
    projectionChannel.postMessage({ type: "REQUEST_CURRENT_STATE" });

    return () => {
      projectionChannel.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white font-body-md overflow-hidden flex flex-col p-8 select-none">
      {/* Top Bar */}
      <header className="flex justify-between items-center border-b-2 border-zinc-800 pb-4 mb-6">
        <div className="flex flex-col">
          <span className="text-[14px] text-zinc-500 uppercase font-bold tracking-wider">Hora Local</span>
          <span className="font-mono-label text-4xl text-white">{systemTime}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[14px] text-zinc-500 uppercase font-bold tracking-wider">{timerLabel}</span>
          <span className="font-mono-label text-4xl text-emerald-400">{timerText}</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-[16px] text-yellow-500 uppercase font-bold tracking-wider mb-2">Diapositiva Actual</span>
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-6 flex-1 flex items-center justify-center gap-6 overflow-hidden">
            {slideImage && (
              <img
                src={slideImage}
                alt=""
                className="max-h-full max-w-[40%] object-contain rounded border border-zinc-800 shadow"
              />
            )}
            {slideText ? (
              <p className="text-white text-3xl sm:text-5xl font-bold font-display-live text-center leading-tight whitespace-pre-line flex-1">
                {slideText}
              </p>
            ) : !slideImage ? (
              <p className="text-white text-4xl sm:text-6xl font-bold font-display-live text-center leading-tight whitespace-pre-line">
                (Pantalla en negro)
              </p>
            ) : null}
          </div>
        </div>

        <div className="h-6" />

        <div className="h-1/3 flex flex-col justify-end">
          <span className="text-[16px] text-emerald-500 uppercase font-bold tracking-wider mb-2">Siguiente Diapositiva</span>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1 flex items-center justify-center">
            <p className="text-zinc-400 text-2xl sm:text-4xl font-bold font-display-live text-center leading-normal truncate max-w-full">
              {nextSlideText || "---"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
