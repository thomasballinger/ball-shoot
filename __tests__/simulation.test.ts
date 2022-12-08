import { expect, test, describe } from "vitest";
import { currentPosition, yMin } from "../simulation";

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
    expect(later.y).toBeCloseTo(0.613, 3);
  });

  test("ball bounces off the yMin floor", () => {
    const ball = createBall(0, yMin, 0, -1);
    const later = currentPosition(ball, 100);
    expect(later.x).toEqual(ball.x);
    expect(later.y).toBeGreaterThan(ball.y);
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
        break;
      }
      prev = cur;
    }
    expect(stable).toBeTruthy();
  });
});
