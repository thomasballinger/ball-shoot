import { Ball, degreesToVector, currentPosition } from "../simulation";
import { query, mutation } from "./_generated/server";
import {instance} from "../hello-wasm/tmp.mjs";
import {Id} from "./_generated/dataModel";

console.log(instance.exports.add)

const add = instance.exports.add as (a: number, b: number) => number;

export const getBalls = query(async ({ db }) => {
  const balls = await db.table("balls").collect();
  return balls.map((b) => {
    // strip out identifiers because these are secret
    const { identifier, ...rest } = b;
    return rest;
  });
});

export const createBall = mutation(({ db }, identifier, color): Id<"balls"> => {
  return db.insert("balls", {
    x: add(10, Math.random() * 200),
    y: 10 + Math.random() * 200,
    dx: 0,
    dy: 0,
    ts: Date.now(),
    color,
    identifier,
  });
});

export const getBall = query(
  async ({ db }, id: Id<"balls"> | null): Promise<Ball | null> => {
    if (!id) return null;
    const ball = await db.get(id);
    if (!ball) return ball;
    const { identifier, ...rest } = ball;
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
    const ball = await db.table("balls").filter(q => q.eq(q.field('identifier'), identifier)).unique();
    if (!ball) {
      throw new Error("Can't find that ball!");
    }
    if (angleInDegrees < -180 || angleInDegrees > 180) {
      throw new Error(
        "Hey it's in degrees, -180 to 180, unit circle style."
      );
    }
    if (mightiness < 0 || mightiness > 20) {
      throw new Error("You can't hit the ball that hard!");
    }

    console.log('angleInDegrees', angleInDegrees);
    let [dx, dy] = degreesToVector(angleInDegrees);
    dx *= mightiness;
    dy *= mightiness;

    const { x, y } = currentPosition(ball);
    const DELAY = 0;
    const newBall = { ...ball, x, y, dx, dy, ts: Date.now() + DELAY };

    db.replace(ball._id, newBall);
  }
);
