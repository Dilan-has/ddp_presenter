import { useState, useEffect, useRef } from "react";

// Initialize BroadcastChannel for local multiscreen synchronization
const projectionChannel = new BroadcastChannel("ddp_projection");

// Helper to get animation classNames for in and out states
const getAnimClass = (transition, isOut) => {
  if (!transition || transition === "none") return "";
  if (transition === "fade") return isOut ? "animate-fade-out" : "animate-fade-in";
  if (transition === "zoom") return isOut ? "animate-zoom-out" : "animate-zoom-in";
  if (transition === "slide") return isOut ? "animate-slide-out" : "animate-slide-in";
  return isOut ? "animate-fade-out" : "animate-fade-in";
};

// Helper to render slide overlays
const renderOverlay = (ov) => {
  const customStyle = {
    position: "absolute",
    ...ov.style
  };
  
  if (ov.type === "image") {
    return (
      <img
        key={ov.id}
        src={ov.url}
        style={customStyle}
        alt="Overlay"
        className="pointer-events-none object-contain live-output-media"
      />
    );
  }
  if (ov.type === "text") {
    return (
      <div
        key={ov.id}
        style={customStyle}
        className="font-display-live whitespace-pre-line pointer-events-none live-output-text text-white font-bold leading-tight"
      >
        {ov.text}
      </div>
    );
  }
  return null;
};

