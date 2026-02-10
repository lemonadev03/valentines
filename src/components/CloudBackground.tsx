"use client";
import { useEffect, useRef } from "react";

export default function CloudBackground({ visible = true, onReady }: { visible?: boolean; onReady?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([
      import("three"),
      import("vanta/dist/vanta.clouds.min"),
    ]).then(([THREE, CLOUDS]) => {
      if (!ref.current || effectRef.current) return;
      effectRef.current = CLOUDS.default({
        THREE,
        el: ref.current,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        skyColor: 0xf2dfe8,
        cloudColor: 0xf0ecee,
        cloudShadowColor: 0xbfa0ac,
        sunColor: 0xffaa88,
        sunlightColor: 0xffbb99,
        speed: 0.3,
      });
      // Force 1x pixel ratio — blur overlay hides the difference
      effectRef.current.renderer.setPixelRatio(1);
      onReady?.();
    });
    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        className="absolute"
        style={{ width: "25%", height: "25%", transformOrigin: "top left", transform: "scale(4)" }}
      />
      <div className="absolute inset-0 backdrop-blur-sm" />
    </div>
  );
}
