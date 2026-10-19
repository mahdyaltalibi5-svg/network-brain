/** GLSL for The Ascent. Colours are authored in linear space; values > 1 feed the bloom pass. */

// Ashima / Stefan Gustavson 3D simplex noise (MIT)
export const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
// Curl of a noise vector field (finite differences): divergence-free swirl, reads as woven motion.
vec3 curl(vec3 p){
  const float e=.1;
  vec3 dx=vec3(e,0.,0.),dy=vec3(0.,e,0.),dz=vec3(0.,0.,e);
  float n1=snoise(p+dy+vec3(31.4))-snoise(p-dy+vec3(31.4));
  float n2=snoise(p+dz+vec3(-17.))-snoise(p-dz+vec3(-17.));
  float n3=snoise(p+dz)-snoise(p-dz);
  float n4=snoise(p+dx+vec3(31.4))-snoise(p-dx+vec3(31.4));
  float n5=snoise(p+dx+vec3(-17.))-snoise(p-dx+vec3(-17.));
  float n6=snoise(p+dy)-snoise(p-dy);
  return vec3(n1-n2,n3-n5,n4-n6)/(2.*e);
}
`;

export const particleVertex = /* glsl */ `
${SIMPLEX}
uniform float uTime;
uniform float uMorph1;   // thread → mountain
uniform float uMorph2;   // mountain → jacket
uniform float uSwirl;
uniform float uBurst;
uniform vec3 uBurstOrigin;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uLightDir;
uniform vec2 uMouse;      // NDC
uniform float uMouseStrength;
uniform float uAspect;
uniform float uSummitY;
uniform float uRest;      // 0 intro, 1 resting hero
uniform float uProcess;   // scroll scenes (Phase 3), each 0–1
uniform float uAnatomy;
uniform float uFabric;
uniform float uCamp;      // active process step, 1–5 (continuous)

attribute vec3 aThread;
attribute vec3 aMountain;
attribute vec3 aJacket;
attribute vec3 aNMountain;
attribute vec3 aNJacket;
attribute vec4 aRandom;
attribute float aPart;
attribute vec3 aProcess;
attribute vec3 aAnatomy;
attribute vec3 aFabric;
attribute vec3 aTags;     // x process tag (-1 terrain, -.5 ridge, 0 trail, 1–5 camp) · y anatomy layer · z fabric panel

varying vec3 vColor;
varying float vAlpha;
varying float vCore;

const float PI = 3.14159265;
float ease(float t){ return t<.5 ? 4.*t*t*t : 1.-pow(-2.*t+2.,3.)/2.; }

