"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ReactLenis } from "lenis/react";

const NUM_CHARS = 5;
const NUM_CARDS = 6;

// Outside-in: 1st+6th → 2nd+5th → 3rd+4th
const CARD_DELAYS = [0, 150, 300, 300, 150, 0];

const CARD_COLORS = [
  "bg-base-200",
  "bg-base-300",
  "bg-base-200",
  "bg-base-300",
  "bg-base-200",
  "bg-base-300",
];

const SPOTLIGHT_COLORS = [
  "bg-rose-200",
  "bg-sky-200",
  "bg-amber-200",
  "bg-emerald-200",
  "bg-violet-200",
  "bg-orange-200",
];


// Words that describe her — edit this array
const WORDS = [
  "kind",
  "brilliant",
  "beautiful",
  "warm",
  "funny",
  "gentle",
  "radiant",
  "fearless",
  "magnetic",
  "mine",
];

// Starts slow (~900ms), accelerates toward the end (~200ms)
function getWordInterval(index: number, total: number): number {
  const progress = index / Math.max(total - 1, 1);
  const eased = progress * progress;
  return Math.round(900 - 700 * eased);
}

const SUCCESS_MESSAGE = "this is for you";

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
  const [isMobile, setIsMobile] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleVolumeReady = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.4;
      audio.play().catch(() => {});
    }
    setVolumeExiting(true);
    setTimeout(() => setPhase("input"), 600);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
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
      if (allFilled) {
        setTimeout(() => setPhase("success"), 300);
      }
    },
    [phase]
  );

  // Success animation sequence
  useEffect(() => {
    if (phase !== "success") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // t=0ms — green flash + haptic
    setSuccessStep(1);
    navigator.vibrate?.(50);

    // t=1000ms — borders fade away
    timers.push(setTimeout(() => setSuccessStep(2), 1000));

    // t=2000ms — letters collapse, comma appears
    timers.push(setTimeout(() => setSuccessStep(3), 2000));

    // t=3200ms — start typewriter
    timers.push(
      setTimeout(() => {
        setSuccessStep(4);
        let charIndex = 0;
        const typeInterval = setInterval(() => {
          setTypedMessageIndex(charIndex);
          charIndex++;
          if (charIndex >= SUCCESS_MESSAGE.length) {
            clearInterval(typeInterval);
            // 2s pause after typing complete, then wipe
            timers.push(setTimeout(() => setPhase("wiping"), 2000));
          }
        }, 90);
        timers.push(typeInterval as unknown as ReturnType<typeof setTimeout>);
      }, 3200)
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
        timeout = setTimeout(() => setPhase("done"), 500);
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
      const char = e.target.value.slice(-1);
      if (!char) return;

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
    <div className={`relative min-h-screen bg-base-100 ${phase === "done" ? "overflow-y-auto" : "overflow-hidden"}`}>
      {/* DEV: test telegram notification */}
      <button
        onClick={() => fetch("/api/notify", { method: "POST" })}
        className="fixed top-4 left-4 z-50 btn btn-xs btn-ghost opacity-50 hover:opacity-100"
      >
        Test TG
      </button>
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
            <p className="text-lg text-base-content/70" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>Please turn your volume up! :D</p>
            <button
              onClick={handleVolumeReady}
              className="btn btn-soft btn-primary btn-wide"
            >
              I&apos;m ready
            </button>
          </div>
        </div>
      )}

      {/* Password input */}
      {!inputHidden &&
        (phase === "input" || phase === "success" || phase === "wiping") && (
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center">
              {isMobile && phase === "input" && (
                <p className="text-sm text-base-content/50 mb-4 text-center">
                  Open this on a computer
                </p>
              )}
              {/* Inputs + crossfade word share the same spot */}
              <div className="relative">
                {/* Input boxes */}
                <div
                  className="flex items-center"
                  style={{
                    gap: "8px",
                    opacity: successStep >= 3 ? 0 : isMobile && phase === "input" ? 0.4 : 1,
                    transition: "opacity 0.6s ease",
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
                      disabled={isMobile && phase === "input"}
                      onChange={(e) => handleChange(i, e)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      autoFocus={!isMobile && i === 0}
                      className={`input input-bordered text-center text-2xl font-semibold caret-transparent focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary${isMobile && phase === "input" ? " cursor-not-allowed pointer-events-none" : ""}`}
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        padding: 0,
                        transform: bouncing[i] ? "scale(0.9)" : "scale(1)",
                        borderColor:
                          successStep >= 2
                            ? "transparent"
                            : successStep >= 1
                              ? "rgb(74, 222, 128)"
                              : undefined,
                        backgroundColor:
                          successStep >= 2
                            ? "transparent"
                            : successStep >= 1
                              ? "rgba(74, 222, 128, 0.1)"
                              : undefined,
                        boxShadow:
                          successStep >= 2
                            ? "none"
                            : successStep >= 1
                              ? "0 0 0 3px rgba(74, 222, 128, 0.25)"
                              : bouncing[i]
                                ? "0 0 0 3px rgba(99, 102, 241, 0.25)"
                                : "none",
                        transition: "all 0.8s ease",
                      }}
                    />
                  ))}
                </div>
                {/* Plain text word — fades in on top */}
                {successStep >= 3 && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-base-content"
                    style={{ opacity: 0, animation: "fadeIn 0.8s ease 0.5s both" }}
                  >
                    {values.join("")},
                  </span>
                )}
                {/* Typewriter — absolutely positioned below, no layout shift */}
                {successStep >= 4 && (
                  <p
                    className="absolute left-0 right-0 text-center font-bold text-lg mt-3 text-base-content"
                    style={{ opacity: 0, animation: "fadeIn 0.6s ease 0.1s both", top: "100%" }}
                  >
                    {SUCCESS_MESSAGE.slice(0, typedMessageIndex + 1)}
                    <span className="animate-blink">|</span>
                  </p>
                )}
              </div>
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
              className={`${CARD_COLORS[i]} rounded-t-2xl shadow-lg overflow-hidden`}
              style={{
                height: "120vh",
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
                <div
                  className={`${SPOTLIGHT_COLORS[i]} rounded-2xl`}
                  style={{
                    width: "80%",
                    height: "60%",
                    opacity: activeCard === i ? 1 : 0,
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
            className="text-6xl font-bold text-base-content select-none"
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
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
          {/* DEV: replay letter animation */}
          <button
            onClick={() => setLetterKey((k) => k + 1)}
            className="fixed top-4 right-4 z-50 btn btn-xs btn-ghost opacity-50 hover:opacity-100"
          >
            Replay
          </button>
          <article key={letterKey} className="max-w-xl w-full text-left">
            {/* Step 1: Greeting */}
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 0.2s both" }}>
              <p className="text-4xl text-base-content mb-8" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>Dear you,</p>
            </div>

            {/* Body — paragraph by paragraph */}
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 0.6s both" }}>
              <p className="text-base text-base-content/70 leading-relaxed mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Pellentesque habitant
                morbi tristique senectus et netus et malesuada fames ac turpis
                egestas.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 1.0s both" }}>
              <p className="text-base text-base-content/70 leading-relaxed mb-4">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum. Vivamus sagittis lacus vel augue
                laoreet rutrum faucibus dolor auctor. Maecenas sed diam eget
                risus varius blandit sit amet non magna.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 1.4s both" }}>
              <p className="text-base text-base-content/70 leading-relaxed mb-4">
                Curabitur pretium tincidunt lacus. Nulla gravida orci a odio.
                Nullam varius, turpis et commodo pharetra, est eros bibendum
                elit, nec luctus magna felis sollicitudin mauris. Integer in
                mauris eu nibh euismod gravida. Duis ac tellus et risus
                vulputate vehicula. Donec lobortis risus a elit.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 1.8s both" }}>
              <p className="text-base text-base-content/70 leading-relaxed mb-4">
                Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies
                nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget
                condimentum rhoncus, sem quam semper libero, sit amet adipiscing
                sem neque sed ipsum. Nam quam nunc, blandit vel, luctus
                pulvinar, hendrerit id, lorem.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 2.2s both" }}>
              <p className="text-base text-base-content/70 leading-relaxed mb-4">
                Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor
                eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante,
                dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra
                nulla ut metus varius laoreet. Quisque rutrum. Aenean
                imperdiet. Etiam ultricies nisi vel augue. Integer ante arcu,
                accumsan a, consectetuer eget, posuere ut, mauris.
              </p>
            </div>
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 2.6s both" }}>
              <p className="text-base text-base-content/70 leading-relaxed mb-8">
                Praesent congue erat at massa. Sed cursus turpis vitae tortor.
                Donec posuere vulputate arcu. Phasellus accumsan cursus velit.
                Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
                posuere cubilia Curae; Sed aliquam, nisi quis porttitor congue,
                elit erat euismod orci, ac placerat dolor lectus quis orci.
                Phasellus consectetuer vestibulum elit.
              </p>
            </div>

            {/* Closing */}
            <div style={{ opacity: 0, animation: "fadeSlideUp 0.8s ease-out 3.0s both" }}>
              <p className="text-base text-base-content/70">Forever yours,</p>
              <p className="text-lg font-semibold text-base-content mt-1 mb-12">
                Me
              </p>
              <div className="flex justify-center mt-12">
                <button
                  onClick={async () => {
                    await fetch("/api/notify", { method: "POST" });
                  }}
                  className="btn btn-soft btn-primary btn-wide btn-lg"
                >
                  Answer here
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Audio element — always mounted, plays on password success */}
      <audio ref={audioRef} src="/song.mp3" loop preload="auto" />


      <style>{`
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
    </>
  );
}
