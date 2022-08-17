use wasm_bindgen::{prelude::*, convert::FromWasmAbi};

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}
    
#[wasm_bindgen]
pub fn add(a: f64, b: f64) -> f64 {
    a + b
}

const xMin: f64 = 0.0;
const xMax: f64 = 1000.0;
const yMin: f64 = 0.0;
const yMax: f64 = 500.0;


pub struct Ball {
    pub x: f64,
    pub y: f64,
    dx: f64,
    dy: f64,
    ts: f64,
}

pub fn step(mut ball: Ball, dt: f64) -> Ball {
    let Ball{mut x, mut y, mut dx, mut dy, mut ts } = ball;

    if x < xMin || x > xMax {
        ball.x = f64::min(xMax, f64::max(xMin, x));
        return ball;
    }

    ts = ts + dt;
    dx = 0.99 * dx;
    dy = 0.99 * dy - 0.05;
    x = x + dx;
    y = y + dy;

    // bounce
    if y < yMin {
        y = yMin + (yMin - y);
        dy = -dy * 0.7;
    }

    Ball { x, y, dx, dy, ts, ..ball }
}
  