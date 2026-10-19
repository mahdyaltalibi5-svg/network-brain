"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  PlaneGeometry,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { JACKET_ORIGIN } from "../config";
import type { IntroState } from "../state";
import type { ParticleData } from "../targets/build";
import { SUMMIT } from "../targets/heightfield";
import { lapelCurvePoints } from "../targets/jacket";
import { mulberry32 } from "../targets/rng";
import { stitchHoles, THREAD_TRAVEL_SECONDS, threadCurve } from "../targets/thread";
import * as S from "./shaders";

/** Shared pointer state (NDC, smoothed), written by the director. */
export const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: 0 };

/** Create a GPU resource once per mount and dispose it on unmount. */
function useDisposable<T extends { dispose: () => void }>(factory: () => T) {
  const [obj] = useState(factory);
  useEffect(() => () => obj.dispose(), [obj]);
  return obj;
}

const additive = { transparent: true, depthWrite: false, blending: AdditiveBlending } as const;

// ── Particles: thread → mountain → jacket ────────────────────────────
export function Particles({ data, s, sizeScale }: { data: ParticleData; s: IntroState; sizeScale: number }) {
  const { gl, size } = useThree();
  const geo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.jacket, 3));
    g.setAttribute("aThread", new BufferAttribute(data.thread, 3));
    g.setAttribute("aMountain", new BufferAttribute(data.mountain, 3));
    g.setAttribute("aJacket", new BufferAttribute(data.jacket, 3));
    g.setAttribute("aNMountain", new BufferAttribute(data.nMountain, 3));
    g.setAttribute("aNJacket", new BufferAttribute(data.nJacket, 3));
    g.setAttribute("aRandom", new BufferAttribute(data.random, 4));
    g.setAttribute("aPart", new BufferAttribute(data.part, 1));
    return g;
  });
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.particleVertex,
        fragmentShader: S.particleFragment,
        ...additive,
        uniforms: {
          uTime: { value: 0 },
          uMorph1: { value: 0 },
          uMorph2: { value: 0 },
          uSwirl: { value: 1 },
          uBurst: { value: 0 },
          uBurstOrigin: { value: new Vector3(JACKET_ORIGIN[0], JACKET_ORIGIN[1] + 0.5, JACKET_ORIGIN[2] + 0.6) },
          uSize: { value: 22 },
          uPixelRatio: { value: 1 },
          uLightDir: { value: new Vector3(-0.4, 0.8, 0.5) },
          uMouse: { value: new Vector2(9, 9) },
          uMouseStrength: { value: 0 },
          uAspect: { value: 1 },
          uSummitY: { value: SUMMIT.y },
          uRest: { value: 0 },
          uOpacity: { value: 0 },
        },
      }),
  );
  useFrame(({ clock }) => {
    const u = mat.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uMorph1.value = s.morph1;
    u.uMorph2.value = s.morph2;
    u.uSwirl.value = s.swirl;
    u.uBurst.value = s.burst;
    u.uSize.value = 22 * s.size * sizeScale;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uLightDir.value.set(s.lightX + pointer.x * 0.5, 0.8 + pointer.y * 0.3, 0.5);
    u.uMouse.value.set(pointer.x, pointer.y);
    u.uMouseStrength.value = s.rest * pointer.active;
    u.uAspect.value = size.width / size.height;
    u.uRest.value = s.rest;
    // portrait: the resting jacket sits behind body copy, so it stays faint
    u.uOpacity.value = s.particleOpacity * (size.width < size.height ? 1 - 0.6 * s.rest : 1);
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

// ── Needle tip: the gold point of light ──────────────────────────────
export function NeedleTip({ s }: { s: IntroState }) {
  const { gl } = useThree();
  const geo = useDisposable(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(3), 3)));
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.tipVertex,
        fragmentShader: S.tipFragment,
        ...additive,
        depthTest: false,
        uniforms: { uSize: { value: 60 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
      }),
  );
  const p = useMemo(() => new Vector3(), []);
  useFrame(() => {
    threadCurve.getPointAt(Math.min(1, Math.max(0, s.thread)), p);
    (geo.attributes.position as BufferAttribute).setXYZ(0, p.x, p.y, p.z);
    geo.attributes.position.needsUpdate = true;
    mat.uniforms.uSize.value = 34 * (1 + s.tipPulse * 1.8);
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    mat.uniforms.uOpacity.value = s.tipOpacity;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={10} />;
}

// ── The thread: a glowing tube drawn on behind the needle ────────────
export function Thread({ s }: { s: IntroState }) {
  const geo = useDisposable(() => new TubeGeometry(threadCurve, 900, 0.0055, 6, false));
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.tubeVertex,
        fragmentShader: S.threadFragment,
        ...additive,
        uniforms: { uProgress: { value: 0 }, uOpacity: { value: 0 }, uTrail: { value: 0.3 } },
      }),
  );
  useFrame(() => {
    mat.uniforms.uProgress.value = s.thread;
    mat.uniforms.uOpacity.value = s.threadOpacity;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

// ── Sparks at each stitch hole ───────────────────────────────────────
export function Sparks({ s }: { s: IntroState }) {
  const { gl } = useThree();
  const geo = useDisposable(() => {
    const rng = mulberry32(99);
    const per = 40;
    const n = stitchHoles.length * per;
    const origin = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const birth = new Float32Array(n);
    const seed = new Float32Array(n);
    stitchHoles.forEach((h, k) => {
      for (let i = 0; i < per; i++) {
        const idx = k * per + i;
        origin.set([h.p.x, h.p.y, h.p.z], idx * 3);
        const a = rng() * Math.PI * 2;
        const up = 0.4 + rng() * 1.6;
        const sp = 0.4 + rng() * 1.4;
        vel.set([Math.cos(a) * sp, up, Math.sin(a) * sp], idx * 3);
        birth[idx] = h.t;
        seed[idx] = i === per - 1 ? 0.99 : rng() * 0.95;
      }
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(origin, 3));
    g.setAttribute("aOrigin", new BufferAttribute(origin, 3));
    g.setAttribute("aVelocity", new BufferAttribute(vel, 3));
    g.setAttribute("aBirth", new BufferAttribute(birth, 1));
    g.setAttribute("aSeed", new BufferAttribute(seed, 1));
    return g;
  });
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.sparkVertex,
        fragmentShader: S.sparkFragment,
        ...additive,
        uniforms: {
          uProgress: { value: 0 },
          uSeconds: { value: THREAD_TRAVEL_SECONDS },
          uPixelRatio: { value: 1 },
          uOpacity: { value: 1 },
        },
      }),
  );
  useFrame(() => {
    mat.uniforms.uProgress.value = s.thread;
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    mat.uniforms.uOpacity.value = s.sparks;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

// ── Pick-stitching traced along the lapel edge ───────────────────────
export function StitchLine({ s }: { s: IntroState }) {
  const geo = useDisposable(() => {
    const [ox, oy, oz] = JACKET_ORIGIN;
    const pts = lapelCurvePoints(160).map(([x, y, z]) => new Vector3(x + ox, y + oy, z + oz));
    return new TubeGeometry(new CatmullRomCurve3(pts), 480, 0.0075, 5, false);
  });
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.tubeVertex,
        fragmentShader: S.stitchFragment,
        ...additive,
        uniforms: { uDraw: { value: 0 }, uOpacity: { value: 0 }, uStitches: { value: 84 } },
      }),
  );
  useFrame(() => {
    mat.uniforms.uDraw.value = s.stitch;
    mat.uniforms.uOpacity.value = s.stitchOpacity;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

// ── Low fog drifting through the valleys ─────────────────────────────
export function FogPlane({ s }: { s: IntroState }) {
  const geo = useDisposable(() => new PlaneGeometry(14, 18, 1, 1).rotateX(-Math.PI / 2));
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.fogVertex,
        fragmentShader: S.fogFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      }),
  );
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uOpacity.value = s.fog;
  });
  return <mesh geometry={geo} material={mat} position={[0, SUMMIT.y * 0.07, -1]} renderOrder={-1} />;
}

// ── Ambient dust: depth and parallax for the chase through the void ──
export function Dust({ s }: { s: IntroState }) {
  const { gl } = useThree();
  const geo = useDisposable(() => {
    const rng = mulberry32(5);
    const n = 1400;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (rng() - 0.5) * 9;
      p[i * 3 + 1] = SUMMIT.y + (rng() - 0.35) * 5;
      p[i * 3 + 2] = 8 - rng() * 18;
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(p, 3));
  });
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: S.dustVertex,
        fragmentShader: S.dustFragment,
        ...additive,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 0 } },
      }),
  );
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    mat.uniforms.uOpacity.value = s.dust;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
