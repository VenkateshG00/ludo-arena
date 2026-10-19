import { useCallback, useRef } from "react";

/**
 * Triggers a brief screen shake via CSS class toggling.
 * Respects prefers-reduced-motion via the CSS media query in globals.css.
 */
export function useScreenShake() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shake = useCallback((intensity: "small" | "medium" | "large" = "medium") => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("game-root");
    if (!el) return;

    const cls = intensity === "large" ? "shake-large" : intensity === "small" ? "shake-small" : "shake-medium";
    el.classList.add(cls);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      el.classList.remove("shake-small", "shake-medium", "shake-large");
    }, 400);
  }, []);

  return shake;
}
