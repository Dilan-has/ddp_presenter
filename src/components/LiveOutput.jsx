import { useState, useEffect, useRef } from "react";
import { onProjectionMessage } from "../utils/networkSync";

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
  const [bgFit, setBgFit] = useState("cover");

  const [audioVolume, setAudioVolume] = useState(0.8);
  const [isBlackout, setIsBlackout] = useState(false);
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

  // Synchronization refs to avoid listener recreation and stale closures
  const currentSlideRef = useRef(currentSlide);
  currentSlideRef.current = currentSlide;
  const activeDeckRef = useRef(activeDeck);
  activeDeckRef.current = activeDeck;
  const deck1Ref = useRef(deck1);
  deck1Ref.current = deck1;
  const deck2Ref = useRef(deck2);
  deck2Ref.current = deck2;
  const slideDurationRef = useRef(slideDuration);
  slideDurationRef.current = slideDuration;
  const bgDurationRef = useRef(bgDuration);
  bgDurationRef.current = bgDuration;

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
    const handleMessage = (dataOrEvent) => {
      const data = dataOrEvent.data || dataOrEvent;
      if (!data || !data.type) return;
      const { type, slideText, slideImage, slideImageStyle, overlays, slideStyle, mediaUrl, mediaType, transition, duration, volume, fit, background, enabled, state } = data;
      
      switch (type) {
        case "INIT_STATE": {
          if (!state) break;
          if (state.slideText || state.slideImage || (state.overlays && state.overlays.length > 0)) {
            setCurrentSlide({
              text: state.slideText || "",
              image: state.slideImage || null,
              imageStyle: state.slideImageStyle || {},
              overlays: state.overlays || [],
              style: state.slideStyle || {}
            });
          }
          if (state.background && state.background.url) {
            const isVideo = state.background.type === "video";
            setDeck1({
              url: state.background.url,
              type: state.background.type || "image",
              fit: state.bgFit || "cover",
              ready: !isVideo
            });
            setBgFit(state.bgFit || "cover");
          }
          setIsBlackout(Boolean(state.isBlackout));
          break;
        }

        case "BLACKOUT": {
          setIsBlackout(Boolean(enabled));
          break;
        }

        case "UPDATE_BACKGROUND_FIT": {
          const newFit = fit || "cover";
          setBgFit(newFit);
          setDeck1((d) => ({ ...d, fit: newFit }));
          setDeck2((d) => ({ ...d, fit: newFit }));
          break;
        }

        case "TRIGGER_SLIDE":
        case "UPDATE_SLIDE": {
          if (slideTimeoutRef.current) {
            clearTimeout(slideTimeoutRef.current);
            slideTimeoutRef.current = null;
          }
          const isDocHidden = typeof document !== "undefined" && document.hidden;
          const dur = duration !== undefined ? duration : 0.4;
          setSlideTransition(transition || "fade");
          setSlideDuration(dur);

          const newSlide = {
            text: slideText,
            image: slideImage || null,
            imageStyle: slideImageStyle || {},
            overlays: overlays || [],
            style: slideStyle || {}
          };

          if (isDocHidden) {
            // When tab or window is in background / not focused, DO NOT animate or wait for setTimeout!
            // Instantly apply the new slide with no previous slide overlay to prevent frozen opacity-0
            setPrevSlide(null);
            setCurrentSlide(newSlide);
          } else {
            setPrevSlide(currentSlideRef.current);
            setCurrentSlide(newSlide);
            slideTimeoutRef.current = setTimeout(() => {
              setPrevSlide(null);
              slideTimeoutRef.current = null;
            }, dur * 1000 + 50);
          }
          break;
        }

        case "UPDATE_BACKGROUND": {
          if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
          if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
          pendingCrossfadeRef.current = null;

          const isDocHidden = typeof document !== "undefined" && document.hidden;
          const curActiveDeck = activeDeckRef.current;
          const curDeck1 = deck1Ref.current;
          const curDeck2 = deck2Ref.current;
          const chosenUrl = mediaUrl || (background ? background.url : null);
          const chosenType = mediaType || (background ? background.type : "image");
          const dur = duration !== undefined ? duration : 0.6;
          const trans = transition || "fade";
          const chosenFit = fit || bgFit || "cover";
          setBgTransition(trans);
          setBgDuration(dur);
          if (fit) setBgFit(fit);

          if (!chosenUrl) {
            // Clearing background
            const nextDeck = curActiveDeck === 1 ? 2 : 1;
            if (nextDeck === 1) setDeck1({ url: "", type: "none", ready: true });
            else setDeck2({ url: "", type: "none", ready: true });
            setActiveDeck(nextDeck);
            if (isDocHidden) {
              setIsBgTransitioning(false);
              setDeck1({ url: "", type: "none", ready: true });
              setDeck2({ url: "", type: "none", ready: true });
            } else {
              setIsBgTransitioning(true);
              bgCleanupTimerRef.current = setTimeout(() => {
                setIsBgTransitioning(false);
                setDeck1({ url: "", type: "none", ready: true });
                setDeck2({ url: "", type: "none", ready: true });
              }, dur * 1000 + 50);
            }
            break;
          }

          // If current media is already active, check if fit changed
          const currentMedia = curActiveDeck === 1 ? curDeck1 : curDeck2;
          if (currentMedia.url === chosenUrl && currentMedia.type === chosenType) {
            if (fit && currentMedia.fit !== fit) {
              setBgFit(fit);
              setDeck1((d) => ({ ...d, fit }));
              setDeck2((d) => ({ ...d, fit }));
            }
            break;
          }

          const nextDeck = curActiveDeck === 1 ? 2 : 1;
          const isVideo = chosenType === "video";
          const newMedia = {
            url: chosenUrl,
            type: chosenType,
            fit: chosenFit,
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

            if (isDocHidden) {
              setIsBgTransitioning(false);
              if (nextDeck === 1) {
                if (deck2VideoRef.current) deck2VideoRef.current.pause();
                setDeck2({ url: "", type: "none", ready: true });
              } else {
                if (deck1VideoRef.current) deck1VideoRef.current.pause();
                setDeck1({ url: "", type: "none", ready: true });
              }
            } else {
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
            }
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

        case "CLEAR_TEXT": {
          if (slideTimeoutRef.current) {
            clearTimeout(slideTimeoutRef.current);
            slideTimeoutRef.current = null;
          }
          const isDocHidden = typeof document !== "undefined" && document.hidden;
          const emptySlide = { text: "", image: null, overlays: [], style: {} };
          if (isDocHidden) {
            setPrevSlide(null);
            setCurrentSlide(emptySlide);
          } else {
            setPrevSlide(currentSlideRef.current);
            setCurrentSlide(emptySlide);
            slideTimeoutRef.current = setTimeout(() => {
              setPrevSlide(null);
              slideTimeoutRef.current = null;
            }, (slideDurationRef.current || 0.4) * 1000 + 50);
          }
          break;
        }

        case "CLEAR_BACKGROUND":
          if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
          if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
          {
            const curActiveDeck = activeDeckRef.current;
            const nextDeck = curActiveDeck === 1 ? 2 : 1;
            if (nextDeck === 1) setDeck1({ url: "", type: "none", ready: true });
            else setDeck2({ url: "", type: "none", ready: true });
            setActiveDeck(nextDeck);
            setIsBgTransitioning(true);
            bgCleanupTimerRef.current = setTimeout(() => {
              setIsBgTransitioning(false);
              setDeck1({ url: "", type: "none", ready: true });
              setDeck2({ url: "", type: "none", ready: true });
            }, (bgDurationRef.current || 0.6) * 1000 + 50);
          }
          break;

        case "CLEAR_ALL":
          if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
          if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
          if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
          setPrevSlide(null);
          setCurrentSlide({ text: "", image: null, overlays: [], style: {} });
          setDeck1({ url: "", type: "none", ready: true });
          setDeck2({ url: "", type: "none", ready: true });
          setIsBgTransitioning(false);
          break;
          
        default:
          break;
      }
    };

    projectionChannel.addEventListener("message", handleMessage);
    const unsubscribeNetwork = onProjectionMessage(handleMessage);

    return () => {
      projectionChannel.removeEventListener("message", handleMessage);
      unsubscribeNetwork();
      if (bgCleanupTimerRef.current) clearTimeout(bgCleanupTimerRef.current);
      if (videoWaitTimeoutRef.current) clearTimeout(videoWaitTimeoutRef.current);
    };
  }, []); // Run once on mount!

  // Window visibility & focus recovery: instantly clears any stalled animations or timeouts
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        if (slideTimeoutRef.current) {
          clearTimeout(slideTimeoutRef.current);
          slideTimeoutRef.current = null;
        }
        if (bgCleanupTimerRef.current) {
          clearTimeout(bgCleanupTimerRef.current);
          bgCleanupTimerRef.current = null;
        }
        setPrevSlide(null);
        setIsBgTransitioning(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);

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

    const isFullWidth = Boolean(style.fullWidth || style.width === "full" || style.layout === "full");
    const isLowerThird = style.layout === "lower-third" || style.position === "bottom";
    const isTopBanner = style.layout === "top-banner" || style.position === "top";

    let alignClass = "items-center";
    if (isLowerThird || style.verticalAlign === "flex-end") alignClass = "items-end pb-6 md:pb-12";
    else if (isTopBanner || style.verticalAlign === "flex-start") alignClass = "items-start pt-6 md:pt-12";

    let textAlignClass = "text-center";
    if (style.textAlign === "left") textAlignClass = "text-left";
    if (style.textAlign === "right") textAlignClass = "text-right";
    if (style.textAlign === "justify") textAlignClass = "text-justify";

    const alignStyle = {
      textAlign: style.textAlign || "center",
      ...(style.fontSize ? { fontSize: style.fontSize } : {})
    };

    const layerKey = (isOut ? "out-" : "in-") + (slide.id || slide.text || imgUrl);

    const pos = imgStyle.position || "center";
    const fit = imgStyle.fit || "contain";
    const sizeVal = imgStyle.size || "70%";

    const renderSlideContent = () => {
      if (!imgUrl) {
        if (isLowerThird) {
          return (
            slide.text && (
              <div className="w-full max-w-[98%] bg-black/80 backdrop-blur-md border-t-2 border-primary/60 shadow-2xl rounded-2xl p-5 md:p-8 flex flex-col justify-center">
                <p 
                  style={alignStyle}
                  className={`w-full text-white font-bold font-display-live leading-snug tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-3xl md:text-5xl" : ""}`}
                >
                  {slide.text}
                </p>
              </div>
            )
          );
        }

        if (isTopBanner) {
          return (
            slide.text && (
              <div className="w-full max-w-[98%] bg-black/80 backdrop-blur-md border-b-2 border-primary/60 shadow-2xl rounded-2xl p-5 md:p-8 flex flex-col justify-center">
                <p 
                  style={alignStyle}
                  className={`w-full text-white font-bold font-display-live leading-snug tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-3xl md:text-5xl" : ""}`}
                >
                  {slide.text}
                </p>
              </div>
            )
          );
        }

        if (isFullWidth) {
          return (
            slide.text && (
              <div className="w-full max-w-[97%] px-2 md:px-6 flex flex-col justify-center">
                <p 
                  style={alignStyle}
                  className={`w-full text-white font-bold font-display-live leading-snug tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-5xl md:text-7xl" : ""}`}
                >
                  {slide.text}
                </p>
              </div>
            )
          );
        }

        return (
          slide.text && (
            <div className="w-full max-w-[85%] flex flex-col justify-center">
              <p 
                style={alignStyle}
                className={`w-full text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-5xl md:text-7xl" : ""}`}
              >
                {slide.text}
              </p>
            </div>
          )
        );
      }

      if (pos === "only-image") {
        const isFill = fit === "fill";
        return (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={imgUrl}
              alt=""
              style={{
                width: isFill ? "100%" : "auto",
                height: isFill ? "100%" : "auto",
                maxHeight: isFill ? "100%" : sizeVal,
                maxWidth: isFill ? "100%" : sizeVal
              }}
              className={`${isFill ? "w-full h-full object-fill rounded-none" : `object-${fit} drop-shadow-2xl rounded-lg`} pointer-events-none live-output-media`}
            />
          </div>
        );
      }

      if (pos === "background") {
        const fitClass = fit === "fill" ? "object-fill" : fit === "contain" ? "object-contain" : "object-cover";
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imgUrl}
              alt=""
              style={{ opacity: 0.85 }}
              className={`absolute inset-0 w-full h-full ${fitClass} pointer-events-none live-output-media`}
            />
            {slide.text && (
              <div className={isFullWidth ? "w-full max-w-[97%] px-2 md:px-6 z-10" : "w-full max-w-[85%] z-10"}>
                <p 
                  style={alignStyle}
                  className={`w-full text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-5xl md:text-7xl" : ""}`}
                >
                  {slide.text}
                </p>
              </div>
            )}
          </div>
        );
      }

      if (pos === "left") {
        const isFill = fit === "fill";
        return (
          <div className="flex flex-row items-center justify-center gap-8 w-full max-w-[90%] h-full">
            <div className="flex-1 flex justify-center items-center h-full max-h-[80vh]">
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: isFill ? "100%" : "auto",
                  height: isFill ? "100%" : "auto",
                  maxHeight: isFill ? "100%" : sizeVal,
                  maxWidth: isFill ? "100%" : "100%"
                }}
                className={`w-full h-full object-${fit} ${isFill ? "rounded-none" : "rounded-lg drop-shadow-2xl"} pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <div className="flex-1 flex justify-center items-center">
                <p 
                  style={alignStyle}
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
        const isFill = fit === "fill";
        return (
          <div className="flex flex-row-reverse items-center justify-center gap-8 w-full max-w-[90%] h-full">
            <div className="flex-1 flex justify-center items-center h-full max-h-[80vh]">
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: isFill ? "100%" : "auto",
                  height: isFill ? "100%" : "auto",
                  maxHeight: isFill ? "100%" : sizeVal,
                  maxWidth: isFill ? "100%" : "100%"
                }}
                className={`w-full h-full object-${fit} ${isFill ? "rounded-none" : "rounded-lg drop-shadow-2xl"} pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <div className="flex-1 flex justify-center items-center">
                <p 
                  style={alignStyle}
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
        const isFill = fit === "fill";
        return (
          <div className="flex flex-col items-center justify-center gap-6 w-full max-w-[85%] h-full">
            <div className="flex justify-center items-center max-h-[50vh]">
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: isFill ? "100%" : "auto",
                  height: isFill ? "100%" : "auto",
                  maxHeight: isFill ? "100%" : sizeVal,
                  maxWidth: isFill ? "100%" : "100%"
                }}
                className={`w-full h-full object-${fit} ${isFill ? "rounded-none" : "rounded-lg drop-shadow-2xl"} pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <p 
                style={alignStyle}
                className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-5xl" : ""}`}
              >
                {slide.text}
              </p>
            )}
          </div>
        );
      }

      if (pos === "bottom") {
        const isFill = fit === "fill";
        return (
          <div className="flex flex-col-reverse items-center justify-center gap-6 w-full max-w-[85%] h-full">
            <div className="flex justify-center items-center max-h-[50vh]">
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: isFill ? "100%" : "auto",
                  height: isFill ? "100%" : "auto",
                  maxHeight: isFill ? "100%" : sizeVal,
                  maxWidth: isFill ? "100%" : "100%"
                }}
                className={`w-full h-full object-${fit} ${isFill ? "rounded-none" : "rounded-lg drop-shadow-2xl"} pointer-events-none live-output-media`}
              />
            </div>
            {slide.text && (
              <p 
                style={alignStyle}
                className={`text-white font-bold font-display-live leading-tight tracking-tight live-output-text whitespace-pre-line ${textAlignClass} ${!style.fontSize ? "text-4xl md:text-5xl" : ""}`}
              >
                {slide.text}
              </p>
            )}
          </div>
        );
      }

      // Default: pos === "center"
      const isFill = fit === "fill";
      return (
        <div className="flex flex-col items-center justify-center gap-4 w-full max-w-[85%] h-full">
          <img
            src={imgUrl}
            alt=""
            style={{
              width: isFill ? "100%" : "auto",
              height: isFill ? "100%" : "auto",
              maxHeight: isFill ? "100%" : sizeVal,
              maxWidth: isFill ? "100%" : "90%"
            }}
            className={`w-full h-full object-${fit} ${isFill ? "rounded-none" : "rounded-lg drop-shadow-2xl"} pointer-events-none live-output-media`}
          />
          {slide.text && (
            <p 
              style={alignStyle}
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
        className={`absolute inset-0 z-20 flex justify-center ${isFullWidth || isLowerThird || isTopBanner ? "px-2 py-4 md:px-4 md:py-6" : "p-6"} ${alignClass} ${getAnimClass(slideTransition, isOut)}`}
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

    const currentFit = bgFit || deckData.fit || "cover";
    const fitClass = currentFit === "fill" ? "object-fill" : currentFit === "contain" ? "object-contain" : "object-cover";

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
            className={`w-full h-full ${fitClass} pointer-events-none live-output-media`}
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
            className={`w-full h-full ${fitClass} pointer-events-none live-output-media`}
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

      {/* Blackout Layer */}
      {isBlackout && (
        <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-300" />
      )}
    </div>
  );
}
