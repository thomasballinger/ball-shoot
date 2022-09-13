import {instance} from "./hello-wasm/tmp.mjs";

const add = instance.exports.add as (a: number, b: number) => number;
//(window as any).instance = instance;
const memory = instance.exports.memory as unknown as ArrayBuffer;

export const [xMin, xMax, yMin, yMax] = [0, 1000, 0, 500];
const xExtent = xMax - xMin;
const yExtent = yMax - yMin;

export type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  ts: number;
  color: string;
};

export type Level = {
  domain: number[],
  elevation: number[],
  created: number,
}

export function genLevel(){
  return {
    elevation: [...Array(20).keys()].map(() => yMin + yExtent * Math.random()),
    domain: [...Array(20).keys()].map(() => xMin + xExtent * Math.random()).sort((a, b) => a - b)
  }
}



function step(ball: Ball, dt: number): Ball {
  let { x, y, dx, dy, ts } = ball;

  if (x < xMin) {
    x = xMax + x;
  } else if (x > xMax) {
    x = x - xMax;
  }

  ts = ts + dt;
  dx = 0.995 * dx;
  dy = 0.995 * dy - 0.08;
  x = add(x, dx);
  y = add(y, dy);

  // bounce
  if (y < yMin) {
    y = yMin + (yMin - y);
    dy = -dy * 0.75;
  }

  return { ...ball, x, y, dx, dy, ts };
}

export function currentPosition(ball: Ball): { x: number; y: number } {
  const now = Date.now();
  if (ball.ts > now) return ball;

  let newBall = ball;
  let i = 0;

  // infinite loops are annoying
  while (i++ < 1000) {
    newBall = step(newBall, 10);

    if (
      newBall.y < 1 &&
      Math.abs(newBall.dy * newBall.dy + newBall.dx * newBall.dx) < 1
    ) {
      // stuck on ground
      return newBall;
    }

    if (newBall.ts > now) {
      // we have reached the present
      return newBall;
    }
  }
  // ran out of simulation steps
  return newBall;
}

export const degreesToVector = (deg: number) => [
  Math.cos((deg * 2 * Math.PI) / 360),
  Math.sin((deg * 2 * Math.PI) / 360),
];
