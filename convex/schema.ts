import { defineSchema, defineTable, s } from "convex/schema";

export default defineSchema({
  balls: defineTable({
    ts: s.number(),
    x: s.number(),
    y: s.number(),
    dx: s.number(),
    dy: s.number(),
    identifier: s.string(),
    color: s.string(),
  }),
});
