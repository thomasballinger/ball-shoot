import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// the Ball type used in client code doesn't have an identifier
export type Ball = Omit<Doc<"balls">, "identifier">;

export type Level = Doc<"levels">;

export default defineSchema({
  balls: defineTable({
    ts: v.number(), // Time of last stroke
    x: v.number(), // position and velocity at time of stroke
    y: v.number(),
    dx: v.number(),
    dy: v.number(),
    identifier: v.string(), // secret access token that allows strokes
    color: v.string(),
    strokes: v.number(), // how many int
    updates: v.number(), // setting a ball to resting counts as an update but not a stroke
    name: v.optional(v.string()),
    level: v.id("levels"),
    grounded: v.optional(v.boolean()),
    finished: v.optional(v.boolean()),
  })
    .index("by_level", ["level"])
    .index("by_identifier", ["identifier"]),
  levels: defineTable({
    started: v.number(),
    elevation: v.array(v.number()),
    domain: v.array(v.number()),
    hole: v.object({ x1: v.number(), x2: v.number() }),
  }).index("by_level_start_time", ["started"]),
});
