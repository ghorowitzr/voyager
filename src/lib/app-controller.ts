// @ts-nocheck
/* Ported verified Voyages runtime. Pure logic lives in ./lib/* ; this is the
   imperative map + UI glue, mounted once by the React client component.
   Refactor into components incrementally — the storage seam (./storage) is the
   part that makes swapping in Supabase/Neon a drop-in later. */
import maplibregl from 'maplibre-gl';
import { localStore as Store } from './storage';

let _booted = false;
export function initVoyagesApp(){
  if (_booted) return; _booted = true;
/* ================================================================
   VOYAGES — persistent, water-routed expedition simulator (MVP)
   • Position is derived from elapsed simulation time (timestamps),
     so voyages keep progressing while you're away.
   • Events & diary are deterministic (seeded by voyage id).
   • Routes are computed with A* over a land/sea grid built from
     real coastline data, so ships sail AROUND land, never through it.
   ================================================================ */

/* ---------------- Ports ---------------- */
const PORTS=[
  {n:"Seville",c:"Spain",r:"Europe",lon:-6.35,lat:36.79},{n:"Sanlúcar",c:"Spain",r:"Europe",lon:-6.35,lat:36.77},
  {n:"Cádiz",c:"Spain",r:"Europe",lon:-6.29,lat:36.53},{n:"Palos",c:"Spain",r:"Europe",lon:-6.90,lat:37.23},
  {n:"Lisbon",c:"Portugal",r:"Europe",lon:-9.30,lat:38.60},{n:"Plymouth",c:"England",r:"Europe",lon:-4.35,lat:50.30},
  {n:"London",c:"England",r:"Europe",lon:-0.60,lat:51.45},{n:"Bristol",c:"England",r:"Europe",lon:-3.40,lat:51.35},
  {n:"Amsterdam",c:"Netherlands",r:"Europe",lon:4.30,lat:52.55},{n:"Marseille",c:"France",r:"Europe",lon:5.40,lat:43.25},
  {n:"Genoa",c:"Italy",r:"Europe",lon:9.00,lat:44.30},{n:"Venice",c:"Italy",r:"Europe",lon:12.50,lat:45.10},
  {n:"Athens",c:"Greece",r:"Europe",lon:23.65,lat:37.85},
  {n:"Madeira",c:"Atlantic",r:"Atlantic Isles",lon:-16.92,lat:32.65},{n:"Canary Islands",c:"Las Palmas",r:"Atlantic Isles",lon:-15.60,lat:28.10},
  {n:"Cape Verde",c:"Praia",r:"Atlantic Isles",lon:-23.90,lat:14.80},{n:"Azores",c:"Ponta Delgada",r:"Atlantic Isles",lon:-25.67,lat:37.74},
  {n:"Bermuda",c:"Atlantic",r:"Atlantic Isles",lon:-64.78,lat:32.29},{n:"St. Helena",c:"Atlantic",r:"Atlantic Isles",lon:-5.72,lat:-15.96},
  {n:"Salvador",c:"Brazil",r:"S. America",lon:-38.60,lat:-13.00},{n:"Recife",c:"Brazil",r:"S. America",lon:-34.95,lat:-8.10},
  {n:"Rio de Janeiro",c:"Brazil",r:"S. America",lon:-43.30,lat:-23.10},{n:"Río de la Plata",c:"Uruguay",r:"S. America",lon:-56.30,lat:-35.30},
  {n:"Punta Arenas",c:"Patagonia",r:"S. America",lon:-70.60,lat:-53.30},{n:"Valparaíso",c:"Chile",r:"S. America",lon:-71.80,lat:-33.05},
  {n:"Callao",c:"Peru",r:"S. America",lon:-77.30,lat:-12.10},{n:"Cartagena",c:"Colombia",r:"S. America",lon:-75.70,lat:10.30},
  {n:"Acapulco",c:"Mexico",r:"N. America",lon:-100.10,lat:16.70},{n:"Havana",c:"Cuba",r:"N. America",lon:-82.50,lat:23.20},
  {n:"San Salvador",c:"Bahamas",r:"N. America",lon:-74.50,lat:24.05},{n:"Hispaniola",c:"Caribbean",r:"N. America",lon:-71.00,lat:18.60},
  {n:"Veracruz",c:"Mexico",r:"N. America",lon:-96.30,lat:19.20},{n:"New York",c:"USA",r:"N. America",lon:-73.90,lat:40.55},
  {n:"Boston",c:"USA",r:"N. America",lon:-70.80,lat:42.30},{n:"San Francisco",c:"USA",r:"N. America",lon:-122.60,lat:37.70},
  {n:"Alexandria",c:"Egypt",r:"Africa",lon:29.90,lat:31.30},{n:"Cape of Good Hope",c:"S. Africa",r:"Africa",lon:18.30,lat:-34.50},
  {n:"Cape Town",c:"S. Africa",r:"Africa",lon:18.35,lat:-34.00},{n:"Mozambique",c:"Mozambique",r:"Africa",lon:40.80,lat:-19.80},
  {n:"Malindi",c:"Kenya",r:"Africa",lon:40.20,lat:-3.20},{n:"Mombasa",c:"Kenya",r:"Africa",lon:39.75,lat:-4.10},
  {n:"Zanzibar",c:"Tanzania",r:"Africa",lon:39.35,lat:-6.30},
  {n:"Aden",c:"Yemen",r:"Asia",lon:45.10,lat:12.60},{n:"Hormuz",c:"Persia",r:"Asia",lon:56.60,lat:26.60},
  {n:"Goa",c:"India",r:"Asia",lon:73.70,lat:15.40},{n:"Calicut",c:"India",r:"Asia",lon:75.60,lat:11.20},
  {n:"Colombo",c:"Ceylon",r:"Asia",lon:79.70,lat:6.90},{n:"Malacca",c:"Malaysia",r:"Asia",lon:102.10,lat:2.00},
  {n:"Batavia",c:"Jakarta",r:"Asia",lon:106.70,lat:-6.30},{n:"Manila",c:"Philippines",r:"Asia",lon:120.70,lat:14.60},
  {n:"Cebu",c:"Philippines",r:"Asia",lon:123.70,lat:10.30},{n:"Tidore",c:"Moluccas",r:"Asia",lon:127.30,lat:0.70},
  {n:"Guangzhou",c:"China",r:"Asia",lon:113.40,lat:22.90},{n:"Nagasaki",c:"Japan",r:"Asia",lon:129.70,lat:32.75},
  {n:"Nanjing",c:"China",r:"Asia",lon:120.90,lat:31.60},{n:"Tokyo",c:"Japan",r:"Asia",lon:139.90,lat:35.40},
  {n:"Guam",c:"Marianas",r:"Oceania",lon:144.80,lat:13.40},{n:"Tahiti",c:"Polynesia",r:"Oceania",lon:-149.50,lat:-17.60},
  {n:"Sydney",c:"Australia",r:"Oceania",lon:151.40,lat:-33.90},
  {n:"South Georgia",c:"S. Atlantic",r:"Antarctic",lon:-36.50,lat:-54.30},{n:"Elephant Island",c:"Antarctica",r:"Antarctic",lon:-55.20,lat:-61.10},
];
const REGIONS=["Europe","Atlantic Isles","N. America","S. America","Africa","Asia","Oceania","Antarctic"];

/* ---------------- Ships ---------------- */
const SHIPS=[
  {id:"victoria",name:"Victoria",type:"Carrack (Nao)",era:"1519",avg:4.2,max:8,cargo:85,crew:42,foodDays:150,waterDays:120,hull:100,sails:92,maneuver:55,nav:60,accuracy:96,blurb:"The first ship to circle the globe."},
  {id:"trinidad",name:"Trinidad",type:"Carrack (Nao)",era:"1519",avg:4.0,max:7.5,cargo:110,crew:55,foodDays:160,waterDays:130,hull:100,sails:90,maneuver:50,nav:58,accuracy:94,blurb:"Magellan's flagship."},
  {id:"santamaria",name:"Santa María",type:"Carrack",era:"1492",avg:3.8,max:7,cargo:100,crew:40,foodDays:120,waterDays:100,hull:96,sails:88,maneuver:48,nav:55,accuracy:92,blurb:"Columbus's largest vessel."},
  {id:"caravel",name:"Caravel",type:"Caravel",era:"15th c.",avg:5.2,max:9,cargo:50,crew:25,foodDays:110,waterDays:95,hull:94,sails:95,maneuver:82,nav:65,accuracy:90,blurb:"Nimble, weatherly, built for discovery."},
  {id:"galleon",name:"Galleon",type:"Galleon",era:"16th c.",avg:4.6,max:8.5,cargo:400,crew:130,foodDays:170,waterDays:140,hull:100,sails:90,maneuver:45,nav:70,accuracy:88,blurb:"Great ocean-going warship and trader."},
  {id:"clipper",name:"Clipper",type:"Clipper",era:"19th c.",avg:8.6,max:16,cargo:120,crew:30,foodDays:150,waterDays:130,hull:92,sails:99,maneuver:78,nav:88,accuracy:70,blurb:"The fastest sail ever built (experimental era)."},
  {id:"frigate",name:"Frigate",type:"Frigate",era:"18th c.",avg:7.2,max:13,cargo:90,crew:200,foodDays:140,waterDays:120,hull:98,sails:96,maneuver:74,nav:85,accuracy:78,blurb:"Fast, well-armed, long legs."},
  {id:"merchant",name:"Merchant Fluyt",type:"Merchant vessel",era:"17th c.",avg:4.4,max:8,cargo:500,crew:15,foodDays:180,waterDays:150,hull:95,sails:86,maneuver:52,nav:72,accuracy:84,blurb:"Cheap, capacious cargo hauler."},
];
const shipById=id=>SHIPS.find(s=>s.id===id)||SHIPS[0];

/* ---------------- Geo math ---------------- */
const R_NM=3440.065,toRad=d=>d*Math.PI/180,toDeg=r=>r*180/Math.PI;
function hav(a,b){const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),la1=toRad(a.lat),la2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R_NM*Math.asin(Math.min(1,Math.sqrt(h)));}
function slerp(a,b,t){const φ1=toRad(a.lat),λ1=toRad(a.lon),φ2=toRad(b.lat),λ2=toRad(b.lon);
  const d=2*Math.asin(Math.sqrt(Math.sin((φ2-φ1)/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin((λ2-λ1)/2)**2));
  if(d===0)return{lon:a.lon,lat:a.lat};const A=Math.sin((1-t)*d)/Math.sin(d),B=Math.sin(t*d)/Math.sin(d);
  const x=A*Math.cos(φ1)*Math.cos(λ1)+B*Math.cos(φ2)*Math.cos(λ2);const y=A*Math.cos(φ1)*Math.sin(λ1)+B*Math.cos(φ2)*Math.sin(λ2);
  const z=A*Math.sin(φ1)+B*Math.sin(φ2);return{lat:toDeg(Math.atan2(z,Math.sqrt(x*x+y*y))),lon:toDeg(Math.atan2(y,x))};}
function bearing(a,b){const φ1=toRad(a.lat),φ2=toRad(b.lat),Δλ=toRad(b.lon-a.lon);
  const y=Math.sin(Δλ)*Math.cos(φ2),x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (toDeg(Math.atan2(y,x))+360)%360;}
function compassPoint(brg){return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(brg/22.5)%16];}

