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
import { DataModel, Doc, Id, TableNames } from "./_generated/dataModel";
import { v } from "convex/values";
import { QueryCtx } from "convex/server";
import { internal } from "./_generated/api";

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
const ROUND_LENGTH = 20000;

async function ballsForLevel(db: DatabaseReader, levelId: Id<"levels">) {
  const balls = await db
    .query("balls")
    .withIndex("by_level", (q) => q.eq("level", levelId))
    .collect();
  return balls;
}

export function canGoToNextLevel(
  now: number,
  balls: Doc<"balls">[],
  level: Doc<"levels">
) {
  const timeUp = now - level.started > ROUND_LENGTH;
  const oneIn = balls.some((x) => x.finished);
  return timeUp || oneIn;
}

export const createLevel = mutation(
  async ({ db }): Promise<Doc<"levels"> | null> => {
    const curLevel = await currentLevel({ db });
    if (curLevel) {
      const now = Date.now();
      const balls = await ballsForLevel(db, curLevel._id);
      if (!canGoToNextLevel(now, balls, curLevel)) {
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
  args: {
    identifier: v.string(),
    color: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { identifier, color, name }): Promise<Id<"balls">> => {
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

    const ball: Omit<Doc<"balls">, "_id" | "_creationTime"> = {
      x: 10 + Math.random() * 200,
      y: xMin + ((xMax - xMin) * (1 + Math.random())) / 2,
      dx: 0,
      dy: 0,
      ts: Date.now(),
      color,
      identifier,
      level: curLevel?._id,
      strokes: 0,
      updates: 0,
      finished: false,
      grounded: false,
    };
    if (name) {
      ball.name = name;
    }
    const id = await db.insert("balls", ball);
    const eventualPosition = currentPosition(ball, Infinity, curLevel);
    await ctx.scheduler.runAt(eventualPosition.ts, internal.golf.updateBall, {
      ballId: id,
      lastUpdate: 0,
    });
    return id;
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
  handler: async (
    { db, scheduler },
    { identifier, angleInDegrees, mightiness }
  ) => {
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
    if (!level) throw new Error("no current level");

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
      updates: ball.updates + 1,
      finished: false,
      grounded: false,
    };

    await db.replace(ball._id, newBall);

    const eventualPosition = currentPosition(newBall, Infinity, level);
    scheduler.runAt(eventualPosition.ts, internal.golf.updateBall, {
      ballId: newBall._id,
      lastUpdate: newBall.updates,
    });
  },
});

/** Once the ball has come to rest, update
 * This causes the state state queries to update and is friendlier to clients,
 * which no longer need to run simulation steps to place the ball.
 */
export const updateBall = internalMutation(
  async (
    ctxOrig,
    { ballId, lastUpdate }: { ballId: Id<"balls">; lastUpdate: number }
  ) => {
    // TODO check to see if the last stoke number
    const ctx = augment(ctxOrig);
    const ball = await ctx.db.get(ballId)!;
    if (!ball) throw new Error("bad id " + ballId);
    if (lastUpdate !== ball.updates) {
      // another stroke acted on this ball in the meantime, this scheduled update is bad
      console.log(
        "not updating because last update:",
        lastUpdate,
        "current update",
        ball.updates
      );
      return;
    }
    const level = await ctx.db.getOrThrow(ball.level);
    const eventualPosition = currentPosition(ball, Infinity, level);
    if (!eventualPosition.isStuckOnGround) {
      // TODO if this happens, just drop the ball right there in the simulation.
      // A good property of a simulation is that is runs predictably, sacrificing
      // accuracy.
      throw new Error("Simulation took too many steps, ball didn't stop");
    }
    const { x, y, ts, isInHole, isStuckOnGround } = eventualPosition;
    await ctx.db.patch(ball._id, {
      x,
      y,
      ts,
      dx: 0,
      dy: 0,
      updates: ball.updates + 1,
      grounded: isStuckOnGround,
      finished: isInHole,
    });
  }
);
// TODO update are separate from strokes

function augment<T extends QueryCtx<DataModel>>(ctx: T) {
  return {
    ...ctx,
    db: {
      ...ctx.db,
      async getOrThrow<TableName extends TableNames>(id: Id<TableName>) {
        const x = await ctx.db.get(id);
        if (!x) throw new Error("No record exists with id " + id);
        return x;
      },
    },
  };
}
