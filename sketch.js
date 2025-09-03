/**
 * Soroban (Abacus) Clock in p5.js
 * -----------------------------------------
 * HOW THIS CLOCK WORKS:
 * - Each vertical column of beads = one decimal digit.
 * - The clock converts the current time into digits (HH:MM or HH:MM:SS).
 * - It then displays those digits on a soroban-style abacus:
 *    Heaven bead (top, worth 5) moves down to the beam when active.
 *    Earth beads (bottom 4, each worth 1) move up to the beam when active.
 * - The bead positions "ease" smoothly toward their targets, so they appear
 *   to slide/flow like a real abacus being manipulated.
 * - The minute value is logged to the JavaScript console when it changes
 *   (this was a requirement of the assignment).
 *
 * HOW A SOROBAN ABACUS IS READ:
 * - One rod = one digit.
 * - Heaven bead touching the beam = +5.
 * - Each Earth bead touching the beam = +1.
 * - Example: Heaven down + 2 Earth up = 7.
 * - Together, rods form multi-digit numbers.
 *
 * MY PROCESS / ACKNOWLEDGEMENT:
 * - I used a generative AI model to help write and debug the p5.js code structure.
 * - Then I researched the Japanese soroban abacus specifically, to understand
 *   how heaven and earth beads should be placed and how they represent numbers.
 * - I customized the colors and styling so the beads look like real wooden beads
 *   and the rods/beam match the look of an authentic abacus.
 * - This way the visualization is not only functional as a clock, but also
 *   aesthetically aligned with the physical object it references.
 */

// Settings
const SHOW_SECONDS = true;   // true = show HH:MM:SS, false = HH:MM
const USE_12_HOUR  = true;   // true = 12-hour clock, false = 24-hour

// Theme: colors chosen to resemble real abacus wood/metal
const THEME = {
  bg:        '#0e1014', // dark background
  rod:       '#6f7a92', // grey-blue rods
  beam:      '#3a2e1f', // dark brown central beam
  bead:      '#8c6239', // warm wood bead
  beadStroke:'#3f2b18'  // darker outline for depth
};

let _madeCanvas = false;
let prevMinute = -1;
let dims, cols = [];

function setup() {
  createOrResize();
  angleMode(DEGREES);
  initSoroban();
}

function windowResized() {
  createOrResize();
  initSoroban();
}

// Creates the canvas once, resizes it on window resize
function createOrResize() {
  const w = Math.min(windowWidth - 24, 1100);
  const h = Math.min(windowHeight - 24, 700);
  if (!_madeCanvas) {
    createCanvas(w, h);
    pixelDensity(2);
    _madeCanvas = true;
  } else {
    resizeCanvas(w, h);
  }
}

// Initialize soroban digits (rods)
function initSoroban() {
  dims = computeDims();
  cols = [];
  const count = SHOW_SECONDS ? 6 : 4; // 2 rods per time unit (HH, MM, SS)
  for (let i = 0; i < count; i++) {
    const x = dims.margin + i * dims.spacing;
    cols.push(new SorobanDigit(x, dims.top, dims.height, dims.beadR));
  }
}

// Calculate positions for beam, rods, beads
function computeDims() {
  const W = width, H = height;
  const count = SHOW_SECONDS ? 6 : 4;
  const margin = W * 0.08;
  const spacing = (W - 2 * margin) / (count - 1);

  const heightAbacus = H * 0.74;
  const top = (H - heightAbacus) / 2;

  const beadR = Math.min(W, H) * 0.028;
  const topLimit = top + beadR;
  const botLimit = top + heightAbacus - beadR;

  const beamY = top + heightAbacus * 0.40;

  // Heaven bead positions
  const heavenRestY   = Math.max(topLimit, top + heightAbacus * 0.18);
  const heavenActiveY = beamY - beadR - 2;

  // Earth bead positions
  const earthGap        = 2.4 * beadR;
  const earthActiveTopY = beamY + beadR + 2;          // active = near beam
  const earthRestTopY   = botLimit - 3 * earthGap;    // rest = bottom stack

  return {
    W, H, margin, spacing, top, height: heightAbacus, beadR,
    topLimit, botLimit,
    beamY, heavenRestY, heavenActiveY,
    earthGap, earthActiveTopY, earthRestTopY
  };
}

function draw() {
  background(THEME.bg);
  drawShelf();

  // Current time
  const rawHr = hour();
  const mn = minute();
  const sc = second();

  // Log minute changes
  if (mn !== prevMinute) {
    console.log('[Abacus Clock] Minute changed →', mn);
    prevMinute = mn;
  }

  // Adjust for 12-hour display if needed
  const displayHr = USE_12_HOUR ? ((rawHr % 12) || 12) : rawHr;

  // Build digit string: e.g. "093045" for 9:30:45
  const digitsStr = SHOW_SECONDS
    ? nf(displayHr, 2) + nf(mn, 2) + nf(sc, 2)
    : nf(displayHr, 2) + nf(mn, 2);

  // Update each abacus column
  for (let i = 0; i < cols.length; i++) {
    cols[i].setDigit(int(digitsStr[i]));
    cols[i].updateAndDraw();
  }
}