function buildPath(points){
  const coords=[],cum=[0];let total=0;
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];const segNm=hav(a,b);const steps=Math.max(10,Math.round(segNm/55));
    for(let s=0;s<steps;s++){if(i>0&&s===0)continue;const p=slerp(a,b,s/steps);coords.push([p.lon,p.lat]);
      if(coords.length>1){total+=hav({lon:coords[coords.length-2][0],lat:coords[coords.length-2][1]},p);cum.push(total);}}}
  const last=points[points.length-1];coords.push([last.lon,last.lat]);
  total+=hav({lon:coords[coords.length-2][0],lat:coords[coords.length-2][1]},last);cum.push(total);
  return {coords,cum,total};
}
function pointAtDist(path,d){d=Math.max(0,Math.min(path.total,d));let i=1;while(i<path.cum.length-1&&path.cum[i]<d)i++;
  const d0=path.cum[i-1],d1=path.cum[i],t=d1>d0?(d-d0)/(d1-d0):0;
  const a={lon:path.coords[i-1][0],lat:path.coords[i-1][1]},b={lon:path.coords[i][0],lat:path.coords[i][1]};
  const p=slerp(a,b,t);return {lon:p.lon,lat:p.lat,brg:bearing(a,b)};}

/* ---------------- Land/sea grid + A* water routing ---------------- */
const RES=2,COLS=360/RES,ROWS=180/RES;
let LAND=null; // Uint8Array once built
const lonC=c=>-180+c*RES+RES/2, latR=r=>90-r*RES-RES/2;
const colOf=lon=>{let c=Math.floor((((lon+180)%360+360)%360)/RES);return (c%COLS+COLS)%COLS;};
const rowOf=lat=>Math.max(0,Math.min(ROWS-1,Math.floor((90-lat)/RES)));
const isLandCell=(c,r)=>LAND&&LAND[r*COLS+c]===1;
const isLandLL=(lon,lat)=>!!(LAND&&isLandCell(colOf(lon),rowOf(lat)));

function pointInRing(lon,lat,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
  if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
function buildLandGrid(features){
  const g=new Uint8Array(COLS*ROWS);
  const polys=[]; // {bbox:[minx,miny,maxx,maxy], rings:[[...outer], holes...]}
  for(const f of features){const geom=f.geometry;if(!geom)continue;
    const list=geom.type==="Polygon"?[geom.coordinates]:geom.type==="MultiPolygon"?geom.coordinates:[];
    for(const poly of list){const outer=poly[0];let minx=180,miny=90,maxx=-180,maxy=-90;
      for(const p of outer){if(p[0]<minx)minx=p[0];if(p[0]>maxx)maxx=p[0];if(p[1]<miny)miny=p[1];if(p[1]>maxy)maxy=p[1];}
      polys.push({bbox:[minx,miny,maxx,maxy],rings:poly});}}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const lon=lonC(c),lat=latR(r);
    for(const P of polys){const b=P.bbox;if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3])continue;
      if(pointInRing(lon,lat,P.rings[0])){let inHole=false;for(let h=1;h<P.rings.length;h++)if(pointInRing(lon,lat,P.rings[h])){inHole=true;break;}
        if(!inHole){g[r*COLS+c]=1;break;}}}}
  return g;
}
function nearestWater(lon,lat){if(!isLandLL(lon,lat))return{c:colOf(lon),r:rowOf(lat)};
  const c0=colOf(lon),r0=rowOf(lat);
  for(let rad=1;rad<40;rad++)for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){
    if(Math.max(Math.abs(dr),Math.abs(dc))!==rad)continue;const c=((c0+dc)%COLS+COLS)%COLS,r=r0+dr;
    if(r<0||r>=ROWS)continue;if(!isLandCell(c,r))return{c,r};}
  return{c:c0,r:r0};}
function segWater(a,b){const d=hav(a,b),n=Math.max(1,Math.ceil(d/55));for(let i=1;i<n;i++){const f=i/n;if(f*d<70||(1-f)*d<70)continue;const p=slerp(a,b,f);if(isLandLL(p.lon,p.lat))return false;}return true;}
function astar(start,goal){
  const s=nearestWater(start.lon,start.lat),g=nearestWater(goal.lon,goal.lat);
  const sIdx=s.r*COLS+s.c,gIdx=g.r*COLS+g.c;if(sIdx===gIdx)return[start,goal];
  const open=new Map(),came=new Map(),gS=new Map();gS.set(sIdx,0);
  open.set(sIdx,hav({lon:lonC(s.c),lat:latR(s.r)},{lon:lonC(g.c),lat:latR(g.r)}));
  let guard=0;
  while(open.size){if(guard++>120000)break;let cur=-1,best=Infinity;for(const[k,v]of open)if(v<best){best=v;cur=k;}
    if(cur===gIdx)break;open.delete(cur);const cr=Math.floor(cur/COLS),cc=cur%COLS;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=cr+dr;if(nr<0||nr>=ROWS)continue;
      const nc=((cc+dc)%COLS+COLS)%COLS;if(isLandCell(nc,nr))continue;const nIdx=nr*COLS+nc;
      const t=gS.get(cur)+hav({lon:lonC(cc),lat:latR(cr)},{lon:lonC(nc),lat:latR(nr)});
      if(t<(gS.get(nIdx)??Infinity)){came.set(nIdx,cur);gS.set(nIdx,t);open.set(nIdx,t+hav({lon:lonC(nc),lat:latR(nr)},{lon:lonC(g.c),lat:latR(g.r)}));}}}
  if(!came.has(gIdx))return null;
  const path=[];let cur=gIdx;while(cur!==undefined){path.unshift(cur);if(cur===sIdx)break;cur=came.get(cur);}
  const pts=path.map(i=>({lon:lonC(i%COLS),lat:latR(Math.floor(i/COLS))}));
  pts.unshift({lon:start.lon,lat:start.lat});pts.push({lon:goal.lon,lat:goal.lat});return pts;
}
function smooth(pts){if(!pts||pts.length<3)return pts;const out=[pts[0]];let i=0;
  while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!segWater(pts[i],pts[j]))j--;out.push(pts[j]);i=j;}return out;}
// Route between two named points, avoiding land. Falls back to direct if grid not ready.
function routeLeg(a,b){
  if(!LAND) return [a,b];
  if(segWater(a,b)) return [a,b];
  const raw=astar(a,b);if(!raw) return [a,b];
  return smooth(raw);
}
// Full route through user points -> water-safe polyline of {lon,lat} nodes
function computeRoute(points){
  if(points.length<2) return points.slice();
  const out=[points[0]];
  for(let i=0;i<points.length-1;i++){const leg=routeLeg(points[i],points[i+1]);for(let k=1;k<leg.length;k++)out.push(leg[k]);}
  return out;
}

/* ---------------- Deterministic RNG ---------------- */
function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return (h^h>>>16)>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* ---------------- Event templates ---------------- */
const EVENTS=[
  {type:"wind",major:false,icon:"💨",cat:"weather",title:"Strong Winds",
    text:e=>`A steady following wind filled the sails; the ship surged ahead. Estimated arrival improved by ${Math.abs(e.eta).toFixed(1)} days.`,
    eff:r=>({eta:-(0.4+r*0.7),sails:-1})},
  {type:"storm",major:true,icon:"⚠️",cat:"weather",title:"Storm",
    text:e=>`A violent storm battered the ship. Hull integrity fell ${Math.abs(e.hull).toFixed(0)}%, sails ${Math.abs(e.sails).toFixed(0)}%, and arrival slipped ${e.eta.toFixed(1)} days.`,
    eff:r=>({hull:-(4+r*5),sails:-(3+r*4),water:-(2+r*3),eta:+(0.8+r*1.1)})},
  {type:"calm",major:false,icon:"🌊",cat:"weather",title:"Calm Waters",
    text:e=>`The ship drifted into a windless expanse of glassy sea. Arrival slipped ${e.eta.toFixed(1)} days.`,
    eff:r=>({eta:+(0.4+r*0.8)})},
  {type:"water",major:false,icon:"💧",cat:"supplies",title:"Low Water",
    text:e=>`The quartermaster reports fresh water running low. Rations were tightened under a hard sun.`,
    eff:r=>({water:-(7+r*7)})},
  {type:"food",major:false,icon:"🥖",cat:"supplies",title:"Provisions Spoiled",
    text:e=>`Casks of salted meat were found rotten and cast overboard.`,
    eff:r=>({food:-(6+r*8)})},
  {type:"scurvy",major:true,icon:"🩺",cat:"crew",title:"Sickness Aboard",
    text:e=>`Scurvy spread among the crew. The surgeon's stores were drawn down.`,
    eff:r=>({medicine:-(9+r*10),crew:-1})},
  {type:"current",major:false,icon:"🧭",cat:"navigation",title:"Favorable Current",
    text:e=>`The ship caught a current running true toward its heading. Arrival improved by ${Math.abs(e.eta).toFixed(1)} days.`,
    eff:r=>({eta:-(0.4+r*0.6)})},
  {type:"discovery",major:true,icon:"🏝️",cat:"discovery",title:"Land Sighted",
    text:e=>`The lookout cried land — an island unmarked on any chart. The crew's spirits lifted at the discovery.`,
    eff:r=>({food:+2})},
  {type:"whale",major:true,icon:"🐋",cat:"discovery",title:"A Great Whale",
    text:e=>`A whale broke the surface alongside, vast and unhurried, before sounding into the deep.`,eff:r=>({})},
  {type:"repair",major:false,icon:"🔨",cat:"navigation",title:"Repairs at Sea",
    text:e=>`The carpenter mended a strained seam in the hull.`,eff:r=>({hull:+(3+r*3),sails:+2})},
  {type:"mutiny",major:true,icon:"⚔️",cat:"crew",title:"Unrest",
    text:e=>`Discontent stirred below decks. The captain restored order, but the day was lost.`,
    eff:r=>({eta:+(0.5+r*0.6),crew:-1})},
];
const WEATHERS=["Clear","Fair","Overcast","Squally","Foggy","Windy","Fine","Grey skies"];
const WINDS=["N","NE","E","SE","S","SW","W","NW","NNW","WSW","ESE","ENE"];

/* ---------------- Voyage model ---------------- */
function makeVoyage(o){
  const ship=shipById(o.shipId);
  const routePts=[o.start,...(o.waypoints||[]),o.dest];
  const nodes=o.routeNodes||computeRoute(routePts);   // water-safe polyline
  const path=buildPath(nodes);
  const durationDays=path.total/(ship.avg*24);
  return {
    id:o.id, name:o.name||ship.name, shipId:ship.id, expedition:o.expedition||"",
    start:o.start, dest:o.dest, waypoints:o.waypoints||[], routeNodes:nodes,
    distanceNm:path.total, baseDurationDays:durationDays,
    departDate:o.departDate||new Date().toISOString(),
    startTimestamp:o.startTimestamp||Date.now(), simSpeed:o.simSpeed??1, paused:o.paused??false,
    simAccumDays:o.simAccumDays||0, lastToggleTs:o.lastToggleTs||Date.now(),
    lastViewedSimDay:o.lastViewedSimDay||0, demo:!!o.demo, _rev:0, _arrived:false,
  };
}
function simDaysNow(v,now=Date.now()){if(v.paused)return v.simAccumDays;return v.simAccumDays+((now-v.lastToggleTs)/86400000)*v.simSpeed;}
function bank(v,now=Date.now()){v.simAccumDays=simDaysNow(v,now);v.lastToggleTs=now;}
function setSpeed(v,s){bank(v);v.simSpeed=s;}
function setPaused(v,p){bank(v);v.paused=p;}
function advanceDays(v,d){bank(v);v.simAccumDays=Math.min(v.simAccumDays+d,v.baseDurationDays);}

