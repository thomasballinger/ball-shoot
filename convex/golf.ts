import { Id } from "convex/values";
import { Ball, degreesToVector, currentPosition } from "../simulation";
import { query, mutation } from "./_generated/server";
import {instance} from "../hello-wasm/tmp.mjs";
console.log(instance.exports.add)

export const getBalls = query(async ({ db }) => {
  const balls = await db.table("balls").collect();
  console.log(instance.exports.add)
  console.log(instance.exports.add(1, 2));
  return balls.map((b) => {
    // strip out identifiers because these are secret
    const { identifier, ...rest } = b;
    return rest;
  });
});

export const createBall = mutation(({ db }, identifier, color): Id => {
  return db.insert("balls", {
    x: 10 + Math.random() * 200,
    y: 10 + Math.random() * 200,
    dx: 0,
    dy: 0,
    ts: Date.now(),
    color,
    identifier,
  });
});

export const getBall = query(
  async ({ db }, id: Id | null): Promise<Ball | null> => {
    if (!id) return null;
    const { identifier, ...rest } = await db.get(id);
    return rest;
  }
);

export const publishStroke = mutation(
  async (
    { db },
    identifier: string,
    angleInDegrees: number,
    mightiness: number
  ) => {
    if (
      typeof identifier !== "string" ||
      typeof angleInDegrees !== "number" ||
      typeof mightiness !== "number"
    ) {
      throw new Error("bad arg types");
    }
    let balls = await db.table("balls").collect();
    const [ball] = balls.filter((b) => b.identifier === identifier);
    if (!ball) {
      throw new Error("Can't find that ball!");
    }
    if (angleInDegrees < -90 || angleInDegrees > 90) {
      throw new Error(
        "Hey it's in degrees, 90 means straight right, 0 means straight up."
      );
    }
    if (mightiness < 0 || mightiness > 20) {
      throw new Error("You can't hit the ball that hard!");
    }

    let [dx, dy] = degreesToVector(angleInDegrees);
    dx *= mightiness;
    dy *= mightiness;

    const { x, y } = currentPosition(ball);
    const DELAY = 0;
    const newBall = { ...ball, x, y, dx, dy, ts: Date.now() + DELAY };

    db.replace(ball._id, newBall);
  }
);
