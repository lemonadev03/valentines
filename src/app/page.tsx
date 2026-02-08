"use client";

import { useRef, useState, useCallback, useEffect } from "react";

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

type Phase = "input" | "wiping" | "words" | "done";

export default function Home() {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [values, setValues] = useState<string[]>(Array(NUM_CHARS).fill(""));
  const [bouncing, setBouncing] = useState<boolean[]>(
    Array(NUM_CHARS).fill(false)
  );
  const [phase, setPhase] = useState<Phase>("input");
  const [cardsUp, setCardsUp] = useState(false);
  const [cardsOut, setCardsOut] = useState(false);
  const [inputHidden, setInputHidden] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

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
        setTimeout(() => setPhase("wiping"), 500);
      }
    },
    [phase]
  );

  // Wipe animation
  useEffect(() => {
    if (phase !== "wiping") return;

    // Mount cards off-screen, then next frame → animate up
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCardsUp(true));
    });

    // Hide input once cards have fully covered the screen
    // 1.2s transition + 300ms max delay = ~1.5s, plus buffer
    const hideInput = setTimeout(() => setInputHidden(true), 1700);
    // After cards fully cover screen, slide them off the top
    const slideOff = setTimeout(() => setCardsOut(true), 2000);
    // Transition to words as cards begin clearing
    const toWords = setTimeout(() => setPhase("words"), 2600);

    return () => {
      clearTimeout(hideInput);
      clearTimeout(slideOff);
      clearTimeout(toWords);
    };
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
    <div className="relative min-h-screen overflow-hidden bg-base-100">
      {/* Password input */}
      {!inputHidden && (phase === "input" || phase === "wiping") && (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex gap-3">
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
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                autoFocus={i === 0}
                className="input input-bordered h-16 w-14 text-center text-2xl font-semibold caret-transparent transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{
                  transform: bouncing[i] ? "scale(0.9)" : "scale(1)",
                  boxShadow: bouncing[i]
                    ? "0 0 0 3px rgba(99, 102, 241, 0.25)"
                    : "none",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Card wipe overlay — stays rendered after wiping to finish exit animation */}
      {phase !== "input" && (
        <div className="pointer-events-none fixed inset-0 z-30 flex">
          {Array.from({ length: NUM_CARDS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${CARD_COLORS[i]} rounded-t-2xl shadow-lg`}
              style={{
                height: "120vh",
                transform: cardsOut
                  ? "translateY(-120vh)"
                  : cardsUp
                    ? "translateY(0)"
                    : "translateY(100vh)",
                transition: "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: `${CARD_DELAYS[i]}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Words flashing — behind the cards (z-20 < z-30), revealed as cards clear */}
      {phase === "words" && currentWordIndex >= 0 && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <span
            key={currentWordIndex}
            className="text-6xl font-bold text-base-content select-none"
            style={{
              animation: `wordPulse ${getWordInterval(currentWordIndex, WORDS.length)}ms ease-in-out both`,
            }}
          >
            {WORDS[currentWordIndex]}
          </span>
        </div>
      )}

      {/* Final text */}
      {phase === "done" && (
        <div
          className="flex min-h-screen items-center justify-center"
          style={{
            animation: "fadeSlideUp 0.8s ease-out 0.2s both",
          }}
        >
          <div className="text-center max-w-md px-6">
            <h1 className="text-4xl font-bold text-base-content mb-4">
              Welcome
            </h1>
            <p className="text-lg text-base-content/70">
              You&apos;ve unlocked something special.
            </p>
          </div>
        </div>
      )}

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
      `}</style>
    </div>
  );
}
