import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "./convex/_generated/react";
import { currentPosition, yMax, yMin, xMax, xMin } from "./simulation";
import {useGameplay} from "./useGameplay";


export const Game = () => {
  const { onMouseOrTouchMove, fire, mousePos, ballPos } = useGameplay();
  const width = 1000;
  const height = 500;
  const newLevel = useMutation("golf:createLevel");
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <svg
        style={{ width, height }}
        viewBox={`${xMin - 50} ${yMin - 50} ${xMax - xMin + 100} ${yMax - yMin + 100}`}
        xmlns="<http://www.w3.org/2000/svg>"
        onMouseMove={onMouseOrTouchMove}
        onTouchMove={onMouseOrTouchMove}
        onMouseUp={fire}
        onTouchEnd={fire}
      >
        <Ground />
        <Balls />
        <Controls mousePos={mousePos} ballPos={ballPos} />
      </svg>
      <button onClick={() => newLevel()}>new level</button>
    </div>
  );
};

export const Ground = () => {
  const level = useQuery("golf:getLevel");
  if (!level) return <></>
  const lines = level.domain.slice(0, -1).map((x1, i) => {
    const x2 = level.domain[i+1];
    const y1 = level.elevation[i];
    const y2 = level.elevation[i+1];
    return <line
      key={'ground'+i}
      stroke={"green"}
      strokeWidth={1}
      x1={x1}
      y1={yMax - y1 + yMin}
      x2={x2}
      y2={yMax - y2 + yMin}
    />
  });
  return <>{lines}</>
}

// memoize to prevent rerenders on parent rerenders
export const Balls = React.memo(() => {
  const [_, setFrameNum] = useState(0);
  const balls = useQuery("golf:getBalls") || [];

  useEffect(() => {
    const update = () => {
      setFrameNum((i) => i + 1);
      requestAnimationFrame(update);
    };
    update();
  }, []);

  return (
    <>
      {balls.map((b) => {
        const { x, y } = currentPosition(b);
        return (
          <circle
            key={b._id.toString()}
            cx={x}
            cy={yMax - y}
            r="8"
            strokeWidth="4"
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
  const x1 = ballPos.x
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

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
