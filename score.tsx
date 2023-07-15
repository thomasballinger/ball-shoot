import { useQuery } from "convex/react";
import { api } from "./convex/_generated/api";

export function Scoreboard() {
  const balls = [...(useQuery(api.golf.getBalls) || [])];
  balls.sort(
    (a, b) => a.strokes - b.strokes + (+!!a.finished - +!!b.finished) * 10000000
  );
  return (
    <ul>
      {balls.map((b) => {
        const color = b.color;
        return (
          <li
            key={b._id}
            style={{ color, fontWeight: b.grounded ? "bold" : "normal" }}
          >
            {b.strokes}
            {b.finished ? "*" : ""} {b.name}
          </li>
        );
      })}
    </ul>
  );
}
