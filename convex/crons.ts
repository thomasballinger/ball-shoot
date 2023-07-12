import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createBall, setName } from "./golf";

export const cpuMove = internalMutation(async (ctx) => {
  const identifier = "secretCPU";
  const ballId = await createBall(ctx, { color: "red", identifier });
  await setName(ctx, {
    name: "CPU " + Math.ceil(Math.random() * 100),
    identifier,
  });
  ctx.scheduler.runAfter(5000, api.golf.publishStroke, {
    identifier,
    angleInDegrees: Math.random() * 180,
    mightiness: Math.random() * 20,
  });
  ctx.scheduler.runAfter(10000, api.golf.publishStroke, {
    identifier,
    angleInDegrees: Math.random() * 180,
    mightiness: Math.random() * 20,
  });
});

const crons = cronJobs();
crons.interval("CPU move", { seconds: 60 }, internal.crons.cpuMove);
export default crons;
