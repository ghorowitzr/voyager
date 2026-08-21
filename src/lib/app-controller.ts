// @ts-nocheck
/* Ported verified Voyager runtime (imperative map + UI glue). Storage seam: ./storage. */
import maplibregl from 'maplibre-gl';
import { localStore as Store } from './storage';
let _booted=false;
export function initVoyagesApp(){
  if(_booted)return; _booted=true;
/* ================================================================
   VOYAGER — persistent, water-routed expedition simulator (MVP)
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

/* ---------------- Captains ---------------- */
/* Attributes (1–100) are grounded in each figure's historical record and
   subtly influence the simulation (see captainMods). Portraits load a
   public-domain painting when online, with an engraved medallion fallback. */
const CAPTAINS=[
  {id:"magellan",name:"Ferdinand Magellan",era:"1480–1521",flag:"Portugal / Castile",file:"Ferdinand Magellan.jpg",hue:205,
    bio:"Led the first expedition to circumnavigate the globe; killed at Mactan before its completion.",
    specialty:"Long-range ocean navigation, strait-finding",
    a:{navigation:94,exploration:98,leadership:82,diplomacy:68,combat:87,endurance:91}},
  {id:"elcano",name:"Juan Sebastián Elcano",era:"1476–1526",flag:"Castile (Basque)",file:"Juan Sebastián Elcano.jpg",hue:190,
    bio:"Completed the first circumnavigation aboard the Victoria after Magellan's death.",
    specialty:"Endurance, seamanship, survival",
    a:{navigation:88,exploration:84,leadership:86,diplomacy:70,combat:74,endurance:96}},
  {id:"columbus",name:"Christopher Columbus",era:"1451–1506",flag:"Genoa / Castile",file:"Portrait of a Man, Said to be Christopher Columbus.jpg",hue:25,
    bio:"Crossed the Atlantic in 1492, opening sustained contact between Europe and the Americas.",
    specialty:"Ocean crossing, dead-reckoning",
    a:{navigation:90,exploration:95,leadership:70,diplomacy:55,combat:66,endurance:84}},
  {id:"dagama",name:"Vasco da Gama",era:"1460s–1524",flag:"Portugal",file:"Vasco da Gama (Gregório Lopes).png",hue:150,
    bio:"First to sail directly from Europe to India around the Cape of Good Hope.",
    specialty:"Blue-water routing, the volta do mar",
    a:{navigation:92,exploration:90,leadership:78,diplomacy:52,combat:83,endurance:88}},
  {id:"dias",name:"Bartolomeu Dias",era:"1450s–1500",flag:"Portugal",file:"Bartolomeu Dias.jpg",hue:135,
    bio:"First European to round the southern tip of Africa, opening the sea route east.",
    specialty:"Cape rounding, storm sailing",
    a:{navigation:89,exploration:93,leadership:76,diplomacy:58,combat:70,endurance:90}},
  {id:"cook",name:"James Cook",era:"1728–1779",flag:"Great Britain",file:"Captainjamescookportrait.jpg",hue:220,
    bio:"Charted the Pacific with unmatched precision on three great voyages.",
    specialty:"Cartography, scurvy prevention, crew health",
    a:{navigation:99,exploration:96,leadership:92,diplomacy:74,combat:72,endurance:93}},
  {id:"drake",name:"Francis Drake",era:"1540–1596",flag:"England",file:"1590 or later Marcus Gheeraerts, Sir Francis Drake Buckland Abbey, Devon.jpg",hue:15,
    bio:"Second to circumnavigate the globe; famed privateer and naval commander.",
    specialty:"Combat, raiding, bold seamanship",
    a:{navigation:85,exploration:82,leadership:88,diplomacy:60,combat:97,endurance:86}},
  {id:"zhenghe",name:"Zheng He",era:"1371–1433",flag:"Ming China",file:"ZhengHeStatue.jpg",hue:10,
    bio:"Commanded the vast Ming treasure fleets across the Indian Ocean.",
    specialty:"Fleet command, diplomacy, logistics",
    a:{navigation:90,exploration:88,leadership:95,diplomacy:96,combat:80,endurance:89}},
];
const captainById=id=>CAPTAINS.find(c=>c.id===id)||CAPTAINS[0];
/* Modifiers derived from captain attributes — deliberately subtle. */
function captainMods(cap){cap=cap||CAPTAINS[0];const a=cap.a;
  return {
    etaMul:1-(a.navigation-70)/100*0.18,        // better navigator → shorter effective route
    supplyMul:1-(a.endurance-70)/100*0.22,      // endurance → slower food/water burn
    crewLossMul:1-(a.leadership-70)/100*0.5,    // leadership → fewer crew losses
    negEventMul:1-(a.leadership-70)/100*0.25,   // leadership → milder bad events
    combatBonus:(a.combat-70)/100,              // combat → survive pirate encounters
  };}

/* ---------------- Piracy ---------------- */
/* 10 pirate vessels roam fixed ocean regions on continuous, persistent orbits.
   Position is a pure function of a world-day, so encounters can be computed
   deterministically — even for time that elapsed while the user was away. */
/* Each pirate is a historically-named vessel with a captain and attributes
   (1–100). Aggression/firepower drive combat; the roam params define a
   persistent ocean orbit. */
const PIRATES=[
  {id:0,name:"Queen Anne's Revenge",captain:"Blackbeard (Edward Teach)",era:"1717",lon:-42,lat:22,rlon:15,rlat:8,period:58,phase:0.2,
    a:{aggression:95,speed:70,cunning:80,firepower:92,notoriety:99}},
  {id:1,name:"Whydah Gally",captain:"Black Sam Bellamy",era:"1717",lon:-52,lat:6,rlon:13,rlat:7,period:74,phase:1.1,
    a:{aggression:74,speed:88,cunning:82,firepower:76,notoriety:85}},
  {id:2,name:"Royal Fortune",captain:"Bartholomew Roberts",era:"1720",lon:-28,lat:-16,rlon:14,rlat:9,period:66,phase:2.0,
    a:{aggression:90,speed:80,cunning:88,firepower:88,notoriety:94}},
  {id:3,name:"Flying Dutchman",captain:"Van der Decken",era:"legend",lon:-16,lat:-34,rlon:11,rlat:7,period:82,phase:0.7,
    a:{aggression:88,speed:96,cunning:99,firepower:84,notoriety:100}},
  {id:4,name:"Adventure Galley",captain:"William Kidd",era:"1696",lon:62,lat:-8,rlon:16,rlat:8,period:70,phase:1.7,
    a:{aggression:66,speed:74,cunning:70,firepower:72,notoriety:80}},
  {id:5,name:"Fancy",captain:"Henry Every",era:"1694",lon:92,lat:1,rlon:12,rlat:7,period:63,phase:2.6,
    a:{aggression:82,speed:84,cunning:90,firepower:80,notoriety:88}},
  {id:6,name:"Rising Sun",captain:"Christopher Moody",era:"1713",lon:150,lat:10,rlon:17,rlat:9,period:86,phase:0.4,
    a:{aggression:86,speed:72,cunning:66,firepower:82,notoriety:78}},
  {id:7,name:"Happy Delivery",captain:"George Lowther",era:"1721",lon:-118,lat:-12,rlon:19,rlat:10,period:92,phase:1.3,
    a:{aggression:70,speed:68,cunning:74,firepower:66,notoriety:64}},
  {id:8,name:"Ranger",captain:"Charles Vane",era:"1718",lon:-150,lat:6,rlon:17,rlat:9,period:77,phase:2.2,
    a:{aggression:80,speed:78,cunning:72,firepower:70,notoriety:82}},
  {id:9,name:"Revenge",captain:"Stede Bonnet",era:"1717",lon:-66,lat:-40,rlon:11,rlat:6,period:72,phase:0.9,
    a:{aggression:60,speed:64,cunning:58,firepower:68,notoriety:70}},
];
PIRATES.forEach(p=>p.strength=(p.a.aggression*0.45+p.a.firepower*0.45+p.a.notoriety*0.1)/100*0.85);
const pirateById=id=>PIRATES.find(p=>p.id===id);
const PIRATE_DETECT_NM=200; // pursuit begins within this range
function piratePosAt(p,day){const a=p.phase+2*Math.PI*day/p.period;
  let ox=p.rlon*Math.cos(a),oy=p.rlat*Math.sin(a*1.3);
  let lon=p.lon+ox,lat=Math.max(-58,Math.min(60,p.lat+oy));
  if(LAND){for(let k=0;k<7&&isLandLL(lon,lat);k++){ox*=0.72;oy*=0.72;lon=p.lon+ox;lat=Math.max(-58,Math.min(60,p.lat+oy));}}
  return {lon,lat};}
function pirateBearingAt(p,day){const a=piratePosAt(p,day),b=piratePosAt(p,day+0.05);return bearing(a,b);}
function worldDayOf(v){return Math.floor(new Date(v.departDate).getTime()/86400000);}

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

// Make longitudes continuous so a line never jumps across the ±180° dateline
// (otherwise MapLibre draws a straight streak across the whole map).
function unwrapLons(coords){if(!coords||!coords.length)return coords;const out=[[coords[0][0],coords[0][1]]];let prev=coords[0][0];
  for(let i=1;i<coords.length;i++){let lon=coords[i][0];while(lon-prev>180)lon-=360;while(lon-prev<-180)lon+=360;out.push([lon,coords[i][1]]);prev=lon;}return out;}
function buildPath(points){
  const coords=[],cum=[0];let total=0;
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];const segNm=hav(a,b);const steps=Math.max(10,Math.round(segNm/55));
    for(let s=0;s<steps;s++){if(i>0&&s===0)continue;const p=slerp(a,b,s/steps);coords.push([p.lon,p.lat]);
      if(coords.length>1){total+=hav({lon:coords[coords.length-2][0],lat:coords[coords.length-2][1]},p);cum.push(total);}}}
  const last=points[points.length-1];coords.push([last.lon,last.lat]);
  total+=hav({lon:coords[coords.length-2][0],lat:coords[coords.length-2][1]},last);cum.push(total);
  return {coords:unwrapLons(coords),cum,total};
}
function pointAtDist(path,d){d=Math.max(0,Math.min(path.total,d));let i=1;while(i<path.cum.length-1&&path.cum[i]<d)i++;
  const d0=path.cum[i-1],d1=path.cum[i],t=d1>d0?(d-d0)/(d1-d0):0;
  const a={lon:path.coords[i-1][0],lat:path.coords[i-1][1]},b={lon:path.coords[i][0],lat:path.coords[i][1]};
  const p=slerp(a,b,t);return {lon:p.lon,lat:p.lat,brg:bearing(a,b)};}

