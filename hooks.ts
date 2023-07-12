import { useState, useEffect } from "react";

declare global {
  interface Window {
    DEBUG?: boolean;
  }
}

export function useDimensions({
  el,
  width,
  height,
}: {
  el: HTMLElement | null;
  width?: number;
  height?: number;
}): {
  width: number;
  height: number;
} {
  const [dimensions, setDimensions] = useState({
    width: width || 0,
    height: height || 0,
  });
  useEffect(() => {
    function handleResize() {
      if (el) {
        setDimensions({
          width: el.offsetWidth,
          height: el.offsetHeight,
        });
      }
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [el]);
  return dimensions;
}

export function useDebug(value: Record<string, any>) {
  if (typeof document === "undefined") return;
  if (!window.DEBUG) return;
  const el = document.querySelector(".debug");
  if (!el) return;
  el.innerHTML = `<pre><code></code></pre>`;
  el.children[0].children[0].textContent = JSON.stringify(value, null, 2);
}
