import { useState, useEffect } from "react";

export function useWindowSize({
  width,
  height,
}: {
  width: number;
  height: number;
}): {
  width?: number;
  height?: number;
} {
  const [windowSize, setWindowSize] = useState({
    width,
    height,
  });
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowSize;
}