/* ---------------- Land/sea grid + A* water routing ---------------- */
const RES=1,COLS=360/RES,ROWS=180/RES; // 1° land/sea grid — resolves narrow straits
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
// Force known narrow straits/passages open (the 2° grid closes them, which would
// otherwise make Mediterranean/Indonesian routes fall back to a straight line).
function setWaterBox(g,lon0,lat0,lon1,lat1){for(let lon=lon0;lon<=lon1;lon+=1)for(let lat=lat0;lat<=lat1;lat+=1){const c=colOf(lon),r=rowOf(lat);g[r*COLS+c]=0;}}
function carveStraits(g){if(!g)return;
  setWaterBox(g,-7,35,-4,37);    // Strait of Gibraltar (Mediterranean ↔ Atlantic)
  setWaterBox(g,25,39,30,42);    // Aegean / Dardanelles approach
  setWaterBox(g,102,-1,105,3);   // Strait of Malacca / Singapore
  setWaterBox(g,104,-7,107,-5);  // Sunda Strait (Java ↔ Sumatra)
  setWaterBox(g,-71,-55,-66,-52);// Strait of Magellan approaches (open water)
}
function nearestWater(lon,lat){if(!isLandLL(lon,lat))return{c:colOf(lon),r:rowOf(lat)};
  const c0=colOf(lon),r0=rowOf(lat);
  for(let rad=1;rad<40;rad++)for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){
    if(Math.max(Math.abs(dr),Math.abs(dc))!==rad)continue;const c=((c0+dc)%COLS+COLS)%COLS,r=r0+dr;
    if(r<0||r>=ROWS)continue;if(!isLandCell(c,r))return{c,r};}
  return{c:c0,r:r0};}
function segWater(a,b){const d=hav(a,b),n=Math.max(1,Math.ceil(d/28));for(let i=1;i<n;i++){const f=i/n;if(f*d<40||(1-f)*d<40)continue;const p=slerp(a,b,f);if(isLandLL(p.lon,p.lat))return false;}return true;}
function astar(start,goal){
  const s=nearestWater(start.lon,start.lat),g=nearestWater(goal.lon,goal.lat);
  const sIdx=s.r*COLS+s.c,gIdx=g.r*COLS+g.c;if(sIdx===gIdx)return[start,goal];
  const came=new Map(),gS=new Map(),done=new Set();gS.set(sIdx,0);
  const gc={lon:lonC(g.c),lat:latR(g.r)};
  const heap=[]; // binary min-heap of [f, idx] — keeps A* fast on the 1° grid
  const push=(f,i)=>{heap.push([f,i]);let c=heap.length-1;while(c>0){const p=(c-1)>>1;if(heap[p][0]<=heap[c][0])break;const t=heap[p];heap[p]=heap[c];heap[c]=t;c=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let c=0;for(;;){let l=2*c+1,r=l+1,m=c;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===c)break;const t=heap[m];heap[m]=heap[c];heap[c]=t;c=m;}}return top;};
  push(hav({lon:lonC(s.c),lat:latR(s.r)},gc),sIdx);
  let guard=0;
  while(heap.length){if(guard++>2000000)break;const cur=pop()[1];if(done.has(cur))continue;done.add(cur);
    if(cur===gIdx)break;const cf=gS.get(cur),cr=Math.floor(cur/COLS),cc=cur%COLS;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=cr+dr;if(nr<0||nr>=ROWS)continue;
      const nc=((cc+dc)%COLS+COLS)%COLS;if(isLandCell(nc,nr))continue;
      if(dr&&dc&&(isLandCell(nc,cr)||isLandCell(cc,nr)))continue; // no diagonal corner-cutting through land
      const nIdx=nr*COLS+nc;
      const t=cf+hav({lon:lonC(cc),lat:latR(cr)},{lon:lonC(nc),lat:latR(nr)});
      if(t<(gS.get(nIdx)??Infinity)){came.set(nIdx,cur);gS.set(nIdx,t);push(t+hav({lon:lonC(nc),lat:latR(nr)},gc),nIdx);}}}
  if(!came.has(gIdx))return null;
  const path=[];let cur=gIdx;while(cur!==undefined){path.unshift(cur);if(cur===sIdx)break;cur=came.get(cur);}
  const pts=path.map(i=>({lon:lonC(i%COLS),lat:latR(Math.floor(i/COLS))}));
  pts.unshift({lon:start.lon,lat:start.lat});pts.push({lon:goal.lon,lat:goal.lat});return pts;
}
function smooth(pts){if(!pts||pts.length<3)return pts;const out=[pts[0]];let i=0;
  while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!segWater(pts[i],pts[j]))j--;out.push(pts[j]);i=j;}return out;}
// Route between two named points, avoiding land. Only returns a direct line if the grid isn't loaded yet.
function routeLeg(a,b){
  if(!LAND) return [a,b];
  if(segWater(a,b)) return [a,b];
  const raw=astar(a,b);if(!raw) return [a,b];
  const sm=smooth(raw);
  for(let i=0;i<sm.length-1;i++){if(!segWater(sm[i],sm[i+1]))return raw;} // keep grid path if smoothing clips land
  return sm;
}
// Does a computed node list cross land anywhere?
function routeCrossesLand(nodes){if(!LAND)return false;for(let i=0;i<nodes.length-1;i++)if(!segWater(nodes[i],nodes[i+1]))return true;return false;}
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
  {type:"mutiny",major:true,icon:"⚔️",cat:"crew",title:"Mutiny!",
    text:e=>`MUTINY! The crew rose against their officers over short rations and hard discipline. Order was restored at a cost — ${Math.abs(e.crew)} lost and days squandered.`,
    eff:r=>({eta:+(0.6+r*0.9),crew:-(1+Math.round(r)),food:-(2+r*4)})},
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
    id:o.id, name:o.name||ship.name, shipId:ship.id, captainId:o.captainId||"magellan", expedition:o.expedition||"",
    start:o.start, dest:o.dest, waypoints:o.waypoints||[], routeNodes:nodes,
    distanceNm:path.total, baseDurationDays:durationDays,
    departDate:o.departDate||new Date().toISOString(),
    startTimestamp:o.startTimestamp||Date.now(), simSpeed:o.simSpeed??1, paused:o.paused??false,
    simAccumDays:o.simAccumDays||0, lastToggleTs:o.lastToggleTs||Date.now(),
    lastViewedSimDay:o.lastViewedSimDay||0, demo:!!o.demo,
    gold:o.gold??4, interventions:o.interventions||[], _rev:o._rev||0, _arrived:false,
  };
}
// A player pays 2 gold (of a 4-gold budget) to restock a supply by +10 points.
function buyResource(v,type){const cost=2;
  if(v.gold<cost){showToast('Out of gold for this voyage');return;}
  const day=simDaysNow(v);v.gold-=cost;v.interventions.push({day,type,amount:10,cost});v._rev=(v._rev||0)+1;
  save();if(shipCardOpen)renderShipCard();showToast('Bought '+type+' (+10%) for '+cost+' gold');}
