export const [xMin, xMax, yMin, yMax] = [0, 1200, 0, 600];
export const radius = 6;
const xExtent = xMax - xMin;
const yExtent = yMax - yMin;

export type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  ts: number;
};

type BallWithIdentity = Ball & {
  _id: string;
  updates: number;
};

export type Level = {
  domain: number[];
  elevation: number[];
  hole: { x1: number; x2: number };
};

export function generateLevel(): Level {
  const numSegments = 50;
  const elevations = [Math.random() * yMin + yExtent / 2];
  while (elevations.length < numSegments) {
    const prev = elevations[elevations.length - 1];
    const prevDelta = prev - (elevations[elevations.length - 2] || prev);
    const elevation = Math.max(
      yMin,
      Math.min(
        yMin + yExtent / 2,
        prev + (prevDelta + (Math.random() * 2 - 1) * 30)
      )
    );
    elevations.push(elevation);
  }

  const domain = [0].concat(
    [...Array(numSegments - 1).keys()]
      .map(() => xMin + xExtent * Math.random())
      .sort((a, b) => a - b)
  );

  let hole;
  {
    // add a hole in somewhere in the second half-ish
    const holeIndex = Math.floor(
      numSegments / 2 + Math.random() * numSegments * (4 / 9)
    );

    const toReplace =
      domain.findIndex(
        (x, i) => i > holeIndex && x > domain[holeIndex] + radius * 3 + 0.2
      ) - holeIndex;
    domain.splice(
      holeIndex,
      toReplace,
      domain[holeIndex],
      domain[holeIndex] + 0.1,
      domain[holeIndex] + radius * 3 + 0.1,
      domain[holeIndex] + radius * 3 + 0.2
    );
    elevations.splice(
      holeIndex,
      toReplace,
      elevations[holeIndex],
      elevations[holeIndex] - radius * 2.5,
      elevations[holeIndex] - radius * 2.5,
      elevations[holeIndex]
    );
    hole = { x1: domain[holeIndex + 1], x2: domain[holeIndex + 4] };

    // bump everything up a bit
    elevations.forEach((e, i, arr) => {
      arr[i] = (e / (yExtent + radius * 3)) * yExtent + radius * 3;
    });
  }

  return {
    domain,
    elevation: elevations,
    hole,
  };
}

export function groundLines(level: Level) {
  const lines = level.domain.slice(0, -1).map((x1, i) => {
    const x2 = level.domain[i + 1];
    const y1 = level.elevation[i];
    const y2 = level.elevation[i + 1];
    return { x1, x2, y1, y2 };
  });
  const last = lines[lines.length - 1];
  lines.push({ x1: last.x2, y1: last.y2, x2: xMax, y2: lines[0].y1 });
  return lines;
}

export function elevationAtX(level: Level, x: number): number {
  const domain = [...level.domain, xMax];
  const elevation = [...level.elevation, level.elevation[0]];

  for (let i = 1; i < domain.length; i++) {
    if (domain[i - 1] <= x && x <= domain[i]) {
      return (
        elevation[i - 1] +
        ((elevation[i] - elevation[i - 1]) * (x - domain[i - 1])) /
          (domain[i] - domain[i - 1])
      );
    }
  }
  return 0;
}

function step(ball: Ball, dt: number): Ball {
  let { x, y, dx, dy, ts } = ball;

  // wrap around edges horizontally
  if (x < xMin) {
    x = xMax + x;
  } else if (x > xMax) {
    x = x - xMax;
  }

  // fall through floor to top
  if (y < yMin) {
    y = yMax + y;
  }

  ts = ts + dt;
  // drag
  dx = 0.995 * dx;
  dy = 0.995 * dy - 0.08;

  x = x + dx;
  y = y + dy;

  return { ...ball, x, y, dx, dy, ts };
}

// An optimization: get the relevant 3 or fewer line segments from a level
// to check collisions against.
export function getRelevantLand(
  left: number,
  right: number,
  level: Level
): { x1: number; y1: number; x2: number; y2: number }[] {
  //const { domain, elevation } = level;
  const domain = [...level.domain, xMax];
  const elevation = [...level.elevation, level.elevation[0]];
  const lineSegments = [];

  for (let i = 1; i < domain.length; i++) {
    const segmentIsRelevant =
      (domain[i - 1] <= left && domain[i] >= left) ||
      (domain[i - 1] <= right && domain[i] >= right) ||
      (domain[i - 1] >= left && domain[i - 1] <= right) ||
      (domain[i] >= left && domain[i] <= right);
    if (segmentIsRelevant) {
      lineSegments.push({
        x1: domain[i - 1],
        y1: elevation[i - 1],
        x2: domain[i],
        y2: elevation[i],
      });
    }
  }
  return lineSegments;
}

const dt = 10;

export function restingPosition(
  ball: Ball,
  level: Level = {
    domain: [xMin, xMax],
    elevation: [yMin, yMin],
    hole: { x1: -10000, x2: -10000 },
  }
) {
  return currentPosition(ball, Infinity, level);
}

// Time never flows backwards, so the thing to cache is always the last time before now.
// Or infinity, that could be useful too.
const memory: Map<
  string,
  BallWithIdentity & { isInHole: boolean; isStuckOnGround: boolean }
> = new Map();
if (typeof window !== "undefined") {
  (window as any).memory = memory;
}

