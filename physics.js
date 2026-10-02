/**
 * Spherical IEC vacuum potential — Pilot 2 analytic form (von Neumann).
 * Fixed background Φ. No space charge. Not Langmuir–Blodgett.
 *
 * SI units throughout. Ion charge/mass are for D+ by default.
 */

export const E_CHARGE = 1.602176634e-19;
export const M_DEUTERON = 2 * 1.67262192369e-27;

/** Φ(r) in volts. r, Rc, Ra in meters; V0 is the positive bias magnitude. */
export function phi(r, Rc, Ra, V0) {
  const D = 1 / Rc - 1 / Ra;
  if (r >= Rc) {
    const rr = Math.max(r, 1e-9);
    return -V0 * (1 / rr - 1 / Ra) / D;
  }
  // Interior C1 quadratic. k = V0 / (Rc^3 D); Φ(Rc) = -V0 from both sides.
  const k = V0 / (Rc * Rc * Rc * D);
  return -V0 + 0.5 * k * (r * r - Rc * Rc);
}

/** Er = -∂rΦ in V/m. Negative outside (inward on a positive ion). */
export function electricFieldR(r, Rc, Ra, V0) {
  const D = 1 / Rc - 1 / Ra;
  if (r >= Rc) {
    const rr = Math.max(r, 1e-9);
    return -V0 / (D * rr * rr);
  }
  const k = V0 / (Rc * Rc * Rc * D);
  return -k * r;
}

/** Φ(0)/V0. Equals -1.6 when Ra/Rc = 6. */
export function phi0OverV0(Rc, Ra) {
  if (!(Ra > Rc)) return NaN;
  return phi(0, Rc, Ra, 1);
}

/**
 * Radial acceleration magnitude along +r for a charge q, mass m.
 * a_r = (q/m) Er. Cartesian: a = a_r * r_hat.
 */
export function accelCartesian(x, y, z, q, m, Rc, Ra, V0) {
  const r = Math.hypot(x, y, z);
  const rSafe = Math.max(r, 1e-6);
  const ar = (q / m) * electricFieldR(rSafe, Rc, Ra, V0);
  const s = ar / rSafe;
  return [s * x, s * y, s * z];
}

/**
 * One velocity-Verlet step plus soft bounce at rMin and at the anode.
 * State arrays are flat [x,y,z] and [vx,vy,vz].
 */
export function verletStep(pos, vel, dt, q, m, Rc, Ra, V0, rMin) {
  const a0 = accelCartesian(pos[0], pos[1], pos[2], q, m, Rc, Ra, V0);
  vel[0] += 0.5 * dt * a0[0];
  vel[1] += 0.5 * dt * a0[1];
  vel[2] += 0.5 * dt * a0[2];
  pos[0] += dt * vel[0];
  pos[1] += dt * vel[1];
  pos[2] += dt * vel[2];
  bounce(pos, vel, Ra, rMin);
  const a1 = accelCartesian(pos[0], pos[1], pos[2], q, m, Rc, Ra, V0);
  vel[0] += 0.5 * dt * a1[0];
  vel[1] += 0.5 * dt * a1[1];
  vel[2] += 0.5 * dt * a1[2];
}

function bounce(pos, vel, Ra, rMin) {
  const r = Math.hypot(pos[0], pos[1], pos[2]);
  if (r < 1e-12) {
    pos[0] = rMin;
    pos[1] = 0;
    pos[2] = 0;
    vel[0] = Math.abs(vel[0]);
    return;
  }
  const inv = 1 / r;
  const ux = pos[0] * inv;
  const uy = pos[1] * inv;
  const uz = pos[2] * inv;
  const vr = vel[0] * ux + vel[1] * uy + vel[2] * uz;
  if (r < rMin && vr < 0) {
    vel[0] -= 2 * vr * ux;
    vel[1] -= 2 * vr * uy;
    vel[2] -= 2 * vr * uz;
    const s = rMin * inv;
    pos[0] *= s;
    pos[1] *= s;
    pos[2] *= s;
  } else if (r > Ra && vr > 0) {
    vel[0] -= 2 * vr * ux;
    vel[1] -= 2 * vr * uy;
    vel[2] -= 2 * vr * uz;
    const s = Ra * inv;
    pos[0] *= s;
    pos[1] *= s;
    pos[2] *= s;
  }
}

export function kineticEV(vx, vy, vz, m) {
  const v2 = vx * vx + vy * vy + vz * vz;
  return (0.5 * m * v2) / E_CHARGE;
}

/** mulberry32 — deterministic, seedable. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