function nextResourceCost(v){return 2;}
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
  const cap=captainById(v.captainId);const cm=captainMods(cap);
  const rng=mulberry32(hashStr(v.id)^0x9e3779b9);
  const depart=new Date(v.departDate);
  let hull=ship.hull,sails=ship.sails,food=100,water=100,medicine=100,crew=ship.crew,eta=0;
  const CONSUME=1.6; // global difficulty — supplies/condition run down faster
  const foodRate=100/ship.foodDays*cm.supplyMul*CONSUME, waterRate=100/ship.waterDays*cm.supplyMul*CONSUME;
  const ivs=[...(v.interventions||[])].sort((a,b)=>a.day-b.day);let ivIdx=0;
  const diary=[];const nDays=Math.max(1,Math.ceil(upto));
  const path=buildPath(v.routeNodes);
  const baseWD=worldDayOf(v);const pirateResolved=new Set();
  let sunk=false,sinkDay=0,sinkPos=null,sinkCause='',lastCause='storms and hardship';let stopIdx=0;
  for(let d=1;d<=nDays;d++){
    food-=foodRate;water-=waterRate;medicine-=0.55;hull-=0.13;
    while(ivIdx<ivs.length&&ivs[ivIdx].day<=d){const iv=ivs[ivIdx];if(iv.type==='food')food+=iv.amount;else if(iv.type==='water')water+=iv.amount;else if(iv.type==='medicine')medicine+=iv.amount;
      diary.push({day:d,date:new Date(depart.getTime()+d*86400000),major:false,cat:'supplies',icon:'🪙',title:'Resupplied',text:`The captain paid for fresh ${iv.type} to be brought aboard (+${iv.amount}%).`,meta:`Player intervention · ${iv.cost} gold`});ivIdx++;}
    // provisioning stop reached?
    while(stopIdx<stops.length&&stops[stopIdx].day<=d){const s=stops[stopIdx];food=Math.max(food,72);water=Math.max(water,68);medicine=Math.min(100,medicine+14);
      diary.push(mkStop(v,d,depart,s.name,path,d/dur));stopIdx++;}
    // events on this day
    const todays=evAll.filter(e=>Math.floor(e.day)===d);
    for(const e of todays){const f=e.eff;const nm=cm.negEventMul;
      if(f.hull)hull+=f.hull<0?f.hull*nm:f.hull;
      if(f.sails)sails+=f.sails<0?f.sails*nm:f.sails;
      if(f.food)food+=f.food<0?f.food*nm:f.food;
      if(f.water)water+=f.water<0?f.water*nm:f.water;
      if(f.medicine)medicine+=f.medicine<0?f.medicine*nm:f.medicine;
      if(f.eta)eta+=f.eta>0?f.eta*nm:f.eta;
      if(f.crew)crew+=f.crew<0?Math.min(0,Math.round(f.crew*cm.crewLossMul)):f.crew;}
    if(todays.some(e=>e.tpl.type==='storm'))lastCause='a storm';
    // starvation / thirst crew loss (leadership softens this)
    if(food<=0||water<=0){const loss=Math.round(((rng()<0.6?1:0)+(medicine<20?1:0))*cm.crewLossMul);crew=Math.max(0,crew-loss);if(food<=0||water<=0)lastCause='starvation and thirst';}
    // ---- piracy: nearest un-resolved pirate within detection during the day ----
    const dpos=pointAtDist(path,Math.min(1,d/dur)*v.distanceNm);
    if(crew>0&&!sunk){let near=null,nearD=1e9;
      for(const pir of PIRATES){if(pirateResolved.has(pir.id))continue;
        for(let k=0;k<8;k++){const fr=d-1+k/8;if(fr<0)continue;const pp=pointAtDist(path,Math.min(1,fr/dur)*v.distanceNm);const qp=piratePosAt(pir,baseWD+fr);const dd=hav(pp,qp);if(dd<nearD){nearD=dd;near=pir;}}}
      if(near&&nearD<PIRATE_DETECT_NM){pirateResolved.add(near.id);
        const cbr=mulberry32(hashStr(v.id+'|pir'+near.id+'|'+d));
        const def=Math.min(0.82,0.26+cm.combatBonus*0.6+(ship.maneuver-50)/100*0.25+(hull/100-0.5)*0.15);
        const sev=Math.max(0.12,near.strength*(1-def)*(0.7+cbr()*0.6));
        const dHull=-(5+sev*22),dFood=-(sev*8),dWater=-(sev*6),dMed=-(sev*7),dCrew=-Math.round(sev*4);
        hull+=dHull;food+=dFood;water+=dWater;medicine+=dMed;crew=Math.max(0,crew+dCrew);lastCause='a pirate attack';
        diary.push({day:d,date:new Date(depart.getTime()+d*86400000),major:true,cat:'combat',icon:'🏴‍☠️',title:'Pirate Attack',
          text:`The ${v.name} was intercepted by the pirate ${near.name} under ${near.captain}. Hull ${dHull.toFixed(0)}%, food ${dFood.toFixed(0)}%, crew ${dCrew}.${cm.combatBonus>0.12?` Captain ${cap.name.split(' ').slice(-1)[0]}'s combat skill blunted the assault.`:''}`,
          meta:`Pirate encounter · sighted ${Math.round(nearD)} nm · ${fmtCoord(dpos.lat,dpos.lon)}`});}}
    hull=cl(hull);sails=cl(sails);food=cl(food);water=cl(water);medicine=cl(medicine);
    if(hull<=0&&!sunk){sunk=true;sinkDay=d;sinkPos={lon:dpos.lon,lat:dpos.lat};sinkCause=lastCause;
      diary.push({day:d,date:new Date(depart.getTime()+d*86400000),major:true,cat:'combat',icon:'☠️',title:'The '+v.name+' is lost',
        text:`Her hull breached, the ${v.name} was lost to the sea after ${d} days — ${sinkCause}. The wreck settled beneath the waves.`,
        meta:`Wreck · ${fmtCoord(dpos.lat,dpos.lon)}`});break;}
    // diary entry for the day (event days emphasized)
    const r1=rng(),r2=rng();const weather=WEATHERS[Math.floor(r1*WEATHERS.length)],wind=WINDS[Math.floor(r2*WINDS.length)];
    const pos=dpos;const date=new Date(depart.getTime()+d*86400000);
    const instSpeed=ship.avg*(1+Math.sin(d*1.6)*0.05);
    if(todays.length){for(const e of todays){diary.push({day:d,date,major:e.tpl.major,cat:e.tpl.cat,icon:e.tpl.icon,title:e.tpl.title,
      text:e.tpl.text({hull:e.eff.hull||0,sails:e.eff.sails||0,water:e.eff.water||0,food:e.eff.food||0,eta:e.eff.eta||0,crew:e.eff.crew||0}),
      meta:`${weather} · Wind ${wind} · ${fmtCoord(pos.lat,pos.lon)}`});}}
    else diary.push({day:d,date,major:d===1,cat:d===1?"navigation":"navigation",icon:d===1?"⚓":null,title:d===1?"Departure":null,
      text:dayText(d,v,ship,crew,weather,wind,instSpeed,path,d/dur,rng),
      meta:`${weather} · Wind ${wind} · ${instSpeed.toFixed(1)} kn · ${fmtCoord(pos.lat,pos.lon)}`});
  }
  eta-=(1-cm.etaMul)*dur*0.5; // navigation efficiency (subtle)
  const res={final:{hull,sails,food,water,medicine,crew,eta},diary,events:evAll,stops,sunk,sinkDay,sinkPos,sinkCause};
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
  const ship=shipById(v.shipId);const dur=v.baseDurationDays;
  const cd=Math.max(0,Math.min(curDay,dur));
  const sim=simulate(v,cd);const f=sim.final;
  const sunk=!!sim.sunk;const done=!sunk&&curDay>=dur;
  const effDay=sunk?sim.sinkDay:cd;
  const path=buildPath(v.routeNodes);const distSoFar=Math.min(1,effDay/dur)*v.distanceNm;
  const pos=pointAtDist(path,distSoFar);
  const adjDur=dur+f.eta;const remainingDays=Math.max(0,adjDur-curDay);
  const instSpeed=Math.max(1.2,ship.avg*(1+Math.sin(effDay*1.6)*0.05));
  const rng=mulberry32(hashStr(v.id)^(Math.floor(effDay)+7));const weather=WEATHERS[Math.floor(rng()*WEATHERS.length)],wind=WINDS[Math.floor(rng()*WINDS.length)];
  let nextStop=null;for(const s of sim.stops)if(s.day>effDay){nextStop=s;break;}
  return {ship,curDay:sunk?sim.sinkDay:curDay,done,sunk,sinkCause:sim.sinkCause,sinkDay:sim.sinkDay,dur,adjDur,pos,brg:pos.brg,heading:compassPoint(pos.brg),
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
  id:v.id,name:v.name,shipId:v.shipId,captainId:v.captainId,expedition:v.expedition,start:v.start,dest:v.dest,waypoints:v.waypoints,
  routeNodes:v.routeNodes,departDate:v.departDate,startTimestamp:v.startTimestamp,simSpeed:v.simSpeed,paused:v.paused,
  simAccumDays:v.simAccumDays,lastToggleTs:v.lastToggleTs,lastViewedSimDay:v.lastViewedSimDay,demo:v.demo,ci:v.ci,color:v.color,
  gold:v.gold,interventions:v.interventions,_rev:v._rev}))};
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
  map.on('load',()=>{addGraticule();addPorts();addArrowImages();setupRouteLayers();addPirates();applyMapTheme();fetchLandGrid();
    refreshAll(true);document.getElementById('boot').style.opacity='0';setTimeout(()=>{const b=document.getElementById('boot');if(b)b.remove();},700);startRAF();});
  map.on('error',()=>{});
  map.on('click',()=>{hideClock();}); // clicking open sea/land deselects the voyage clock
}
function fetchLandGrid(){
  fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson")
   .then(r=>r.json()).then(gj=>{LAND=buildLandGrid(gj.features);carveStraits(LAND);STATE.voyages.forEach(v=>v._routeOk=false);rerouteAll();showToast("Charts loaded — routes steer around land");})
   .catch(()=>{
     fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson")
      .then(r=>r.json()).then(gj=>{LAND=buildLandGrid(gj.features);carveStraits(LAND);STATE.voyages.forEach(v=>v._routeOk=false);rerouteAll();}).catch(()=>{});});
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
    if(dc.length>1)done.push({type:'Feature',properties:{color:v.color,active:1},geometry:{type:'LineString',coordinates:unwrapLons(dc)}});}
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
    const cut=pointAtDist(path,cutD);dc.push([cut.lon,cut.lat]);if(dc.length>1)done.push({type:'Feature',properties:{color:v.color,active:1},geometry:{type:'LineString',coordinates:unwrapLons(dc)}});}
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
      el.innerHTML=`<div class="inner">${shipSVG(shipById(v.shipId))}</div>`;
      el.addEventListener('click',()=>{STATE.activeId=v.id;save();showClockFor();refreshAll(false);const s=stateAt(v,simDaysNow(v));if(s.sunk)showWreck(v);else toggleShipCard(true);});
      shipMarkers[v.id]=new maplibregl.Marker({element:el,rotationAlignment:'viewport'}).setLngLat([pt.lon,pt.lat]).addTo(map);}
    const m=shipMarkers[v.id];m.setLngLat([pt.lon,pt.lat]);applyMarkerState(m,v,st,pt);});
}
function applyMarkerState(m,v,st,pt){const el=m.getElement();const inner=el.querySelector('.inner');
  if(st.sunk){if(el.dataset.wreck!=='1'){el.dataset.wreck='1';el.classList.add('wreck');inner.innerHTML=wreckSVG();inner.style.transform='';}}
  else{if(el.dataset.wreck==='1'){el.dataset.wreck='0';el.classList.remove('wreck');inner.innerHTML=shipSVG(shipById(v.shipId));}
    inner.style.transform=(pt.brg>180?'scaleX(-1)':'scaleX(1)');}
  el.classList.toggle('dim',v.id!==STATE.activeId&&!st.sunk);}
function wreckSVG(){return `<svg width="36" height="26" viewBox="0 0 40 30">
  <g stroke="#241a0f" stroke-width=".8"><path d="M8 23 L32 23 L28.5 27.5 L11.5 27.5 Z" fill="#4a3a28" opacity=".9"/>
  <line x1="19" y1="23" x2="25" y2="10" stroke="#241a0f" stroke-width="1.5"/>
  <path d="M25 11 L31 16 L25 16 Z" fill="#6a5a45" opacity=".55"/>
  <line x1="14" y1="23" x2="11" y2="15" stroke="#241a0f" stroke-width="1.1"/></g>
  <g fill="#d8cbb2"><circle cx="17.5" cy="19.5" r=".9"/><circle cx="16.6" cy="21" r=".9"/></g></svg>`;}
