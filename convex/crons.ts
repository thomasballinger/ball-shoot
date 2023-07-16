import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createBall, getBalls, setName } from "./golf";

export const cpuMove = internalMutation(
  async (ctx, { identifier }: { identifier: string }) => {
    const ball = (await ctx.db
      .query("balls")
      .withIndex("by_identifier")
      .filter((q) => q.eq(q.field("identifier"), identifier))
      .unique())!;
    if (!ball.finished) {
      ctx.scheduler.runAfter(0, api.golf.publishStroke, {
        identifier,
        angleInDegrees: Math.random() * 180,
        mightiness: Math.random() * 20,
      });
      const delay = Math.floor(5000 + Math.random() * 5000);
      ctx.scheduler.runAfter(delay, internal.crons.cpuMove, { identifier });
    }
  }
);

export const createCpu = internalMutation(async (ctx) => {
  const num = Math.ceil(Math.random() * 100);
  const identifier = "secretCPU-" + num;
  const balls = await getBalls(ctx, {});
  if (balls.length >= 4) return;
  const cpuColor = [
    "crimson",
    "deeppink",
    "hotpink",
    "lightcoral",
    "lightpink",
    "magenta",
    "mediumvioletred",
    "orchid",
    "pink",
    "plum",
    "salmon",
    "tomato",
  ];
  const color = cpuColor[Math.floor(Math.random() * cpuColor.length)];

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
  const name = names[Math.floor(Math.random() * names.length)];

  await createBall(ctx, { color, identifier });
  await setName(ctx, {
    name: "CPU " + num,
    identifier,
  });
  ctx.scheduler.runAfter(7000, internal.crons.cpuMove, {
    identifier,
  });
});

const crons = cronJobs();
crons.interval("CPU move", { seconds: 60 }, internal.crons.createCpu);
export default crons;