export function currentPosition(
  ball: Ball & {
    _id?: string;
    updates?: number;
    grounded?: boolean;
    finished?: boolean;
  },
  now: number,
  level: Level = {
    domain: [xMin, xMax],
    elevation: [yMin, yMin],
    hole: { x1: -10000, x2: -10000 },
  }
): {
  x: number;
  y: number;
  ts: number;
  isInHole: boolean;
  isStuckOnGround: boolean;
} {
  if (ball.ts >= now)
    return { ...ball, isInHole: false, isStuckOnGround: false };

  if (ball.finished) return { ...ball, isInHole: true, isStuckOnGround: true };
  if (ball.grounded) return { ...ball, isInHole: false, isStuckOnGround: true };

  let newBall = ball;

  if (ball._id && typeof ball.updates === "number") {
    const saved = memory.get(ball._id);
    if (saved && ball.updates === saved.updates) {
      if (saved.ts > now) {
        console.log("saved:", saved);
        console.log("ball:", ball);
        console.warn("saved state has larger ts than current time (?)");
      }
      const { x, y, dx, dy, ts, isInHole, isStuckOnGround } = saved;
      if (ts > now) {
        console.log("CACHE HIT: ran no steps");
        return { x, y, ts, isInHole, isStuckOnGround };
      }
      newBall = { x, y, ts, dx, dy };
    }
  }

  let i = 0;

  // infinite loops are annoying, give up after 1000 steps
  while (i++ < 1000) {
    // step always returns a new ball object
    const prev = newBall;
    newBall = step(newBall, dt);

    // TODO check if line betwen previous position and new position crosses *through* any of them
    let toClosest = Infinity;
    let closestObj:
      | { x1: number; y1: number; x2: number; y2: number }
      | { x: number; y: number };
    const lines = getRelevantLand(
      newBall.x - radius,
      newBall.x + radius,
      level
    );
    for (const line of lines) {
      const [pointOrLine, dist] = pointFromLineSegment(newBall, line);
      if (dist < toClosest) {
        toClosest = dist;
        closestObj = pointOrLine;
      }
    }

    if (toClosest < radius) {
      const { dx, dy } = bounce(newBall, closestObj!);
      newBall = { ...prev, dx: dx * 0.76, dy: dy * 0.76 };
    }

    if (
      toClosest < radius &&
      Math.abs(newBall.dy * newBall.dy + newBall.dx * newBall.dx) < 1
    ) {
      // stuck on ground
      const ret = {
        ...newBall,
        isStuckOnGround: true,
        isInHole: level.hole.x1 < ball.x && ball.x < level.hole.x2,
      };
      if (ball._id && typeof ball.updates === "number") {
        memory.set(ball._id, { ...ret, _id: ball._id, updates: ball.updates });
      }
      console.log("had to run", i, "steps for", ball);
      return ret;
    }

    if (newBall.ts > now) {
      // we have reached the present
      const ret = { ...newBall, isInHole: false, isStuckOnGround: false };
      if (ball._id && typeof ball.updates === "number") {
        memory.set(ball._id, { ...ret, _id: ball._id, updates: ball.updates });
      }
      console.log("had to run", i, "steps for", ball);
      return ret;
    }
  }
  // ran out of simulation steps
  return { ...newBall, isInHole: false, isStuckOnGround: false };
}

export const degreesToVector = (deg: number) => [
  Math.cos((deg * 2 * Math.PI) / 360),
  Math.sin((deg * 2 * Math.PI) / 360),
];

export function pointToLine(
  { x, y }: { x: number; y: number },
  { x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }
) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq != 0)
    //in case of 0 length line
    param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function bounce(
  { x, y, dx, dy }: { x: number; y: number; dx: number; dy: number },
  lineOrPoint:
    | { x1: number; y1: number; x2: number; y2: number }
    | { x: number; y: number }
) {
  var normal;
  if ("x" in lineOrPoint) {
    const point = lineOrPoint;
    // for bouncing off of a point, normal is from point to ball
    normal = normalize(x - point.x, y - point.y);
  } else {
    const line = lineOrPoint;
    var xDiff = line.x2 - line.x1;
    var yDiff = line.y2 - line.y1;
    normal = normalize(-yDiff, xDiff);
  }
  const dot = dx * normal[0] + dy * normal[1];
  const reflected = {
    dx: dx - 2 * dot * normal[0],
    dy: dy - 2 * dot * normal[1],
  };
  return reflected;
}

function normalize(dx: number, dy: number) {
  var magnitude = Math.sqrt(dx * dx + dy * dy);
  return [dx / magnitude, dy / magnitude];
}

/** Returns closest line or point and distance to it */
function pointFromLineSegment(
  point: { x: number; y: number },
  line: { x1: number; y1: number; x2: number; y2: number }
): [
  { x: number; y: number } | { x1: number; y1: number; x2: number; y2: number },
  number
] {
  function dist2(
    { x: x1, y: y1 }: { x: number; y: number },
    { x: x2, y: y2 }: { x: number; y: number }
  ) {
    return (x1 - x2) ** 2 + (y1 - y2) ** 2;
  }
  const p0 = point;
  const { x, y } = point;
  const { x1, y1, x2, y2 } = line;
  const p1 = { x: x1, y: y1 };
  const p2 = { x: x2, y: y2 };
  var lengthSquared = dist2(p1, p2);
  if (lengthSquared === 0) return [p1, dist2(p0, p1)];
  let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const dist = Math.sqrt(
    dist2(p0, { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) })
  );
  const obj = t === 0 ? p1 : t === 1 ? p2 : line;
  return [obj, dist];
}