void main(){
  // 1. thread unravels and settles into the range
  float d1 = aRandom.x * .45;
  float p1 = clamp((uMorph1 - d1) / .55, 0., 1.);
  vec3 pos = mix(aThread, aMountain, ease(p1));
  // curl noise is costly (12 simplex evaluations): only for particles mid-flight
  if (p1 > 0. && p1 < 1.) pos += curl(aMountain * .32 + vec3(0., uTime * .08, 0.)) * sin(p1 * PI) * .55;

  // 2. the range is re-woven into the jacket: lapel first, then outward
  // coherent weave: lapel first, then cloth from the shoulders down, so particles travel in ribbons
  float lapelFirst = aPart > 1.5 && aPart < 2.5 ? 0. : .14;
  float topDown = clamp((uSummitY + 2. - aJacket.y) / 4., 0., 1.) * .22;
  float isLapelP = aPart > 1.5 && aPart < 2.5 ? 1. : 0.;
  float d2 = lapelFirst + topDown * (1. - isLapelP) + aRandom.y * .08;
  float p2 = clamp((uMorph2 - d2) / mix(.52, .3, isLapelP), 0., 1.);
  float e2 = ease(p2);
  vec3 swirl = (p2 > 0. && p2 < 1.) ? curl(pos * .22 + vec3(uTime * .06, 0., 0.)) * sin(p2 * PI) * uSwirl : vec3(0.);
  pos = mix(pos, aJacket, e2) + swirl;
  vec3 n = normalize(mix(aNMountain, aNJacket, e2));

  // 4. scroll scenes: trail with camps → exploded layers → woven swatches
  float pP = 0., pA = 0., pF = 0.;
  if (uProcess > 0.) {
    pP = ease(clamp((uProcess - aRandom.z * .3) / .7, 0., 1.));
    vec3 drift = (pP > 0. && pP < 1.) ? curl(pos * .3 + vec3(0., uTime * .05, 0.)) * sin(pP * PI) * .35 : vec3(0.);
    pos = mix(pos, aProcess, pP) + drift;
    n = normalize(mix(n, vec3(0., 0., 1.), pP));
  }
  if (uAnatomy > 0.) {
    pA = ease(clamp((uAnatomy - aTags.y * .05 - aRandom.z * .15) / .6, 0., 1.));
    pos = mix(pos, aAnatomy, pA);
  }
  if (uFabric > 0.) {
    pF = ease(clamp((uFabric - aRandom.z * .3) / .7, 0., 1.));
    vec3 f = aFabric;
    float ph = aTags.z * 1.7;
    float w1 = sin(f.x * 2.6 + uTime * 1.4 + ph);
    float w2 = sin(f.y * 3.3 - uTime * 1.05 + ph * .5);
    f.z += w1 * .09 + w2 * .05;
    vec3 nf = normalize(vec3(-cos(f.x * 2.6 + uTime * 1.4 + ph) * .234, -cos(f.y * 3.3 - uTime * 1.05 + ph * .5) * .165, 1.));
    vec3 drift = (pF > 0. && pF < 1.) ? curl(pos * .3) * sin(pF * PI) * .3 : vec3(0.);
    pos = mix(pos, f, pF) + drift;
    n = normalize(mix(n, nf, pF));
  }
  float wPe = pP * (1. - pA) * (1. - pF);
  float wAe = pA * (1. - pF);
  float wFe = pF;

  // woven-fibre shimmer: each particle breathes along its normal
  pos += n * sin(uTime * 2.2 + aRandom.z * 6.2831) * .007;

  // 3. the entrance: burst outward past the camera
  vec3 dir = normalize(pos - uBurstOrigin + (aRandom.xyz - .5) * .9);
  pos += dir * uBurst * uBurst * (2.5 + aRandom.w * 10.);

  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  vec4 clip = projectionMatrix * mv;

  // mouse ripple (resting hero): particles part around the cursor in a travelling ring
  vec2 ndc = clip.xy / clip.w;
  vec2 dm = (ndc - uMouse) * vec2(uAspect, 1.);
  float md = length(dm);
  float ring = sin(md * 28. - uTime * 5.) * exp(-md * 5.);
  float push = uMouseStrength * (exp(-md * md * 26.) * .22 + ring * .015);
  mv.xy += normalize(dm + 1e-5) * push * (-mv.z) * .12;
  gl_Position = projectionMatrix * mv;

  float isLapel = step(1.5, aPart) * step(aPart, 2.5);
  float isButton = step(2.5, aPart);
  float camp = aTags.x >= .5 ? aTags.x : 0.;
  float campGlow = camp > 0. ? exp(-abs(camp - uCamp) * 2.4) : 0.;
  float size = uSize * (.55 + aRandom.w * .9) * (1. + (isLapel * .5 + isButton * .3) * e2 * (1. - wPe) * (1. - wFe))
             * (1. + wPe * (step(.5, camp) * (.4 + campGlow * .9) - step(aTags.x, -.75) * .25));
  gl_PointSize = min(size * uPixelRatio / -mv.z, 9. * uPixelRatio);

  // colour: gold and ivory fibre, lit by a movable key light, cool rim on the range
  vec3 gold = vec3(1.0, .64, .26);
  vec3 ivory = vec3(.92, .86, .76);
  vec3 cool = vec3(.42, .6, 1.0);
  float ivoryMix = step(.64, aRandom.y) * (1. - isLapel) * (1. - (1. - e2) * smoothstep(uSummitY * .5, uSummitY, aMountain.y) * .7);
  vec3 base = mix(gold, ivory, ivoryMix);
  vec3 vn = normalize(normalMatrix * n);
  vec3 viewDir = normalize(-mv.xyz);
  float diff = .45 + .55 * max(dot(n, normalize(uLightDir)), 0.);
  float rim = pow(1. - abs(dot(vn, viewDir)), 3.) * (1. - e2) * (1. - uRest);
  float fogLow = smoothstep(uSummitY * .55, 0., pos.y) * (1. - e2);
  float twinkle = .82 + .18 * sin(uTime * 3.1 + aRandom.z * 40. + pos.x * 3.);
  vColor = base * diff * twinkle + cool * rim * .9;
  vColor = mix(vColor, vec3(.12, .14, .19), fogLow * .7);
  vColor *= 1. + (1. - e2) * (1. - uRest) * smoothstep(uSummitY * .45, uSummitY, aMountain.y) * .6;
  vColor *= 1. + (isLapel * e2 * 1.6 + isButton * e2 * .6) * (1. - wPe) * (1. - wFe) * (1. - wAe * .4);

  // scene colour: camps glow (the active one pulses), terrain recedes; layers read as different materials; swatches by panel
  float pulse = .8 + .2 * sin(uTime * 3.);
  float terrain = step(aTags.x, -.75);
  float ridgeEdge = step(-.75, aTags.x) * step(aTags.x, -.25);
  vec3 processCol = gold * (terrain * .28 + ridgeEdge * .7 + step(-.25, aTags.x) * (1. + step(.5, camp) * (.6 + campGlow * 3.2 * pulse)));
  processCol = mix(processCol, ivory * .5, ridgeEdge * .5);
  float L = aTags.y;
  vec3 layerCol = L < .5 ? gold * .8 : L < 1.5 ? ivory * .45 : L < 2.5 ? vec3(.55, .5, .42) * .75 : L < 3.5 ? gold * 1.9 : L < 4.5 ? gold * 1.2 : ivory * 1.5;
  vec3 panelCol = aTags.z < .5 ? ivory * .85 : aTags.z < 1.5 ? gold * 1.05 : vec3(.62, .58, .5) * .9;
  vec3 sceneLit = .5 + .5 * vec3(max(dot(n, normalize(uLightDir)), 0.));
  vColor = mix(vColor, processCol * twinkle, wPe);
  vColor = mix(vColor, layerCol * diff * twinkle, wAe);
  vColor = mix(vColor, panelCol * sceneLit * twinkle, wFe);
  float dist = length(mv.xyz);
  float nearFade = smoothstep(.25, 1.4, -mv.z);
  vAlpha = (.55 + .45 * aRandom.w) * exp(-dist * .028) * (1. - fogLow * .8) * (1. - smoothstep(.55, 1., uBurst)) * mix(nearFade, 1., uBurst);
  vAlpha *= 1. - .55 * sin(p2 * PI);  // mid-flight fibres recede so the forming jacket reads
  vCore = isLapel * e2;
}
`;

export const particleFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
varying float vCore;
void main(){
  vec2 c = gl_PointCoord - .5;
  float d = length(c);
  if (d > .5) discard;
  float soft = smoothstep(.5, .0, d);
  float core = smoothstep(.22, .0, d);
  vec3 col = vColor * (soft * .7 + core * (.9 + vCore));
  gl_FragColor = vec4(col, soft * vAlpha * uOpacity);
}
`;

