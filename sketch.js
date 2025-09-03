/**
 * p5.js — Soroban (Abacus) Clock — aligned beads (fixed)
 * - Earth beads indexed TOP→BOTTOM
 * - Rest stack computed from bottom rail so the last bead lines up
 * - Constraint keeps min spacing; no overlaps/crossing while flowing
 */

const SHOW_SECONDS = true;   // set false for HH:MM only
const USE_12_HOUR  = true;   // set false for 24-hour

const THEME = {
  bg:        '#0e1014',
  rod:       '#6f7a92',
  beam:      '#3a2e1f',
  bead:      '#8c6239',
  beadStroke:'#3f2b18',
  accent:    '#9aa3ff',
  label:     '#e6ebf7',
  labelDim:  '#93a0ff'
};

let _madeCanvas = false;
let prevMinute = -1;
let dims, cols = [];

function setup() {
  createResponsiveCanvas();
  angleMode(DEGREES);
  initSoroban();
}

function windowResized() {
  createResponsiveCanvas();
  initSoroban();
}

function createResponsiveCanvas() {
  const w = min(windowWidth - 24, 1100);
  const h = min(windowHeight - 24, 700);
  if (!_madeCanvas) {
    createCanvas(w, h);
    pixelDensity(2);
    _madeCanvas = true;
  } else {
    resizeCanvas(w, h);
  }
}

function initSoroban() {
  dims = computeDims();
  cols = [];
  const count = SHOW_SECONDS ? 6 : 4; // HHMM or HHMMSS
  for (let i = 0; i < count; i++) {
    const x = dims.margin + i * dims.spacing;
    cols.push(new SorobanDigit(x, dims.top, dims.height, dims.beadR));
  }
}

function computeDims() {
  const W = width, H = height;
  const count = SHOW_SECONDS ? 6 : 4;
  const margin = W * 0.08;
  const spacing = (W - 2 * margin) / (count - 1);

  const heightAbacus = H * 0.74;
  const top = (H - heightAbacus) / 2;

  const beadR = min(W, H) * 0.028;
  const topLimit = top + beadR;                 // keep bead centers inside rails
  const botLimit = top + heightAbacus - beadR;

  const beamY = top + heightAbacus * 0.40;

  // Heaven positions
  const heavenRestY   = max(topLimit, top + heightAbacus * 0.18);
  const heavenActiveY = beamY - beadR - 2;

  // Earth positions (note: TOP→BOTTOM order)
  const earthGap      = 2.4 * beadR;
  const earthActiveTopY = beamY + beadR + 2;        // first active bead just below beam (top of active stack)
  const earthRestTopY  = botLimit - 3 * earthGap;   // compute TOP of rest stack so bottom aligns with botLimit

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

  const rawHr = hour();
  const mn = minute();
  const sc = second();

  if (mn !== prevMinute) {
    console.log('[Soroban Clock] Minute changed →', mn);
    prevMinute = mn;
  }

  let displayHr = USE_12_HOUR ? ((rawHr % 12) || 12) : rawHr;

  const digitsStr = SHOW_SECONDS
    ? nf(displayHr, 2) + nf(mn, 2) + nf(sc, 2)
    : nf(displayHr, 2) + nf(mn, 2);

  for (let i = 0; i < cols.length; i++) {
    cols[i].setDigit(int(digitsStr[i]));
    cols[i].updateAndDraw();
  }
}

function drawShelf() {
  // backdrop bar
  noStroke();
  fill(255, 255, 255, 12);
  rect(0, dims.beamY - dims.beadR * 3.5, width, dims.beadR * 7.0);

  // beam
  fill(THEME.beam);
  rect(0, dims.beamY - dims.beadR * 0.45, width, dims.beadR * 0.9);

  // rails
  fill(255, 255, 255, 8);
  rect(0, dims.top - dims.beadR * 0.9, width, dims.beadR * 0.9);
  rect(0, dims.top + dims.height, width, dims.beadR * 0.9);
}

/* ======================= SorobanDigit =========================
 * Earth beads are TOP→BOTTOM: ey[0] is highest, ey[3] is lowest.
 * Targets are built the same way, so spacing can enforce y[i] >= y[i-1] + minGap.
 */