export default function LiveOutput() {
  const [currentSlide, setCurrentSlide] = useState({ text: "", overlays: [], style: {} });
  const [prevSlide, setPrevSlide] = useState(null);
  const [slideTransition, setSlideTransition] = useState("fade");
  const [slideDuration, setSlideDuration] = useState(0.8);

  // Dual-Deck Background Engine (Seamless A/B crossfading without unmounting or reloading)
  const [deck1, setDeck1] = useState({ url: "", type: "none", ready: true });
  const [deck2, setDeck2] = useState({ url: "", type: "none", ready: true });
  const [activeDeck, setActiveDeck] = useState(1);
  const [isBgTransitioning, setIsBgTransitioning] = useState(false);
  const [bgTransition, setBgTransition] = useState("fade");
  const [bgDuration, setBgDuration] = useState(0.8);

  const [audioVolume, setAudioVolume] = useState(0.8);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [screenStats, setScreenStats] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
    dpr: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  });

  const slideTimeoutRef = useRef(null);
  const bgCleanupTimerRef = useRef(null);
  const videoWaitTimeoutRef = useRef(null);
  const pendingCrossfadeRef = useRef(null);
  const deck1VideoRef = useRef(null);
  const deck2VideoRef = useRef(null);
  const hudTimerRef = useRef(null);
  const cursorTimerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.warn("Fullscreen error:", err));
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => console.warn("Exit fullscreen error:", err));
    }
  };

  const handleMouseMove = () => {
    setCursorHidden(false);
    setShowHud(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    hudTimerRef.current = setTimeout(() => setShowHud(false), 3000);
    cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 2500);
  };

  useEffect(() => {
    const onResize = () => {
      setScreenStats({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1
      });
    };
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const onKeyDown = (e) => {
      if (e.key === "f" || e.key === "F" || e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);

    cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 3000);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
    };
  }, []);

  // Sync volume to active video backgrounds
  useEffect(() => {
    if (deck1VideoRef.current) {
      deck1VideoRef.current.volume = audioVolume;
      deck1VideoRef.current.muted = audioVolume <= 0.01;
    }
    if (deck2VideoRef.current) {
      deck2VideoRef.current.volume = audioVolume;
      deck2VideoRef.current.muted = audioVolume <= 0.01;
    }
  }, [audioVolume, deck1, deck2]);

  useEffect(() => {
    const handleMessage = (e) => {
      const { type, slideText, slideImage, slideImageStyle, overlays, slideStyle, mediaUrl, mediaType, transition, duration, volume } = e.data;
      
      switch (type) {
        case "UPDATE_SLIDE": {
          if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
          const dur = duration !== undefined ? duration : 0.4;
          setSlideTransition(transition || "fade");
          setSlideDuration(dur);
          setPrevSlide(currentSlide);
          setCurrentSlide({
            text: slideText,
            image: slideImage || null,
            imageStyle: slideImageStyle || {},
            overlays: overlays || [],
            style: slideStyle || {}
          });
          slideTimeoutRef.current = setTimeout(() => {
            setPrevSlide(null);
          }, dur * 1000 + 50);
          break;
        }

        case "UPDATE_BACKGROUND": {
          if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
          if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
          pendingCrossfadeRef.current = null;

          const dur = duration !== undefined ? duration : 0.6;
          const trans = transition || "fade";
          setBgTransition(trans);
          setBgDuration(dur);

          // If current media is already active, ignore
          const currentMedia = activeDeck === 1 ? deck1 : deck2;
          if (currentMedia.url === mediaUrl && currentMedia.type === mediaType) {
            break;
          }

          const nextDeck = activeDeck === 1 ? 2 : 1;
          const isVideo = mediaType === "video";
          const newMedia = {
            url: mediaUrl,
            type: mediaType,
            ready: !isVideo // images are immediately ready; videos pre-buffer
          };

          if (nextDeck === 1) {
            setDeck1(newMedia);
          } else {
            setDeck2(newMedia);
          }

          const executeCrossfade = () => {
            if (videoWaitTimeoutRef.current) {
              clearTimeout(videoWaitTimeoutRef.current);
              videoWaitTimeoutRef.current = null;
            }
            pendingCrossfadeRef.current = null;

            if (nextDeck === 1) setDeck1(d => ({ ...d, ready: true }));
            else setDeck2(d => ({ ...d, ready: true }));

            setActiveDeck(nextDeck);
            setIsBgTransitioning(true);

            if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
            bgCleanupTimerRef.current = setTimeout(() => {
              setIsBgTransitioning(false);
              if (nextDeck === 1) {
                if (deck2VideoRef.current) deck2VideoRef.current.pause();
                setDeck2({ url: "", type: "none", ready: true });
              } else {
                if (deck1VideoRef.current) deck1VideoRef.current.pause();
                setDeck1({ url: "", type: "none", ready: true });
              }
            }, dur * 1000 + 80);
          };

          if (isVideo) {
            pendingCrossfadeRef.current = executeCrossfade;
            // Safety timeout: start crossfade anyway after 300ms if video event was delayed
            videoWaitTimeoutRef.current = setTimeout(() => {
              if (pendingCrossfadeRef.current) {
                pendingCrossfadeRef.current();
              }
            }, 300);
          } else {
            executeCrossfade();
          }
          break;
        }

        case "UPDATE_VOLUME": {
          const vol = volume !== undefined ? Math.max(0, Math.min(1, volume)) : 0.8;
          setAudioVolume(vol);
          break;
        }

        case "TOGGLE_FULLSCREEN": {
          toggleFullscreen();
          break;
        }

        case "CLEAR_TEXT":
          if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
          setPrevSlide(currentSlide);
          setCurrentSlide({ text: "", image: null, overlays: [], style: {} });
          slideTimeoutRef.current = setTimeout(() => {
            setPrevSlide(null);
          }, slideDuration * 1000 + 50);
          break;

        case "CLEAR_BACKGROUND":
          if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
          if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
          {
            const nextDeck = activeDeck === 1 ? 2 : 1;
            if (nextDeck === 1) setDeck1({ url: "", type: "none", ready: true });
            else setDeck2({ url: "", type: "none", ready: true });
            setActiveDeck(nextDeck);
            setIsBgTransitioning(true);
            bgCleanupTimerRef.current = setTimeout(() => {
              setIsBgTransitioning(false);
              setDeck1({ url: "", type: "none", ready: true });
              setDeck2({ url: "", type: "none", ready: true });
            }, bgDuration * 1000 + 50);
          }
          break;

        case "CLEAR_ALL":
          if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
          if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
          if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
          setPrevSlide(currentSlide);
          setCurrentSlide({ text: "", image: null, overlays: [], style: {} });
          
          {
            const nextDeck = activeDeck === 1 ? 2 : 1;
            if (nextDeck === 1) setDeck1({ url: "", type: "none", ready: true });
            else setDeck2({ url: "", type: "none", ready: true });
            setActiveDeck(nextDeck);
            setIsBgTransitioning(true);
            
            slideTimeoutRef.current = setTimeout(() => {
              setPrevSlide(null);
            }, slideDuration * 1000 + 50);
            bgCleanupTimerRef.current = setTimeout(() => {
              setIsBgTransitioning(false);
              setDeck1({ url: "", type: "none", ready: true });
              setDeck2({ url: "", type: "none", ready: true });
            }, bgDuration * 1000 + 50);
          }
          break;
          
        default:
          break;
      }
    };

    projectionChannel.addEventListener("message", handleMessage);

    return () => {
      projectionChannel.removeEventListener("message", handleMessage);
      if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
      if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
    };
  }, [currentSlide, deck1, deck2, activeDeck, slideDuration, bgDuration]);

  // Request initial state on mount exactly once
  useEffect(() => {
    projectionChannel.postMessage({ type: "REQUEST_CURRENT_STATE" });
  }, []);

  const hasText = Boolean(currentSlide?.text || prevSlide?.text);
  const activeMedia = activeDeck === 1 ? deck1 : deck2;
  const inactiveMedia = activeDeck === 1 ? deck2 : deck1;
  const hasBg = activeMedia.type !== "none" || (isBgTransitioning && inactiveMedia.type !== "none");

  const renderSlideLayer = (slide, isOut) => {
    if (!slide || (!slide.text && !slide.image && !slide.imageUrl && !slide.overlays?.length)) return null;
    const style = slide.style || {};
    const imgUrl = slide.image || slide.imageUrl;
    const imgStyle = slide.imageStyle || { fit: "contain", position: "center", size: "70%" };

    let alignClass = "items-center";
    if (style.verticalAlign === "flex-start") alignClass = "items-start pt-16";
    if (style.verticalAlign === "flex-end") alignClass = "items-end pb-16";

    let textAlignClass = "text-center";
    if (style.textAlign === "left") textAlignClass = "text-left";
    if (style.textAlign === "right") textAlignClass = "text-right";
    if (style.textAlign === "justify") textAlignClass = "text-justify";

    const customStyle = {};
    if (style.fontSize) customStyle.fontSize = style.fontSize;

    const layerKey = (isOut ? "out-" : "in-") + (slide.id || slide.text || imgUrl);

    const pos = imgStyle.position || "center";
    const fit = imgStyle.fit || "contain";
    const sizeVal = imgStyle.size || "70%";

    const renderSlideContent = () => {
      if (!imgUrl) {
        return (
          slide.text && (
            <p 
              style={customStyle}
              className={`max-w-[85%] text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-5xl md:text-7xl" : ""}`}
            >
              {slide.text}
            </p>
          )
        );
      }

      if (pos === "only-image") {
        return (
          <img
            src={imgUrl}
            alt=""
            style={{ maxHeight: sizeVal, maxWidth: sizeVal }}
            className={`object-${fit} drop-shadow-2xl rounded-lg pointer-events-none live-output-media`}
          />
        );
      }

      if (pos === "background") {
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imgUrl}
              alt=""
              style={{ opacity: 0.85 }}
              className={`absolute inset-0 w-full h-full object-${fit} pointer-events-none live-output-media`}
            />
            {slide.text && (
              <p 
                style={customStyle}
                className={`max-w-[85%] text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line z-10 ${textAlignClass} ${!style.fontSize ? "text-5xl md:text-7xl" : ""}`}
              >
                {slide.text}
              </p>
            )}
          </div>
        );
      }

      if (pos === "left") {
        return (
          <div className="flex flex-row items-center justify-center gap-8 w-full max-w-[90%] h-full">
            <div className="flex-1 flex justify-center items-center h-full max-h-[80vh]">
              <img
                src={imgUrl}
                alt=""
                style={{ maxHeight: sizeVal, maxWidth: "100%" }}
                className={`object-${fit} drop-shadow-2xl rounded-lg pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <div className="flex-1 flex justify-center items-center">
                <p 
                  style={customStyle}
                  className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-6xl" : ""}`}
                >
                  {slide.text}
                </p>
              </div>
            )}
          </div>
        );
      }

      if (pos === "right") {
        return (
          <div className="flex flex-row-reverse items-center justify-center gap-8 w-full max-w-[90%] h-full">
            <div className="flex-1 flex justify-center items-center h-full max-h-[80vh]">
              <img
                src={imgUrl}
                alt=""
                style={{ maxHeight: sizeVal, maxWidth: "100%" }}
                className={`object-${fit} drop-shadow-2xl rounded-lg pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <div className="flex-1 flex justify-center items-center">
                <p 
                  style={customStyle}
                  className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-6xl" : ""}`}
                >
                  {slide.text}
                </p>
              </div>
            )}
          </div>
        );
      }

      if (pos === "top") {
        return (
          <div className="flex flex-col items-center justify-center gap-6 w-full max-w-[85%] h-full">
            <div className="flex justify-center items-center max-h-[50vh]">
              <img
                src={imgUrl}
                alt=""
                style={{ maxHeight: sizeVal, maxWidth: "100%" }}
                className={`object-${fit} drop-shadow-2xl rounded-lg pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <p 
                style={customStyle}
                className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-5xl" : ""}`}
              >
                {slide.text}
              </p>
            )}
          </div>
        );
      }

      if (pos === "bottom") {
        return (
          <div className="flex flex-col-reverse items-center justify-center gap-6 w-full max-w-[85%] h-full">
            <div className="flex justify-center items-center max-h-[50vh]">
              <img
                src={imgUrl}
                alt=""
                style={{ maxHeight: sizeVal, maxWidth: "100%" }}
                className={`object-${fit} drop-shadow-2xl rounded-lg pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <p 
                style={customStyle}
                className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-5xl" : ""}`}
              >
                {slide.text}
              </p>
            )}
          </div>
        );
      }

      // Default: pos === "center"
      return (
        <div className="flex flex-col items-center justify-center gap-4 w-full max-w-[85%] h-full">
          <img
            src={imgUrl}
            alt=""
            style={{ maxHeight: sizeVal, maxWidth: "90%" }}
            className={`object-${fit} drop-shadow-2xl rounded-lg pointer-events-none live-output-media`}
          />
          {slide.text && (
            <p 
              style={customStyle}
              className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-5xl" : ""}`}
            >
              {slide.text}
            </p>
          )}
        </div>
      );
    };

    return (
      <div 
        key={layerKey} 
        style={{ animationDuration: `${slideDuration}s` }}
        className={`absolute inset-0 z-20 flex justify-center p-6 ${alignClass} ${getAnimClass(slideTransition, isOut)}`}
      >
        {renderSlideContent()}
        {slide.overlays?.map(renderOverlay)}
      </div>
    );
  };

  const renderDeckLayer = (deckNum, deckData, videoRef) => {
    if (!deckData || deckData.type === "none" || !deckData.url) return null;

    const isCurrent = activeDeck === deckNum;
    const isReady = deckData.ready !== false;

    if (!isCurrent && !isBgTransitioning && isReady) return null;

    let layerClass = "z-10 opacity-100";
    if (!isReady) {
      // Invisible pre-buffering while video initializes decoded frames
      layerClass = "z-0 opacity-0 pointer-events-none";
    } else if (isBgTransitioning) {
      if (isCurrent) {
        layerClass = `z-10 ${getAnimClass(bgTransition, false)}`;
      } else {
        layerClass = "z-0 opacity-100";
      }
    }

    return (
      <div
        key={`deck-${deckNum}-${deckData.url}`}
        style={{ animationDuration: `${bgDuration}s` }}
        className={`absolute inset-0 w-full h-full pointer-events-none ${layerClass}`}
      >
        {deckData.type === "image" && (
          <img
            src={deckData.url}
            alt=""
            className="w-full h-full object-cover pointer-events-none live-output-media"
          />
        )}
        {deckData.type === "video" && (
          <video
            ref={videoRef}
            src={deckData.url}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableremoteplayback="true"
            onPlaying={(e) => {
              if (pendingCrossfadeRef.current) {
                pendingCrossfadeRef.current();
              }
              if (audioVolume > 0.01) {
                e.target.muted = false;
                e.target.volume = audioVolume;
              }
            }}
            onCanPlay={(e) => {
              e.target.play().catch(() => {});
              if (pendingCrossfadeRef.current) {
                pendingCrossfadeRef.current();
              }
            }}
            className="w-full h-full object-cover pointer-events-none live-output-media"
          />
        )}
      </div>
    );
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      onDoubleClick={toggleFullscreen}
      className={`w-screen h-screen bg-black overflow-hidden relative flex items-center justify-center select-none ${cursorHidden ? "cursor-hidden" : ""}`}
    >
      {/* Seamless Dual-Deck Background Layers (Never destroyed mid-transition) */}
      {renderDeckLayer(1, deck1, deck1VideoRef)}
      {renderDeckLayer(2, deck2, deck2VideoRef)}
      
      {/* Smart Dim Overlay: Only dims background when slide text is present to maintain 100% video color & contrast */}
      {hasBg && (
        <div 
          className={`absolute inset-0 bg-black transition-opacity duration-500 z-10 pointer-events-none ${
            hasText ? "opacity-35" : "opacity-0"
          }`} 
        />
      )}

      {/* Slide Content Layer (Previous) */}
      {renderSlideLayer(prevSlide, true)}

      {/* Slide Content Layer (Current) */}
      {renderSlideLayer(currentSlide, false)}

      {/* Auto-hiding HUD for Quality & Fullscreen Information */}
      <div 
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 pointer-events-auto ${
          showHud ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md text-white px-3.5 py-2 rounded-full border border-white/20 shadow-2xl text-xs select-none">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{screenStats.width}×{screenStats.height}</span>
            {screenStats.dpr > 1 && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">
                {screenStats.dpr.toFixed(1)}x DPR
              </span>
            )}
            {screenStats.width >= 3840 ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">4K UHD</span>
            ) : screenStats.width >= 1920 ? (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded">1080p FHD</span>
            ) : null}
          </div>
          <div className="h-3 w-px bg-white/20" />
          <span className="text-[11px] text-zinc-400 hidden sm:inline">Doble clic para pantalla completa</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-medium px-2 py-1 rounded-md transition-all text-[11px]"
            title="Alternar Pantalla Completa (F / F11)"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
            <span>{isFullscreen ? "Salir" : "Completa"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