/* Pirate fleet markers — distinctive black ships flying the Jolly Roger, clickable */
let pirateMarkers=[];
function addPirates(){PIRATES.forEach(p=>{const el=document.createElement('div');el.className='pirate-marker';el.title='Pirate — '+p.name+' ('+p.captain+')';
  el.innerHTML='<div class="pinner">'+pirateSVG()+'</div>';el.addEventListener('click',()=>showPirate(p));
  const m=new maplibregl.Marker({element:el,rotationAlignment:'viewport'}).setLngLat([p.lon,p.lat]).addTo(map);pirateMarkers.push(m);});}
function pirateSVG(){return `<svg width="34" height="27" viewBox="0 0 46 34">
  <g stroke="#0c0806" stroke-width=".7">
    <rect x="22.2" y="2.5" width="1.5" height="19.5" fill="#0c0806" stroke="none"/>
    <path d="M23.7 3 L32.5 4.8 L23.7 6.7 Z" fill="#111"/>
    <path d="M8 22 L38 22 L34 28.5 L12 28.5 Z" fill="#1b140d"/>
    <path d="M12.5 22 L33.5 22 L33 16.5 Q23 19.6 13 16.5 Z" fill="#2a2017"/>
    <path d="M21.4 21.5 L21.4 8.5 Q27.5 11.5 33 8.5 L33 21.5 Z" fill="#31261c"/>
    <line x1="8" y1="22.2" x2="38" y2="22.2" stroke="#6e1c12" stroke-width="1"/></g>
  <g fill="#efe9dc"><circle cx="27.6" cy="4.9" r="1.15"/><circle cx="26.7" cy="6.4" r=".55"/><circle cx="28.5" cy="6.4" r=".55"/></g></svg>`;}
function updatePirates(av){const wd=av?worldDayOf(av)+simDaysNow(av):Date.now()/86400000;
  PIRATES.forEach((p,i)=>{if(!pirateMarkers[i])return;const pos=piratePosAt(p,wd);pirateMarkers[i].setLngLat([pos.lon,pos.lat]);
    const inner=pirateMarkers[i].getElement().querySelector('.pinner');if(inner){const brg=pirateBearingAt(p,wd);inner.style.transform=(brg>180?'scaleX(-1)':'scaleX(1)');}});}
function showPirate(p){const av=activeVoyage();let state='Patrolling',dist=null;
  if(av){const st=stateAt(av,simDaysNow(av));const wd=worldDayOf(av)+simDaysNow(av);const pp=piratePosAt(p,wd);dist=hav(st.pos,pp);state=st.sunk||st.done?'Patrolling':dist<60?'Attacking':dist<PIRATE_DETECT_NM?'Pursuing':'Patrolling';}
  const A=p.a;const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow" style="color:#a23c2c">🏴‍☠️ Pirate Vessel</div><h2>${p.name}</h2>
    <div class="sub">${p.captain} · ${p.era}</div>
    <div class="stamp">State: ${state}${dist!=null?' · '+Math.round(dist).toLocaleString()+' nm from '+av.name:''}</div>
    <div class="divider"></div>
    <div class="sd-ratings" style="max-width:320px;margin:0 auto">
      ${ratingBar('Aggression',A.aggression)}${ratingBar('Speed',A.speed)}${ratingBar('Cunning',A.cunning)}${ratingBar('Firepower',A.firepower)}${ratingBar('Notoriety',A.notoriety)}</div>
    <div class="btnrow"><button class="btn btn-gold btn-sm" onclick="hideModal()">Close</button></div>`;
  showModal();}
/* side-view sailing-ship silhouettes, type-accurate. Bow faces right; marker flips when heading west. */
function shipClass(ship){const t=(ship.type||"").toLowerCase();if(t.includes("caravel"))return"caravel";
  if(t.includes("galleon")||t.includes("frigate"))return"tallship";if(t.includes("clipper"))return"clipper";return"carrack";}
/* Ship art registry. Each class returns period-appropriate SVG (bow faces right).
   To swap in custom artwork for a ship later, add an `art` key to the ship and
   branch on it here — the rest of the app calls shipArt()/shipSVG() unchanged. */
function shipArt(cls,scale){scale=scale||1;const W=Math.round(54*scale),H=Math.round(38*scale);
  const wood='#7a5c2e',woodD='#513c1c',canv='#f1e5c9',canv2='#e3d0a6',rope='#9a7d46';
  const flag=(x,y,c)=>`<path d="M${x} ${y} L${x+6.5} ${y+1.3} L${x} ${y+2.7} Z" fill="${c||'#b5362a'}" stroke="#00000030" stroke-width=".3"/>`;
  const mast=(x,top)=>`<rect x="${x-0.5}" y="${top}" width="1" height="${22-top}" rx=".4" fill="${woodD}"/>`;
  const yard=(x,y,w)=>`<rect x="${x-w}" y="${y-0.35}" width="${w*2}" height=".7" rx=".35" fill="${woodD}"/>`;
  const sq=(x,yt,h,w,fill)=>`${yard(x,yt,w+0.5)}<path d="M${x-w} ${yt} Q${x} ${yt+0.6} ${x+w} ${yt} L${x+w} ${yt+h} Q${x} ${yt+h+1.5} ${x-w} ${yt+h} Z" fill="${fill||canv}" stroke="${rope}" stroke-width=".4"/><line x1="${x-w}" y1="${yt+h*0.6}" x2="${x+w}" y2="${yt+h*0.6}" stroke="${rope}" stroke-width=".25" opacity=".5"/>`;
  const lateen=(x,yt,yb,dir,fill)=>`<line x1="${x}" y1="${yt-1}" x2="${x+dir*10}" y2="${yb-2}" stroke="${woodD}" stroke-width=".6"/><path d="M${x} ${yt} L${x+dir*9} ${yb-1.5} L${x} ${yb} Z" fill="${fill||canv}" stroke="${rope}" stroke-width=".4"/>`;
  // shared hull with sheer, wale line, rudder
  const hull=`<path d="M4 24.5 Q3 21.5 7.5 21.3 L45 21.3 Q49.5 21.3 46.8 25.4 L42.5 29.6 Q40.5 31 35 31 L13 31 Q8 31 6 27.8 Z" fill="${wood}" stroke="${woodD}" stroke-width=".8"/>
    <path d="M6.5 23.4 L45.3 23.4" stroke="${woodD}" stroke-width=".7" opacity=".55"/>`;
  const bowsprit=`<line x1="45" y1="22" x2="53" y2="18.5" stroke="${woodD}" stroke-width="1" stroke-linecap="round"/>`;
  let g="";
  if(cls==="carrack"){ // Victoria / Santa María — tall aft castle, forecastle, 3 masts
    g=`<path d="M4 24.5 Q3 18 6 17.5 L11.5 17.5 Q12.5 17.5 12.5 21.3 L6 22 Z" fill="#6a4d24" stroke="${woodD}" stroke-width=".6"/>
       <path d="M40 21.3 L40 17 Q40 15.4 43 15.4 L45.5 15.6 Q47 15.8 46.4 18 L45 21.3 Z" fill="#6a4d24" stroke="${woodD}" stroke-width=".6"/>
       ${mast(17,4.5)}${mast(27,2)}${mast(37.5,7)}
       ${sq(27,3.5,7,6)}${sq(27,11.5,6.5,4.6,canv2)}
       ${sq(17,6.5,6.5,4.4)}
       ${lateen(37.5,9,20,1,canv2)}
       ${flag(27,1,'#b5362a')}${flag(17,4,'#2f6b8f')}`;
  } else if(cls==="caravel"){ // caravela latina — sleek, lateen-rigged
    g=`${mast(16,5)}${mast(27,3.5)}${mast(38,7.5)}
       ${lateen(16,6,20,1,canv)}${lateen(27,4.5,20,1,canv2)}${lateen(38,8.5,20,1,canv)}
       ${flag(27,2.5,'#3f7d4a')}`;
  } else if(cls==="tallship"){ // galleon / frigate — long hull, gunports, stacked square sails
    g=`<path d="M4 24.5 Q3 18.5 6 18 L11 18 Q12 18 12 21.3 L6 22 Z" fill="#6a4d24" stroke="${woodD}" stroke-width=".6"/>
       ${mast(15,4)}${mast(25.5,1.5)}${mast(36,3.5)}
       ${sq(15,6,6,4.2)}${sq(15,13,5.5,3.4,canv2)}
       ${sq(25.5,3.5,6.5,5)}${sq(25.5,11,6,4,canv2)}${sq(25.5,18,4.5,3,canv)}
       ${sq(36,5,6,4.4)}${sq(36,12,5.5,3.4,canv2)}
       ${flag(25.5,0.5,'#b5362a')}
       <g fill="#3a2c14">${[15,20,25,30,35,40].map(x=>`<rect x="${x}" y="24.4" width="2" height="1.4" rx=".3"/>`).join('')}</g>`;
  } else { // clipper — long low hull, tall raked masts, clouds of canvas + jibs
    g=`${mast(15,2)}${mast(26,0.5)}${mast(37,2)}
       ${sq(15,3.5,5,3.8)}${sq(15,9.5,5,3.2,canv2)}${sq(15,15.5,4.5,2.6,canv)}
       ${sq(26,2,5.5,4.2)}${sq(26,8.5,5,3.4,canv2)}${sq(26,14.5,4.5,2.8,canv)}
       ${sq(37,3.5,5,3.8)}${sq(37,9.5,5,3.2,canv2)}${sq(37,15.5,4.5,2.6,canv)}
       <path d="M45 21 L48 6 L45 20 Z" fill="${canv}" stroke="${rope}" stroke-width=".3"/>
       ${flag(26,-0.5,'#2f6b8f')}`;
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 54 34">${bowsprit}${g}${hull}</svg>`;}
function shipSVG(ship){return shipArt(shipClass(ship||SHIPS[0]),1);}

