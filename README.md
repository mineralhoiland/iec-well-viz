# IEC vacuum well (interactive)

Static Three.js page for the Pilot 2 spherical IEC toy. The integrator uses the same vacuum potential as `src/iec_well_sim.py`.

## Potential

For \(R_c \le r \le R_a\):

\[
\Phi(r) = -V_0 \frac{1/r - 1/R_a}{1/R_c - 1/R_a}
\]

For \(r < R_c\), a quadratic well matches \(\Phi\) and \(\partial_r\Phi\) at \(R_c\). With \(R_a/R_c = 6\) (the defaults 0.15 m / 0.025 m), \(\Phi(0) = -1.6\,V_0\).

Ions are D⁺. Motion is non-relativistic, \(m\ddot{\mathbf{r}} = q\mathbf{E}\) with \(\mathbf{E} = E_r\hat{r}\) and \(E_r = -\partial_r\Phi\). A small tangential kick gives a little angular momentum so orbits are not perfectly radial. Soft bounce at \(r = 1\,\mathrm{mm}\) and at the anode. No space charge, no Langmuir–Blodgett current, no fusion yield.

Math lives in `physics.js`. The scene is `app.js`.

## Open it

Modules and the Three.js CDN import map need a static server (a `file://` open will fail).

```bash
cd /workspace/shared/pilot2-iec-well/web
python3 -m http.server 8765
```

Then open http://localhost:8765/

Controls: \(V_0\), \(R_a\), \(R_c\) (kept with \(R_a > R_c\)), particle count, time scale, seed, trails, pause, reset. The readout is \(\Phi(0)/V_0\), \(R_a/R_c\), and kinetic energies of the first four ions.

## Defaults

| Parameter | Value |
| --- | --- |
| \(R_a\) | 0.15 m |
| \(R_c\) | 0.025 m |
| \(V_0\) | 30 kV |
| particles | 72 |
| seed | 42 |
| ion | D⁺ |

Three.js r170 is loaded from unpkg. No backend.