/* deterministic event schedule (independent of time) */
function eventSchedule(v){
  const rng=mulberry32(hashStr(v.id));const evs=[];const dur=v.baseDurationDays;
  let day=1.5+rng()*2.5,guard=0;
  const density=Math.max(2.0,dur/9); // fewer events per day on very long voyages
  while(day<dur-0.6&&guard++<80){const tpl=EVENTS[Math.floor(rng()*EVENTS.length)];const eff=tpl.eff(rng());
    evs.push({day:+day.toFixed(1),tpl,eff});day+=density*(0.5+rng());}
  return evs;
}
/* waypoint arrival days (provisioning stops) */
function stopDays(v){
  const ship=shipById(v.shipId);const pts=[v.start,...v.waypoints,v.dest];
  const seg=buildPath(pts);// distances along the *named* points (approx for stop timing)
  // cumulative dist to each named point using water route proportion
  const full=v.distanceNm;const out=[];let acc=0;
  for(let i=1;i<pts.length-1;i++){acc+=hav(pts[i-1],pts[i]);}
  // simpler: distribute stops by straight-line cumulative fraction of total straight distance
  let straightTotal=0;for(let i=0;i<pts.length-1;i++)straightTotal+=hav(pts[i],pts[i+1]);
  let c=0;for(let i=1;i<pts.length-1;i++){c+=hav(pts[i-1],pts[i]);const frac=straightTotal?c/straightTotal:0;out.push({name:pts[i].n,day:frac*v.baseDurationDays});}
  return out;
}

/* full simulation walk (memoized) */
const simCache=new Map();
function simulate(v,uptoDay){
  const ship=shipById(v.shipId);const dur=v.baseDurationDays;
  const upto=Math.max(0,Math.min(uptoDay,dur));
  const key=v.id+"|"+v._rev+"|"+Math.floor(upto*4);
  if(simCache.has(key))return simCache.get(key);
  const evAll=eventSchedule(v);const stops=stopDays(v);
  const rng=mulberry32(hashStr(v.id)^0x9e3779b9);
  const depart=new Date(v.departDate);
  let hull=ship.hull,sails=ship.sails,food=100,water=100,medicine=100,crew=ship.crew,eta=0;
  const foodRate=100/ship.foodDays, waterRate=100/ship.waterDays;
  const diary=[];const nDays=Math.max(1,Math.ceil(upto));
  const path=buildPath(v.routeNodes);
  let stopIdx=0;
  for(let d=1;d<=nDays;d++){
    food-=foodRate;water-=waterRate;medicine-=0.25;hull-=0.05;
    // provisioning stop reached?
    while(stopIdx<stops.length&&stops[stopIdx].day<=d){const s=stops[stopIdx];food=Math.max(food,90);water=Math.max(water,88);medicine=Math.min(100,medicine+20);
      diary.push(mkStop(v,d,depart,s.name,path,d/dur));stopIdx++;}
    // events on this day
    const todays=evAll.filter(e=>Math.floor(e.day)===d);
    for(const e of todays){const f=e.eff;if(f.hull)hull+=f.hull;if(f.sails)sails+=f.sails;if(f.food)food+=f.food;
      if(f.water)water+=f.water;if(f.medicine)medicine+=f.medicine;if(f.eta)eta+=f.eta;if(f.crew)crew+=f.crew;}
    // starvation / thirst crew loss
    if(food<=0||water<=0){const loss=(rng()<0.6?1:0)+(medicine<20?1:0);crew=Math.max(0,crew-loss);}
    hull=cl(hull);sails=cl(sails);food=cl(food);water=cl(water);medicine=cl(medicine);
    // diary entry for the day (event days emphasized)
    const r1=rng(),r2=rng();const weather=WEATHERS[Math.floor(r1*WEATHERS.length)],wind=WINDS[Math.floor(r2*WINDS.length)];
    const pos=pointAtDist(path,Math.min(1,d/dur)*v.distanceNm);const date=new Date(depart.getTime()+d*86400000);
    const instSpeed=ship.avg*(1+Math.sin(d*1.6)*0.05);
    if(todays.length){for(const e of todays){diary.push({day:d,date,major:e.tpl.major,cat:e.tpl.cat,icon:e.tpl.icon,title:e.tpl.title,
      text:e.tpl.text({hull:e.eff.hull||0,sails:e.eff.sails||0,water:e.eff.water||0,food:e.eff.food||0,eta:e.eff.eta||0}),
      meta:`${weather} · Wind ${wind} · ${fmtCoord(pos.lat,pos.lon)}`});}}
    else diary.push({day:d,date,major:d===1,cat:d===1?"navigation":"navigation",icon:d===1?"⚓":null,title:d===1?"Departure":null,
      text:dayText(d,v,ship,crew,weather,wind,instSpeed,path,d/dur,rng),
      meta:`${weather} · Wind ${wind} · ${instSpeed.toFixed(1)} kn · ${fmtCoord(pos.lat,pos.lon)}`});
  }
  const res={final:{hull,sails,food,water,medicine,crew,eta},diary,events:evAll,stops};
  simCache.set(key,res);return res;
}
function mkStop(v,d,depart,name,path,frac){const pos=pointAtDist(path,Math.min(1,frac)*v.distanceNm);
  return {day:d,date:new Date(depart.getTime()+d*86400000),major:true,cat:"navigation",icon:"⚓",title:"Provisioning — "+name,
    text:`The expedition put in at ${name} to take on fresh food and water and to make repairs. The crew rested.`,
    meta:`Anchored · ${fmtCoord(pos.lat,pos.lon)}`};}
function dayText(d,v,ship,crew,weather,wind,spd,path,frac,rng){
  if(d===1)return `The ${v.name} departed ${v.start.n} under ${weather.toLowerCase()} skies, ${crew} souls aboard. The open sea lies ahead toward ${v.dest.n}.`;
  const rem=Math.round((1-Math.min(1,frac))*v.distanceNm);
  const lines=[`The ${v.name} held her course toward ${v.dest.n}. The crew kept to their watches.`,
    `A quiet day of sailing; ${rem.toLocaleString()} nautical miles remain to ${v.dest.n}.`,
    `The sea ran ${weather.toLowerCase()}, the wind out of the ${wind}. Steady progress at ${spd.toFixed(1)} knots.`,
    `The log records ${spd.toFixed(1)} knots. Spirits aboard remain fair.`,
    `Another day upon the water. The horizon yields nothing but more horizon.`];
  return lines[Math.floor(rng()*lines.length)];
}
function cl(x){return Math.max(0,Math.min(100,x));}

/* derived instantaneous state */
function stateAt(v,curDay){
  const ship=shipById(v.shipId);const dur=v.baseDurationDays;const done=curDay>=dur;
  const cd=Math.max(0,Math.min(curDay,dur));
  const sim=simulate(v,cd);const f=sim.final;
  const path=buildPath(v.routeNodes);const distSoFar=Math.min(1,cd/dur)*v.distanceNm;
  const pos=pointAtDist(path,distSoFar);
  const adjDur=dur+f.eta;const remainingDays=Math.max(0,adjDur-curDay);
  const instSpeed=Math.max(1.2,ship.avg*(1+Math.sin(cd*1.6)*0.05)+(done?0:0));
  const rng=mulberry32(hashStr(v.id)^(Math.floor(cd)+7));const weather=WEATHERS[Math.floor(rng()*WEATHERS.length)],wind=WINDS[Math.floor(rng()*WINDS.length)];
  // next stop
  let nextStop=null;for(const s of sim.stops)if(s.day>cd){nextStop=s;break;}
  return {ship,curDay,done,dur,adjDur,pos,brg:pos.brg,heading:compassPoint(pos.brg),
    hull:f.hull,sails:f.sails,food:f.food,water:f.water,medicine:f.medicine,crew:f.crew,
    distSoFar,distRemaining:Math.max(0,v.distanceNm-distSoFar),remainingDays,instSpeed,weather,wind,
    events:sim.events,stops:sim.stops,nextStop,diary:sim.diary};
}
function fmtCoord(lat,lon){return `${Math.abs(lat).toFixed(1)}° ${lat>=0?'N':'S'}, ${Math.abs(lon).toFixed(1)}° ${lon>=0?'E':'W'}`;}
function fmtDate(dt){return dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function fmtLongDate(dt){return dt.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});}

/* ---------------- Persistence ---------------- */
const STORAGE_KEY="voyages_state_v2";
let STATE={voyages:[],activeId:null};
function save(){try{const slim={activeId:STATE.activeId,voyages:STATE.voyages.map(v=>({
  id:v.id,name:v.name,shipId:v.shipId,expedition:v.expedition,start:v.start,dest:v.dest,waypoints:v.waypoints,
  routeNodes:v.routeNodes,departDate:v.departDate,startTimestamp:v.startTimestamp,simSpeed:v.simSpeed,paused:v.paused,
  simAccumDays:v.simAccumDays,lastToggleTs:v.lastToggleTs,lastViewedSimDay:v.lastViewedSimDay,demo:v.demo,ci:v.ci,color:v.color}))};
  Store.setState(slim);}catch(e){}}
function load(){try{const s=Store.getState();if(s){
  s.voyages=s.voyages.map(o=>makeVoyage(o));return s;}}catch(e){}return null;}
function activeVoyage(){return STATE.voyages.find(v=>v.id===STATE.activeId)||STATE.voyages[0];}

/* ---------------- Historical reference routes (hand-authored, water-safe) ---------------- */
function P(n){return PORTS.find(p=>p.n===n);}
function W(lon,lat,n){return {lon,lat,n:n||"·"};}
const HISTORIES=[
  {id:"magellan",name:"Magellan's Circumnavigation",captain:"Ferdinand Magellan",year:"1519–1522",shipId:"victoria",
    blurb:"The first voyage around the world. Seville to the Spice Islands and home.",
    depart:"1519-08-10",
    nodes:[P("Seville"),P("Canary Islands"),W(-24,8,"Doldrums"),P("Rio de Janeiro"),P("Río de la Plata"),
      P("Punta Arenas"),W(-72,-56,"Cape Horn"),W(-90,-40),W(-120,-20),W(-150,-5),P("Guam"),P("Cebu")]},
  {id:"columbus",name:"Columbus's First Voyage",captain:"Christopher Columbus",year:"1492",shipId:"santamaria",
    blurb:"Palos across the Atlantic to the Bahamas and the Caribbean.",depart:"1492-08-03",
    nodes:[P("Palos"),P("Canary Islands"),W(-40,25),W(-60,24),P("San Salvador"),P("Havana"),P("Hispaniola")]},
  {id:"dagama",name:"Da Gama to India",captain:"Vasco da Gama",year:"1497–1499",shipId:"caravel",
    blurb:"Lisbon around the Cape of Good Hope to Calicut — the sea road to the Indies.",depart:"1497-07-08",
    nodes:[P("Lisbon"),P("Cape Verde"),W(-25,-10,"Volta do Mar"),W(-10,-32),P("Cape of Good Hope"),
      P("Mozambique"),P("Malindi"),W(60,5),P("Calicut")]},
  {id:"cook",name:"Cook's First Voyage",captain:"James Cook",year:"1768–1771",shipId:"frigate",
    blurb:"Plymouth to Tahiti and beyond, charting the Pacific.",depart:"1768-08-26",
    nodes:[P("Plymouth"),P("Madeira"),P("Rio de Janeiro"),W(-65,-57,"Cape Horn"),W(-100,-40),W(-135,-25),P("Tahiti")]},
  {id:"zhenghe",name:"Zheng He's Treasure Fleet",captain:"Zheng He",year:"1405–1433",shipId:"galleon",
    blurb:"The great Ming fleet from China across the Indian Ocean.",depart:"1405-07-11",
    nodes:[P("Nanjing"),W(112,8),P("Malacca"),P("Colombo"),P("Calicut"),W(62,15),P("Hormuz")]},
  {id:"shackleton",name:"Shackleton's Endurance",captain:"Ernest Shackleton",year:"1914–1916",shipId:"caravel",
    blurb:"Into the Weddell Sea ice — the great survival epic of the Antarctic.",depart:"1914-12-05",
    nodes:[P("South Georgia"),W(-30,-74,"Weddell Sea"),P("Elephant Island"),P("South Georgia")]},
];

