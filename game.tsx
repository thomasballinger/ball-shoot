declare global {
  interface Window {
    DEBUG?: boolean;
  }
}

import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useDebug, useDimensions } from "./hooks";
import { api } from "./convex/_generated/api";
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
import { ground } from "./style";
import { Scoreboard } from "./score";

// takes up the whole screen
export const Game = () => {
  const [mouseDown, setMouseDown] = useState(false);
  const { onMouseOrTouchMove, fire, mousePos, ballPos, strokes, setName } =
    useGameplay();
  const nextLevel = useMutation(api.golf.createLevel);
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          backgroundColor: "lightgray",
        }}
      >
        <div>strokes: {strokes}</div>
        <Scoreboard />
        <input
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setName(e.currentTarget.value);
          }}
        />
        <button onClick={() => nextLevel()}>new level</button>
      </div>
      <svg
        style={{
          aspectRatio: `${xMax - xMin} / ${yMax - yMin}`,
        }}
        viewBox={`${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`}
        xmlns="<http://www.w3.org/2000/svg>"
        onMouseMove={onMouseOrTouchMove}
        onTouchMove={onMouseOrTouchMove}
        onMouseUp={() => {
          setMouseDown(false);
          fire();
        }}
        onTouchEnd={() => {
          setMouseDown(false);
          fire();
        }}
        onMouseDown={() => setMouseDown(true)}
        onTouchStart={() => setMouseDown(true)}
      >
        <Ground ballPos={ballPos} />
        <Balls />
        <Controls mousePos={mousePos} ballPos={ballPos} mouseDown={mouseDown} />
      </svg>
      <div style={{ backgroundColor: ground, flexGrow: 1 }}></div>
    </>
  );
};

export const Ground = ({
  ballPos,
}: {
  ballPos: { x: number; y: number } | undefined;
}) => {
  const level = useQuery(api.golf.getLevel);
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
      fill={ground}
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
  const balls = useQuery(api.golf.getBalls) || [];
  const level = useQuery(api.golf.getLevel) || undefined;

  useEffect(() => {
    const update = () => {
      setFrameNum((i) => i + 1);
      requestAnimationFrame(update);
    };
    update();
  }, []);

  const now = Date.now();

  const pos = balls.map((b) => currentPosition(b, now, level));

  useDebug({ _, pos });

  return (
    <>
      {balls.map((b) => {
        const { x, y, isInHole, isStuckOnGround } = currentPosition(
          b,
          now,
          level
        );
        return (
          <>
            <text key={b._id + "-name"} x={x} y={yMax - y - 15} fill="white">
              {b.name}
            </text>
            <circle
              key={b._id}
              cx={x}
              cy={yMax - y}
              r={radius - 2}
              strokeWidth="2"
              stroke={b.color}
              fill={"white"}
            />
          </>
        );
      })}
    </>
  );
});

export const Controls = ({
  mousePos,
  ballPos,
  mouseDown,
}: {
  mousePos: { x: number; y: number } | undefined;
  ballPos: { x: number; y: number } | undefined;
  mouseDown: boolean;
}) => {
  if (!ballPos || !mousePos) return null;
  const x1 = ballPos.x;
  const y1 = yMax - ballPos.y + yMin;
  const x2 = mousePos.x;
  const y2 = mousePos.y;
  const tooFar = dist(x1, y1, x2, y2) / 20 > 20;
  const color = tooFar ? "red" : "black";
  if (!mouseDown) return null;
  return (
    <line
      key="controls"
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
