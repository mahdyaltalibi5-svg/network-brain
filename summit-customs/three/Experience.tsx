"use client";

import { addAfterEffect, addEffect, Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import gsap from "gsap";
import { BlendFunction, type BloomEffect, type ChromaticAberrationEffect, type NoiseEffect } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { PerspectiveCamera, Vector2, Vector3 } from "three";
import { IntroAudio } from "./audio/sfx";
import { JACKET_ORIGIN, TIER_SETTINGS, type IntroMode, type Tier } from "./config";
import { Dust, FogPlane, NeedleTip, Particles, pointer, Sparks, StitchLine, Thread } from "./scene/objects";
import { scenes } from "@/lib/scenes";
import { LAYERS } from "./targets/scenes";
import { createIntroState, type IntroState } from "./state";
import type { ParticleData } from "./targets/build";
import { loadParticleData } from "./targets/load";
import { threadCurve } from "./targets/thread";
import { buildAscent, buildMicro } from "./timeline/ascent";

export type ExperienceProps = { tier: Tier; mode: IntroMode; onDone?: () => void };

const [JX, JY, JZ] = JACKET_ORIGIN;

/**
 * One WebGL canvas for the homepage. It starts as the intro overlay, then
 * drops behind the page (z-index -1) and becomes the resting hero jacket.
 */
export default function Experience({ tier, mode, onDone }: ExperienceProps) {
  const settings = TIER_SETTINGS[tier];
  const [data, setData] = useState<ParticleData | null>(null);
  const [layer, setLayer] = useState<"overlay" | "page">(mode === "none" ? "page" : "overlay");
  const [playing, setPlaying] = useState(mode !== "none");
  const wrap = useRef<HTMLDivElement>(null);
  const [s] = useState(createIntroState);

  useEffect(() => {
    let alive = true;
    loadParticleData(settings.particles).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [settings.particles]);

  return (
    <div ref={wrap} className="intro-canvas" data-layer={layer} aria-hidden="true" style={{ opacity: 0, visibility: "hidden" }}>
      {/* anatomy labels: HTML positioned over projected 3D anchor points */}
      <div className="anatomy-labels">
        {LABELLED.map((name) => (
          <span key={name} data-anatomy-label={name} className="anatomy-label">
            <i />
            <b />
            {name}
          </span>
        ))}
      </div>
      {data && (
        <Canvas
          dpr={settings.dpr}
          flat
          gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
          camera={{ fov: 40, near: 0.05, far: 120, position: [0, 4, 9] }}
          style={{ position: "absolute", inset: 0 }}
        >
          <color attach="background" args={["#07080A"]} />
          <Director
            s={s}
            anchors={data.anchors}
            mode={mode}
            wrap={wrap}
            onEntrance={() => setLayer("page")}
            onDone={() => {
              setPlaying(false);
              onDone?.();
            }}
          />
          <group>
            <Particles data={data} s={s} sizeScale={tier === "mid" ? 1.3 : 1} />
            {playing && (
              <>
                <Dust s={s} />
                <NeedleTip s={s} />
                <Thread s={s} />
                <Sparks s={s} />
                <StitchLine s={s} />
                <FogPlane s={s} />
              </>
            )}
          </group>
          <Effects tier={tier} playing={playing} s={s} />
        </Canvas>
      )}
    </div>
  );
}

function Effects({ tier, playing, s }: { tier: Tier; playing: boolean; s: IntroState }) {
  const bloom = useRef<BloomEffect>(null);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const noise = useRef<NoiseEffect>(null);
  const caOffset = useMemo(() => new Vector2(0, 0), []);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = s.bloom;
    if (ca.current) ca.current.offset.set(s.ca * 0.0016, s.ca * 0.0008);
    if (noise.current) noise.current.blendMode.opacity.value = s.grain;
  });
  const full = TIER_SETTINGS[tier].post === "full";
  const bloomFx = <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={1.1} radius={0.72} />;
  if (full && playing) {
    return (
      <EffectComposer multisampling={0}>
        {bloomFx}
        <ChromaticAberration ref={ca} offset={caOffset} radialModulation={false} modulationOffset={0} />
        {/* premultiplied additive grain: SOFT_LIGHT misbehaves on HDR values > 1 (cyan cores) */}
        <Noise ref={noise} premultiply blendFunction={BlendFunction.ADD} opacity={0.09} />
        <Vignette offset={0.28} darkness={0.78} />
      </EffectComposer>
    );
  }
  if (full) {
    return (
      <EffectComposer multisampling={0}>
        {bloomFx}
        <Vignette offset={0.28} darkness={0.7} />
      </EffectComposer>
    );
  }
  return <EffectComposer multisampling={0}>{bloomFx}</EffectComposer>;
}