/* ---------------- Map ---------------- */
let map,shipMarkers={},endpointMarkers=[],portMarkers=[],rafOn=false;
let THEME=localStorage.getItem('voyages_theme')||'night';
const THEMES={
  night:{ocean:"#0a1f34",land:"#152b20",coast:"#2f6b57",grat:"#3f6d8e",gratOp:.2},
  day:{ocean:"#a9cbe0",land:"#e6dcc0",coast:"#b9a877",grat:"#6f95b3",gratOp:.28},
};
function applyTheme(t){THEME=t;document.body.dataset.theme=t;localStorage.setItem('voyages_theme',t);
  document.getElementById('themeToggle').textContent=t==='day'?'☀':'☾';applyMapTheme();}
function applyMapTheme(){if(!map||!map.getLayer('ocean'))return;const c=THEMES[THEME];
  map.setPaintProperty('ocean','background-color',c.ocean);
  map.setPaintProperty('land','fill-color',c.land);
  map.setPaintProperty('coast','line-color',c.coast);
  if(map.getLayer('grat')){map.setPaintProperty('grat','line-color',c.grat);map.setPaintProperty('grat','line-opacity',c.gratOp);}}
const PAL=["#e23d3d","#3d7de2","#e5c33a","#41ad4b","#e08a2f","#9b5fd6","#3fb0a0","#d060a8"];
const PAL_NAMES=["red","blue","yellow","green","orange","purple","teal","pink"];
function ensureColors(){STATE.voyages.forEach((v,i)=>{if(v.ci==null){v.ci=i%PAL.length;}v.color=PAL[v.ci];});save();}
function addArrowImages(){for(let i=0;i<PAL.length;i++){const s=22,cv=document.createElement('canvas');cv.width=s;cv.height=s;const x=cv.getContext('2d');
  x.clearRect(0,0,s,s);x.fillStyle=PAL[i];x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;
  x.beginPath();x.moveTo(6,4);x.lineTo(17,11);x.lineTo(6,18);x.lineTo(9,11);x.closePath();x.fill();x.stroke();
  const img=x.getImageData(0,0,s,s);if(!map.hasImage('arrow-'+i))map.addImage('arrow-'+i,img,{pixelRatio:2});}}
function initMap(){
  map=new maplibregl.Map({container:"map",
    style:{version:8,glyphs:"https://basemaps.cartocdn.com/gl/dark-matter-gl-style/{fontstack}/{range}.pbf",
      sources:{world:{type:"geojson",data:"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"}},
      layers:[{id:"ocean",type:"background",paint:{"background-color":"#0a1f34"}},
        {id:"land",type:"fill",source:"world",paint:{"fill-color":"#152b20","fill-opacity":.92}},
        {id:"coast",type:"line",source:"world",paint:{"line-color":"#2f6b57","line-width":.7,"line-opacity":.7}}]},
    center:[-25,10],zoom:2.3,maxZoom:9,minZoom:1.3,renderWorldCopies:true,attributionControl:{compact:true}});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
  map.on('load',()=>{addGraticule();addPorts();addArrowImages();setupRouteLayers();applyMapTheme();fetchLandGrid();
    refreshAll(true);document.getElementById('boot').style.opacity='0';setTimeout(()=>{const b=document.getElementById('boot');if(b)b.remove();},700);startRAF();});
  map.on('error',()=>{});
}
function fetchLandGrid(){
  fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson")
   .then(r=>r.json()).then(gj=>{LAND=buildLandGrid(gj.features);rerouteAll();showToast("Charts loaded — routes steer around land");})
   .catch(()=>{
     fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson")
      .then(r=>r.json()).then(gj=>{LAND=buildLandGrid(gj.features);rerouteAll();}).catch(()=>{});});
}
/* re-route any voyage whose stored path crosses land (e.g. launched before the grid loaded, or hand-authored) */
function reroute(v){const ship=shipById(v.shipId);const pts=[v.start,...(v.waypoints||[]),v.dest];const nodes=computeRoute(pts);
  v.routeNodes=nodes;const path=buildPath(nodes);v.distanceNm=path.total;v.baseDurationDays=path.total/(ship.avg*24);v._rev=(v._rev||0)+1;}
function crossesLand(v){const n=v.routeNodes;for(let i=0;i<n.length-1;i++)if(!segWater(n[i],n[i+1]))return true;return false;}
function rerouteAll(){if(!LAND)return;let changed=false;STATE.voyages.forEach(v=>{if(crossesLand(v)){reroute(v);changed=true;}});
  if(changed){save();refreshAll(false);}}
function addGraticule(){const feats=[];
  for(let lat=-60;lat<=75;lat+=15){const c=[];for(let lon=-180;lon<=180;lon+=5)c.push([lon,lat]);feats.push({type:"Feature",geometry:{type:"LineString",coordinates:c}});}
  for(let lon=-180;lon<=180;lon+=15){const c=[];for(let lat=-80;lat<=85;lat+=5)c.push([lon,lat]);feats.push({type:"Feature",geometry:{type:"LineString",coordinates:c}});}
  map.addSource('grat',{type:'geojson',data:{type:"FeatureCollection",features:feats}});
  map.addLayer({id:'grat',type:'line',source:'grat',paint:{"line-color":"#3f6d8e","line-width":.4,"line-opacity":.2}});}
function addPorts(){PORTS.forEach(p=>{const el=document.createElement('div');el.className='port-marker';el.title=`${p.n}, ${p.c}`;
  const m=new maplibregl.Marker({element:el}).setLngLat([p.lon,p.lat]).addTo(map);el.addEventListener('click',()=>onPortClick(p));portMarkers.push(m);});}
function setupRouteLayers(){
  map.addSource('v-lines',{type:'geojson',data:emptyFC()});
  map.addSource('v-done',{type:'geojson',data:emptyFC()});
  map.addSource('route-ref',{type:'geojson',data:emptyFC()});
  map.addSource('route-preview',{type:'geojson',data:emptyFC()});
  map.addLayer({id:'route-ref',type:'line',source:'route-ref',paint:{"line-color":"#5a86b3","line-width":1.4,"line-opacity":.6,"line-dasharray":[3,2]}});
  map.addLayer({id:'v-lines',type:'line',source:'v-lines',layout:{"line-cap":"round"},paint:{
    "line-color":["get","color"],"line-dasharray":[0,2.6],
    "line-width":["case",["==",["get","active"],1],2.4,1.5],
    "line-opacity":["case",["==",["get","active"],1],.5,.32]}});
  map.addLayer({id:'v-done',type:'line',source:'v-done',layout:{"line-cap":"round"},paint:{"line-color":["get","color"],"line-dasharray":[0,2.4],
    "line-width":["case",["==",["get","active"],1],3,1.8],"line-opacity":["case",["==",["get","active"],1],1,.6]}});
  map.addLayer({id:'v-arrows',type:'symbol',source:'v-lines',layout:{
    "symbol-placement":"line","symbol-spacing":95,"icon-image":["concat","arrow-",["to-string",["get","ci"]]],
    "icon-rotation-alignment":"map","icon-allow-overlap":false,"icon-ignore-placement":false,"icon-size":0.9,"icon-keep-upright":false},
    paint:{"icon-opacity":["case",["==",["get","active"],1],.95,.6]}});
  map.addLayer({id:'route-preview',type:'line',source:'route-preview',paint:{"line-color":"#e5c877","line-width":1.8,"line-opacity":.7,"line-dasharray":[2,2]}});
}
const emptyFC=()=>({type:"FeatureCollection",features:[]});
const lineFeat=coords=>({type:"Feature",geometry:{type:"LineString",coordinates:coords}});

function buildRouteFCs(){const lines=[],done=[];const v=activeVoyage();
  if(v){const path=buildPath(v.routeNodes);
    lines.push({type:'Feature',properties:{color:v.color,ci:v.ci,active:1},geometry:{type:'LineString',coordinates:path.coords}});
    const st=stateAt(v,simDaysNow(v));const cutD=st.distSoFar;const dc=[];
    for(let i=0;i<path.coords.length;i++){if(path.cum[i]<=cutD)dc.push(path.coords[i]);}
    const cut=pointAtDist(path,cutD);dc.push([cut.lon,cut.lat]);
    if(dc.length>1)done.push({type:'Feature',properties:{color:v.color,active:1},geometry:{type:'LineString',coordinates:dc}});}
  return {lines:{type:"FeatureCollection",features:lines},done:{type:"FeatureCollection",features:done}};}
function refreshAll(fit){
  if(!map.getSource('v-lines'))return;
  const fc=buildRouteFCs();map.getSource('v-lines').setData(fc.lines);map.getSource('v-done').setData(fc.done);
  const v=activeVoyage();if(!v)return;
  endpointMarkers.forEach(m=>m.remove());endpointMarkers=[];
  addEndpoint(v.start,'start',v.start.n);(v.waypoints||[]).forEach(w=>addEndpoint(w,'way',w.n));addEndpoint(v.dest,'end',v.dest.n);
  syncShipMarkers();
  if(fit)fitToVoyage(v);
}
function updateDone(){if(!map.getSource('v-done'))return;const done=[];const v=activeVoyage();
  if(v){const path=buildPath(v.routeNodes);const st=stateAt(v,simDaysNow(v));const cutD=st.distSoFar;const dc=[];
    for(let i=0;i<path.coords.length;i++){if(path.cum[i]<=cutD)dc.push(path.coords[i]);}
    const cut=pointAtDist(path,cutD);dc.push([cut.lon,cut.lat]);if(dc.length>1)done.push({type:'Feature',properties:{color:v.color,active:1},geometry:{type:'LineString',coordinates:dc}});}
  map.getSource('v-done').setData({type:"FeatureCollection",features:done});}
function fitToVoyage(v){const path=buildPath(v.routeNodes);const b=new maplibregl.LngLatBounds();path.coords.forEach(c=>b.extend(c));
  map.fitBounds(b,{padding:{top:110,bottom:90,left:70,right:360},duration:1300,maxZoom:5});}
function addEndpoint(port,kind,label){const el=document.createElement('div');el.className='endpoint '+kind;
  el.innerHTML=`<div class="dot"></div><div class="lbl">${label}</div>`;
  const m=new maplibregl.Marker({element:el,anchor:'top'}).setLngLat([port.lon,port.lat]).addTo(map);endpointMarkers.push(m);}