class SorobanDigit {
  constructor(x, top, colH, r) {
    this.x = x;
    this.top = top;
    this.colH = colH;
    this.r = r;

    this.rodX = x;
    this.rodColor = THEME.rod;

    // Current positions (start at REST TOP→BOTTOM)
    this.hy = dims.heavenRestY;
    this.ey = [
      dims.earthRestTopY + 0 * dims.earthGap,
      dims.earthRestTopY + 1 * dims.earthGap,
      dims.earthRestTopY + 2 * dims.earthGap,
      dims.earthRestTopY + 3 * dims.earthGap
    ];

    // Targets
    this.hyT = this.hy;
    this.eyT = [...this.ey];

    // Motion params
    this.ease    = 0.25;
    this.snapEps = 0.01;
    this.minGap  = 2.0 * this.r; // at least bead-height apart
    this.value   = -1;
  }

  setDigit(d) {
    d = constrain(d, 0, 9);
    if (d === this.value) return;
    this.value = d;

    // Heaven: active (down) for 5..9
    this.hyT = (d >= 5) ? dims.heavenActiveY : dims.heavenRestY;

    // Earth: k = d % 5 active starting just below the beam (TOP→BOTTOM)
    const k = d % 5;
    for (let i = 0; i < 4; i++) {
      if (i < k) {
        this.eyT[i] = dims.earthActiveTopY + i * dims.earthGap; // active stack
      } else {
        this.eyT[i] = dims.earthRestTopY  + i * dims.earthGap;  // rest stack
      }
    }
  }

  updateAndDraw() {
    // rod
    stroke(this.rodColor);
    strokeWeight(max(2, this.r * 0.4));
    line(this.rodX, this.top, this.rodX, this.top + this.colH);

    // ease
    this.hy = lerp(this.hy, this.hyT, this.ease);
    for (let i = 0; i < 4; i++) {
      this.ey[i] = lerp(this.ey[i], this.eyT[i], this.ease);
    }

    // snap near targets
    if (abs(this.hy - this.hyT) < this.snapEps) this.hy = this.hyT;
    for (let i = 0; i < 4; i++) {
      if (abs(this.ey[i] - this.eyT[i]) < this.snapEps) this.ey[i] = this.eyT[i];
    }

    // enforce spacing & frame bounds (TOP→BOTTOM ordering)
    this.enforceSpacing();

    // draw beads
    this.drawBead(this.x, this.hy);      // heaven
    for (let i = 0; i < 4; i++) this.drawBead(this.x, this.ey[i]); // earth
  }

  enforceSpacing() {
    const minY0 = dims.topLimit;
    const maxY3 = dims.botLimit;

    // ensure monotonic increasing y with min gap
    for (let i = 1; i < 4; i++) {
      if (this.ey[i] < this.ey[i - 1] + this.minGap) {
        this.ey[i] = this.ey[i - 1] + this.minGap;
      }
    }

    // clamp inside frame with adequate space for remaining beads
    this.ey[0] = constrain(this.ey[0], minY0, maxY3 - 3 * this.minGap);
    this.ey[1] = constrain(this.ey[1], minY0 + 1 * this.minGap, maxY3 - 2 * this.minGap);
    this.ey[2] = constrain(this.ey[2], minY0 + 2 * this.minGap, maxY3 - 1 * this.minGap);
    this.ey[3] = constrain(this.ey[3], minY0 + 3 * this.minGap, maxY3);

    // gentle pull toward targets so constraints don't “stick”
    for (let i = 0; i < 4; i++) {
      this.ey[i] = lerp(this.ey[i], this.eyT[i], 0.06);
    }
  }

  drawBead(cx, cy) {
    const w = 2.8 * this.r;
    const h = 2.0 * this.r;
    const x0 = cx - w / 2, y0 = cy - h / 2;

    noStroke();
    fill(THEME.bead);
    rect(x0, y0, w, h, h / 2);

    stroke(THEME.beadStroke);
    strokeWeight(max(1, this.r * 0.18));
    noFill();
    rect(x0, y0, w, h, h / 2);

    // highlight/shadow
    noStroke();
    fill(255, 255, 255, 22);
    rect(x0, y0, w, h * 0.38, h / 2);
    fill(0, 0, 0, 28);
    rect(x0, y0 + h * 0.55, w, h * 0.45, h / 2);
  }
}
