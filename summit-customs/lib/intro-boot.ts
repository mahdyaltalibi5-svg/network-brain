/**
 * Pre-paint boot script for the homepage intro (inlined in <head>, ~1 KB).
 * Decides the mode before first paint so the veil never flashes the page:
 *   full     first visit this session
 *   micro    return visit this session (1.5 s)
 *   fallback reduced motion: the 3 s SVG version (pure SVG/SMIL, no WebGL)
 * Without JavaScript none of this runs and the page renders normally.
 * Skip / Escape / sound / tilt controls work from the first frame, before React hydrates.
 */
export const INTRO_BOOT = `(function(){try{
var d=document.documentElement,q=new URLSearchParams(location.search),w=window;
if(location.pathname!=="/"||q.get("intro")==="off")return;
var seen=false;try{seen=sessionStorage.getItem("sc-intro")==="1"}catch(e){}
if(q.get("intro")==="force")seen=false;
var rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
if(rm&&seen)return;
var mode=rm?"fallback":seen?"micro":"full";
d.dataset.intro=mode;d.classList.add("intro-on");
w.__introFinish=function(){if(d.classList.contains("intro-done"))return;if(scrollY>0)scrollTo(0,0);d.classList.add("intro-done");try{sessionStorage.setItem("sc-intro","1")}catch(e){}
var a=document.activeElement;if(a&&a.closest&&a.closest(".intro-ui")){var m=document.getElementById("main");m&&m.focus({preventScroll:true})}};
w.__startFallback=function(){clearTimeout(w.__introT);d.dataset.intro="fallback";d.classList.add("intro-fallback");
var s=document.getElementById("fb-draw");if(s&&s.beginElement)s.beginElement();w.__introT=setTimeout(w.__introFinish,2500)};
if(rm){d.classList.add("intro-fallback");document.addEventListener("DOMContentLoaded",function(){w.__startFallback()})}
else w.__introT=setTimeout(function(){if(!d.classList.contains("intro-active"))w.__introFinish()},5000);
var skip=function(){if(w.__introSkip)w.__introSkip();else w.__introFinish()};
document.addEventListener("click",function(e){var t=e.target;if(!t.closest)return;
if(t.closest("[data-intro-skip]"))skip();
var s=t.closest("[data-intro-sound]");if(s){var on=s.getAttribute("aria-pressed")!=="true";s.setAttribute("aria-pressed",String(on));s.querySelector("span").textContent=on?"Sound on":"Sound off";w.__introSound=on;w.__introSoundChange&&w.__introSoundChange(on)}
var g=t.closest("[data-intro-tilt]");if(g&&w.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission){DeviceOrientationEvent.requestPermission().then(function(r){w.__introTilt=r==="granted";g.hidden=true})}});
document.addEventListener("keydown",function(e){if(d.classList.contains("intro-done"))return;
if(e.key==="Escape")skip();
else if(e.key==="Tab"&&(document.activeElement===document.body||!document.activeElement)){var b=document.querySelector("[data-intro-skip]");if(b){e.preventDefault();b.focus()}}});
}catch(e){}})();`;
