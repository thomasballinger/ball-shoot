import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createBall, getBalls, setName } from "./golf";

export const cpuMove = internalMutation(async (ctx) => {
  const num = Math.ceil(Math.random() * 100);
  const identifier = "secretCPU-" + num;
  const balls = await getBalls(ctx, {});
  if (balls.length >= 4) return;
  await createBall(ctx, { color: "red", identifier });
  await setName(ctx, {
    name: "CPU " + num,
    identifier,
  });
  for (const delay of [5000, 10000, 15000, 20000, 25000, 30000]) {
    ctx.scheduler.runAfter(delay, api.golf.publishStroke, {
      identifier,
      angleInDegrees: Math.random() * 180,
      mightiness: Math.random() * 20,
    });
  }
});

const crons = cronJobs();
crons.interval("CPU move", { seconds: 60 }, internal.crons.cpuMove);
export default crons;
