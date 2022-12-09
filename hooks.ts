import { useState, useEffect } from "react";

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
