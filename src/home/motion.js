/**
 * motion.js — the painting itself, moving: wheels, gears, banners, water,
 * flames and lamps lifted out of home-world-v1.png as feathered patches and
 * animated in place. (Stub; filled in by the living-painting pass.)
 *
 * @param {HTMLElement} map  the .cw-map layer (painting pixels, 1536×1024)
 * @param {{atmo: {hour, weather, season}, reduced: boolean}} o
 * @returns {{ setAtmo(atmo): void, destroy(): void }}
 */
export function mountMotion(map, { atmo, reduced } = {}) {
  void map; void atmo; void reduced;
  return { setAtmo() {}, destroy() {} };
}