function syncShipMarkers(){
  const ids=new Set(STATE.voyages.map(v=>v.id));
  Object.keys(shipMarkers).forEach(id=>{if(!ids.has(id)){shipMarkers[id].remove();delete shipMarkers[id];}});
  STATE.voyages.forEach(v=>{const path=buildPath(v.routeNodes);const st=stateAt(v,simDaysNow(v));const pt=pointAtDist(path,st.distSoFar);
    if(!shipMarkers[v.id]){const el=document.createElement('div');el.className='ship-marker';
      el.innerHTML=`<div class="inner">${shipSVG(shipById(v.shipId))}</div>`;el.addEventListener('click',()=>{STATE.activeId=v.id;save();refreshAll(false);toggleShipCard(true);});
      shipMarkers[v.id]=new maplibregl.Marker({element:el,rotationAlignment:'viewport'}).setLngLat([pt.lon,pt.lat]).addTo(map);}
    const m=shipMarkers[v.id];m.setLngLat([pt.lon,pt.lat]);
    const el=m.getElement();el.classList.toggle('dim',v.id!==STATE.activeId);
    const inner=el.querySelector('.inner');inner.style.transform=(pt.brg>180?'scaleX(-1)':'scaleX(1)');});
}
/* side-view sailing-ship silhouettes, type-accurate. Bow faces right; marker flips when heading west. */
function shipClass(ship){const t=(ship.type||"").toLowerCase();if(t.includes("caravel"))return"caravel";
  if(t.includes("galleon")||t.includes("frigate"))return"tallship";if(t.includes("clipper"))return"clipper";return"carrack";}
function shipArt(cls,scale){scale=scale||1;const w=Math.round(48*scale),h=Math.round(36*scale);
  const hull=`<path d="M5 24 Q4 21 8 21 L40 21 Q44 21 41 25 L36 29 Q34 30 30 30 L14 30 Q10 30 9 28 Z" fill="#7a5c2e" stroke="#4a3718" stroke-width="0.8"/>`;
  const pennant=(x,y)=>`<path d="M${x} ${y} L${x+6} ${y+1.4} L${x} ${y+2.8} Z" fill="#c0392b" stroke="#7a2118" stroke-width="0.4"/>`;
  const mast=(x,top)=>`<rect x="${x-0.6}" y="${top}" width="1.2" height="${21-top}" fill="#4a3718"/>`;
  const sq=(x,yt,yb,ww,fill)=>`<path d="M${x-ww} ${yt} Q${x} ${yt-1.2} ${x+ww} ${yt} L${x+ww} ${yb} Q${x} ${yb+1.6} ${x-ww} ${yb} Z" fill="${fill||'#efe2c4'}" stroke="#b7a06a" stroke-width="0.5"/>`;
  const lateen=(x,yt,yb,dir,fill)=>`<path d="M${x} ${yt} L${x+dir*8} ${yb} L${x} ${yb} Z" fill="${fill||'#efe2c4'}" stroke="#b7a06a" stroke-width="0.5"/>`;
  let g="";
  if(cls==="carrack"){ // Victoria — high fore & aft castles, 3 masts, square main+fore, lateen mizzen
    g=`<path d="M9 21 L9 15 Q9 13 12 13 L15 13 Q17 13 17 16 L17 21 Z" fill="#6b4f28" stroke="#4a3718" stroke-width="0.6"/>
       <path d="M33 21 L33 14 Q33 11 37 11 L40 11 Q42 11 41.5 14 L41 21 Z" fill="#6b4f28" stroke="#4a3718" stroke-width="0.6"/>
       ${mast(14,5)}${mast(24,2)}${mast(35,7)}
       ${sq(24,4,11,6)}${sq(24,12,18,5,'#e7d6b0')}
       ${sq(14,7,13,4)}
       ${lateen(35,9,18,1,'#e7d6b0')}
       ${pennant(24,1.5)}${pennant(14,4.5)}`;
  } else if(cls==="caravel"){ // small, nimble, lateen-rigged
    g=`${mast(16,4)}${mast(28,3)}${mast(38,8)}
       ${lateen(16,5,19,1,'#efe2c4')}${lateen(28,4,19,1,'#e7d6b0')}${lateen(38,9,19,1,'#efe2c4')}
       ${pennant(28,2.5)}`;
  } else if(cls==="tallship"){ // galleon / frigate — long hull, many square sails, gunports
    g=`<path d="M31 21 L31 13 Q31 10 35 10 L41 10 Q43 10 42.5 14 L41 21 Z" fill="#6b4f28" stroke="#4a3718" stroke-width="0.6"/>
       ${mast(13,4)}${mast(23,1)}${mast(33,3)}
       ${sq(13,6,12,4.5)}${sq(23,3,10,5.5)}${sq(23,11,17,4.5,'#e7d6b0')}${sq(33,5,12,5)}${sq(33,13,18,4,'#e7d6b0')}
       ${pennant(23,0.5)}
       <g fill="#3a2c14"><circle cx="16" cy="24.5" r="0.7"/><circle cx="21" cy="24.5" r="0.7"/><circle cx="26" cy="24.5" r="0.7"/><circle cx="31" cy="24.5" r="0.7"/></g>`;
  } else { // clipper — sleek, tall raked masts, lots of canvas
    g=`${mast(14,2)}${mast(24,1)}${mast(34,2)}
       ${sq(14,4,10,4)}${sq(14,10.5,15,3.3,'#e7d6b0')}
       ${sq(24,3,9,4.5)}${sq(24,9.5,15,3.6,'#e7d6b0')}
       ${sq(34,4,10,4)}${sq(34,10.5,15,3.3,'#e7d6b0')}
       ${pennant(24,0.5)}`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 48 34">${g}${hull}</svg>`;}
function shipSVG(ship){return shipArt(shipClass(ship||SHIPS[0]),1);}

/* animation loop — positions derive from timestamps */
function startRAF(){if(rafOn)return;rafOn=true;let last=0;
  function tick(ts){if(ts-last>180){let anyMoving=false;STATE.voyages.forEach(v=>{if(!shipMarkers[v.id])return;const path=buildPath(v.routeNodes);
      const st=stateAt(v,simDaysNow(v));const pt=pointAtDist(path,st.distSoFar);const m=shipMarkers[v.id];
      m.setLngLat([pt.lon,pt.lat]);const inner=m.getElement().querySelector('.inner');inner.style.transform=(pt.brg>180?'scaleX(-1)':'scaleX(1)');
      if(!st.done&&!v.paused)anyMoving=true;if(v.id===STATE.activeId)checkArrival(v,st);});
    if(anyMoving)updateDone();
    const av=activeVoyage();if(av){updateClock(av);if(shipCardOpen)renderShipCard();if(drawerOpen)renderDrawer();}
    last=ts;}if(rafOn)requestAnimationFrame(tick);}requestAnimationFrame(tick);}

/* ---------------- Sim clock HUD ---------------- */
function updateClock(v){const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);
  const wDate=new Date(new Date(v.departDate).getTime()+cd*86400000);
  const frac=cd-Math.floor(cd);const hh=String(Math.floor(frac*24)).padStart(2,'0');const mm=String(Math.floor((frac*24%1)*60)).padStart(2,'0');
  document.getElementById('clock').style.display='block';
  document.getElementById('clockDay').textContent=st.done?`Arrived · Day ${st.dur.toFixed(0)}`:`Day ${Math.floor(cd)} of ${st.dur.toFixed(0)}`;
  document.getElementById('clockDate').textContent=fmtLongDate(wDate);
  document.getElementById('clockTime').textContent=`${hh}:${mm} · ${v.paused?'PAUSED':v.simSpeed+'×'}`;}

/* ---------------- Ship card ---------------- */
function renameVoyage(e){if(e)e.stopPropagation();const v=activeVoyage();if(!v)return;
  const nn=prompt('Name this voyage',v.name);if(nn&&nn.trim()){v.name=nn.trim();save();if(shipCardOpen)renderShipCard();if(drawerOpen)renderDrawer();showToast('Renamed to “'+v.name+'”');}}
let shipCardOpen=false;
function toggleShipCard(open){shipCardOpen=open!==undefined?open:!shipCardOpen;const el=document.getElementById('shipCard');
  if(shipCardOpen){closeSheet();renderShipCard();el.style.display='block';}else el.style.display='none';}
function renderShipCard(){const v=activeVoyage();if(!v)return;const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);
  const el=document.getElementById('shipCard');
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div class="eyebrow">${st.done?'Arrived':'At Sea'}</div><div class="name">${v.name} <button class="pencil" onclick="renameVoyage(event)" title="Rename voyage">✎</button></div>
      ${v.expedition?`<div class="exp">${v.expedition}</div>`:''}</div>
      <button onclick="toggleShipCard(false)" style="font-size:17px;color:#8a6d30">✕</button></div>
    <div class="route-mini" style="font-size:13px;margin:8px 0 4px">${v.start.n} → ${v.dest.n}</div>
    <div style="text-align:center;margin-bottom:6px"><span class="pill">Day ${Math.floor(cd)} / ${st.dur.toFixed(0)}</span></div>
    <div class="divider"></div>
    <div class="col2"><div style="flex:1">
      <div class="stat-row"><span>Position</span><b>${fmtCoord(st.pos.lat,st.pos.lon)}</b></div>
      <div class="stat-row"><span>Heading</span><b>${st.heading}</b></div>
      <div class="stat-row"><span>Speed</span><b>${st.instSpeed.toFixed(1)} kn</b></div>
      <div class="stat-row"><span>Wind</span><b>${st.wind} · ${st.weather}</b></div>
    </div><div style="text-align:center"><div class="compass"><div class="n">N</div>
      <div class="needle" style="transform:translate(-50%,-100%) rotate(${st.brg}deg)"></div></div>
      <div style="font-size:9px;color:#8a6d30;letter-spacing:.14em;margin-top:4px">${Math.round(st.brg)}°</div></div></div>
    <div class="stat-row"><span>Next stop</span><b>${st.nextStop?st.nextStop.name:'—'}</b></div>
    <div class="stat-row"><span>ETA</span><b>${st.done?'Arrived':Math.ceil(st.remainingDays)+' days'}</b></div>
    <div class="stat-row"><span>Distance left</span><b>${Math.round(st.distRemaining).toLocaleString()} nm</b></div>
    <div class="divider"></div>
    <div class="eyebrow" style="margin-bottom:7px">Condition</div>
    ${bar('Hull',st.hull)}${bar('Sails',st.sails)}
    <div class="eyebrow" style="margin:9px 0 7px">Supplies</div>
    ${bar('Food',st.food)}${bar('Water',st.water)}${bar('Medicine',st.medicine)}
    <div class="stat-row" style="margin-top:8px"><span>Crew</span><b>${st.crew} / ${st.ship.crew}</b></div>
    <div class="divider"></div>
    <button class="btn btn-primary" style="width:100%" onclick="openDrawer('overview')">View Voyage</button>`;}
function bar(label,val){const cls=val<25?'crit':val<50?'warn':'';return `<div class="barwrap"><div class="top"><span>${label}</span><span>${Math.round(val)}%</span></div><div class="bar ${cls}"><i style="width:${val}%"></i></div></div>`;}

/* ---------------- Sheet: New Voyage / Fleet / History ---------------- */
let sheetMode=null,nv={shipId:"victoria",start:null,dest:null,waypoints:[],region:{start:"Europe",dest:"S. America",way:"Atlantic Isles"}};
function setRegion(kind,region){nv.region[kind]=region;renderNew();}
function selPortByName(kind,name){const p=PORTS.find(x=>x.n===name);if(p)selPort(kind,p);}
function portSelector(kind){const reg=nv.region[kind];const ports=PORTS.filter(p=>p.r===reg);const cur=kind==='start'?nv.start:kind==='dest'?nv.dest:null;
  return `<div style="display:flex;gap:6px;margin-bottom:6px">
    <select class="sel" onchange="setRegion('${kind}',this.value)">${REGIONS.map(r=>`<option ${r===reg?'selected':''}>${r}</option>`).join('')}</select>
    <select class="sel" onchange="selPortByName('${kind}',this.value)"><option value="">— choose port —</option>${ports.map(p=>`<option value="${p.n}" ${cur&&cur.n===p.n?'selected':''}>${p.n}</option>`).join('')}</select></div>
    <div class="search"><input id="s-${kind}" autocomplete="off" placeholder="…or search any port" value="${cur?cur.n:''}"><div class="results" id="r-${kind}"></div></div>`;}
function ratingBar(l,v){return `<div class="rb"><span>${l}</span><div class="rbar"><i style="width:${v}%"></i></div></div>`;}
function shipDetailsHTML(s){return `<div class="ship-detail">
  <div style="display:flex;gap:12px;align-items:center">
    <div class="ship-art">${shipArt(shipClass(s),1.5)}</div>
    <div style="flex:1"><div style="font-family:var(--serif);font-size:19px;font-weight:600;color:var(--ink);line-height:1.05">${s.name}</div>
      <div style="font-size:11px;color:#8a6d30">${s.type} · ${s.era}</div>
      <div style="font-size:11.5px;color:#5a4a28;font-style:italic;margin-top:3px">${s.blurb}</div></div></div>
  <div class="sd-grid">
    <span><b>${s.avg}</b> kn avg</span><span><b>${s.max}</b> kn max</span><span>Crew <b>${s.crew}</b></span>
    <span>Cargo <b>${s.cargo}t</b></span><span>Food <b>${s.foodDays}d</b></span><span>Water <b>${s.waterDays}d</b></span></div>
  <div class="sd-ratings">${ratingBar('Hull',s.hull)}${ratingBar('Sails',s.sails)}${ratingBar('Maneuver',s.maneuver)}${ratingBar('Navigation',s.nav)}${ratingBar('Historical accuracy',s.accuracy)}</div></div>`;}
function openSheet(mode){sheetMode=mode;toggleShipCard(false);document.getElementById('sheet').style.display='block';renderSheet();}
function closeSheet(){document.getElementById('sheet').style.display='none';sheetMode=null;if(map&&map.getSource('route-preview'))map.getSource('route-preview').setData(emptyFC());if(map&&map.getSource('route-ref'))map.getSource('route-ref').setData(emptyFC());}
function renderSheet(){if(sheetMode==='new')renderNew();else if(sheetMode==='fleet')renderFleet();else if(sheetMode==='history')renderHistory();}

function renderNew(){const el=document.getElementById('sheet');const canPrev=nv.start&&nv.dest;let prev='';
  if(canPrev){const ship=shipById(nv.shipId);const pts=[nv.start,...nv.waypoints,nv.dest];const nodes=computeRoute(pts);
    const path=buildPath(nodes);const dur=path.total/(ship.avg*24);const dep=new Date();const arr=new Date(dep.getTime()+dur*86400000);
    const foodEnd=Math.max(0,100-100*dur/ship.foodDays),waterEnd=Math.max(0,100-100*dur/ship.waterDays);
    prev=`<div class="divider"></div><div class="eyebrow" style="text-align:center;margin-bottom:8px">Your Voyage</div>
      <div class="route-mini">${pts.map(p=>p.n).join('<span class="arw">↓</span>')}</div>
      <div class="hint" style="text-align:center">${nodes.length>pts.length?'Route steers around land ('+nodes.length+' plotted points).':'Direct open-water passage.'}</div>
      <div class="divider"></div><div class="preview-grid">
        <div class="pv"><div class="k">Distance</div><div class="v">${Math.round(path.total).toLocaleString()}<span style="font-size:11px"> nm</span></div></div>
        <div class="pv"><div class="k">Duration</div><div class="v">${Math.round(dur)}<span style="font-size:11px"> days</span></div></div>
        <div class="pv"><div class="k">Stops</div><div class="v">${nv.waypoints.length}</div></div>
        <div class="pv"><div class="k">Avg speed</div><div class="v">${ship.avg}<span style="font-size:11px"> kn</span></div></div>
        <div class="pv"><div class="k">Food at arrival</div><div class="v">${Math.round(foodEnd)}%</div></div>
        <div class="pv"><div class="k">Water at arrival</div><div class="v">${Math.round(waterEnd)}%</div></div>
        <div class="pv"><div class="k">Departure</div><div class="v" style="font-size:14px">${fmtDate(dep)}</div></div>
        <div class="pv"><div class="k">Est. arrival</div><div class="v" style="font-size:14px">${fmtDate(arr)}</div></div>
      </div>
      ${(dur>ship.foodDays||dur>ship.waterDays)?'<div class="hint" style="color:#a23c2c">⚠ Supplies may run out — add a provisioning stop.</div>':''}
      <button class="btn btn-gold" style="width:100%;margin-top:14px;padding:13px" onclick="launch()">⚓ Launch Voyage</button>`;}
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:21px">New Voyage</h2>
      <button onclick="closeSheet()" style="font-size:17px;color:#8a6d30">✕</button></div><div class="divider"></div>
    <div class="field"><label>Ship</label>
      <select class="sel" style="width:100%" onchange="pickShip(this.value)">${SHIPS.map(s=>`<option value="${s.id}" ${s.id===nv.shipId?'selected':''}>${s.name} — ${s.type} (${s.era})</option>`).join('')}</select>
      ${shipDetailsHTML(shipById(nv.shipId))}</div>
    <div class="field"><label>Starting point</label>${portSelector('start')}</div>
    <div class="field"><label>Destination</label>${portSelector('dest')}</div>
    <div class="field"><label>Waypoints <span style="text-transform:none;font-weight:400;font-style:italic;letter-spacing:0">(optional, up to 5)</span></label>
      ${nv.waypoints.map((w,i)=>`<span class="chip">${w.n}<button onclick="rmWay(${i})">✕</button></span>`).join('')}
      ${nv.waypoints.length<5?portSelector('way'):'<div class="hint">Maximum stops added.</div>'}</div>
    <div class="hint">Tip: click any golden port on the map to set it.</div>${prev}`;
  attachSearch('start');attachSearch('dest');if(nv.waypoints.length<5)attachSearch('way');}
