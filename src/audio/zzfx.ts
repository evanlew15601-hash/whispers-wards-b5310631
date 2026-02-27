/*
  Derived from ZzFXMicro ("Zuper Zmall Zound Zynth") by Frank Force.
  Upstream: https://github.com/KilledByAPixel/ZzFX
  License: MIT

  This file includes modifications (TypeScript types + lazy AudioContext init)
  to better fit this codebase and avoid jsdom/test environment issues.
*/



type WebkitWindow = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let zzfxV = 0.25;
let zzfxX: AudioContext | null = null;

const getAudioContextCtor = () => {
  const w = globalThis as WebkitWindow;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
};

const getContext = () => {
  if (zzfxX) return zzfxX;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  zzfxX = new Ctor();
  return zzfxX;
};

export const setZzfxVolume = (volume: number) => {
  zzfxV = Math.max(0, Math.min(1, volume));
};

export const resumeZzfx = async () => {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') await ctx.resume();
};

// ZzFXMicro play function (unminified only lightly for maintainability).
export const zzfx = (
  p = 1,
  k = .05,
  b = 220,
  e = 0,
  r = 0,
  t = .1,
  q = 0,
  D = 1,
  u = 0,
  y = 0,
  v = 0,
  z = 0,
  l = 0,
  E = 0,
  A = 0,
  F = 0,
  c = 0,
  w = 1,
  m = 0,
  B = 0,
  N = 0,
) => {
  const X = getContext();
  if (!X) return;

  // Original ZzFXMicro variables.
  const M = Math;
  const d = 2 * M.PI;
  const R = 44100;
  const G = (u *= 500 * d / R / R);
  let C = (b *= (1 - k + 2 * k * M.random())) * d / R;

  let g = 0;
  let H = 0;
  let a = 0;
  let n = 1;
  let I = 0;
  let J = 0;
  let f = 0;

  const h = N < 0 ? -1 : 1;
  const x = d * h * N * 2 / R;
  const L = M.cos(x);
  const Z = M.sin;
  const K = Z(x) / 4;
  const O = 1 + K;
  const Y = (1 - K) / O;
  const P = (1 + h * L) / 2 / O;
  const S = P;

  let T = 0;
  let U = 0;
  let V = 0;
  let W = 0;

  e = R * e + 9;
  m *= R;
  r *= R;
  t *= R;
  c *= R;
  y *= 500 * d / (R ** 3);
  A *= d / R;
  v *= d / R;
  z *= R;
  l = R * l | 0;
  p *= zzfxV;

  const totalSamples = (e + m + r + t + c) | 0;
  const samples = new Float32Array(totalSamples);

  const X_ = -2 * L / O;
  const _ = -(h + L) / O;

  // This is a near-direct transcription of the original micro code.
  for (a = 0; a < totalSamples; a++) {
    if (F) J = (J + 1) % (100 * F | 0);

    f =
      q
        ? q > 1
          ? q > 2
            ? q > 3
              ? q > 4
                ? (((g / d) % 1 < D / 2) as any as number) * 2 - 1
                : Z(g ** 3)
              : M.max(M.min(M.tan(g), 1), -1)
            : 1 - (2 * g / d % 2 + 2) % 2
          : 1 - 4 * M.abs(M.round(g / d) - g / d)
        : Z(g);

    f =
      (l ? 1 - B + B * Z(d * a / l) : 1) *
      (q > 4 ? S : (f < 0 ? -1 : 1) * M.abs(f) ** D) *
      (a < e
        ? a / e
        : a < e + m
        ? 1 - (a - e) / m * (1 - w)
        : a < e + m + r
        ? w
        : a < totalSamples - c
        ? (totalSamples - a - c) / t * w
        : 0);

    if (c) {
      f = f / 2 + (c > a ? 0 : (a < totalSamples - c ? 1 : (totalSamples - a) / c) * samples[a - c | 0] / 2 / p);
    }

    if (N) {
      W = S * T + _ * (T = U) + P * (U = f) - Y * V - X_ * (V = W);
      f = W;
    }

    const x2 = (b += u += y) * M.cos(A * H++);
    g += x2 + x2 * E * Z(a ** 5);

    if (n && ++n > z) {
      b += v;
      C += v;
      n = 0;
    }

    if (!l || ++I % l) {
      // no-op
    } else {
      b = C;
      u = G;
      n = n || 1;
    }

    samples[a] = f * p;
  }

  const buffer = X.createBuffer(1, totalSamples, R);
  buffer.getChannelData(0).set(samples);

  const source = X.createBufferSource();
  source.buffer = buffer;
  source.connect(X.destination);
  source.start();
};
