export const [xMin, xMax, yMin, yMax] = [0, 1000, 0, 500];
export const radius = 10;
const xExtent = xMax - xMin;
const yExtent = yMax - yMin;

export type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  ts: number;
  color: string;
};

export type Level = {
  domain: number[];
  elevation: number[];
};

export function genLevel() {
  // start on the bottom half of the playfield, so that there's more space to play
  const elevations = [Math.random() * yMin + yExtent / 2];
  while (elevations.length < 20) {
    const prev = elevations[elevations.length - 1];
    const elevation = Math.max(
      yMin,
      Math.min(yMax, prev + ((Math.random() - 0.5) * yExtent) / 2)
    );
    elevations.push(elevation);
  }

  return {
    elevation: elevations,
    domain: [0].concat(
      [...Array(19).keys()]
        .map(() => xMin + xExtent * Math.random())
        .sort((a, b) => a - b)
    ),
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

function step(ball: Ball, dt: number): Ball {
  let { x, y, dx, dy, ts } = ball;

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
  dx = 0.995 * dx;
  dy = 0.995 * dy - 0.08;
  const magnitude = Math.sqrt(dx ** 2 + dy ** 2);
  const speedLimit = 100;
  if (magnitude > speedLimit) {
    dx = (dx * speedLimit) / magnitude;
    dy = (dy * speedLimit) / magnitude;
  }

  x = x + dx;
  y = y + dy;

  return { ...ball, x, y, dx, dy, ts };
}

// An optimization: get the relevant 3 or fewer line segments from a level
// to check collisions against.
export function getRelevantLand(
  xMin: number,
  xMax: number,
  level: Level
): { x1: number; y1: number; x2: number; y2: number }[] {
  const domain = [...level.domain, xMax];
  const elevation = [...level.elevation, level.elevation[0]];
  const lineSegments = [];

  for (let i = 1; i < domain.length; i++) {
    const segmentIsRelevant =
      (domain[i - 1] <= xMin && domain[i] >= xMin) ||
      (domain[i - 1] <= xMax && domain[i] >= xMax) ||
      (domain[i - 1] >= xMin && domain[i - 1] <= xMax) ||
      (domain[i] >= xMin && domain[i] <= xMax);
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

// TODO add memoization
export function currentPosition(
  ball: Ball,
  now: number,
  level: Level = { domain: [xMin, xMax], elevation: [yMin, yMin] }
): { x: number; y: number } {
  if (ball.ts >= now) return ball;

  let newBall = ball;
  let i = 0;

  // infinite loops are annoying, give up after 1000 steps
  while (i++ < 1000) {
    newBall = step(newBall, 10);

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
      newBall = { ...newBall, ...bounce(newBall, closestObj!) };
    }

    if (
      toClosest < radius &&
      Math.abs(newBall.dy * newBall.dy + newBall.dx * newBall.dx) < 1
    ) {
      // stuck on ground
      return newBall;
    }

    if (newBall.ts > now) {
      // we have reached the present
      return newBall;
    }
  }
  // ran out of simulation steps
  return newBall;
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