function pickShip(id){nv.shipId=id;renderNew();previewRoute();}
function searchBox(kind){const val=kind==='start'?(nv.start?nv.start.n:''):kind==='dest'?(nv.dest?nv.dest.n:''):'';
  return `<div class="search"><input id="s-${kind}" autocomplete="off" placeholder="Search a port…" value="${val}"><div class="results" id="r-${kind}"></div></div>`;}
function attachSearch(kind){const inp=document.getElementById('s-'+kind),res=document.getElementById('r-'+kind);if(!inp)return;
  inp.addEventListener('input',()=>{const q=inp.value.trim().toLowerCase();if(!q){res.style.display='none';return;}
    const m=PORTS.filter(p=>p.n.toLowerCase().includes(q)||p.c.toLowerCase().includes(q)).slice(0,8);
    res.innerHTML=m.map(p=>`<div data-n="${p.n}">${p.n}<small>${p.c}</small></div>`).join('')||'<div style="color:#8a6d30">No port found</div>';
    res.style.display='block';res.querySelectorAll('div[data-n]').forEach(d=>d.addEventListener('click',()=>{selPort(kind,PORTS.find(x=>x.n===d.dataset.n));res.style.display='none';}));});
  inp.addEventListener('focus',()=>{if(inp.value.trim())inp.dispatchEvent(new Event('input'));});}
function selPort(kind,p){if(kind==='start')nv.start=p;else if(kind==='dest')nv.dest=p;else if(nv.waypoints.length<5)nv.waypoints.push(p);renderNew();previewRoute();}
function rmWay(i){nv.waypoints.splice(i,1);renderNew();previewRoute();}
function onPortClick(p){if(sheetMode==='new'){if(!nv.start)selPort('start',p);else if(!nv.dest)selPort('dest',p);else if(nv.waypoints.length<5)selPort('way',p);showToast(`${p.n} added`);}else showToast(`${p.n}, ${p.c}`);}
function previewRoute(){if(!nv.start||!map.getSource('route-preview'))return;const pts=[nv.start,...nv.waypoints,...(nv.dest?[nv.dest]:[])];
  if(pts.length<2){map.getSource('route-preview').setData(emptyFC());return;}const nodes=computeRoute(pts);const path=buildPath(nodes);
  map.getSource('route-preview').setData(lineFeat(path.coords));
  const b=new maplibregl.LngLatBounds();path.coords.forEach(c=>b.extend(c));map.fitBounds(b,{padding:{top:110,bottom:90,left:70,right:380},duration:800,maxZoom:5});}
function launch(){const ship=shipById(nv.shipId);const id='v-'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);const now=Date.now();
  const v=makeVoyage({id,shipId:ship.id,name:ship.name,start:nv.start,dest:nv.dest,waypoints:nv.waypoints.slice(),
    departDate:new Date().toISOString(),startTimestamp:now,simSpeed:1,paused:false,simAccumDays:0,lastToggleTs:now,lastViewedSimDay:0});
  STATE.voyages.push(v);STATE.activeId=id;ensureColors();save();closeSheet();nv={shipId:"victoria",start:null,dest:null,waypoints:[]};
  if(map.getSource('route-preview'))map.getSource('route-preview').setData(emptyFC());
  refreshAll(true);setSpeedUI(1);setPlayUI(false);showToast('⚓ '+v.name+' departs '+v.start.n);setTimeout(()=>toggleShipCard(true),1400);}