const LABELLED = ["canvas", "lining", "lapel", "pockets", "buttons"] as const;

type DirectorProps = {
  s: IntroState;
  anchors: number[];
  mode: IntroMode;
  wrap: React.RefObject<HTMLDivElement | null>;
  onEntrance: () => void;
  onDone: () => void;
};

/** Owns the master timeline, camera rig, input, audio and lifecycle. */
function Director({ s, anchors, mode, wrap, onEntrance, onDone }: DirectorProps) {
  const { camera, size, setFrameloop } = useThree();
  const cam = camera as PerspectiveCamera;
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const started = useRef(false);
  const tmp = useMemo(
    () => ({ pos: new Vector3(), tgt: new Vector3(), tip: new Vector3(), look: new Vector3() }),
    [],
  );
  const fps = useRef<number[]>([]);
  const meter = useRef<HTMLDivElement | null>(null);
  const labels = useRef<HTMLElement[]>([]);
  useEffect(() => {
    labels.current = LABELLED.map((n) => document.querySelector<HTMLElement>(`[data-anatomy-label="${n}"]`)!);
  }, []);

  // Build the timeline once
  useEffect(() => {
    const html = document.documentElement;
    const audio = new IntroAudio();
    if (window.__introSound) audio.enable();
    window.__introSoundChange = (on) => (on ? audio.enable() : audio.disable());

    const layers = [...document.querySelectorAll<HTMLElement>("[data-intro-layer]")];
    const enterPage = () => {
      onEntrance();
      html.classList.add("hero-3d");
      if (wrap.current) gsap.fromTo(wrap.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: "power1.out" });
    };
    const finish = () => {
      window.__introFinish?.();
      window.__introSkip = undefined;
      setTimeout(() => audio.dispose(), 1500);
      onDone();
    };

    if (mode === "none") {
      Object.assign(s, { morph1: 1, morph2: 1, particleOpacity: 1, rest: 1, restFrame: 1, swirl: 0.35, shake: 0, parallax: 0.4, burst: 1 });
      Object.assign(s.orbit, { on: 1, az: 0, el: 0.04, r: 9.2, ty: 0 });
      tlRef.current = gsap.timeline({ paused: true }).to(s, { burst: 0, duration: 1.4, ease: "power3.out" });
      tlRef.current.call(enterPage, [], 0);
    } else {
      const hooks = {
        dom: {
          glyphs: [...document.querySelectorAll<SVGPathElement>("[data-glyph]")],
          label: document.querySelector<HTMLElement>("[data-intro-label]"),
          tagline: document.querySelector<HTMLElement>("[data-intro-tagline]"),
          layers: [...layers, ...(wrap.current ? [wrap.current] : [])],
        },
        cue: audio.cue.bind(audio),
        onReveal: () => {
          window.scrollTo({ top: 0, behavior: "instant" });
          html.classList.add("hero-3d");
        },
        onEntrance: enterPage,
        onDone: finish,
      };
      tlRef.current = mode === "micro" ? buildMicro(s, hooks) : buildAscent(s, hooks);
    }
    const tl = tlRef.current;

    // Skip: jump to the entrance and play it out fast (no hard cut)
    window.__introSkip = () => {
      const e = tl.labels.entrance ?? 0;
      if (tl.time() < e) tl.seek(e, true);
      tl.timeScale(2.2).play();
    };
    // Scroll / click / keypress fast-forward at 3× instead of jumping
    const ff = (e: Event) => {
      if (html.classList.contains("intro-done")) return;
      if (e instanceof KeyboardEvent && ["Tab", "Shift", "Escape", "Enter", " "].includes(e.key)) return;
      if (e.target instanceof Element && e.target.closest(".intro-btn")) return;
      if (tl.timeScale() < 3) gsap.to(tl, { timeScale: 3, duration: 0.25 });
    };
    const ffEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    if (mode !== "none") ffEvents.forEach((ev) => window.addEventListener(ev, ff, { passive: true }));

    // Pointer + gyro parallax
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.active = e.pointerType === "mouse" ? 1 : 0.6;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function" && !window.__introTilt) return;
      pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      pointer.ty = Math.max(-1, Math.min(1, (45 - e.beta) / 30));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    const tiltBtn = document.querySelector<HTMLButtonElement>("[data-intro-tilt]");
    if (tiltBtn && matchMedia("(pointer: coarse)").matches && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function") tiltBtn.hidden = false;

    // Pause everything when the tab is hidden
    const onVis = () => {
      if (document.hidden) {
        tl.pause();
        setFrameloop("never");
      } else {
        if (started.current && !debugT()) tl.resume();
        setFrameloop("always");
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // After the 3D sections: stop rendering entirely once the particles are hidden
    const onScroll = () => {
      if (!html.classList.contains("hero-3d") || document.hidden) return;
      setFrameloop(scenes.hide > 0.999 && s.hide > 0.995 ? "never" : "always");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // main-thread cost per frame (scene update + WebGL command submission), GPU-independent
    const cpu: number[] = [];
    let frameStart = 0;
    const unsubStart = addEffect(() => void (frameStart = performance.now()));
    const unsubEnd = addAfterEffect(() => {
      cpu.push(performance.now() - frameStart);
      if (cpu.length > 900) cpu.shift();
    });
    window.__intro = { tl, state: s, fps: fps.current, cpu, seek: (t: number) => tl.pause().seek(t, false) };
    // ?fps=1: on-screen frame-rate meter for checking real hardware
    if (new URLSearchParams(location.search).has("fps")) {
      meter.current = Object.assign(document.createElement("div"), {
        style: "position:fixed;top:8px;left:8px;z-index:99;font:12px/1 monospace;color:#C9A45C;background:#07080Acc;padding:6px 8px",
      });
      document.body.append(meter.current);
    }
    return () => {
      tl.kill();
      ffEvents.forEach((ev) => window.removeEventListener(ev, ff));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      html.classList.remove("hero-3d");
      meter.current?.remove();
      unsubStart();
      unsubEnd();
      audio.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }, dt) => {
    const tl = tlRef.current;
    if (!tl) return;
    // First rendered frame: the canvas takes over from the CSS veil
    if (!started.current) {
      started.current = true;
      const html = document.documentElement;
      clearTimeout(window.__introT);
      if (mode !== "none") {
        html.classList.add("intro-active");
        if (wrap.current) gsap.set(wrap.current, { autoAlpha: 1 });
      }
      const t = debugT();
      if (t != null) tl.seek(t, false).pause();
      else tl.play();
    }
    if (fps.current.length > 900) fps.current.shift();
    fps.current.push(dt);
    if (meter.current && fps.current.length % 15 === 0) {
      const recent = fps.current.slice(-60);
      meter.current.textContent = `${(recent.length / recent.reduce((a, b) => a + b, 0)).toFixed(0)} fps · ${size.width}×${size.height}`;
    }

    // ── scroll scenes: damp toward the shared store once the hero is resting
    if (s.rest > 0.99) {
      const k = 1 - Math.exp(-dt * 4.5);
      s.process += (scenes.process - s.process) * k;
      s.anatomy += (scenes.anatomy - s.anatomy) * k;
      s.fabric += (scenes.fabric - s.fabric) * k;
      s.camp += (scenes.camp - s.camp) * (1 - Math.exp(-dt * 6));
      s.hide += (scenes.hide - s.hide) * k;
      s.frameX += (scenes.frameX - s.frameX) * k;
      s.frameY += (scenes.frameY - s.frameY) * k;
      s.yaw += (scenes.yaw - s.yaw) * k;
      s.zoom += (scenes.zoom - s.zoom) * k;
      s.particleOpacity = 1 - s.hide;
    }

    // ── camera rig: keyframed path, blended with chase cam and orbit cam
    const t = clock.elapsedTime;
    const { pos, tgt, tip, look } = tmp;
    pos.set(s.cam.px, s.cam.py, s.cam.pz);
    tgt.set(s.cam.tx, s.cam.ty, s.cam.tz);
    const portraitChase = size.width < size.height;
    if (s.chase > 0) {
      threadCurve.getPointAt(Math.min(1, s.thread), tip);
      threadCurve.getPointAt(Math.min(1, s.thread + 0.05), look);
      pos.lerp(tip.set(tip.x + (portraitChase ? 0 : 0.35), tip.y + (portraitChase ? 0.12 : 0.3), tip.z + (portraitChase ? 3.2 : 1.5)), s.chase);
      tgt.lerp(look, s.chase);
    }
    const portrait = size.width < size.height;
    if (s.orbit.on > 0) {
      const o = s.orbit;
      const ce = Math.cos(o.el);
      const r = o.r * (portrait ? 1 + 0.25 * (1 - s.restFrame) + 0.7 * s.restFrame : 1) * s.zoom;
      tip.set(JX + r * ce * Math.sin(o.az), JY + o.ty + r * Math.sin(o.el), JZ + r * ce * Math.cos(o.az));
      pos.lerp(tip, o.on);
      tgt.lerp(look.set(JX, JY + o.ty, JZ), o.on);
    }
    // handheld noise + pointer parallax
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    const sh = s.shake * 0.035;
    pos.x += sh * (Math.sin(t * 1.7) + 0.5 * Math.sin(t * 4.3)) + pointer.x * 0.35 * s.parallax;
    pos.y += sh * (Math.sin(t * 1.3 + 1) + 0.5 * Math.sin(t * 3.7)) + pointer.y * 0.22 * s.parallax;
    if (s.rest > 0) {
      // resting jacket turns gently toward the cursor
      const yaw = pointer.x * 0.32 * (1 - s.anatomy * 0.6) + Math.sin(t * 0.25) * 0.06 * (1 - s.fabric) + s.yaw;
      const r = Math.hypot(pos.x - JX, pos.z - JZ);
      const a = Math.atan2(pos.x - JX, pos.z - JZ) + yaw * s.rest;
      pos.x = JX + r * Math.sin(a);
      pos.z = JZ + r * Math.cos(a);
      pos.y += -pointer.y * 0.4 * s.rest;
    }
    cam.position.copy(pos);
    cam.lookAt(tgt);

    // framing: centred during the intro; offset into the hero's art slot at rest
    const fx = portrait ? 0.7 : s.frameX;
    const fy = portrait ? 0.3 : s.frameY;
    const k = s.restFrame;
    const offX = -(fx - 0.5) * size.width * k;
    const offY = (0.5 - fy) * size.height * k;
    if (k > 0) cam.setViewOffset(size.width, size.height, offX, offY, size.width, size.height);
    else if (cam.view) cam.clearViewOffset();
    cam.updateProjectionMatrix();

    // anatomy labels follow their projected 3D anchors
    const show = portrait ? 0 : Math.max(0, (s.anatomy - 0.55) / 0.45) * (1 - s.fabric) * (1 - s.hide);
    labels.current.forEach((el, i) => {
      if (!el) return;
      if (show < 0.01) {
        if (el.style.opacity !== "0") el.style.opacity = "0";
        return;
      }
      const li = LAYERS.indexOf(LABELLED[i]);
      tip.set(anchors[li * 3], anchors[li * 3 + 1], anchors[li * 3 + 2]).project(cam);
      const x = (tip.x * 0.5 + 0.5) * size.width;
      const y = (-tip.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = String(show);
    });
  });
  return null;
}

function debugT(): number | null {
  const v = new URLSearchParams(location.search).get("t");
  return v == null ? null : Number(v);
}

declare global {
  interface Window {
    __intro?: { tl: gsap.core.Timeline; state: IntroState; fps: number[]; cpu: number[]; seek: (t: number) => void };
  }
}
