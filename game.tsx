declare global {
  interface Window {
    DEBUG?: boolean;
  }
}

import React, { ChangeEvent, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useDebug } from "./hooks";
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
  xExtent,
  yExtent,
} from "./simulation";
import { useGameplay } from "./useGameplay";
import { ground } from "./style";
import { Scoreboard } from "./score";

function Debug() {
  return (
    <div
      className="debug"
      style={{
        position: "absolute",
        backgroundColor: " rgba(0, 0, 0, 0.2)",
        pointerEvents: "none",
        color: "white",
        overflow: "scroll",
        maxHeight: "100vh",
      }}
    ></div>
  );
}

function InfoOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "row",
        pointerEvents: "none",
        overflow: "hidden",
        maxHeight: "100%",
        marginTop: 20,
      }}
    >
      <Scoreboard />
    </div>
  );
}

function ControlsOverlay({
  setName,
  nextLevel,
  name,
}: {
  setName: (name: string) => Promise<any>;
  nextLevel?: () => void;
  name: string;
}) {
  return (
    <div>
      <input
        placeholder="change your name"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setName(e.currentTarget.value);
        }}
        defaultValue={name}
      />
      <button onClick={nextLevel && (() => nextLevel())} disabled={!nextLevel}>
        new level
      </button>
    </div>
  );
}

// takes up the whole screen
export const Game = () => {
  const [mouseDown, setMouseDown] = useState(false);
  const {
    onMouseOrTouchMove,
    fire,
    mousePos,
    ballPos,
    setName,
    nextLevel,
    wonMessage,
    name,
  } = useGameplay();
  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "inline-flex",
        flexDirection: "column",
        overflow: "none",
      }}
    >
      <Debug />
      <InfoOverlay />
      <ControlsOverlay
        nextLevel={() => nextLevel()}
        setName={setName}
        name={name}
      />
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
        <CenteredMessage message={wonMessage} />
      </svg>
      <div style={{ backgroundColor: ground, flexGrow: 1 }}></div>
    </div>
  );
};

function CenteredMessage({ message }: { message?: string }) {
  const shared = {
    textAnchor: "middle",
    dominantBaseline: "middle",
    fontSize: 144,
    x: xMin + xExtent / 2,
    y: yMin + yExtent / 3,
  };
  return (
    <g>
      <defs>
        <filter id="bigBlur" x="0" y="0">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>
      <text
        style={{ transition: "all 1s ease-out" }}
        key={"winMessageBg"}
        {...shared}
        fill={"black"}
        opacity={message ? 1 : 0}
        filter="url(#bigBlur)"
      >
        {message}
      </text>
      <text
        key={"winMessageBg2"}
        {...shared}
        opacity={message ? 1 : 0}
        fill="lightblue"
      >
        {message}
      </text>
      <text
        style={{ transition: "all 200ms ease-out" }}
        key={"winMessage"}
        {...shared}
        opacity={message ? 1 : 0}
        fill="white"
      >
        {message}
      </text>
    </g>
  );
}

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
      strokeWidth={2}
      strokeLinecap="round"
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
      key="polyPoints"
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
      {fatLines}
      {polyPoints}
      {lines}
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

  // TODO return bounces from currentPosition, show some particle effects
  return (
    <g key="balls-section">
      {balls.map((b) => {
        const { x, y, isInHole, isStuckOnGround } = currentPosition(
          b,
          now,
          level
        );
        return (
          <g key={b._id + "-group"}>
            <defs>
              <filter id="blur" x="0" y="0">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
              </filter>
            </defs>
            <text
              key={b._id + "-name-bg"}
              x={x}
              y={yMax - y - 20}
              fill="black"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              filter="url(#blur)"
            >
              {b.name}
            </text>
            <text
              key={b._id + "-name"}
              x={x}
              y={yMax - y - 20}
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
            >
              {b.name}
            </text>
            <circle
              key={b._id + "-circle"}
              cx={x}
              cy={yMax - y}
              r={radius - 2}
              strokeWidth="2"
              stroke={b.color}
              fill={"white"}
            />
          </g>
        );
      })}
    </g>
  );
});
Balls.displayName = "Balls";

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