/** Tube shaders: uv.x runs along the curve. Draw-on, head glow and pick-stitch dashes. */
export const tubeVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
`;

export const threadFragment = /* glsl */ `
uniform float uProgress;
uniform float uOpacity;
uniform float uTrail;
varying vec2 vUv;
void main(){
  float s = vUv.x;
  if (s > uProgress) discard;
  float head = smoothstep(uProgress - .04, uProgress, s);
  float trail = mix(.18, 1., smoothstep(uProgress - uTrail, uProgress, s));
  vec3 gold = vec3(1.0, .62, .22);
  vec3 col = gold * (.9 * trail + 3.2 * head);
  gl_FragColor = vec4(col, uOpacity * trail);
}
`;

export const stitchFragment = /* glsl */ `
uniform float uDraw;
uniform float uOpacity;
uniform float uStitches;
varying vec2 vUv;
void main(){
  float s = vUv.x;
  if (s > uDraw) discard;
  if (fract(s * uStitches) > .56) discard;
  float head = smoothstep(uDraw - .03, uDraw, s);
  vec3 col = vec3(1.0, .7, .3) * (2.6 + 4. * head);
  gl_FragColor = vec4(col, uOpacity);
}
`;

export const sparkVertex = /* glsl */ `
uniform float uProgress;   // thread progress (0–1)
uniform float uSeconds;    // seconds per unit of progress
uniform float uPixelRatio;
uniform float uOpacity;
attribute vec3 aOrigin;
attribute vec3 aVelocity;
attribute float aBirth;
attribute float aSeed;
varying float vLife;
varying float vHole;
void main(){
  float age = (uProgress - aBirth) * uSeconds;
  float life = clamp(age / (.35 + aSeed * .4), 0., 1.);
  vec3 pos = aOrigin + aVelocity * age + vec3(0., -2.2, 0.) * age * age;
  // the last spark of each burst stays as a faint stitch hole
  vHole = step(.97, aSeed) * step(0., age);
  if (vHole > .5) pos = aOrigin;
  vLife = (age < 0.) ? 1. : life;
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  float sz = vHole > .5 ? 3. : mix(6., 1., life) * (.6 + aSeed);
  gl_PointSize = (age < 0. ? 0. : sz) * uPixelRatio / -mv.z;
}
`;

export const sparkFragment = /* glsl */ `
uniform float uOpacity;
varying float vLife;
varying float vHole;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float a = smoothstep(.5, 0., d);
  vec3 col = vHole > .5 ? vec3(.9, .82, .7) * .6 : mix(vec3(1.6, 1.25, .8), vec3(1., .45, .12), vLife) * 3.;
  float alpha = vHole > .5 ? a * .7 : a * (1. - vLife);
  gl_FragColor = vec4(col, alpha * uOpacity);
}
`;

export const fogVertex = tubeVertex;
export const fogFragment = /* glsl */ `
${SIMPLEX}
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main(){
  vec2 p = vUv * 6.;
  float n = snoise(vec3(p.x * .6 + uTime * .05, p.y * .9, uTime * .04)) * .5 + .5;
  n += .5 * (snoise(vec3(p * 1.7, uTime * .07)) * .5 + .5);
  float edge = smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x) * smoothstep(0., .2, vUv.y) * smoothstep(1., .8, vUv.y);
  gl_FragColor = vec4(vec3(.32, .4, .55) * .55, n * n * .07 * edge * uOpacity);
}
`;

export const tipVertex = /* glsl */ `
uniform float uSize;
uniform float uPixelRatio;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio / -mv.z;
}
`;
export const tipFragment = /* glsl */ `
uniform float uOpacity;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float core = smoothstep(.12, 0., d);
  float halo = smoothstep(.5, 0., d);
  vec3 col = vec3(1.0, .72, .32) * (halo * halo * 1.4 + core * 6.);
  gl_FragColor = vec4(col, (halo * .8 + core) * uOpacity);
}
`;

export const dustVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
varying float vA;
void main(){
  vec3 p = position;
  p.y += sin(uTime * .3 + position.x * 2.) * .05;
  p.x += cos(uTime * .2 + position.z) * .05;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  gl_PointSize = clamp(2.6 * uPixelRatio * 3. / d, .5, 3.5 * uPixelRatio);
  vA = smoothstep(.2, 1.5, d) * exp(-d * .12);
}
`;
export const dustFragment = /* glsl */ `
uniform float uOpacity;
varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  gl_FragColor = vec4(vec3(.9, .82, .68) * .5, smoothstep(.5, 0., d) * vA * uOpacity * .6);
}
`;
