import { defineSchema, defineTable, s } from "convex/schema";
import {Document} from "./_generated/dataModel";

// the Ball type used in client code doesn't have an identifier
export type Ball = Omit<Document<"balls">, "identifier">;

export type Level = Document<"levels">;

export default defineSchema({
  balls: defineTable({
    ts: s.number(),
    x: s.number(),
    y: s.number(),
    dx: s.number(),
    dy: s.number(),
    identifier: s.string(),
    color: s.string(),
    level: s.id("levels")
  }).index("by_level", ["level"]),
  levels: defineTable({
    started: s.number(),
    elevation: s.array(s.number()),
    domain: s.array(s.number()),
  }).index("by_level_start_time", ["started", "_creationTime"])
});
