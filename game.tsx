declare global {
  interface Window {
    DEBUG?: boolean;
  }
}

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "./convex/_generated/react";
import { useDimensions } from "./hooks";
import {
  currentPosition,
  yMax,
  yMin,
  xMax,
  xMin,
  groundLines,
  radius,
  getRelevantLand,
  pointToLine,
} from "./simulation";
import { useGameplay } from "./useGameplay";

// takes up the whole screen
export const Game = () => {
  const { onMouseOrTouchMove, fire, mousePos, ballPos, strokes } =
    useGameplay();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useDimensions({
    el: containerRef.current,
  });
  const newLevel = useMutation("golf:createLevel");
  return (
    <>
      <p>strokes: {strokes}</p>
      <button onClick={() => newLevel()}>new level</button>
      <div ref={containerRef}>
        <svg
          viewBox={`${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`}
          xmlns="<http://www.w3.org/2000/svg>"
          onMouseMove={onMouseOrTouchMove}
          onTouchMove={onMouseOrTouchMove}
          onMouseUp={fire}
          onTouchEnd={fire}
        >
          <Ground ballPos={ballPos} />
          <Balls />
          <Controls mousePos={mousePos} ballPos={ballPos} />
        </svg>
      </div>
    </>
  );
};

export const Ground = ({
  ballPos,
}: {
  ballPos: { x: number; y: number } | undefined;
}) => {
  const level = useQuery("golf:getLevel");
  const relevantLines =
    level && ballPos
      ? getRelevantLand(ballPos.x - radius, ballPos.x + radius, level)
      : [];
  if (!level) return <></>;
  const lines = groundLines(level).map(({ x1, y1, x2, y2 }, i) => (
    <line
      key={"ground" + i}
      stroke={"green"}
      strokeWidth={1}
      x1={x1}
      y1={yMax - y1 + yMin}
      x2={x2}
      y2={yMax - y2 + yMin}
    />
  ));
  const points = [
    ...level.domain.map((x, i) => ({ x, y: level.elevation[i] })),
    { x: xMax, y: level.elevation[0] },
    { x: xMax, y: yMin },
    { x: xMin, y: yMin },
  ];
  const polyPoints = (
    <polygon
      points={points.map(({ x, y }) => `${x},${yMax - y + yMin}`).join(" ")}
      fill="#142e1b"
    />
  );

  const fatLines = window.DEBUG
    ? relevantLines.map(({ x1, y1, x2, y2 }, i) => (
        <line
          key={"ground-debug" + i}
          stroke={
            pointToLine(ballPos || { x: 0, y: 0 }, { x1, y1, x2, y2 }) > radius
              ? "blue"
              : "red"
          }
          strokeWidth={
            pointToLine(ballPos || { x: 0, y: 0 }, { x1, y1, x2, y2 }) * 2
          }
          x1={x1}
          y1={yMax - y1 + yMin}
          x2={x2}
          y2={yMax - y2 + yMin}
        />
      ))
    : [];
  return (
    <>
      {lines}
      {fatLines}
      {polyPoints}
    </>
  );
};

// memoize to prevent rerenders on parent rerenders
export const Balls = React.memo(() => {
  const [_, setFrameNum] = useState(0);
  const balls = useQuery("golf:getBalls") || [];
  const level = useQuery("golf:getLevel") || undefined;

  useEffect(() => {
    const update = () => {
      setFrameNum((i) => i + 1);
      requestAnimationFrame(update);
    };
    update();
  }, []);

  const now = Date.now();

  return (
    <>
      {balls.map((b) => {
        const { x, y } = currentPosition(b, now, level);
        return (
          <circle
            key={b._id.toString()}
            cx={x}
            cy={yMax - y}
            r={radius - 2}
            strokeWidth="2"
            stroke={b.color}
            fill={"white"}
          />
        );
      })}
    </>
  );
});

export const Controls = ({
  mousePos,
  ballPos,
}: {
  mousePos: { x: number; y: number } | undefined;
  ballPos: { x: number; y: number } | undefined;
}) => {
  if (!ballPos || !mousePos) return null;
  const x1 = ballPos.x;
  const y1 = yMax - ballPos.y + yMin;
  const x2 = mousePos.x;
  const y2 = mousePos.y;
  const tooFar = dist(x1, y1, x2, y2) / 20 > 20;
  const color = tooFar ? "red" : "black";
  return (
    <line
      stroke={color}
      strokeWidth={tooFar ? 1 : 3}
      x1={ballPos.x}
      y1={yMax - ballPos.y + yMin}
      x2={mousePos.x}
      y2={mousePos.y}
    />
  );
};

const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
