import { Id } from "./convex/_generated/dataModel";
import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "./convex/_generated/react";
import { currentPosition, xMax, xMin, yMax, yMin } from "./simulation";

export function useGameplay(): {
  onMouseOrTouchMove: (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => void;
  fire: () => any;
  ballPos: { x: number; y: number } | undefined;
  mousePos: { x: number; y: number } | undefined;
} {
  const [mousePos, setMousePos] = useState<
    { x: number; y: number } | undefined
  >();

  const createBall = useMutation("golf:createBall");
  const identifier = useRef<string>("user" + Math.random());
  const color = useRef<string>(
    `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`
  );
  function onMouseOrTouchMove(
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) {
    const [screenX, screenY] =
      "touches" in e
        ? [e.touches[0].clientX, e.touches[0].clientY]
        : [e.clientX, e.clientY];
    const domPoint = new DOMPointReadOnly(screenX, screenY);
    const svg = e.currentTarget;
    const { x, y } = domPoint.matrixTransform(
      (svg.getScreenCTM() as any).inverse() as DOMMatrixInit
    );
    setMousePos({ x, y });
  }

  const [myBallId, setMyBallId] = useState<Id<"balls"> | null>(null);
  const [ballPos, setBallPos] = useState<{ x: number; y: number }>();
  const ball = useQuery("golf:getBall", myBallId) || null;
  const level = useQuery("golf:getLevel") || undefined;

  useEffect(() => {
    async function init() {
      const id = await createBall(identifier.current, color.current);
      setMyBallId(id);
    }
    if (level) {
      init();
    }
  }, [level]);

  //const now = Date.now();
  //const ballPos = ball ? currentPosition(ball, now, level) : undefined;
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      const now = Date.now();
      setBallPos(ball ? currentPosition(ball, now, level) : undefined);
    });
    return () => cancelAnimationFrame(handle);
  });

  const publish = useMutation("golf:publishStroke");

  const fire = () => {
    if (!mousePos || !ball) return;
    const now = Date.now();
    const ballPos = currentPosition(ball, now, level);
    const dx = mousePos.x - ballPos.x;
    const dy = yMax - mousePos.y + yMin - ballPos.y;
    const mightiness = Math.sqrt(dx * dx + dy * dy) / 20;
    const angleInDegrees = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (mightiness > 20) {
      return;
    }

    publish(identifier.current, angleInDegrees, mightiness);
  };

  return {
    onMouseOrTouchMove,
    fire,
    ballPos,
    mousePos,
  };
}
