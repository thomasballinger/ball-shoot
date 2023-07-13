import {
  degreesToVector,
  currentPosition,
  generateLevel,
  xMax,
  xMin,
} from "../simulation";
import {
  query,
  mutation,
  DatabaseReader,
  internalMutation,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const setName = mutation({
  args: { name: v.string(), identifier: v.string() },
  handler: async (ctx, { name, identifier }) => {
    const ball = (await ctx.db
      .query("balls")
      .withIndex("by_identifier")
      .filter((q) => q.eq(q.field("identifier"), identifier))
      .unique())!;
    ball.name = name;
    await ctx.db.replace(ball._id, ball);
  },
});

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

async function ballsForLevel(db: DatabaseReader, levelId: Id<"levels">) {
  const balls = await db
    .query("balls")
    .withIndex("by_level", (q) => q.eq("level", levelId))
    .collect();
  return balls;
}

export const createLevel = mutation(
  async ({ db }): Promise<Doc<"levels"> | null> => {
    const curLevel = await currentLevel({ db });
    if (curLevel) {
      const now = Date.now();
      const timeUp = now - curLevel.started > ROUND_LENGTH;
      const balls = await ballsForLevel(db, curLevel._id);
      if (!timeUp) {
        const inHoles = balls.map(
          (b) => currentPosition(b, now, curLevel).isInHole
        );
        const oneIn = inHoles.some((x) => x);
        const allIn = inHoles.every((x) => x);
        if (!allIn) return null;
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

export const getLevel = query(({ db }): Promise<Doc<"levels"> | null> => {
  return currentLevel({ db });
});

export const publishStroke = mutation({
  args: {
    identifier: v.string(),
    angleInDegrees: v.number(),
    mightiness: v.number(),
  },
  handler: async ({ db }, { identifier, angleInDegrees, mightiness }) => {
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
  },
});

export const updateBall = internalMutation(
  async (ctx, { ballId }: { ballId: Id<"balls"> }) => {
    const ball = await ctx.db.get(ballId)!;
    if (!ball) throw new Error("bad id " + ballId);
    const level = await ctx.db.get(ball.level);

    // TODO
  }
);