function renderFleet(){const el=document.getElementById('sheet');
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:21px">Your Fleet</h2>
      <button onclick="closeSheet()" style="font-size:17px;color:#8a6d30">✕</button></div>
    <div class="hint" style="margin-top:2px">Every voyage keeps sailing in real time — even while you're away.</div><div class="divider"></div>
    ${STATE.voyages.length?STATE.voyages.map(v=>{const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);const pct=Math.min(100,cd/st.dur*100);
      return `<div class="fleet-item ${v.id===STATE.activeId?'active':''}" onclick="focusVoyage('${v.id}')">
        <span class="fleet-dot" style="background:${v.color}"></span>
        <button class="fleet-x" onclick="removeVoyage('${v.id}',event)" title="Remove voyage">✕</button>
        <div class="fn">${v.name}</div><div class="fr">${v.expedition?v.expedition+' · ':''}${v.start.n} → ${v.dest.n}</div>
        <div class="fs ${st.done?'done':'sea'}">${st.done?'✓ Arrived':'At sea · Day '+Math.floor(cd)+' / '+st.dur.toFixed(0)}</div>
        <div class="prog"><i style="width:${pct}%;background:${v.color}"></i></div></div>`;}).join(''):'<div class="hint">No voyages yet. Start one!</div>'}
    <button class="btn btn-gold btn-sm" style="width:100%;margin-top:8px" onclick="openSheet('new')">+ New Voyage</button>`;}
function focusVoyage(id){STATE.activeId=id;save();closeSheet();refreshAll(true);setSpeedUI(activeVoyage().simSpeed);setPlayUI(activeVoyage().paused);setTimeout(()=>toggleShipCard(true),700);}
function removeVoyage(id,e){if(e)e.stopPropagation();const v=STATE.voyages.find(x=>x.id===id);if(!v)return;
  if(!confirm('Remove “'+v.name+'” ('+v.start.n+' → '+v.dest.n+')? This cannot be undone.'))return;
  STATE.voyages=STATE.voyages.filter(x=>x.id!==id);
  if(shipMarkers[id]){shipMarkers[id].remove();delete shipMarkers[id];}
  if(STATE.activeId===id)STATE.activeId=STATE.voyages[0]?STATE.voyages[0].id:null;
  ensureColors();save();refreshAll(!!STATE.activeId);renderFleet();showToast('Voyage removed');
  if(!STATE.voyages.length){toggleShipCard(false);document.getElementById('clock').style.display='none';}}

/* explorer portraits — real public-domain paintings when online, engraved medallion as fallback */
const PORTRAITS={
  magellan:{file:"Ferdinand Magellan.jpg",hue:205},
  columbus:{file:"Portrait of a Man, Said to be Christopher Columbus.jpg",hue:25},
  dagama:{file:"Vasco da Gama (Gregório Lopes).png",hue:150},
  cook:{file:"Captainjamescookportrait.jpg",hue:220},
  zhenghe:{file:"ZhengHeStatue.jpg",hue:15},
  shackleton:{file:"Ernest Shackleton before 1909.jpg",hue:195},
};
function medallionSVG(hue){return `<svg class="medallion" viewBox="0 0 56 56" preserveAspectRatio="xMidYMid slice">
  <defs><radialGradient id="mg${hue}" cx="50%" cy="34%" r="75%"><stop offset="0%" stop-color="hsl(${hue},32%,42%)"/><stop offset="100%" stop-color="hsl(${hue},38%,16%)"/></radialGradient></defs>
  <rect width="56" height="56" fill="url(#mg${hue})"/>
  <g fill="rgba(242,230,207,.82)"><circle cx="28" cy="21" r="8.5"/><path d="M13 54 Q13 35 28 35 Q43 35 43 54 Z"/></g>
  <rect x="0" y="0" width="56" height="56" fill="none" stroke="rgba(201,162,75,.35)" stroke-width="2"/></svg>`;}
function portraitHTML(h,big){const p=PORTRAITS[h.id]||{hue:210};const cls=big?'portrait portrait-lg':'portrait';
  const url=p.file?`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.file)}?width=220`:'';
  return `<div class="${cls}" title="${h.captain}">${medallionSVG(p.hue)}${url?`<img alt="${h.captain}" src="${url}" onload="this.classList.add('ok')" onerror="this.remove()">`:''}</div>`;}

function renderHistory(){const el=document.getElementById('sheet');
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:21px">Recreate History</h2>
      <button onclick="closeSheet()" style="font-size:17px;color:#8a6d30">✕</button></div>
    <div class="hint" style="margin-top:2px">Launch a famous expedition and watch it unfold. The historical route is shown as reference.</div><div class="divider"></div>
    ${HISTORIES.map(h=>`<div class="hist-item" onclick="previewHistory('${h.id}')">
      <div class="htext"><div class="hn">${h.name}</div><div class="hd">${h.captain} · ${h.year}</div><div class="hm">${h.blurb}</div></div>
      ${portraitHTML(h,false)}</div>`).join('')}`;}
function previewHistory(id){const h=HISTORIES.find(x=>x.id===id);if(!h)return;
  map.getSource('route-ref').setData(lineFeat(buildPath(h.nodes).coords));
  const b=new maplibregl.LngLatBounds();buildPath(h.nodes).coords.forEach(c=>b.extend(c));map.fitBounds(b,{padding:60,duration:1000,maxZoom:5});
  const el=document.getElementById('sheet');const ship=shipById(h.shipId);const path=buildPath(h.nodes);const dur=path.total/(ship.avg*24);
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:20px">${h.name}</h2>
      <button onclick="renderHistory()" style="font-size:15px;color:#8a6d30">← back</button></div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin-top:8px">
      <div style="flex:1"><div class="hd" style="font-size:12px;color:#5a4a28">${h.captain} · ${h.year}</div>
      <div class="hint" style="font-style:normal;margin-top:6px">${h.blurb}</div></div>
      ${portraitHTML(h,true)}</div><div class="divider"></div>
    <div class="route-mini" style="margin-top:10px">${h.nodes.filter(n=>n.n&&n.n!=='·').map(n=>n.n).join('<span class="arw">↓</span>')}</div>
    <div class="divider"></div><div class="preview-grid">
      <div class="pv"><div class="k">Ship</div><div class="v" style="font-size:15px">${ship.name}</div></div>
      <div class="pv"><div class="k">Distance</div><div class="v">${Math.round(path.total).toLocaleString()}<span style="font-size:11px"> nm</span></div></div>
      <div class="pv"><div class="k">Est. duration</div><div class="v">${Math.round(dur)}<span style="font-size:11px"> days</span></div></div>
      <div class="pv"><div class="k">Historical</div><div class="v" style="font-size:14px">${h.year}</div></div></div>
    <button class="btn btn-gold" style="width:100%;margin-top:14px;padding:13px" onclick="launchHistory('${h.id}')">⚓ Sail this Expedition</button>`;}
function launchHistory(id){const h=HISTORIES.find(x=>x.id===id);if(!h)return;const now=Date.now();
  const wps=h.nodes.slice(1,-1).filter(n=>n.n&&PORTS.some(p=>p.n===n.n)); // named ports only as waypoints
  const v=makeVoyage({id:'h-'+id+'-'+now.toString(36),shipId:h.shipId,name:shipById(h.shipId).name,expedition:h.name,
    start:h.nodes[0],dest:h.nodes[h.nodes.length-1],waypoints:h.nodes.slice(1,-1),routeNodes:h.nodes,
    departDate:new Date(h.depart).toISOString(),startTimestamp:now,simSpeed:100,paused:false,simAccumDays:0,lastToggleTs:now,lastViewedSimDay:0});
  STATE.voyages.push(v);STATE.activeId=v.id;ensureColors();save();closeSheet();map.getSource('route-ref').setData(emptyFC());
  refreshAll(true);setSpeedUI(100);setPlayUI(false);showToast('⚓ Recreating '+h.name);setTimeout(()=>toggleShipCard(true),1400);}

/* ---------------- Drawer ---------------- */
let drawerOpen=false,drawerTab='overview',diaryFilter='all';
function openDrawer(tab){drawerTab=tab||'overview';drawerOpen=true;document.getElementById('drawer').classList.add('open');
  document.querySelectorAll('#drawerTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===drawerTab));renderDrawer();}
function closeDrawer(){drawerOpen=false;document.getElementById('drawer').classList.remove('open');}
function renderDrawer(){const v=activeVoyage();if(!v)return;const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);
  document.getElementById('drawerHead').innerHTML=`<button class="dclose" onclick="closeDrawer()">✕</button>
    <div class="name">${v.name} <button class="pencil" onclick="renameVoyage(event)" title="Rename voyage">✎</button></div>${v.expedition?`<div class="exp">${v.expedition}</div>`:''}
    <div class="route">${v.start.n} → ${v.dest.n}</div>
    <div class="day">${st.done?'Voyage complete · '+st.dur.toFixed(0)+' days':'Day '+Math.floor(cd)+' of '+st.dur.toFixed(0)}</div>`;
  document.getElementById('drawerBody').innerHTML=drawerTab==='overview'?overviewHTML(v,st):journalHTML(v,st);}
function overviewHTML(v,st){const dur=st.dur;
  const tl=[{day:0,title:'Departure',major:true},...st.events.map(e=>({day:e.day,title:e.tpl.title,major:e.tpl.major})),
    ...st.stops.map(s=>({day:s.day,title:'Stop — '+s.name,major:true})),{day:dur,title:'Arrival',major:true}].sort((a,b)=>a.day-b.day);
  return `<div class="sec"><div class="sec-title">Current Position</div>
      <div class="stat-row ovr"><span>Coordinates</span><b>${fmtCoord(st.pos.lat,st.pos.lon)}</b></div>
      <div class="stat-row ovr"><span>Heading</span><b>${st.heading} (${Math.round(st.brg)}°)</b></div>
      <div class="stat-row ovr"><span>Speed</span><b>${st.instSpeed.toFixed(1)} knots</b></div>
      <div class="stat-row ovr"><span>Weather</span><b>${st.weather} · Wind ${st.wind}</b></div>
      <div class="stat-row ovr"><span>ETA</span><b>${st.done?'Arrived':Math.ceil(st.remainingDays)+' days'}</b></div>
      <div class="stat-row ovr"><span>Distance remaining</span><b>${Math.round(st.distRemaining).toLocaleString()} nm</b></div></div>
    <div class="sec" style="border-top:1px solid var(--line)"><div class="sec-title">Condition &amp; Supplies</div><div class="cond-grid">
      ${dbar('Hull',st.hull)}${dbar('Sails',st.sails)}${dbar('Food',st.food)}${dbar('Water',st.water)}${dbar('Medicine',st.medicine)}
      <div class="d-stat"><div class="top"><span>Crew</span><span>${st.crew}/${st.ship.crew}</span></div><div class="d-bar"><i style="width:${st.crew/st.ship.crew*100}%"></i></div></div></div></div>
    <div class="sec" style="border-top:1px solid var(--line)"><div class="sec-title">Voyage Timeline</div><div class="tl">
      ${tl.map(e=>`<div class="tl-item ${e.major?'major':''} ${e.day>st.curDay+0.001?'future':''}" onclick="gotoJournal(${Math.max(1,Math.round(e.day))})">
        <div class="dot"></div><div class="d">Day ${e.day.toFixed(0)}</div><div class="t">${e.title}</div></div>`).join('')}</div></div>`;}
function dbar(l,val){const cls=val<25?'crit':val<50?'warn':'';return `<div class="d-stat"><div class="top"><span>${l}</span><span>${Math.round(val)}%</span></div><div class="d-bar ${cls}"><i style="width:${val}%"></i></div></div>`;}
const FILTERS=[["all","All"],["major","Major"],["weather","Weather"],["supplies","Supplies"],["navigation","Navigation"],["crew","Crew"],["discovery","Discoveries"]];
function journalHTML(v,st){const entries=st.diary;
  const filtered=entries.filter(e=>diaryFilter==='all'?true:diaryFilter==='major'?e.major:e.cat===diaryFilter);
  const head=`<div class="sec"><div class="sec-title" style="text-align:center">Journal of the ${v.name}</div>
    ${v.expedition?`<div style="text-align:center;font-size:11px;color:#8ea3b4;font-style:italic">${v.expedition}</div>`:''}
    <div style="text-align:center;font-family:var(--serif);color:var(--gold-2);font-size:15px">${v.start.n} → ${v.dest.n}</div></div>
    <div class="filters">${FILTERS.map(f=>`<button class="filt ${diaryFilter===f[0]?'on':''}" onclick="setFilter('${f[0]}')">${f[1]}</button>`).join('')}</div>`;
  if(!filtered.length)return head+`<div class="sec" style="color:#7d94a6;font-style:italic">No entries under this filter yet.</div>`;
  return head+filtered.map(e=>`<div class="diary-entry ${e.major?'major':''}" id="diary-day-${e.day}">
      <div class="date">${fmtDate(e.date)}</div><div class="day">Day ${e.day}${e.title?' · '+e.title:''}</div>
      <div class="text">${e.icon?`<span class="ev-icon">${e.icon}</span>`:''}${e.text}</div><div class="meta">${e.meta}</div></div>`).join('');}
function setFilter(f){diaryFilter=f;renderDrawer();}
function gotoJournal(day){openDrawer('journal');setTimeout(()=>{let el=document.getElementById('diary-day-'+day);
  for(let d=day;d>=1&&!el;d--)el=document.getElementById('diary-day-'+d);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});const o=el.style.background;el.style.transition='background .6s';el.style.background='rgba(201,162,75,.25)';setTimeout(()=>el.style.background=o,1200);}},130);}

/* ---------------- Arrival + welcome back ---------------- */
let arrivalShown={};
function checkArrival(v,st){if(st.done&&!arrivalShown[v.id]){arrivalShown[v.id]=true;showArrival(v);}}
function showArrival(v){const st=stateAt(v,v.baseDurationDays);const majors=st.events.filter(e=>e.tpl.major).length;
  const storms=st.events.filter(e=>e.tpl.type==='storm').length;const crewLost=st.ship.crew-st.crew;const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow">Voyage Complete</div><h2>${v.name}</h2>
    ${v.expedition?`<div class="sub">${v.expedition}</div>`:''}<div class="sub">${v.start.n} → ${v.dest.n}</div>
    <div class="stamp">${st.dur.toFixed(0)} simulated days · ${Math.round(v.distanceNm).toLocaleString()} nautical miles</div>
    <div class="divider"></div><div class="eyebrow" style="margin-bottom:9px">Final Condition</div>
    <div class="final-grid"><div><div class="v">${Math.round(st.hull)}%</div><div class="k">Hull</div></div>
      <div><div class="v">${Math.round(st.food)}%</div><div class="k">Food</div></div>
      <div><div class="v">${Math.round(st.water)}%</div><div class="k">Water</div></div>
      <div><div class="v">${st.crew}</div><div class="k">Crew</div></div></div>
    <div class="divider"></div><div class="eyebrow" style="margin-bottom:7px">The Journey</div>
    <div class="journey-line">${st.events.length} events logged · ${majors} of great note · ${st.stops.length} ports of call</div>
    <div class="journey-line">${storms} storm${storms!==1?'s':''} weathered · ${crewLost} crew lost</div>
    <div class="btnrow"><button class="btn btn-primary btn-sm" onclick="hideModal();openDrawer('journal')">Read Journal</button>
      <button class="btn btn-ghost btn-sm" onclick="downloadVoyage('${v.id}')">Download</button>
      <button class="btn btn-ghost btn-sm" onclick="shareVoyage('${v.id}')">Share</button>
      <button class="btn btn-gold btn-sm" onclick="hideModal();openSheet('new')">New Voyage</button></div>`;
  showModal();}
