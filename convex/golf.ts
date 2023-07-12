import {
  degreesToVector,
  currentPosition,
  generateLevel,
  xMax,
  xMin,
} from "../simulation";
import { query, mutation, DatabaseReader } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const getBalls = query(async ({ db }) => {
  const curLevel = await currentLevel({ db });
  if (curLevel === null) return [];

  const balls = await db
    .query("balls")
    .withIndex("by_level", (q) => q.eq("level", curLevel._id))
    .collect();
  return balls.map((b) => {
    // strip out identifiers because these are secret
    const { identifier, ...rest } = b;
    return rest;
  });
});

function currentLevel({
  db,
}: {
  db: DatabaseReader;
}): Promise<Doc<"levels"> | null> {
  return db
    .query("levels")
    .withIndex("by_level_start_time", (q) => q.gt("started", 0))
    .order("desc")
    .first();
}

// The minimum amount of time before a new level can be created
const ROUND_LENGTH = 10000;

export const createLevel = mutation(
  async ({ db }): Promise<Doc<"levels"> | null> => {
    const curLevel = await currentLevel({ db });
    if (curLevel) {
      const ago = Date.now() - curLevel.started;
      if (ago < ROUND_LENGTH) {
        return null;
      }
    }
    const id = await db.insert("levels", {
      started: Date.now(),
      ...generateLevel(),
    });
    return (await db.get(id))!;
  }
);

export const createBall = mutation({
  args: { identifier: v.string(), color: v.string() },
  handler: async (ctx, { identifier, color }): Promise<Id<"balls">> => {
    const { db } = ctx;
    // fails if there's no level? ick, what do we do here?
    let curLevel = await currentLevel(ctx);
    if (curLevel === null) {
      curLevel = await createLevel(ctx, {});
    }
    if (!curLevel) {
      throw new Error("can't find level but can't create new level");
    }
    // clean up any old balls with this same identifier
    const curBalls = await db
      .query("balls")
      .filter((q) => q.eq(q.field("identifier"), identifier))
      .collect();
    await Promise.all(curBalls.map(({ _id }) => db.delete(_id)));
    return await db.insert("balls", {
      x: 10 + Math.random() * 200,
      y: xMin + ((xMax - xMin) * (1 + Math.random())) / 2,
      dx: 0,
      dy: 0,
      ts: Date.now(),
      color,
      identifier,
      level: curLevel?._id,
      strokes: 0,
      done: false,
    });
  },
});

export const getBall = query(
  async ({ db }, { id }: { id: Id<"balls"> | null }) => {
    if (!id) return null;
    const ball = await db.get(id);
    if (!ball) return ball;
    const { identifier, ...rest } = ball;
    return rest;
  }
);

export const getLevel = query(
  ({ db }): Promise<Doc<"levels"> | null> => {
    return currentLevel({ db });
  }
);

export const publishStroke = mutation(
  async (
    { db },
    {
      identifier,
      angleInDegrees,
      mightiness,
    }: {
      identifier: string;
      angleInDegrees: number;
      mightiness: number;
    }
  ) => {
    if (
      typeof identifier !== "string" ||
      typeof angleInDegrees !== "number" ||
      typeof mightiness !== "number"
    ) {
      throw new Error("bad arg types");
    }
    const ball = await db
      .query("balls")
      .filter((q) => q.eq(q.field("identifier"), identifier))
      .unique();
    if (!ball) {
      throw new Error("Can't find that ball!");
    }
    if (angleInDegrees < -180 || angleInDegrees > 180) {
      throw new Error("Hey it's in degrees, -180 to 180, unit circle style.");
    }
    if (mightiness < 0 || mightiness > 20) {
      throw new Error("You can't hit the ball that hard!");
    }
    const level = await currentLevel({ db });

    let [dx, dy] = degreesToVector(angleInDegrees);
    dx *= mightiness;
    dy *= mightiness;

    const now = Date.now();
    const { x, y } = currentPosition(ball, now, level || undefined);
    const DELAY = 0;
    const newBall = {
      ...ball,
      x,
      y,
      dx,
      dy,
      ts: Date.now() + DELAY,
      strokes: ball.strokes + 1,
    };

    db.replace(ball._id, newBall);
  }
);
