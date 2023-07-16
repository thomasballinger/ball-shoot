import { Id } from "./convex/_generated/dataModel";
import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { currentPosition, xMax, xMin, yMax, yMin } from "./simulation";
import { api } from "./convex/_generated/api";

function randomName() {
  const names = [
    `Freddy Allstar`,
    `Chip "Slice" McDivot`,
    `Sandy "Bunker" Bottoms`,
    `Bogey "Mulligan" Johnson`,
    `Tee "Off" Thompson`,
    `Albatross "Eagle" Featherstone`,
    `Birdie "Putt" Parson`,
    `Putter "Whacker" Wilson`,
    `Fairway "Duffer" Davis`,
    `Ace "Golfzilla" Anderson`,
    `Caddy "Clubber" Clarkson`,
    `Slice "Hook" Hamilton`,
    `Fore "Bogeyman" Barclay`,
    `Mulligan "Putter" Peterson`,
    `Shank "Swing" Sullivan`,
    `Dimples "Chipper" Chandler`,
  ];
  return names[Math.floor(Math.random() * names.length)];
}

export function useGameplay(): {
  onMouseOrTouchMove: (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => void;
  fire: () => any;
  ballPos: { x: number; y: number } | undefined;
  mousePos: { x: number; y: number } | undefined;
  setName: (name: string) => Promise<null>;
  strokes: number;
  nextLevel: () => Promise<any>;
  wonMessage?: string;
  name: string;
} {
  const [mousePos, setMousePos] = useState<
    { x: number; y: number } | undefined
  >();
  const [name, setNameLocally] = useState(randomName());
  const nameRef = useRef<string>();
  nameRef.current = name;

  const createBall = useMutation(api.golf.createBall);
  const identifier = useRef<string>("secret:" + Math.random());
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
  const ball = useQuery(api.golf.getBall, { id: myBallId }) || null;
  const level = useQuery(api.golf.getLevel) || undefined;

  useEffect(() => {
    async function init() {
      const id = await createBall({
        identifier: identifier.current,
        color: color.current,
        name: nameRef.current,
      });
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
  // TODO do we really have to run this every render?
  // apparently (cursor line disappears if not) but is that a bug?

  const publish = useMutation(api.golf.publishStroke);

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

    publish({ identifier: identifier.current, angleInDegrees, mightiness });
  };

  const setNameRemotely = useMutation(api.golf.setName);
  const setName = (name: string) => {
    setNameLocally(name);
    return setNameRemotely({ identifier: identifier.current, name });
  };

  // TODO remove this when not canGoToNextLevel()
  // this requires a timer or (better>?) a useQuery()
  // or (better? another field on levels and a scheduled mutation to update the field)
  const nextLevel = useMutation(api.golf.createLevel);

  return {
    onMouseOrTouchMove,
    fire,
    ballPos,
    mousePos,
    strokes: ball ? ball.strokes : 0,
    setName,
    nextLevel,
    wonMessage: ball?.finished ? `Hole in ${ball?.strokes}` : undefined,
    name,
  };
}