/* animation loop — positions derive from timestamps */
function startRAF(){if(rafOn)return;rafOn=true;let last=0;
  function tick(ts){if(ts-last>180){let anyMoving=false;STATE.voyages.forEach(v=>{if(!shipMarkers[v.id])return;const path=buildPath(v.routeNodes);
      const st=stateAt(v,simDaysNow(v));const pt=pointAtDist(path,st.distSoFar);const m=shipMarkers[v.id];
      m.setLngLat([pt.lon,pt.lat]);applyMarkerState(m,v,st,pt);
      if(!st.done&&!st.sunk&&!v.paused)anyMoving=true;if(v.id===STATE.activeId){checkArrival(v,st);}});
    if(anyMoving)updateDone();
    const av=activeVoyage();updatePirates(av);
    if(av){notifyEncounters(av);updateClock(av);const dnow=Math.floor(simDaysNow(av));
      // only rebuild panels when the day changes AND the pointer is up — keeps buttons clickable
      if(!_pDown){if(shipCardOpen&&dnow!==_cardDay){_cardDay=dnow;renderShipCard();}
        if(drawerOpen&&dnow!==_drawerDay){_drawerDay=dnow;renderDrawer();}}}
    last=ts;}if(rafOn)requestAnimationFrame(tick);}requestAnimationFrame(tick);}
let _pDown=false,_cardDay=-1,_drawerDay=-1;
window.addEventListener('pointerdown',()=>{_pDown=true;},true);
window.addEventListener('pointerup',()=>{_pDown=false;},true);
window.addEventListener('pointercancel',()=>{_pDown=false;},true);
function notifyEncounters(v){const cur=simDaysNow(v);const last=v._noteDay||0;if(cur<=last){v._noteDay=cur;return;}
  const st=stateAt(v,cur);
  for(const e of st.diary){if(e.day<=last||e.day>cur)continue;
    if(e.icon==='☠️')showToast('☠️ '+v.name+' has sunk!');
    else if(e.cat==='combat')showToast('🏴‍☠️ Pirate attack — '+v.name);
    else if(e.title==='Mutiny!')showToast('⚔️ MUTINY! aboard '+v.name);}
  v._noteDay=cur;}

/* ---------------- Sim clock HUD ---------------- */
let clockVisible=false;
function showClockFor(){clockVisible=true;}
function hideClock(){clockVisible=false;document.getElementById('clock').style.display='none';}
function updateClock(v){if(!clockVisible){document.getElementById('clock').style.display='none';return;}
  const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);
  const wDate=new Date(new Date(v.departDate).getTime()+cd*86400000);
  const frac=cd-Math.floor(cd);const hh=String(Math.floor(frac*24)).padStart(2,'0');const mm=String(Math.floor((frac*24%1)*60)).padStart(2,'0');
  document.getElementById('clock').style.display='block';
  document.getElementById('clockDay').textContent=st.done?`Arrived · Day ${st.dur.toFixed(0)}`:`Day ${Math.floor(cd)} of ${st.dur.toFixed(0)}`;
  document.getElementById('clockDate').textContent=fmtLongDate(wDate);
  document.getElementById('clockTime').textContent=`${hh}:${mm} · ${v.paused?'PAUSED':v.simSpeed+'×'}`;}

/* ---------------- Ship card ---------------- */
function renameVoyage(e){if(e)e.stopPropagation();const v=activeVoyage();if(!v)return;
  const nn=prompt('Name this voyage',v.name);if(nn&&nn.trim()){v.name=nn.trim();save();if(shipCardOpen)renderShipCard();if(drawerOpen)renderDrawer();showToast('Renamed to “'+v.name+'”');}}
let shipCardOpen=false,_openTimer=null;
function openCardSoon(ms){clearTimeout(_openTimer);_openTimer=setTimeout(()=>toggleShipCard(true),ms);}
function toggleShipCard(open){shipCardOpen=open!==undefined?open:!shipCardOpen;const el=document.getElementById('shipCard');
  if(!shipCardOpen)clearTimeout(_openTimer);
  if(shipCardOpen){closeSheet();renderShipCard();el.style.display='block';showClockFor();}else el.style.display='none';}
function renderShipCard(){const v=activeVoyage();if(!v)return;const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);
  const el=document.getElementById('shipCard');
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div class="eyebrow" ${st.sunk?'style="color:#a23c2c"':''}>${st.sunk?'Lost at Sea':st.done?'Arrived':'At Sea'}</div><div class="name">${v.name} <button class="pencil" onclick="renameVoyage(event)" title="Rename voyage">✎</button></div>
      ${v.expedition?`<div class="exp">${v.expedition}</div>`:''}</div>
      <button onclick="toggleShipCard(false)" style="font-size:17px;color:#8a6d30">✕</button></div>
    <div class="route-mini" style="font-size:13px;margin:8px 0 4px">${v.start.n} → ${v.dest.n}</div>
    <div style="text-align:center;margin-bottom:6px"><span class="pill">Day ${Math.floor(cd)} / ${st.dur.toFixed(0)}</span></div>
    <div class="divider"></div>
    <div class="stat-row" style="margin-bottom:7px;font-size:13.5px"><span>Captain</span><b>${captainById(v.captainId).name}</b></div>
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
    <div class="stat-row"><span>🪙 Gold</span><b>${v.gold} / 4</b></div>
    ${(st.done||st.sunk)?'':`<div class="buy-row">
      <button class="buy-btn" onclick="buyResource(activeVoyage(),'food')" ${v.gold<nextResourceCost(v)?'disabled':''}>＋ Food</button>
      <button class="buy-btn" onclick="buyResource(activeVoyage(),'water')" ${v.gold<nextResourceCost(v)?'disabled':''}>＋ Water</button>
      <button class="buy-btn" onclick="buyResource(activeVoyage(),'medicine')" ${v.gold<nextResourceCost(v)?'disabled':''}>＋ Med</button>
    </div><div class="hint" style="text-align:center;margin-top:5px">Each restocks +10% · costs ${nextResourceCost(v)} gold</div>`}
    <div class="divider"></div>
    <button class="btn btn-primary" style="width:100%" onclick="openDrawer('overview')">View Voyage</button>`;}
function bar(label,val){const cls=val<25?'crit':val<50?'warn':'';return `<div class="barwrap"><div class="top"><span>${label}</span><span>${Math.round(val)}%</span></div><div class="bar ${cls}"><i style="width:${val}%"></i></div></div>`;}

/* ---------------- Sheet: New Voyage / Fleet / History ---------------- */
let sheetMode=null,nv={shipId:"victoria",captainId:"magellan",start:null,dest:null,waypoints:[],pick:null};
function resetNV(){nv={shipId:"victoria",captainId:"magellan",start:null,dest:null,waypoints:[],pick:null};clearPlanMap();}
/* captain portrait — real painting when online, engraved medallion fallback */
function captainPortrait(cap,big){const cls=big?'portrait portrait-lg':'portrait';const url=cap.file?`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cap.file)}?width=220`:'';
  return `<div class="${cls}" title="${cap.name}">${medallionSVG(cap.hue||210)}${url?`<img alt="${cap.name}" src="${url}" onload="this.classList.add('ok')" onerror="this.remove()">`:''}</div>`;}
function captainDetailsHTML(c){const A=c.a;return `<div class="ship-detail">
  <div style="display:flex;gap:12px;align-items:flex-start">
    ${captainPortrait(c,true)}
    <div style="flex:1"><div style="font-family:var(--serif);font-size:18px;font-weight:600;color:var(--ink);line-height:1.05">${c.name}</div>
      <div style="font-size:11px;color:#8a6d30">${c.flag} · ${c.era}</div>
      <div style="font-size:11px;color:#5a4a28;font-style:italic;margin-top:3px">${c.bio}</div>
      <div style="font-size:10.5px;color:#6b5426;margin-top:4px"><b>Specialty:</b> ${c.specialty}</div></div></div>
  <div class="sd-ratings" style="margin-top:10px">
    ${ratingBar('Navigation',A.navigation)}${ratingBar('Exploration',A.exploration)}${ratingBar('Leadership',A.leadership)}
    ${ratingBar('Diplomacy',A.diplomacy)}${ratingBar('Combat',A.combat)}${ratingBar('Endurance',A.endurance)}</div></div>`;}
function pickCaptain(id){nv.captainId=id;renderNew();}
/* route-planner slot picking */
function startPick(kind){nv.pick={kind,continent:null};renderNew();}
function pickContinent(c){if(nv.pick)nv.pick.continent=c;renderNew();}
function choosePort(name){const p=PORTS.find(x=>x.n===name);if(p&&nv.pick)selPort(nv.pick.kind,p);nv.pick=null;renderNew();}
function cancelPick(){nv.pick=null;renderNew();}
function clearStart(){nv.start=null;updatePlanMap();renderNew();}
function clearDest(){nv.dest=null;updatePlanMap();renderNew();}
/* selected-point markers on the map during planning */
let planMarkers=[];
function clearPlanMap(){planMarkers.forEach(m=>m.remove());planMarkers=[];if(map&&map.getSource('route-preview'))map.getSource('route-preview').setData(emptyFC());}
function updatePlanMap(focus){if(!map)return;clearPlanMap();
  const list=[];if(nv.start)list.push([nv.start,'start']);nv.waypoints.forEach(w=>list.push([w,'way']));if(nv.dest)list.push([nv.dest,'end']);
  list.forEach(([p,role])=>{const el=document.createElement('div');el.className='plan-pin '+role;el.innerHTML=`<div class="pin-lbl">${p.n}</div><div class="pin-drop"></div>`;
    const m=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.lon,p.lat]).addTo(map);planMarkers.push(m);});
  if(nv.start&&nv.dest){const nodes=computeRoute([nv.start,...nv.waypoints,nv.dest]);const path=buildPath(nodes);map.getSource('route-preview').setData(lineFeat(path.coords));
    const b=new maplibregl.LngLatBounds();path.coords.forEach(c=>b.extend(c));map.fitBounds(b,{padding:{top:90,bottom:80,left:70,right:390},duration:900,maxZoom:5});}
  else if(focus){map.flyTo({center:[focus.lon,focus.lat],zoom:Math.max(map.getZoom(),3.2),duration:900});}}
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
function openSheet(mode){sheetMode=mode;if(mode==='new')resetNV();toggleShipCard(false);document.getElementById('sheet').style.display='block';renderSheet();}
function closeSheet(){document.getElementById('sheet').style.display='none';sheetMode=null;clearPlanMap();if(map&&map.getSource('route-ref'))map.getSource('route-ref').setData(emptyFC());}
function renderSheet(){if(sheetMode==='new')renderNew();else if(sheetMode==='fleet')renderFleet();else if(sheetMode==='history')renderHistory();}

function renderNew(){const el=document.getElementById('sheet');const ship=shipById(nv.shipId);const cap=captainById(nv.captainId);
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:21px">New Voyage</h2>
      <button onclick="closeSheet()" style="font-size:17px;color:#8a6d30">✕</button></div><div class="divider"></div>
    <div class="field"><label>Ship</label>
      <select class="sel" style="width:100%" onchange="pickShip(this.value)">${SHIPS.map(s=>`<option value="${s.id}" ${s.id===nv.shipId?'selected':''}>${s.name} — ${s.type} (${s.era})</option>`).join('')}</select>
      ${shipDetailsHTML(ship)}</div>
    <div class="field"><label>Choose your Captain</label>
      <select class="sel" style="width:100%" onchange="pickCaptain(this.value)">${CAPTAINS.map(c=>`<option value="${c.id}" ${c.id===nv.captainId?'selected':''}>${c.name} — ${c.flag}</option>`).join('')}</select>
      ${captainDetailsHTML(cap)}</div>
    <div class="divider"></div><div class="eyebrow" style="text-align:center;margin-bottom:12px">Plan your route</div>
    <div class="planner">
      ${slotHTML('start','Start',nv.start)}
      ${nv.pick&&nv.pick.kind==='start'?pickerHTML():''}
      <div class="plan-arrow">↓</div>
      ${slotHTML('dest','Destination',nv.dest)}
      ${nv.pick&&nv.pick.kind==='dest'?pickerHTML():''}
      <div class="plan-arrow">↓</div>
      <div class="plan-cap">Waypoints <span style="font-style:italic;font-weight:400;text-transform:none">optional</span></div>
      ${nv.waypoints.map((w,i)=>`<div class="plan-slot filled"><span class="pin">📍</span><span class="slot-name">${w.n} <small>${w.c}</small></span><button class="slot-x" onclick="rmWay(${i})">✕</button></div>`).join('')}
      ${nv.waypoints.length<5?`<button class="plan-add" onclick="startPick('way')">＋ Add waypoint</button>`:''}
      ${nv.pick&&nv.pick.kind==='way'?pickerHTML():''}
    </div>
    ${(nv.start&&nv.dest)?previewHTML(ship):''}`;
  if(nv.pick){const s=document.getElementById('pickSearch');if(s){s.addEventListener('input',renderPickResults);}}}