function maybeWelcomeBack(){const v=activeVoyage();if(!v)return;const cur=simDaysNow(v);const last=v.lastViewedSimDay||0;const delta=cur-last;
  if(delta<0.5)return;const st=stateAt(v,cur);const between=st.events.filter(e=>e.day>last&&e.day<=Math.min(cur,st.dur));
  const lastSt=stateAt(v,Math.max(0,last));const waterDrop=Math.max(0,lastSt.water-st.water),hullDrop=Math.max(0,lastSt.hull-st.hull);
  let items=[];const seen=new Set();between.forEach(e=>{if(!seen.has(e.tpl.type)){seen.add(e.tpl.type);items.push({ic:e.tpl.icon,t:e.tpl.title+' — '+shortEv(e)});}});
  if(waterDrop>4)items.push({ic:'💧',t:`Water fell ${Math.round(waterDrop)}%.`});if(hullDrop>4)items.push({ic:'🛠️',t:`Hull dropped ${Math.round(hullDrop)}%.`});
  if(st.done)items.push({ic:'🏁',t:`${v.name} has reached ${v.dest.n}.`});else items.push({ic:'📍',t:`Now ${Math.round(st.distRemaining).toLocaleString()} nm from ${v.dest.n}.`});
  if(!items.length)items.push({ic:'🌊',t:'Fair seas and steady sailing throughout.'});
  const cd=Math.min(st.curDay,st.dur);const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow">Welcome Back</div><h2 style="font-size:29px">The voyage sailed on</h2>
    <div class="sub">${delta.toFixed(0)} days have passed since your last visit.</div><div class="divider"></div>
    <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a6d30;font-weight:600;text-align:left">While you were gone</div>
    <div class="wyg-list">${items.map(it=>`<div class="wyg-item"><span class="ic">${it.ic}</span><span>${it.t}</span></div>`).join('')}</div>
    <div class="big-day">${st.done?'Arrived · Day '+st.dur.toFixed(0):'Day '+Math.floor(cd)+' / '+st.dur.toFixed(0)}</div>
    <div class="btnrow"><button class="btn btn-gold btn-sm" onclick="hideModal();toggleShipCard(true)">View Voyage</button></div>`;
  showModal();v.lastViewedSimDay=cur;save();}
function shortEv(e){const m={storm:'the ship was battered but held.',wind:'the sails ran full.',calm:'the sea fell still.',water:'rations were tightened.',food:'stores ran short.',current:'a current carried her on.',discovery:'unknown land broke the horizon.',whale:'a great whale passed by.',repair:'the crew mended the hull.',scurvy:'sickness spread below decks.',mutiny:'the crew grew restless.'};return m[e.tpl.type]||'noted in the log.';}
function showModal(){document.getElementById('scrim').style.display='flex';}
function hideModal(){document.getElementById('scrim').style.display='none';}

/* download / share */
function voyageReport(v){const st=stateAt(v,v.baseDurationDays);let out=`JOURNAL OF THE ${v.name.toUpperCase()}\n`;
  if(v.expedition)out+=v.expedition+"\n";out+=`${v.start.n} → ${v.dest.n}\n${st.dur.toFixed(0)} days · ${Math.round(v.distanceNm).toLocaleString()} nautical miles\n\n`;
  st.diary.forEach(e=>{out+=`DAY ${e.day} — ${fmtDate(e.date)}${e.title?'  ['+e.title+']':''}\n${e.text}\n${e.meta}\n\n`;});
  out+=`\nFINAL: Hull ${Math.round(st.hull)}% · Food ${Math.round(st.food)}% · Water ${Math.round(st.water)}% · Crew ${st.crew}/${st.ship.crew}\n`;return out;}
function downloadVoyage(id){const v=STATE.voyages.find(x=>x.id===id);if(!v)return;const blob=new Blob([voyageReport(v)],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${v.name.replace(/\s+/g,'_')}_journal.txt`;a.click();showToast('Journal downloaded');}
function shareVoyage(id){const v=STATE.voyages.find(x=>x.id===id);if(!v)return;const st=stateAt(v,v.baseDurationDays);
  const txt=`${v.name} sailed ${v.start.n} → ${v.dest.n} — ${st.dur.toFixed(0)} days, ${Math.round(v.distanceNm).toLocaleString()} nm. Hull ${Math.round(st.hull)}%, crew ${st.crew}/${st.ship.crew}. #Voyages`;
  if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>showToast('Summary copied to clipboard')).catch(()=>showToast(txt));}else showToast('Copy: '+txt);}

/* ---------------- Demos ---------------- */
function seedDemos(){const now=Date.now();
  const mag=HISTORIES.find(h=>h.id==='magellan');
  const v1=makeVoyage({id:'demo-victoria',shipId:'victoria',name:'Victoria',expedition:"Magellan Expedition",
    start:mag.nodes[0],dest:mag.nodes[mag.nodes.length-1],waypoints:mag.nodes.slice(1,-1),routeNodes:mag.nodes,
    departDate:new Date('1519-08-10').toISOString(),startTimestamp:now-42*86400000,simSpeed:1,paused:false,
    simAccumDays:0,lastToggleTs:now-42*86400000,lastViewedSimDay:36,demo:true});
  const lis=P("Lisbon"),cv=P("Cape Verde");
  const v2=makeVoyage({id:'demo-short',shipId:'caravel',name:'Caravel',expedition:"",
    start:lis,dest:cv,waypoints:[],departDate:new Date('1500-03-01').toISOString(),
    startTimestamp:now-6*86400000,simSpeed:1,paused:false,simAccumDays:0,lastToggleTs:now-6*86400000,lastViewedSimDay:2,demo:true});
  STATE={voyages:[v1,v2],activeId:'demo-victoria'};save();}

/* ---------------- Wiring ---------------- */
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2400);}
function setSpeedUI(s){document.querySelectorAll('.spd').forEach(b=>b.classList.toggle('active',+b.dataset.s===s));}
function setPlayUI(paused){document.getElementById('playBtn').textContent=paused?'▶':'⏸';document.getElementById('playBtn').classList.toggle('on',!paused);}
document.getElementById('themeToggle').addEventListener('click',()=>{applyTheme(THEME==='day'?'night':'day');showToast(THEME==='day'?'Daylight charts':'Night charts');});
document.getElementById('newBtn').addEventListener('click',()=>openSheet('new'));
document.getElementById('fleetBtn').addEventListener('click',()=>openSheet('fleet'));
document.getElementById('histBtn').addEventListener('click',()=>{map.getSource('route-ref')&&map.getSource('route-ref').setData(emptyFC());openSheet('history');});
document.querySelectorAll('.spd').forEach(b=>b.addEventListener('click',()=>{const s=+b.dataset.s;const v=activeVoyage();if(v){setSpeed(v,s);if(v.paused){setPaused(v,false);setPlayUI(false);}save();}setSpeedUI(s);showToast('Time flowing at '+s+'×');}));
document.getElementById('playBtn').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;setPaused(v,!v.paused);save();setPlayUI(v.paused);showToast(v.paused?'Simulation paused':'Simulation resumed');});
document.getElementById('skipDay').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;advanceDays(v,1);save();refreshAll(false);showToast('Advanced one day');});
document.getElementById('skipEvent').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;const cur=simDaysNow(v);const nxt=stateAt(v,cur).events.find(e=>e.day>cur+0.05);
  if(nxt){advanceDays(v,(nxt.day-cur)+0.05);save();refreshAll(false);showToast('Skipped to next event · Day '+Math.floor(nxt.day));}else{advanceDays(v,v.baseDurationDays);save();refreshAll(false);showToast('No further events — skipped to arrival');}});
document.getElementById('skipArrival').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;advanceDays(v,v.baseDurationDays);save();refreshAll(false);showToast('Skipped to arrival');});
document.querySelectorAll('#drawerTabs .tab').forEach(t=>t.addEventListener('click',()=>openDrawer(t.dataset.tab)));
document.getElementById('scrim').addEventListener('click',e=>{if(e.target.id==='scrim')hideModal();});
window.addEventListener('beforeunload',()=>{const v=activeVoyage();if(v){v.lastViewedSimDay=simDaysNow(v);save();}});
setInterval(()=>save(),5000);

/* ---------------- Boot ---------------- */
Object.assign(window,{closeDrawer,closeSheet,downloadVoyage,focusVoyage,gotoJournal,hideModal,launch,launchHistory,openDrawer,openSheet,pickShip,previewHistory,removeVoyage,renameVoyage,renderHistory,rmWay,selPortByName,setFilter,setRegion,shareVoyage,toggleShipCard});
(function boot(){document.body.dataset.theme=THEME;document.getElementById('themeToggle').textContent=THEME==='day'?'☀':'☾';
  const loaded=load();if(loaded&&loaded.voyages&&loaded.voyages.length)STATE=loaded;else seedDemos();ensureColors();
  const v=activeVoyage();setSpeedUI(v?v.simSpeed:1);setPlayUI(v?v.paused:false);initMap();
  setTimeout(()=>maybeWelcomeBack(),2400);})();

}
