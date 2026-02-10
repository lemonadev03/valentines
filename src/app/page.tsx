"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ReactLenis } from "lenis/react";
import CloudBackground from "@/components/CloudBackground";

const NUM_CHARS = 5;
const NUM_CARDS = 4;

// Outside-in: 1st+4th → 2nd+3rd
const CARD_DELAYS = [0, 150, 150, 0];

const CARD_COLORS = [
  "#f9d1dc",
  "#f0b8c8",
  "#f9d1dc",
  "#f0b8c8",
];

const CARD_IMAGES = ["/0.jpeg", "/1.jpg", "/2.JPG", "/3.jpg"];


// Words that describe her
const WORDS = [
  "kind",
  "brilliant",
  "beautiful",
  "warm",
  "admirable",
  "gentle",
  "radiant",
  "fearless",
  "magnetic",
  "amazing",
];

// Starts slow (~900ms), accelerates toward the end (~200ms)
function getWordInterval(index: number, total: number): number {
  const progress = index / Math.max(total - 1, 1);
  const eased = progress * progress;
  return Math.round(900 - 700 * eased);
}

const SUCCESS_MESSAGE = "this is for you.";

type Phase = "volume" | "input" | "success" | "wiping" | "showcase" | "words" | "done";

export default function Home() {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [values, setValues] = useState<string[]>(Array(NUM_CHARS).fill(""));
  const [bouncing, setBouncing] = useState<boolean[]>(
    Array(NUM_CHARS).fill(false)
  );
  const [phase, setPhase] = useState<Phase>("volume");
  const [volumeExiting, setVolumeExiting] = useState(false);
  const [cardsUp, setCardsUp] = useState(false);
  const [cardsOut, setCardsOut] = useState(false);
  const [inputHidden, setInputHidden] = useState(false);
  const [activeCard, setActiveCard] = useState(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [successStep, setSuccessStep] = useState(0);
  const [typedMessageIndex, setTypedMessageIndex] = useState(-1);
  const [letterKey, setLetterKey] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cloudsReady, setCloudsReady] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);
  const [shaking, setShaking] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (localStorage.getItem("answered") === "true") setAnswered(true);
  }, []);

  const handleVolumeReady = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.4;
      audio.play().catch(() => {});
    }
    setVolumeExiting(true);
    setTimeout(() => setPhase("input"), 1200);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Safety fallback: if Vanta takes too long, unblock the button
  useEffect(() => {
    const t = setTimeout(() => setCloudsReady(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const triggerBounce = useCallback((index: number) => {
    setBouncing((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setTimeout(() => {
      setBouncing((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }, 150);
  }, []);

  const checkComplete = useCallback(
    (newValues: string[]) => {
      if (phase !== "input") return;
      const allFilled = newValues.every((v) => v.length > 0);
      if (!allFilled) return;

      const entered = newValues.join("");
      if (entered.toLowerCase() === "gaile") {
        setTimeout(() => setPhase("success"), 300);
      } else {
        setErrorMsg(true);
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        setTimeout(() => {
          setValues(Array(NUM_CHARS).fill(""));
          inputRefs.current[0]?.focus();
        }, 600);
        setTimeout(() => setErrorMsg(false), 2000);
      }
    },
    [phase]
  );

  // Success animation sequence
  useEffect(() => {
    if (phase !== "success") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // t=0ms — green flash + haptic
    (document.activeElement as HTMLElement)?.blur();
    setSuccessStep(1);
    navigator.vibrate?.(50);

    // t=1000ms — borders fade away
    timers.push(setTimeout(() => setSuccessStep(2), 1000));

    // t=2000ms — inputs fade out
    timers.push(setTimeout(() => setSuccessStep(3), 2000));

    // t=3000ms — "Gaile," appears (after inputs have faded)
    timers.push(setTimeout(() => setSuccessStep(4), 3000));

    // t=4200ms — start typewriter
    timers.push(
      setTimeout(() => {
        setSuccessStep(5);
        let charIndex = 0;
        const typeInterval = setInterval(() => {
          setTypedMessageIndex(charIndex);
          charIndex++;
          if (charIndex >= SUCCESS_MESSAGE.length) {
            clearInterval(typeInterval);
            // Fade out "Gaile, this is for you."
            timers.push(setTimeout(() => setSuccessStep(6), 800));
            // Show message after fade out
            timers.push(setTimeout(() => setMessageVisible(true), 1800));
            // Fade out message
            timers.push(setTimeout(() => setMessageVisible(false), 4300));
            // Then wipe
            timers.push(setTimeout(() => setPhase("wiping"), 5200));
          }
        }, 90);
        timers.push(typeInterval as unknown as ReturnType<typeof setTimeout>);
      }, 4200)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [phase]);

  // Wipe animation
  useEffect(() => {
    if (phase !== "wiping") return;

    // Mount cards off-screen, then next frame → animate up
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCardsUp(true));
    });

    // Hide input once cards have fully covered the screen
    const hideInput = setTimeout(() => setInputHidden(true), 1700);
    // After cards fully cover screen, transition to showcase
    const toShowcase = setTimeout(() => setPhase("showcase"), 2000);

    return () => {
      clearTimeout(hideInput);
      clearTimeout(toShowcase);
    };
  }, [phase]);

  // Showcase effect — cycle through each card spotlight
  useEffect(() => {
    if (phase !== "showcase") return;

    let step = 0;
    const totalSteps = NUM_CARDS + 1; // 6 cards + 1 to return to equal

    const interval = setInterval(() => {
      if (step < NUM_CARDS) {
        setActiveCard(step);
      } else {
        setActiveCard(-1);
      }
      step++;

      if (step > totalSteps - 1) {
        clearInterval(interval);
        // After all cards return to equal, slide off and transition
        setTimeout(() => setCardsOut(true), 300);
        setTimeout(() => setPhase("words"), 1500);
      }
    }, 1200);

    // Kick off the first card immediately
    setActiveCard(0);
    step = 1;

    return () => clearInterval(interval);
  }, [phase]);

  // Words cycling — accelerates toward the end
  useEffect(() => {
    if (phase !== "words") return;

    let timeout: ReturnType<typeof setTimeout>;

    function showWord(index: number) {
      if (index >= WORDS.length) {
        // Last word's animation is still playing — wait for its fade-out to finish
        const lastInterval = getWordInterval(WORDS.length - 1, WORDS.length);
        timeout = setTimeout(() => setPhase("done"), lastInterval);
        return;
      }
      setCurrentWordIndex(index);
      const interval = getWordInterval(index, WORDS.length);
      timeout = setTimeout(() => showWord(index + 1), interval);
    }

    // Brief pause before first word
    timeout = setTimeout(() => showWord(0), 300);

    return () => clearTimeout(timeout);
  }, [phase]);

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      let char = e.target.value.slice(-1);
      if (!char) return;
      if (index === 0) char = char.toUpperCase();

      const newValues = [...values];
      newValues[index] = char;
      setValues(newValues);

      triggerBounce(index);

      if (index < NUM_CHARS - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      checkComplete(newValues);
    },
    [values, triggerBounce, checkComplete]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (values[index]) {
          setValues((prev) => {
            const next = [...prev];
            next[index] = "";
            return next;
          });
          triggerBounce(index);
        } else if (index > 0) {
          setValues((prev) => {
            const next = [...prev];
            next[index - 1] = "";
            return next;
          });
          triggerBounce(index - 1);
          inputRefs.current[index - 1]?.focus();
        }
      }
    },
    [values, triggerBounce]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").slice(0, NUM_CHARS);
      const chars = pasted.split("");

      const newValues = [...values];
      chars.forEach((c, i) => {
        newValues[i] = c;
      });
      setValues(newValues);

      chars.forEach((_, i) => triggerBounce(i));

      const focusIndex = Math.min(chars.length, NUM_CHARS - 1);
      inputRefs.current[focusIndex]?.focus();

      checkComplete(newValues);
    },
    [values, triggerBounce, checkComplete]
  );

  return (
    <>
    {phase === "done" && <ReactLenis root />}
    <div
      className={`relative min-h-screen ${phase === "done" ? "overflow-y-auto" : "overflow-hidden"}`}
    >
      {/* White overlay — fades out to reveal clouds */}
      <div
        className="fixed inset-0 bg-white"
        style={{
          zIndex: -5,
          opacity: volumeExiting || phase === "input" || phase === "success" || phase === "words" || phase === "done" ? 0 : 1,
          transition: "opacity 1s ease",
          pointerEvents: "none",
        }}
      />
      {/* DEV: test telegram notification
      <button
        onClick={() => fetch("/api/notify", { method: "POST" })}
        className="fixed top-4 left-4 z-50 btn btn-xs btn-ghost opacity-50 hover:opacity-100"
      >
        Test TG
      </button> */}
      {/* DEV: reset answered state
      <button
        onClick={() => { localStorage.removeItem("answered"); setAnswered(false); }}
        className="fixed top-4 left-24 z-50 btn btn-xs btn-ghost opacity-50 hover:opacity-100"
      >
        Reset
      </button> */}
      {/* Volume gate */}
      {phase === "volume" && (
        <div
          className="flex min-h-screen items-center justify-center"
          style={{
            opacity: volumeExiting ? 0 : 1,
            transform: volumeExiting ? "scale(0.98)" : "scale(1)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex flex-col items-center gap-6">
            {isMobile === null ? null : isMobile ? (
              <p className="text-sm text-base-content/50 text-center" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>
                Please open this on a computer!
              </p>
            ) : (
              <>
                <p className="text-lg text-base-content/70" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>Please turn your volume up! :D</p>
                <button
                  onClick={handleVolumeReady}
                  disabled={!cloudsReady}
                  className="rounded-full px-10 py-2.5 text-sm font-semibold cursor-pointer"
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    background: "white",
                    color: "#d4688e",
                    border: "2px solid #d4688e",
                    opacity: cloudsReady ? 1 : 0,
                    transition: "opacity 0.4s ease, background 0.2s ease, color 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#d4688e"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#d4688e"; }}
                >
                  I&apos;m ready
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cloud background — visible only during input/success/words/done */}
      <CloudBackground visible={volumeExiting || phase === "input" || phase === "success" || phase === "words" || phase === "done"} onReady={() => setCloudsReady(true)} />

      {/* Password input */}
      {!inputHidden &&
        (phase === "input" || phase === "success" || phase === "wiping") && (
          <div
            className="flex min-h-screen items-center justify-center pb-24"
            style={{ opacity: 0, animation: "fadeIn 0.8s ease 0.2s both" }}
          >
            <div className="flex flex-col items-center">
              <p
                className="text-lg text-white mb-4 text-center"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                  textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.3)",
                  opacity: successStep >= 1 ? 0 : 1,
                  transition: "opacity 0.6s ease",
                }}
              >
                Please type in your name!
              </p>
              <p
                className="text-sm text-white mb-3 text-center"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 700,
                  textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.3)",
                  opacity: errorMsg ? 1 : 0,
                  transition: "opacity 0.3s ease",
                  pointerEvents: "none",
                }}
              >
                Oops! Not quite...
              </p>
              {/* Inputs + crossfade word share the same spot */}
              <div className="relative">
                {/* Input boxes */}
                <div
                  className="flex items-center"
                  style={{
                    gap: "8px",
                    opacity: successStep >= 3 ? 0 : isMobile && phase === "input" ? 0.4 : 1,
                    transition: "opacity 0.6s ease",
                    animation: shaking ? "shake 0.4s ease" : "none",
                  }}
                >
                  {Array.from({ length: NUM_CHARS }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={values[i]}
                      disabled={!!isMobile && phase === "input"}
                      onChange={(e) => handleChange(i, e)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      autoFocus={!isMobile && i === 0 || undefined}
                      className={`text-center text-2xl font-semibold${isMobile && phase === "input" ? " cursor-not-allowed pointer-events-none" : ""}`}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#b0446a"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(212,104,142,0.35)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d4688e"; e.currentTarget.style.boxShadow = "none"; }}
                      style={{
                        caretColor: "transparent",
                        outline: "none",
                        borderRadius: "12px",
                        fontFamily: "'Nunito', sans-serif",
                        fontWeight: 800,
                        color: "#d4688e",
                        width: "2.75rem",
                        height: "2.75rem",
                        padding: 0,
                        transform: bouncing[i] ? "scale(0.9)" : "scale(1)",
                        border: "2px solid #d4688e",
                        borderColor:
                          successStep >= 1
                            ? "rgb(74, 222, 128)"
                            : "#d4688e",
                        backgroundColor: "white",
                        boxShadow:
                          successStep >= 1
                            ? "0 0 0 3px rgba(74, 222, 128, 0.25)"
                            : bouncing[i]
                              ? "0 0 0 3px rgba(99, 102, 241, 0.25)"
                              : "none",
                        transition: "all 0.8s ease",
                      }}
                    />
                  ))}
                </div>
                {/* Plain text word — mounts at step 3, fades in at step 4, fades out at step 6 */}
                {successStep >= 3 && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-2xl text-white"
                    style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontWeight: 800,
                      opacity: successStep >= 4 && successStep < 6 ? 1 : 0,
                      transition: "opacity 0.8s ease",
                      textShadow: "0 2px 12px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    Gaile,
                  </span>
                )}
                {/* Typewriter — fades out at step 6 */}
                {successStep >= 5 && (
                  <div
                    className="absolute mt-3"
                    style={{
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      opacity: successStep >= 6 ? 0 : 1,
                      transition: "opacity 0.8s ease",
                    }}
                  >
                    <p
                      className="font-bold text-lg text-white whitespace-nowrap text-left"
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.3)" }}
                    >
                      <span>{SUCCESS_MESSAGE.slice(0, typedMessageIndex + 1)}</span>
                      <span className="invisible">{SUCCESS_MESSAGE.slice(typedMessageIndex + 1)}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Message interlude — big text over clouds before wipe */}
      {phase === "success" && successStep >= 6 && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{
            opacity: messageVisible ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: "none",
          }}
        >
          <div
            className="rounded-2xl backdrop-blur-lg bg-black/20 px-14 py-10"
            style={{
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <p
              className="text-5xl text-center text-white leading-tight"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                textShadow: "0 2px 16px rgba(0,0,0,0.4), 0 0 4px rgba(0,0,0,0.2)",
              }}
            >
              Here are some pretty<br />
              <span style={{ color: "#f9d1dc" }}>skies and clouds</span><br />
              that remind me of you!
            </p>
          </div>
        </div>
      )}

      {/* Card wipe overlay — stays rendered after wiping to finish exit animation */}
      {phase !== "input" && phase !== "success" && (
        <div className="pointer-events-none fixed inset-0 z-30 flex">
          {Array.from({ length: NUM_CARDS }).map((_, i) => {
            const staggerDelay = phase === "wiping" || cardsOut ? CARD_DELAYS[i] : 0;
            return (
            <div
              key={i}
              className="rounded-2xl shadow-lg overflow-hidden backdrop-blur-xl"
              style={{
                backgroundColor: i % 2 === 0 ? "rgba(249, 209, 220, 0.3)" : "rgba(240, 184, 200, 0.3)",
                height: "120vh",
                margin: "0 -8px",
                flex: activeCard === i ? 5 : 1,
                transform: cardsOut
                  ? "translateY(-120vh)"
                  : cardsUp
                    ? "translateY(0)"
                    : "translateY(100vh)",
                transition: `transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay}ms, flex 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0ms`,
              }}
            >
              {/* Card content */}
              <div
                className="flex items-center justify-center"
                style={{ height: "100vh" }}
              >
                <img
                  src={CARD_IMAGES[i]}
                  alt=""
                  className="rounded-2xl object-cover"
                  style={{
                    width: "440px",
                    height: "560px",
                    opacity: activeCard === i ? 1 : 0,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
                    transition: "opacity 0.3s ease",
                  }}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Words flashing — behind the cards (z-20 < z-30), revealed as cards clear */}
      {phase === "words" && currentWordIndex >= 0 && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <span
            key={currentWordIndex}
            className="text-6xl font-bold text-white select-none"
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              textShadow: "0 1px 6px rgba(0,0,0,0.3)",
              animation: `wordPulse ${getWordInterval(currentWordIndex, WORDS.length)}ms ease-in-out both`,
            }}
          >
            {WORDS[currentWordIndex]}
          </span>
        </div>
      )}

      {/* Final letter */}
      {phase === "done" && (
        <div className="min-h-screen py-20 px-6 flex justify-center overflow-y-auto">
          {/* DEV: replay letter animation
          <button
            onClick={() => setLetterKey((k) => k + 1)}
            className="fixed top-4 right-4 z-50 btn btn-xs btn-ghost opacity-50 hover:opacity-100"
          >
            Replay
          </button> */}
          <article key={letterKey} className="max-w-3xl w-full text-left rounded-2xl backdrop-blur-lg bg-black/40 px-12 py-10" style={{ opacity: 0, animation: "fadeIn 0.8s ease 0.1s both", textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.5)" }}>
            {/* Greeting */}
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 0.2s both" }}>
              <p className="text-4xl text-white mb-8" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>Hi Gaile!</p>
            </div>

            {/* Body */}
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 0.5s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                I hope you liked the drink, the poem, and the flowers! I actually loved how the flowers turned out, I think they were pretty, BUT they were nowhere near as pretty as the girl they were for.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 0.8s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                You looked <em>stunning</em>.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                And don&apos;t take my word for it – I bet everyone in that room thought the same thing!
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 1.1s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                I could ramble on for a lot longer about how great I think you are, or how we all admire how committed you are in helping others, or how impressive it is that you&apos;re doing what you&apos;re doing, but these are things I&apos;d rather say in person (and I hope I won&apos;t be gushing too much over it when that happens). I just love it when people do cool stuff, and you keep on doing it every single time.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 1.4s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                I bet we might sound like broken records when we repeat this praise, but I want you to know that we mean it.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <strong>Everyone <s>thinks</s> knows you&apos;re amazing!</strong>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 1.7s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                But through all the euphonious lines, I felt something deeper. There&apos;s something else, more than the observations you already know or applause you&apos;ve already heard.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <strong>Simply by being you, you make people feel, think, and act a certain way.</strong>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 2.0s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                You&apos;re like the warm sun on a chilly morning, wherever you walk, it simply lightens up and feels your radiance.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 2.3s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                You&apos;re the breeze that lets people relax and take deep breaths, knowing that they&apos;re cared for and have nothing to worry about.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 2.6s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                You&apos;re the <strong>flowers</strong> that people stop walking for to appreciate, the best <strong>smiles</strong> we put on to share joy with one another, the <strong>direction</strong> that our hearts are drawn to.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                And, <em>damn</em>, did I get drawn so strongly.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 2.9s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                We&apos;ve known each other for quite some time now, but only recently did I take notice of how I actually felt.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                It took me some time to convince myself that it wasn&apos;t just an absolutely friendly / platonic sense.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 3.2s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                That someone this admirable, this powerful, but still, if I&apos;m being honest, so gorgeously cute, is someone that I would simply admire from far away?
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                Nope. <em>I miss all the shots I don&apos;t take</em>. I believed in this, and it&apos;s what got me to where I am, and I won&apos;t doubt this saying now.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 3.5s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                And as I was lost in thought, pondering the situation, I found myself asking a few questions that piqued my curiosity. I was thinking,
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <em>If, on the surface, I already see her as an amazing person, what could it look like if I got to know her better?</em><br />
                <em>What drives her?</em><br />
                <em>What ambitious plans does she have for herself?</em>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 3.8s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                But more than that, beneath all the strength you hold, I&apos;d love to know what the person underneath is like.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <em>What&apos;s her favorite color? Dish? <u>Flower</u>?</em><br />
                <em>What songs does she listen to when she&apos;s happy? Sad? Bored?</em><br />
                <em>Which shows did she grow up with as a kid?</em><br />
                <em>What does she do on the weekends?</em><br />
                <em>Will she get the brainrot references I might make?</em>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 4.1s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                And I&apos;m willing to bet, as I gradually uncover the answers to these questions, I&apos;ll end up even more drawn to you.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                Although I think I&apos;ll like you (because again you just blow me away every time), I&apos;m conscious enough that with how little our actual interactions have been, it&apos;s too soon to say that I actually <strong>like</strong> you already. That could be a hasty generalization.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                Do I think you&apos;re cool and awesome and smart and hardworking and charismatic and praiseworthy and … (and a lot more that I&apos;ll truncate for the sake of brevity)?
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <strong>Yes</strong>.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 4.4s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                But we&apos;ve only got to hang out and chat a few times.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                So, of course, the natural response to that is <strong>I&apos;d like to change that!</strong> To answer the questions I posed earlier—
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <strong>I&apos;d love to get to know you more!</strong>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 4.7s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                And of course, in doing this, I&apos;d love to let you get to know me more, too!
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                Which is funny because I think of all the people in the community, I&apos;m definitely part of the subset who are an open book. Or this could just be me claiming a lazy excuse to be a yapper HAHA
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                But in any case, the reason why I&apos;m proposing this is that I believe (and am hoping) that I could provide value to you, too. <em>I mean, that&apos;s what relationships (not just romantic ones!) are for, right?</em>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 5.0s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                I know that you&apos;re a well-established person, and I have the utmost respect for you. I normally would be <em>shy</em> to proclaim that I can provide value to someone like that, and I can say that what I did is a bold move for myself.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                But what I have promised to myself long ago is that I will work to be a man <strong>deserving</strong> of someone&apos;s trust, partnership, <em>and presence</em>. And in this adventure that I embarked on a long time ago, and I still am undertaking, with all the work I&apos;d say I put in, I&apos;m confident that I am at a point to share what I learned and experienced with others.
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                <strong>I&apos;d love to introduce myself to you.</strong>
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 5.3s both" }}>
              <p className="text-lg text-white leading-relaxed mb-6">
                I want to be genuine and honest with you about my intentions, as an initial show of trust.<br />
                There&apos;s going to be a lot of maybes here, but I&apos;ve been known to be an optimistic person :D
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                I&apos;d love for us to know each other more.<br />
                Maybe because of how good we could vibe, we became close!<br />
                Maybe because of that, it might just feel right. We&apos;ll know by then :&gt;
              </p>
              <p className="text-lg text-white leading-relaxed mb-6">
                I&apos;m not saying that it will happen because it&apos;s way too soon for either of us to say, but I see the chance of it happening, and this is my way of saying —
              </p>
              <p className="text-lg text-white leading-relaxed mb-16">
                <strong>I, Lesmon, would love to try this journey with you</strong>.
              </p>
            </div>

            {/* Valentine's question + CTA */}
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 5.6s both" }}>
              <p className="text-lg text-white leading-relaxed mb-10">
                So, in hoping that you feel the same way, how about as a first step of this journey,
              </p>
              <p className="text-2xl text-white text-center mb-8" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>
                Will you be my Valentine&apos;s Date?
              </p>
              <div className="flex flex-col items-center mt-4 gap-3">
                {answered ? (
                  <p className="text-sm text-white">Thanks for checking this out — I&apos;ll chat you in a bit!</p>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        localStorage.setItem("answered", "true");
                        setShowModal(true);
                        fetch("/api/notify", { method: "POST" });
                      }}
                      className="rounded-full px-10 py-3 text-base font-semibold cursor-pointer"
                      style={{
                        fontFamily: "'Nunito', sans-serif",
                        background: "white",
                        color: "#d4688e",
                        border: "2px solid #d4688e",
                        transition: "background 0.2s ease, color 0.2s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#d4688e"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#d4688e"; }}
                    >
                      I&apos;m ready to answer!
                    </button>
                    <p className="text-sm text-white/60 text-center mt-2">Take all the time you need to process and think!<br />No pressure, this button will just be here for you!</p>
                  </>
                )}
              </div>

            </div>
          </article>
        </div>
      )}

      {/* Audio element — always mounted, plays on password success */}
      <audio ref={audioRef} src="/song.mp3" loop preload="auto" />


      <style>{`
        article ::selection {
          background: rgba(244, 143, 177, 0.45);
          color: white;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(5px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(1px); }
        }
        @keyframes wordPulse {
          0% { opacity: 0; transform: scale(0.97); }
          15% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
@keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.6s step-end infinite;
        }
      `}</style>
    </div>

    {/* Modal — top level so fixed positioning works correctly */}
    {showModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-base-100 rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
          <p className="text-lg font-semibold text-base-content mb-2">One sec, I&apos;ll message you!</p>
          <p className="text-sm text-base-content/60 mb-6">Check your phone :)</p>
          <button
            onClick={() => { setShowModal(false); setAnswered(true); }}
            className="rounded-full px-8 py-2.5 text-sm font-semibold cursor-pointer"
            style={{
              fontFamily: "'Nunito', sans-serif",
              background: "white",
              color: "#d4688e",
              border: "2px solid #d4688e",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#d4688e"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#d4688e"; }}
          >
            Close
          </button>
        </div>
      </div>
    )}
    </>
  );
}
