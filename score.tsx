import { useQuery } from "convex/react";
import { api } from "./convex/_generated/api";

export function Scoreboard() {
  const balls = [...(useQuery(api.golf.getBalls) || [])];
  balls.sort((a, b) => a.strokes - b.strokes);
  return (
    <ul>
      {balls.map(({ strokes, name, _id }) => {
        return (
          <li key={_id}>
            {strokes} {name}
          </li>
        );
      })}
    </ul>
  );
}
