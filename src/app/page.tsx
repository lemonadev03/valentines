"use client";

import { useRef, useState, useCallback } from "react";

const NUM_CHARS = 5;

export default function Home() {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [values, setValues] = useState<string[]>(Array(NUM_CHARS).fill(""));
  const [bouncing, setBouncing] = useState<boolean[]>(
    Array(NUM_CHARS).fill(false)
  );

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

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const char = e.target.value.slice(-1);
      if (!char) return;

      setValues((prev) => {
        const next = [...prev];
        next[index] = char;
        return next;
      });

      triggerBounce(index);

      if (index < NUM_CHARS - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [triggerBounce]
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

      setValues((prev) => {
        const next = [...prev];
        chars.forEach((c, i) => {
          next[i] = c;
        });
        return next;
      });

      chars.forEach((_, i) => triggerBounce(i));

      const focusIndex = Math.min(chars.length, NUM_CHARS - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [triggerBounce]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
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
  );
}
