import { Ball, degreesToVector, currentPosition, genLevel } from "../simulation";
import { query, mutation, DatabaseReader } from "./_generated/server";
import {instance} from "../hello-wasm/tmp.mjs";
import {Document, Id} from "./_generated/dataModel";

const add = instance.exports.add as (a: number, b: number) => number;

export const getBalls = query(async ({ db }) => {
  const curLevel = await currentLevel({db});
  if (curLevel === null) return [];

  const balls = await db.table("balls").index("by_level").range(q => q.eq("level", curLevel._id)).collect();
  return balls.map((b) => {
    // strip out identifiers because these are secret
    const { identifier, ...rest } = b;
    return rest;
  });
});

async function currentLevel({db} : {db: DatabaseReader}): Promise<Document<"levels"> | null> {
  const results = await db.table("levels").index("by_level_start_time").range(q => q.gt("started", 0)).collect();
  return results[results.length - 1] || null;
}

// The minimum amount of time before a new level can be created
const ROUND_LENGTH = 10000;

export const createLevel = mutation(async ({ db }): Promise<Document<"levels"> | null> => {
  const curLevel = await currentLevel({db});
  if (curLevel) {
    const ago = Date.now() - curLevel.started;
    if (ago < ROUND_LENGTH) {
      return null;
    }
  }
  const id = db.insert("levels", {
    started: Date.now(),
    ...genLevel()
  });
  const val = (await db.get(id))!;
  return val;
});

export const createBall = mutation(async (ctx, identifier, color): Promise<Id<"balls">> => {
  const {db} = ctx;
  // fails if there's no level? ick, what do we do here?
  let curLevel = await currentLevel(ctx);
  if (curLevel === null) {
    curLevel = await createLevel(ctx);
  }
  if (!curLevel) {
    return null as any;
    throw new Error("can't find level but can't create new level");
  }
  return db.insert("balls", {
    x: add(10, Math.random() * 200),
    y: 10 + Math.random() * 200,
    dx: 0,
    dy: 0,
    ts: Date.now(),
    color,
    identifier,
    level: curLevel?._id
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

export const getLevel = query(
  ({ db }): Promise<Document<"levels"> | null> => {
    return currentLevel({db});
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

    let [dx, dy] = degreesToVector(angleInDegrees);
    dx *= mightiness;
    dy *= mightiness;

    const { x, y } = currentPosition(ball);
    const DELAY = 0;
    const newBall = { ...ball, x, y, dx, dy, ts: Date.now() + DELAY };

    db.replace(ball._id, newBall);
  }
);