function slotHTML(kind,label,cur){const clr=kind==='start'?'clearStart':'clearDest';
  return `<div class="plan-cap">${label}</div>
    <div class="plan-slot ${cur?'filled':''}" onclick="startPick('${kind}')">
      <span class="pin">📍</span>
      <span class="slot-name">${cur?cur.n+' <small>'+cur.c+'</small>':'<span class="muted">Choose '+label.toLowerCase()+'</span>'}</span>
      ${cur?`<button class="slot-x" onclick="event.stopPropagation();${clr}()">✕</button>`:'<span class="slot-cta">Select ▸</span>'}
    </div>`;}
function pickerHTML(){const pk=nv.pick,cont=pk.continent;
  return `<div class="picker">
    <div class="picker-head"><span class="eyebrow">Choose ${pk.kind==='way'?'a waypoint':pk.kind}</span><button onclick="cancelPick()" style="color:#8a6d30;font-size:14px">✕</button></div>
    <div class="picker-search"><input id="pickSearch" placeholder="Search any port…" autocomplete="off"><div id="pickResults"></div></div>
    <div class="cont-chips">${REGIONS.map(r=>`<button class="cont-chip ${r===cont?'on':''}" onclick="pickContinent('${r}')">${r}</button>`).join('')}</div>
    ${cont?`<div class="port-grid">${PORTS.filter(p=>p.r===cont).map(p=>`<button class="port-btn" onclick="choosePort('${p.n.replace(/'/g,"\\'")}')">${p.n}<small>${p.c}</small></button>`).join('')}</div>`:'<div class="hint" style="padding:8px 2px">Pick a continent above to see its ports.</div>'}
  </div>`;}
function renderPickResults(){const q=this.value.trim().toLowerCase();const box=document.getElementById('pickResults');if(!q){box.innerHTML='';return;}
  const m=PORTS.filter(p=>p.n.toLowerCase().includes(q)||p.c.toLowerCase().includes(q)).slice(0,8);
  box.innerHTML=`<div class="port-grid" style="margin-top:6px">${m.map(p=>`<button class="port-btn" onclick="choosePort('${p.n.replace(/'/g,"\\'")}')">${p.n}<small>${p.c}</small></button>`).join('')||'<div class="hint">No port found</div>'}</div>`;}
function previewHTML(ship){const pts=[nv.start,...nv.waypoints,nv.dest];const nodes=computeRoute(pts);const path=buildPath(nodes);
  const cap=captainById(nv.captainId);const cm=captainMods(cap);const dur=path.total/(ship.avg*24)+ (1-cm.etaMul)*0; const dep=new Date();const arr=new Date(dep.getTime()+dur*86400000);
  return `<div class="divider"></div><div class="eyebrow" style="text-align:center;margin-bottom:8px">Your Voyage</div>
    <div class="route-mini">${pts.map(p=>p.n).join('<span class="arw">↓</span>')}</div>
    <div class="hint" style="text-align:center">${nodes.length>pts.length?'Route steers around land.':'Direct open-water passage.'} · Captain ${cap.name.split(' ').slice(-1)}</div>
    <div class="divider"></div><div class="preview-grid">
      <div class="pv"><div class="k">Distance</div><div class="v">${Math.round(path.total).toLocaleString()}<span style="font-size:11px"> nm</span></div></div>
      <div class="pv"><div class="k">Duration</div><div class="v">${Math.round(dur)}<span style="font-size:11px"> days</span></div></div>
      <div class="pv"><div class="k">Departure</div><div class="v" style="font-size:14px">${fmtDate(dep)}</div></div>
      <div class="pv"><div class="k">Est. arrival</div><div class="v" style="font-size:14px">${fmtDate(arr)}</div></div>
    </div>
    <button class="btn btn-gold" style="width:100%;margin-top:14px;padding:13px" onclick="launch()">⚓ Launch Voyage</button>`;}
function pickShip(id){nv.shipId=id;renderNew();}
function selPort(kind,p){if(kind==='start')nv.start=p;else if(kind==='dest')nv.dest=p;else if(nv.waypoints.length<5)nv.waypoints.push(p);updatePlanMap(p);}
function rmWay(i){nv.waypoints.splice(i,1);updatePlanMap();renderNew();}
function onPortClick(p){if(sheetMode==='new'){if(nv.pick){choosePort(p.n);return;}if(!nv.start)selPort('start',p);else if(!nv.dest)selPort('dest',p);else if(nv.waypoints.length<5)selPort('way',p);renderNew();showToast(`${p.n} added`);}else showToast(`${p.n}, ${p.c}`);}
function launch(){if(!nv.start||!nv.dest){showToast('Choose a start and destination first');return;}
  const ship=shipById(nv.shipId);const id='v-'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);const now=Date.now();
  const v=makeVoyage({id,shipId:ship.id,captainId:nv.captainId,name:ship.name,start:nv.start,dest:nv.dest,waypoints:nv.waypoints.slice(),
    departDate:new Date().toISOString(),startTimestamp:now,simSpeed:1,paused:false,simAccumDays:0,lastToggleTs:now,lastViewedSimDay:0});
  STATE.voyages.push(v);STATE.activeId=id;ensureColors();save();closeSheet();resetNV();
  refreshAll(true);setSpeedUI(1);setPlayUI(false);showToast('⚓ '+v.name+' departs '+v.start.n);openCardSoon(1400);}

