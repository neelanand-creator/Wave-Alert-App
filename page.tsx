"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Quake = {
  id: string; properties: { mag: number | null; place: string; time: number; url: string; tsunami: number; alert: string | null; type: string; status: string };
  geometry: { coordinates: [number, number, number] } | null;
};
type ChatMessage = { role: "user" | "assistant"; content: string };
const EARTH_RADIUS_KM = 6371;
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, a)));
}
function timeAgo(timestamp: number) {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hr ago`;
  return `${Math.floor(mins / 1440)} day ago`;
}
function magnitudeLabel(mag: number | null) {
  if (mag === null) return "Magnitude not reported";
  if (mag < 2) return "Micro";
  if (mag < 4) return "Minor";
  if (mag < 5) return "Light";
  if (mag < 6) return "Moderate";
  if (mag < 7) return "Strong";
  return "Major";
}

export default function Home() {
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [coords, setCoords] = useState<{lat:number; lon:number} | null>(null);
  const [locationState, setLocationState] = useState("Location not set");
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey, I'm QuakeGuard, here to answer your earthquake-related queries. Ask me about nearby activity, earthquake science, or how to prepare safely." }
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/earthquakes", { cache: "no-store" });
      if (!response.ok) throw new Error("Live feed unavailable");
      const data = await response.json();
      setQuakes(data.features || []);
      setUpdatedAt(new Date());
      setFeedError("");
    } catch {
      setFeedError("Couldn't load the live USGS feed. Check your connection and try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); const id = window.setInterval(refresh, 60000); return () => window.clearInterval(id); }, [refresh]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationState("This browser doesn't support location access"); return; }
    setLocationState("Waiting for permission…");
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocationState("Your location is being used on this device"); },
      e => setLocationState(e.code === 1 ? "Location permission denied — enter coordinates instead" : "Couldn't get location — try again or enter coordinates"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  };

  const nearby = useMemo(() => {
    if (!coords) return [];
    return quakes.map(q => {
      const c = q.geometry?.coordinates;
      return { ...q, distance: c ? distanceKm(coords.lat, coords.lon, c[1], c[0]) : Infinity };
    }).filter(q => q.distance <= 100).sort((a,b) => a.distance - b.distance);
  }, [quakes, coords]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || chatLoading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setChatLoading(true);
    try {
      const contextQuakes = (coords ? nearby : quakes.slice(0, 20)).map(q => ({
        magnitude: q.properties.mag, place: q.properties.place, time: new Date(q.properties.time).toISOString(),
        distanceKm: "distance" in q ? Math.round((q as any).distance) : null,
        alert: q.properties.alert, tsunami: q.properties.tsunami, url: q.properties.url
      }));
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, earthquakes: contextQuakes, location: coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : "not shared" })
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.answer || data.error || "Sorry, something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "I couldn't connect just now. Please check your connection and try again." }]);
    } finally { setChatLoading(false); }
  };

  const magCount = nearby.filter(q => (q.properties.mag ?? 0) >= 4).length;
  const strongest = nearby.reduce<Quake | null>((best, q) => !best || (q.properties.mag ?? -1) > (best.properties.mag ?? -1) ? q : best, null);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">⌁</span><span>Quake<span className="brand-accent">Guard</span><small>EARTHQUAKE MONITOR</small></span></a>
        <div className="live-pill"><span className="pulse" /> LIVE USGS DATA</div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> KNOW WHAT'S HAPPENING</div>
          <h1>Stay aware.<br/><em>Stay prepared.</em></h1>
          <p>Recent earthquake activity within 100 km of your location, powered by the USGS live earthquake feed.</p>
          <button className="primary-btn" onClick={requestLocation}>◎ Use my location <span>→</span></button>
          <div className="location-note">⌖ {locationState}</div>
        </div>
        <div className="hero-art" aria-label="Decorative seismic wave illustration">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="orbit orbit-three"></div>
          <div className="earth"><div className="earth-grid"></div><div className="earth-glow"></div></div>
          <div className="signal signal-one">⌁</div><div className="signal signal-two">⌁</div>
          <div className="art-label"><span className="pulse" /> SEISMIC ACTIVITY</div>
        </div>
      </section>

      <section className="dashboard">
        <div className="section-heading"><div><div className="eyebrow">YOUR LOCAL OVERVIEW</div><h2>Activity near you</h2></div>
          <button className="refresh-btn" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh feed"}</button>
        </div>
        {!coords && <div className="notice"><span>ⓘ</span><div><b>Enable location to see your 100 km radius.</b><p>Your coordinates are used in this browser session to calculate distances. They aren't saved by this app. You can still browse recent global USGS events below.</p></div></div>}
        {feedError && <div className="error-banner">{feedError}</div>}
        <div className="stats-grid">
          <div className="stat-card"><span className="stat-icon">⌖</span><span className="stat-label">EVENTS WITHIN 100 KM</span><strong>{coords ? nearby.length : "—"}</strong><span className="stat-foot">{coords ? "In the current 24-hour feed" : "Share location to calculate"}</span></div>
          <div className="stat-card"><span className="stat-icon amber">◈</span><span className="stat-label">MAGNITUDE 4.0+</span><strong>{coords ? magCount : "—"}</strong><span className="stat-foot">Nearby events in current feed</span></div>
          <div className="stat-card"><span className="stat-icon coral">↗</span><span className="stat-label">STRONGEST NEARBY</span><strong>{coords && strongest ? (strongest.properties.mag ?? "—") : "—"}</strong><span className="stat-foot">{coords && strongest ? strongest.properties.place : "No local event selected"}</span></div>
        </div>

        <div className="event-panel">
          <div className="panel-head"><div><h3>{coords ? "Earthquakes within 100 km" : "Recent global earthquakes"}</h3><p>{coords ? "Sorted by distance from your location" : "Enable location to filter events to your area"}</p></div><span className="source-tag">USGS · PAST 24H</span></div>
          {loading && quakes.length === 0 ? <div className="empty-state"><div className="loader"></div><p>Loading recent earthquake data…</p></div> :
            coords && nearby.length === 0 ? <div className="empty-state"><div className="empty-symbol">⌁</div><b>No events found within 100 km</b><p>No earthquakes in the current USGS past-day feed match your radius. This is not a prediction or guarantee that no shaking can occur.</p></div> :
            <div className="event-list">{(coords ? nearby : quakes.slice(0, 12)).map(q => {
              const c = q.geometry?.coordinates;
              const dist = coords && c ? distanceKm(coords.lat, coords.lon, c[1], c[0]) : null;
              const mag = q.properties.mag;
              return <a className="event-row" href={q.properties.url} target="_blank" rel="noreferrer" key={q.id}>
                <div className={`magnitude ${mag !== null && mag >= 4 ? "mag-high" : mag !== null && mag >= 2.5 ? "mag-mid" : ""}`}>{mag === null ? "—" : mag.toFixed(1)}</div>
                <div className="event-main"><b>{q.properties.place || "Location unavailable"}</b><span>{timeAgo(q.properties.time)} <i>·</i> {new Date(q.properties.time).toLocaleString()}</span></div>
                <div className="event-distance">{dist !== null ? `${Math.round(dist)} km away` : magnitudeLabel(mag)}</div><span className="row-arrow">↗</span>
              </a>;
            })}</div>}
          <div className="panel-foot"><span>Source: U.S. Geological Survey (USGS)</span><span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Waiting for update"} · auto-refreshes every 60 sec</span></div>
        </div>
      </section>

      <section className="chat-section" id="ask">
        <div className="chat-intro"><div className="eyebrow"><span className="eyebrow-line" /> YOUR EARTHQUAKE ASSISTANT</div><h2>Questions?<br/><em>Ask QuakeGuard.</em></h2><p>Get clear explanations about earthquakes, preparedness, and the latest data available to this page.</p>
          <div className="trust-note"><span>✳</span><div><b>Grounded in live feed context</b><small>Answers can use the current USGS events shown on this page. Always follow local emergency authorities.</small></div></div>
        </div>
        <div className="chat-card">
          <div className="chat-head"><div className="bot-avatar">⌁</div><div><b>QuakeGuard</b><span><i className="online-dot"></i> Earthquake assistant</span></div><span className="chat-head-icon">✳</span></div>
          <div className="chat-messages">{messages.map((m,i) => <div key={i} className={`message ${m.role === "user" ? "user-message" : ""}`}><div className="message-avatar">{m.role === "user" ? "You" : "Q"}</div><div className="bubble">{m.content}</div></div>)}{chatLoading && <div className="message"><div className="message-avatar">Q</div><div className="bubble typing">QuakeGuard is thinking<span> ···</span></div></div>}</div>
          <div className="suggestions"><button onClick={() => send("What should I do during an earthquake?")}>Safety tips</button><button onClick={() => send("Explain earthquake magnitude vs intensity.")}>Magnitude vs intensity</button><button onClick={() => send("Summarize the nearby earthquake activity shown on this page.")}>Summarize activity</button></div>
          <form className="chat-input-row" onSubmit={e => { e.preventDefault(); send(); }}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask an earthquake question…" aria-label="Message QuakeGuard" maxLength={2000}/><button type="submit" disabled={chatLoading || !input.trim()} aria-label="Send message">↑</button></form>
          <div className="chat-disclaimer">AI can make mistakes. Not for emergency alerts or earthquake prediction.</div>
        </div>
      </section>

      <section className="safety-strip"><div className="safety-icon">✳</div><div><span className="eyebrow">REMEMBER</span><h3>Drop. Cover. Hold On.</h3><p>If shaking starts, get low, protect your head and neck, and hold on to sturdy shelter until it stops. Follow local emergency guidance.</p></div><a href="https://www.ready.gov/earthquakes" target="_blank" rel="noreferrer">Preparedness guide ↗</a></section>
      <footer><a className="footer-brand" href="#">Quake<span>Guard</span></a><span>Live event data: USGS · Built for awareness, not prediction.</span><div><a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noreferrer">USGS data</a><a href="https://www.ready.gov/earthquakes" target="_blank" rel="noreferrer">Safety guidance</a></div></footer>
    </main>
  );
}
