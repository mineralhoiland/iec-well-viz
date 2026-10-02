# Math checklist — spherical IEC vacuum well (Pilot 2)

Same potential as `src/iec_well_sim.py`. Viz must match these formulas, not a new model.

## Potential

Let \(V_0>0\) be the cathode bias magnitude, \(R_c<R_a\), and

\[
D=\frac{1}{R_c}-\frac{1}{R_a}.
\]

**Gap** (\(R_c\le r\le R_a\)), exact concentric-sphere vacuum solution (anode at 0, cathode at \(-V_0\)):

\[
\Phi(r)=-V_0\,\frac{1/r-1/R_a}{D}.
\]

**Interior** (\(r<R_c\)), \(C^1\)-matched quadratic toy well (not a real grid multipole):

\[
\left.\partial_r\Phi\right|_{R_c}=\frac{V_0}{R_c^2 D},\qquad
k=\frac{1}{R_c}\left.\partial_r\Phi\right|_{R_c}=\frac{V_0}{R_c^3 D},
\]

\[
\Phi(r)=-V_0+\frac12 k\,(r^2-R_c^2).
\]

For the Pilot 2 radii \(R_a/R_c=6\), the center is deeper than the grid:

\[
\Phi(0)=-V_0-\frac12 k R_c^2=-1.6\,V_0.
\]

## Field

\[
E_r=-\partial_r\Phi.
\]

Closed form (same \(k\)):

- gap: \(E_r(r)=-V_0/(D\,r^2)<0\)
- interior: \(E_r(r)=-k r\le 0\) for \(r\ge 0\)

Positive ions feel \(q E_r<0\) (force toward the center). Do not flip this sign.

## Motion (if the viz integrates orbits)

Non-relativistic radial toy, fixed \(\Phi\), no space charge, no angular momentum:

\[
m\ddot r=q E_r(r).
\]

Soft clamps near \(r\to 0\) or at the anode are integrator guards. They are not part of the Hamiltonian and must not be drawn as a physical wall.

## Invariants the viz must satisfy

1. \(\Phi(R_a)=0\).
2. \(\Phi(R_c)=-V_0\) from both sides.
3. \(C^1\) at \(R_c\): \(\Phi\) and \(\partial_r\Phi\) (equivalently \(E_r\)) agree from inside and outside. For \(R_a/R_c=6\), \(\Phi(0)/V_0=-1.6\).
4. \(E_r\le 0\) for \(r>0\) everywhere in the domain (ions fall inward).
5. Kinetic-energy bound for a particle that starts at \(r_0\) with negligible \(v_0\), in electron-volts (charge \(+e\)):

\[
E_\mathrm{kin}(r)\le \Phi(r_0)-\Phi(r)\le \Phi(r_0)-\Phi(0).
\]

   From the anode, \(\Phi(r_0)=0\), so \(E_\mathrm{kin}\le -\Phi(0)=1.6\,qV_0/e\). Values above \(qV_0\) are expected; values above \(-\Phi(0)\) are a bug (unless a soft bounce injected energy — exclude those samples).

6. **Child–Langmuir.** If a current is shown, label it planar CL with gap \(d=R_a-R_c\) and area \(4\pi R_c^2\):

\[
J=\frac49\varepsilon_0\sqrt{\frac{2q}{m}}\frac{V_0^{3/2}}{d^2},\qquad I=JA.
\]

   Do **not** call this Langmuir–Blodgett or spherical space-charge-limited current. It is an uncoupled diagnostic, not a load on \(\Phi\).

## Out of scope (do not imply these)

No self-consistent space charge, no angular momentum, no discrete grid wires, no collisions, ionization, or fusion yield.