function renderFleet(){const el=document.getElementById('sheet');
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:21px">Your Fleet</h2>
      <button onclick="closeSheet()" style="font-size:17px;color:#8a6d30">✕</button></div>
    <div class="hint" style="margin-top:2px">Every voyage keeps sailing in real time — even while you're away.</div><div class="divider"></div>
    ${STATE.voyages.length?STATE.voyages.map(v=>{const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);const pct=Math.min(100,cd/st.dur*100);
      return `<div class="fleet-item ${v.id===STATE.activeId?'active':''}" onclick="focusVoyage('${v.id}')">
        <span class="fleet-dot" style="background:${v.color}"></span>
        <button class="fleet-x" onclick="removeVoyage('${v.id}',event)" title="Remove voyage">✕</button>
        <div class="fn">${v.name}</div><div class="fr">${v.expedition?v.expedition+' · ':''}${v.start.n} → ${v.dest.n}</div>
        <div class="fs ${st.sunk?'lost':st.done?'done':'sea'}">${st.sunk?'☠ Lost · Day '+st.sinkDay:st.done?'✓ Arrived':'At sea · Day '+Math.floor(cd)+' / '+st.dur.toFixed(0)}</div>
        <div class="prog"><i style="width:${st.sunk?st.sinkDay/st.dur*100:pct}%;background:${st.sunk?'#a23c2c':v.color}"></i></div></div>`;}).join(''):'<div class="hint">No voyages yet. Start one!</div>'}
    <button class="btn btn-gold btn-sm" style="width:100%;margin-top:8px" onclick="openSheet('new')">+ New Voyage</button>`;}
function focusVoyage(id){STATE.activeId=id;save();closeSheet();refreshAll(true);setSpeedUI(activeVoyage().simSpeed);setPlayUI(activeVoyage().paused);openCardSoon(700);}
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
  refreshAll(true);setSpeedUI(100);setPlayUI(false);showToast('⚓ Recreating '+h.name);openCardSoon(1400);}

/* ---------------- Drawer ---------------- */
let drawerOpen=false,drawerTab='overview',diaryFilter='all';
function openDrawer(tab){drawerTab=tab||'overview';drawerOpen=true;showClockFor();document.getElementById('drawer').classList.add('open');
  document.querySelectorAll('#drawerTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===drawerTab));renderDrawer();}
function closeDrawer(){drawerOpen=false;document.getElementById('drawer').classList.remove('open');}
function renderDrawer(){const v=activeVoyage();if(!v)return;const st=stateAt(v,simDaysNow(v));const cd=Math.min(st.curDay,st.dur);
  document.getElementById('drawerHead').innerHTML=`<button class="dclose" onclick="closeDrawer()">✕</button>
    <div class="name">${v.name} <button class="pencil" onclick="renameVoyage(event)" title="Rename voyage">✎</button></div>${v.expedition?`<div class="exp">${v.expedition}</div>`:''}
    <div class="route">${v.start.n} → ${v.dest.n}</div>
    <div class="day">${st.sunk?'⚓ Lost on Day '+st.sinkDay+' · '+st.sinkCause:st.done?'Voyage complete · '+st.dur.toFixed(0)+' days':'Day '+Math.floor(cd)+' of '+st.dur.toFixed(0)}</div>`;
  document.getElementById('drawerBody').innerHTML=drawerTab==='overview'?overviewHTML(v,st):journalHTML(v,st);}
function overviewHTML(v,st){const dur=st.dur;
  const tl=[{day:0,title:'Departure',major:true},...st.events.map(e=>({day:e.day,title:e.tpl.title,major:e.tpl.major})),
    ...st.stops.map(s=>({day:s.day,title:'Stop — '+s.name,major:true})),
    ...st.diary.filter(e=>e.cat==='combat').map(e=>({day:e.day,title:e.title,major:true})),
    st.sunk?{day:st.sinkDay,title:'Lost at Sea',major:true}:{day:dur,title:'Arrival',major:true}].sort((a,b)=>a.day-b.day);
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
const FILTERS=[["all","All"],["major","Major"],["weather","Weather"],["supplies","Supplies"],["navigation","Navigation"],["crew","Crew"],["discovery","Discoveries"],["combat","Pirates"]];
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
let arrivalShown={},sinkShown={};
function checkArrival(v,st){
  if(st.sunk&&!sinkShown[v.id]){sinkShown[v.id]=true;showSink(v,st);return;}
  if(st.done&&!arrivalShown[v.id]){arrivalShown[v.id]=true;showArrival(v);}}
function showSink(v,st){const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow" style="color:#a23c2c">Lost at Sea</div><h2>${v.name} has sunk</h2>
    <div class="sub">Day ${st.sinkDay} · ${v.start.n} → ${v.dest.n}</div>
    <div class="stamp">Position ${fmtCoord(st.pos.lat,st.pos.lon)}</div>
    <div class="divider"></div>
    <div class="journey-line">Cause: ${st.sinkCause}</div>
    <div class="journey-line">${st.diary.filter(e=>e.cat==='combat'&&e.icon==='🏴‍☠️').length} pirate encounter(s) · ${st.crew} crew aboard at the end</div>
    <div class="journey-line" style="color:#8a6d30;font-style:italic;margin-top:6px">Her wreck will remain on the map as a memorial.</div>
    <div class="btnrow"><button class="btn btn-primary btn-sm" onclick="hideModal();openDrawer('journal')">Read the Full Journal</button>
      <button class="btn btn-gold btn-sm" onclick="hideModal();openSheet('new')">Start Another Voyage</button></div>`;
  showModal();}
function showWreck(v){const st=stateAt(v,v.baseDurationDays);const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow">Shipwreck</div><h2>Wreck of the ${v.name}</h2>
    <div class="sub">${v.expedition||captainById(v.captainId).name}</div>
    <div class="stamp">${v.start.n} → ${v.dest.n}</div><div class="divider"></div>
    <div class="journey-line">Lost on Day ${st.sinkDay} · ${fmtCoord(st.pos.lat,st.pos.lon)}</div>
    <div class="journey-line">Cause: ${st.sinkCause}</div>
    <div class="final-grid" style="margin-top:14px">
      <div><div class="v">${st.sinkDay}</div><div class="k">Days</div></div>
      <div><div class="v">${Math.round(v.distanceNm*st.sinkDay/st.dur).toLocaleString()}</div><div class="k">nm sailed</div></div>
      <div><div class="v">${st.events.filter(e=>e.tpl.major).length}</div><div class="k">events</div></div>
      <div><div class="v">${st.diary.filter(e=>e.cat==='combat'&&e.icon==='🏴‍☠️').length}</div><div class="k">battles</div></div></div>
    <div class="btnrow"><button class="btn btn-primary btn-sm" onclick="hideModal();openDrawer('journal')">Read Journal</button>
      <button class="btn btn-ghost btn-sm" onclick="downloadVoyage('${v.id}')">Download</button>
      <button class="btn btn-gold btn-sm" onclick="hideModal();openSheet('new')">New Voyage</button></div>`;
  showModal();}
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
  const combat=st.diary.filter(e=>e.cat==='combat'&&e.icon==='🏴‍☠️'&&e.day>last&&e.day<=cur);
  if(combat.length)items.unshift({ic:'🏴‍☠️',t:`Attacked by pirates ${combat.length>1?combat.length+' times':'once'} — ${v.name} took damage.`});
  if(waterDrop>4)items.push({ic:'💧',t:`Water fell ${Math.round(waterDrop)}%.`});if(hullDrop>6)items.push({ic:'🛠️',t:`Hull dropped ${Math.round(hullDrop)}%.`});
  if(st.sunk&&st.sinkDay>last)items.unshift({ic:'☠️',t:`The ${v.name} was lost to ${st.sinkCause} on Day ${st.sinkDay}.`});
  else if(st.done)items.push({ic:'🏁',t:`${v.name} has reached ${v.dest.n}.`});
  else items.push({ic:'📍',t:`Now ${Math.round(st.distRemaining).toLocaleString()} nm from ${v.dest.n}.`});
  if(!items.length)items.push({ic:'🌊',t:'Fair seas and steady sailing throughout.'});
  const cd=Math.min(st.curDay,st.dur);const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow">Welcome Back</div><h2 style="font-size:29px">The voyage sailed on</h2>
    <div class="sub">${delta.toFixed(0)} days have passed since your last visit.</div><div class="divider"></div>
    <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a6d30;font-weight:600;text-align:left">While you were gone</div>
    <div class="wyg-list">${items.map(it=>`<div class="wyg-item"><span class="ic">${it.ic}</span><span>${it.t}</span></div>`).join('')}</div>
    <div class="big-day">${st.sunk?'Lost · Day '+st.sinkDay:st.done?'Arrived · Day '+st.dur.toFixed(0):'Day '+Math.floor(cd)+' / '+st.dur.toFixed(0)}</div>
    <div class="btnrow"><button class="btn btn-gold btn-sm" onclick="hideModal();toggleShipCard(true)">View Voyage</button></div>`;
  showModal();v.lastViewedSimDay=cur;save();}
/* ---- Captain's Log: one pop-up per voyage on return, dismissable one by one ---- */
let logQueue=[],logMode=false;
function showCaptainLogs(){logQueue=STATE.voyages.filter(v=>simDaysNow(v)-(v.lastViewedSimDay||0)>=0.5);
  if(!logQueue.length)return;logMode=true;renderLog();}
function renderLog(){const v=logQueue[0];if(!v){logMode=false;hideModal();return;}
  const cur=simDaysNow(v),last=v.lastViewedSimDay||0,delta=cur-last,st=stateAt(v,cur),cap=captainById(v.captainId);
  const between=st.events.filter(e=>e.day>last&&e.day<=Math.min(cur,st.dur));
  let items=[];const seen=new Set();between.forEach(e=>{if(!seen.has(e.tpl.type)){seen.add(e.tpl.type);items.push({ic:e.tpl.icon,t:e.tpl.title+' — '+shortEv(e)});}});
  const combat=st.diary.filter(e=>e.cat==='combat'&&e.icon==='🏴‍☠️'&&e.day>last&&e.day<=cur);
  if(combat.length)items.unshift({ic:'🏴‍☠️',t:`Attacked by pirates ${combat.length>1?combat.length+' times':'once'} — we took damage.`});
  const mut=st.diary.filter(e=>e.title==='Mutiny!'&&e.day>last&&e.day<=cur);
  if(mut.length)items.unshift({ic:'⚔️',t:'MUTINY broke out among the crew.'});
  if(st.sunk&&st.sinkDay>last)items=[{ic:'☠️',t:`We were lost to ${st.sinkCause} on Day ${st.sinkDay}.`}].concat(items);
  else if(st.done)items.push({ic:'🏁',t:`We have reached ${v.dest.n}.`});
  else items.push({ic:'📍',t:`${Math.round(st.distRemaining).toLocaleString()} nm remain to ${v.dest.n}.`});
  if(!items.length)items.push({ic:'🌊',t:'Fair seas and steady sailing throughout.'});
  const dire=!st.sunk&&!st.done&&(st.food<25||st.water<25||st.hull<25);
  const plea=dire?`<div class="plea">⚠ We are in dire need — ${st.water<25?'fresh water':st.food<25?'provisions':'the hull'} runs perilously low. The captain begs for aid.</div>`:'';
  const cd=Math.floor(Math.min(cur,st.dur));const m=document.getElementById('modal');
  m.innerHTML=`<div class="eyebrow">Captain's Log${logQueue.length>1?' · '+logQueue.length+' remaining':''}</div>
    <div style="display:flex;gap:14px;align-items:flex-start;text-align:left;margin-top:8px">
      ${captainPortrait(cap,true)}
      <div style="flex:1"><h2 style="font-size:24px;margin:0">${v.name}</h2>
        <div class="sub" style="margin:2px 0 3px">${cap.name}</div>
        <div style="font-size:12px;color:#5a4a28">${delta.toFixed(0)} day${delta>=1.5?'s':''} have passed since your last visit.</div></div></div>
    <div class="divider"></div>
    <div class="wyg-list">${items.map(it=>`<div class="wyg-item"><span class="ic">${it.ic}</span><span>${it.t}</span></div>`).join('')}</div>
    ${plea}
    <div class="big-day">${st.sunk?'Lost · Day '+st.sinkDay:st.done?'Arrived · Day '+st.dur.toFixed(0):'Day '+cd+' / '+st.dur.toFixed(0)}</div>
    <div class="btnrow">
      ${dire?`<button class="btn btn-primary btn-sm" onclick="advanceLog();STATE.activeId='${v.id}';save();refreshAll(false);openCardSoon(150)">Send Help</button>`:''}
      <button class="btn btn-gold btn-sm" onclick="advanceLog()">${logQueue.length>1?'Next Log ▸':'Continue'}</button></div>`;
  showModal();v.lastViewedSimDay=cur;save();}
