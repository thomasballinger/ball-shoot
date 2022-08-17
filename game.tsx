import { Id } from "convex/values";
import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "./convex/_generated/react";
import { Ball, currentPosition, xMax, xMin, yMax, yMin } from "./simulation";

export const Game = () => {
  const [mousePos, setMousePos] = useState<
    { x: number; y: number } | undefined
  >();
  function onMouseOrTouchMove(e: React.MouseEvent | React.TouchEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    if ("touches" in e) {
      setMousePos({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      });
    } else {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }

  const createBall = useMutation("golf:createBall");
  const identifier = useRef<string>("user" + Math.random());
  const color = useRef<string>(
    `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`
  );
  useEffect(() => {
    async function init() {
      const id = await createBall(identifier.current, color.current);
      setMyBallId(id);
    }
    init();
  }, []);

  const [myBallId, setMyBallId] = useState<Id | null>(null);
  const [ballPos, setBallPos] = useState<{x: number, y: number}>();
  const ball = useQuery("golf:getBall", myBallId) || null;
  //const ballPos = ball ? currentPosition(ball) : undefined;
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setBallPos(ball ? currentPosition(ball) : undefined);
    });
    return () => cancelAnimationFrame(handle);
  })

  const publish = useMutation("golf:publishStroke");

  if (mousePos && ball) {
    const ballPos = currentPosition(ball);
    const dx = mousePos.x - ballPos.x;
    const dy = yMax - mousePos.y + yMin - ballPos.y;
    const mightiness = Math.sqrt(dx * dx + dy * dy) / 20;
    const angleInDegrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  const fire = () => {
    if (!mousePos || !ball) return;
    const ballPos = currentPosition(ball);
    const dx = mousePos.x - ballPos.x;
    const dy = yMax - mousePos.y + yMin - ballPos.y;
    const mightiness = Math.sqrt(dx * dx + dy * dy) / 20;
    const angleInDegrees = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (mightiness > 20) {
      return;
    }

    publish(identifier.current, angleInDegrees, mightiness);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <svg
        style={{ width: 1000, height: 500 }}
        viewBox={`${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`}
        xmlns="<http://www.w3.org/2000/svg>"
        onMouseMove={onMouseOrTouchMove}
        onTouchMove={onMouseOrTouchMove}
        onMouseUp={fire}
        onTouchEnd={fire}
      >
        <Balls />

        <Controls mousePos={mousePos} ballPos={ballPos} />

      </svg>
    </div>
  );
};

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

const Controls = ({
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
