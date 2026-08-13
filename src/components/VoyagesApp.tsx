'use client';
import { useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initVoyagesApp } from '../lib/app-controller';

export default function VoyagesApp(){
  useEffect(()=>{ initVoyagesApp(); },[]);
  return (
    <>
      <div id="map"></div>
      <div id="vignette"></div>
      
      <div id="brand"><h1>VOYAGER</h1><div className="sub">Send a ship into the unknown</div><div className="rule"></div></div>
      
      <div id="clock" >
      <div className="day" id="clockDay">Day —</div>
      <div className="date" id="clockDate"></div>
      <div className="time" id="clockTime"></div>
      </div>
      
      <div id="toast" className="toast"></div>
      <button id="themeToggle" title="Toggle day / night">☾</button>
      
      <div id="shipCard" className="panel"></div>
      <div id="sheet" className="panel"></div>
      
      <div id="toolbar">
      <button className="btn btn-primary" id="fleetBtn">⚓ Fleet</button>
      <button className="btn btn-gold" id="newBtn">+ New Voyage</button>
      <button className="btn btn-ghost" id="histBtn">Recreate History</button>
      </div>
      
      <div id="simctl">
      <button className="ic-btn on" id="playBtn" title="Play / Pause">⏸</button>
      <div className="sep"></div>
      <span className="lbl">Time</span>
      <button className="spd" data-s="1">1×</button>
      <button className="spd" data-s="10">10×</button>
      <button className="spd" data-s="100">100×</button>
      <button className="spd" data-s="1000">1000×</button>
      <div className="sep"></div>
      <button className="ic-btn" id="skipDay" title="Skip to next day">＋1d</button>
      <button className="ic-btn" id="skipEvent" title="Skip to next event">⚑</button>
      <button className="ic-btn" id="skipArrival" title="Skip to arrival">⇥</button>
      </div>
      
      <div id="drawer">
      <div className="dhead" id="drawerHead"></div>
      <div className="tabs" id="drawerTabs">
      <div className="tab active" data-tab="overview">Voyage</div>
      <div className="tab" data-tab="journal">Journal</div>
      </div>
      <div className="dbody" id="drawerBody"></div>
      </div>
      
      <div id="scrim"><div className="modal panel" id="modal"></div></div>
      <div id="boot"><div className="cmp"></div><div className="txt">Charting the seas…</div></div>
    </>
  );
}