// Draw beam + rails to make abacus frame
function drawShelf() {
  noStroke();
  fill(255, 255, 255, 12);
  rect(0, dims.beamY - dims.beadR * 3.5, width, dims.beadR * 7.0);

  fill(THEME.beam);
  rect(0, dims.beamY - dims.beadR * 0.45, width, dims.beadR * 0.9);

  fill(255, 255, 255, 8);
  rect(0, dims.top - dims.beadR * 0.9, width, dims.beadR * 0.9);
  rect(0, dims.top + dims.height, width, dims.beadR * 0.9);
}

/**
 * SorobanDigit class
 * ------------------
 * Represents one vertical rod (digit) of the abacus.
 * Each has:
 *  - 1 heaven bead (worth 5)
 *  - 4 earth beads (worth 1 each)
 *
 * setDigit(d):
 *   Moves beads into correct "active" or "rest" positions.
 *
 * updateAndDraw():
 *   Smoothly eases beads toward target positions.
 *   Enforces spacing so beads don't overlap.
 *   Draws beads with wood-like shading for realism.
 */
class SorobanDigit {
  constructor(x, top, colH, r) {
    this.x = x;
    this.top = top;
    this.colH = colH;
    this.r = r;

    this.rodX = x;
    this.rodColor = THEME.rod;

    // current positions
    this.hy = dims.heavenRestY;
    this.ey = [
      dims.earthRestTopY + 0 * dims.earthGap,
      dims.earthRestTopY + 1 * dims.earthGap,
      dims.earthRestTopY + 2 * dims.earthGap,
      dims.earthRestTopY + 3 * dims.earthGap
    ];

    this.hyT = this.hy;
    this.eyT = [...this.ey];

    this.ease = 0.25;     // smoothing factor
    this.snapEps = 0.01;
    this.minGap = 2.0 * this.r;
    this.value = -1;
  }

  setDigit(d) {
    d = constrain(d, 0, 9);
    if (d === this.value) return;
    this.value = d;

    // Heaven bead target
    this.hyT = (d >= 5) ? dims.heavenActiveY : dims.heavenRestY;

    // Earth bead targets
    const k = d % 5; // number of active earth beads
    for (let i = 0; i < 4; i++) {
      if (i < k) {
        this.eyT[i] = dims.earthActiveTopY + i * dims.earthGap;
      } else {
        this.eyT[i] = dims.earthRestTopY  + i * dims.earthGap;
      }
    }
  }

  updateAndDraw() {
    // draw rod
    stroke(this.rodColor);
    strokeWeight(Math.max(2, this.r * 0.4));
    line(this.rodX, this.top, this.rodX, this.top + this.colH);

    // ease beads toward targets
    this.hy = lerp(this.hy, this.hyT, this.ease);
    for (let i = 0; i < 4; i++) {
      this.ey[i] = lerp(this.ey[i], this.eyT[i], this.ease);
    }

    // snap near targets
    if (Math.abs(this.hy - this.hyT) < this.snapEps) this.hy = this.hyT;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(this.ey[i] - this.eyT[i]) < this.snapEps) this.ey[i] = this.eyT[i];
    }

    // enforce spacing
    this.enforceSpacing();

    // draw beads
    this.drawBead(this.x, this.hy);      // heaven bead
    for (let i = 0; i < 4; i++) this.drawBead(this.x, this.ey[i]); // earth beads
  }

  enforceSpacing() {
    const minY0 = dims.topLimit;
    const maxY3 = dims.botLimit;

    for (let i = 1; i < 4; i++) {
      if (this.ey[i] < this.ey[i - 1] + this.minGap) {
        this.ey[i] = this.ey[i - 1] + this.minGap;
      }
    }

    this.ey[0] = constrain(this.ey[0], minY0, maxY3 - 3 * this.minGap);
    this.ey[1] = constrain(this.ey[1], minY0 + 1 * this.minGap, maxY3 - 2 * this.minGap);
    this.ey[2] = constrain(this.ey[2], minY0 + 2 * this.minGap, maxY3 - 1 * this.minGap);
    this.ey[3] = constrain(this.ey[3], minY0 + 3 * this.minGap, maxY3);

    for (let i = 0; i < 4; i++) {
      this.ey[i] = lerp(this.ey[i], this.eyT[i], 0.06);
    }
  }

  drawBead(cx, cy) {
    const w = 2.8 * this.r, h = 2.0 * this.r;
    const x0 = cx - w / 2, y0 = cy - h / 2;

    // wooden bead fill
    noStroke();
    fill(THEME.bead);
    rect(x0, y0, w, h, h / 2);

    // outline
    stroke(THEME.beadStroke);
    strokeWeight(Math.max(1, this.r * 0.18));
    noFill();
    rect(x0, y0, w, h, h / 2);

    // highlight and shadow to make bead look 3D
    noStroke();
    fill(255, 255, 255, 22);
    rect(x0, y0, w, h * 0.38, h / 2);
    fill(0, 0, 0, 28);
    rect(x0, y0 + h * 0.55, w, h * 0.45, h / 2);
  }
}