function advanceLog(){logQueue.shift();if(logQueue.length)renderLog();else{logMode=false;hideModal();}}
function shortEv(e){const m={storm:'the ship was battered but held.',wind:'the sails ran full.',calm:'the sea fell still.',water:'rations were tightened.',food:'stores ran short.',current:'a current carried her on.',discovery:'unknown land broke the horizon.',whale:'a great whale passed by.',repair:'the crew mended the hull.',scurvy:'sickness spread below decks.',mutiny:'the crew rose in revolt.'};return m[e.tpl.type]||'noted in the log.';}
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
  const txt=`${v.name} sailed ${v.start.n} → ${v.dest.n} — ${st.dur.toFixed(0)} days, ${Math.round(v.distanceNm).toLocaleString()} nm. Hull ${Math.round(st.hull)}%, crew ${st.crew}/${st.ship.crew}. #Voyager`;
  if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>showToast('Summary copied to clipboard')).catch(()=>showToast(txt));}else showToast('Copy: '+txt);}

/* ---------------- Demos ---------------- */
function seedDemos(){const now=Date.now();
  const mag=HISTORIES.find(h=>h.id==='magellan');
  const v1=makeVoyage({id:'demo-victoria',shipId:'victoria',captainId:'magellan',name:'Victoria',expedition:"Magellan Expedition",
    start:mag.nodes[0],dest:mag.nodes[mag.nodes.length-1],waypoints:mag.nodes.slice(1,-1),routeNodes:mag.nodes,
    departDate:new Date('1519-08-10').toISOString(),startTimestamp:now-42*86400000,simSpeed:1,paused:false,
    simAccumDays:0,lastToggleTs:now-42*86400000,lastViewedSimDay:36,demo:true});
  const lis=P("Lisbon"),cv=P("Cape Verde");
  const v2=makeVoyage({id:'demo-short',shipId:'caravel',captainId:'dias',name:'Caravel',expedition:"",
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
let _dpAudio=null;
function toggleDaftPunk(){const btn=document.getElementById('daftBtn');
  if(_dpAudio&&!_dpAudio.paused){_dpAudio.pause();_dpAudio.currentTime=0;_dpAudio=null;btn.classList.remove('playing');showToast('⏹ Stopped');return;}
  _dpAudio=new Audio('daft-punk.mp3');
  _dpAudio.onended=()=>{btn.classList.remove('playing');_dpAudio=null;};
  _dpAudio.play().then(()=>{btn.classList.add('playing');showToast('🎧 Daft Punk — one more time');})
    .catch(()=>{_dpAudio=null;showToast('Add “daft-punk.mp3” to the project folder');});}
document.getElementById('daftBtn').addEventListener('click',toggleDaftPunk);
// anchor favicon (works in the single file and in the Next.js app without touching layout)
(function(){try{const svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='88'>⚓</text></svg>";
  let l=document.querySelector("link[rel='icon']")||document.createElement('link');l.rel='icon';l.href='data:image/svg+xml,'+encodeURIComponent(svg);document.head.appendChild(l);}catch(e){}})();
document.getElementById('histBtn').addEventListener('click',()=>{map.getSource('route-ref')&&map.getSource('route-ref').setData(emptyFC());openSheet('history');});
document.querySelectorAll('.spd').forEach(b=>b.addEventListener('click',()=>{const s=+b.dataset.s;const v=activeVoyage();if(v){setSpeed(v,s);if(v.paused){setPaused(v,false);setPlayUI(false);}save();}setSpeedUI(s);showToast('Time flowing at '+s+'×');}));
document.getElementById('playBtn').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;setPaused(v,!v.paused);save();setPlayUI(v.paused);showToast(v.paused?'Simulation paused':'Simulation resumed');});
document.getElementById('skipDay').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;advanceDays(v,1);save();refreshAll(false);showToast('Advanced one day');});
document.getElementById('skipEvent').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;const cur=simDaysNow(v);const nxt=stateAt(v,cur).events.find(e=>e.day>cur+0.05);
  if(nxt){advanceDays(v,(nxt.day-cur)+0.05);save();refreshAll(false);showToast('Skipped to next event · Day '+Math.floor(nxt.day));}else{advanceDays(v,v.baseDurationDays);save();refreshAll(false);showToast('No further events — skipped to arrival');}});
document.getElementById('skipArrival').addEventListener('click',()=>{const v=activeVoyage();if(!v)return;advanceDays(v,v.baseDurationDays);save();refreshAll(false);showToast('Skipped to arrival');});
function setControlsCollapsed(c){document.getElementById('simctl').style.display=c?'none':'flex';document.getElementById('ctrlShow').style.display=c?'block':'none';localStorage.setItem('voyager_ctrl_collapsed',c?'1':'0');}
document.getElementById('ctrlHide').addEventListener('click',()=>setControlsCollapsed(true));
document.getElementById('ctrlShow').addEventListener('click',()=>setControlsCollapsed(false));
document.querySelectorAll('#drawerTabs .tab').forEach(t=>t.addEventListener('click',()=>openDrawer(t.dataset.tab)));
document.getElementById('scrim').addEventListener('click',e=>{if(e.target.id==='scrim'){if(logMode)advanceLog();else hideModal();}});
window.addEventListener('beforeunload',()=>{const v=activeVoyage();if(v){v.lastViewedSimDay=simDaysNow(v);save();}});
setInterval(()=>{save();
  if(LAND){let fixed=false;STATE.voyages.forEach(v=>{if(!v._routeOk){if(crossesLand(v)){reroute(v);fixed=true;}v._routeOk=true;}});
    if(fixed){showToast('Route corrected to steer around land');refreshAll(false);}}},4000);

/* ---------------- Boot ---------------- */
function preloadPortraits(){try{const urls=[];CAPTAINS.forEach(c=>c.file&&urls.push(c.file));Object.values(PORTRAITS).forEach(p=>p.file&&urls.push(p.file));
  urls.forEach(f=>{const im=new Image();im.src='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(f)+'?width=220';});}catch(e){}}
Object.assign(window,{captainMods,piratePosAt,pirateBearingAt,worldDayOf,hav,slerp,bearing,compassPoint,unwrapLons,buildPath,pointAtDist,pointInRing,buildLandGrid,setWaterBox,carveStraits,nearestWater,segWater,astar,smooth,routeLeg,routeCrossesLand,computeRoute,hashStr,mulberry32,makeVoyage,buyResource,nextResourceCost,simDaysNow,bank,setSpeed,setPaused,advanceDays,eventSchedule,stopDays,simulate,mkStop,dayText,cl,stateAt,fmtCoord,fmtDate,fmtLongDate,activeVoyage,P,W,applyTheme,applyMapTheme,ensureColors,addArrowImages,initMap,fetchLandGrid,reroute,crossesLand,rerouteAll,addGraticule,addPorts,setupRouteLayers,buildRouteFCs,refreshAll,updateDone,fitToVoyage,addEndpoint,syncShipMarkers,applyMarkerState,wreckSVG,addPirates,pirateSVG,updatePirates,showPirate,shipClass,shipArt,shipSVG,startRAF,tick,notifyEncounters,showClockFor,hideClock,updateClock,renameVoyage,openCardSoon,toggleShipCard,renderShipCard,bar,resetNV,captainPortrait,captainDetailsHTML,pickCaptain,startPick,pickContinent,choosePort,cancelPick,clearStart,clearDest,clearPlanMap,updatePlanMap,ratingBar,shipDetailsHTML,openSheet,closeSheet,renderSheet,renderNew,slotHTML,pickerHTML,renderPickResults,previewHTML,pickShip,selPort,rmWay,onPortClick,launch,renderFleet,focusVoyage,removeVoyage,medallionSVG,portraitHTML,renderHistory,previewHistory,launchHistory,openDrawer,closeDrawer,renderDrawer,overviewHTML,dbar,journalHTML,setFilter,gotoJournal,checkArrival,showSink,showWreck,showArrival,maybeWelcomeBack,showCaptainLogs,renderLog,advanceLog,shortEv,showModal,hideModal,voyageReport,downloadVoyage,shareVoyage,seedDemos,showToast,setSpeedUI,setPlayUI,toggleDaftPunk,setControlsCollapsed,preloadPortraits,boot});
(function boot(){document.body.dataset.theme=THEME;document.getElementById('themeToggle').textContent=THEME==='day'?'☀':'☾';preloadPortraits();
  const loaded=load();if(loaded&&loaded.voyages&&loaded.voyages.length)STATE=loaded;else seedDemos();ensureColors();
  const v=activeVoyage();setSpeedUI(v?v.simSpeed:1);setPlayUI(v?v.paused:false);
  setControlsCollapsed(localStorage.getItem('voyager_ctrl_collapsed')==='1');initMap();
  setTimeout(()=>showCaptainLogs(),2600);})();

}
