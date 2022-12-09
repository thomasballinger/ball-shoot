import { expect, test, describe } from "vitest";
import {
  currentPosition,
  getRelevantLand,
  radius,
  xMax,
  xMin,
  yMax,
  yMin,
} from "../simulation";

function createBall(x = 0, y = 0, dx = 0, dy = 0, ts = 0, color = "blue") {
  const ball = { x, y, dx, dy, ts, color };
  return ball;
}

describe("simulation", () => {
  const ball = createBall();

  test("ball in steady state doesn't change", () => {
    const cur = currentPosition(ball, 0);
    expect(cur.x).toEqual(ball.x);
    expect(cur.y).toEqual(ball.y);
  });

  test("ball in steady state returns itself", () => {
    const cur = currentPosition(ball, 0);
    expect(cur).toBe(ball);
  });

  test("ball when moving does not returns itself", () => {
    const cur = currentPosition(ball, 1);
    expect(cur).not.toBe(ball);
  });

  test("ball falls down", () => {
    const ball = createBall(0, 10);
    const later = currentPosition(ball, 1000);
    expect(later.x).toEqual(0);
    expect(later.y).toBeCloseTo(0 + radius, 0);
  });

  test("ball bounces off of elevation", () => {
    const yMiddle = (yMin + yMax) / 2;
    const flatLevel = {
      domain: [xMin, xMax],
      elevation: [yMiddle, yMiddle],
    };

    const resting = currentPosition(createBall(0, yMax), 10000, flatLevel);
    expect(resting.y).toBeCloseTo(yMiddle + radius, 0);
  });

  test("ball reaches steady state", () => {
    const ball = createBall(0, 100);

    let prev;
    let stable = false;
    // advance 1 frame at a time at 60fps (~17ms)
    for (let i = 1; i < 10000; i = i + 17) {
      const cur = currentPosition(ball, i);
      // uncomment to watch ball bounce
      // console.log(cur.y);
      if (prev && JSON.stringify(prev) === JSON.stringify(cur)) {
        stable = true;
        console.log("stable");
        break;
      }
      prev = cur;
    }
    expect(stable).toBeTruthy();
  });
});

describe("simulation helpers", () => {
  test("getRelevantLand", () => {
    const yMiddle = (yMin + yMax) / 2;
    const xMiddle = (xMin + xMax) / 2;
    const flatLevel = {
      domain: [xMin, xMax],
      elevation: [yMiddle, yMiddle],
    };
    expect(
      getRelevantLand(
        Math.max(xMin, xMiddle - 1),
        Math.min(xMax, xMiddle + 1),
        flatLevel
      )
    ).toEqual([{ x1: xMin, y1: yMiddle, x2: xMax, y2: yMiddle }]);
  });
});
