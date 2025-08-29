// src/components/YellowLine.jsx
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { YELLOW_STATIONS } from "../stations/yellowStations";

export default function YellowLine({
  map,
  theme = "light",
  showStations = true,
  fitOnMount = false,
  animateTrains = true,
  timeOfDayOverride,
}) {
  const rafRef = useRef(null);
  const tripDefsRef = useRef([]);
  const liveMarkersRef = useRef(new Map());

  useEffect(() => {
    if (!map) return;
    const isDark = theme === "dark";

    // ---------- stations/points ----------
    const stations = (YELLOW_STATIONS || []).filter(
      (s) => typeof s.lat === "number" && typeof s.lng === "number"
    );
    const points = stations.map(({ lat, lng }) => [lng, lat]); // [lng, lat]
    const N = points.length;
    if (N === 0) return;

    // Fit map to bounds once loaded
    if (fitOnMount) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new maplibregl.LngLatBounds(points[0], points[0])
      );
      map.fitBounds(bounds, { padding: 40 });
    }

    // ---------- add layers (always re-add) ----------
    const addLayers = () => {
      // remove if exists
      if (map.getLayer("yellow-line-layer")) map.removeLayer("yellow-line-layer");
      if (map.getSource("yellow-line")) map.removeSource("yellow-line");
      if (map.getLayer("yellow-stations-layer")) map.removeLayer("yellow-stations-layer");
      if (map.getLayer("yellow-stations-labels")) map.removeLayer("yellow-stations-labels");
      if (map.getSource("yellow-stations")) map.removeSource("yellow-stations");

      // line
      if (N >= 2) {
        map.addSource("yellow-line", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: points },
          },
        });

        map.addLayer({
          id: "yellow-line-layer",
          type: "line",
          source: "yellow-line",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#EAB308", "line-width": 4, "line-opacity": 0.95 },
        });
      }

      // stations
      if (showStations) {
        map.addSource("yellow-stations", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: stations.map((s) => ({
              type: "Feature",
              properties: { name: s.name },
              geometry: { type: "Point", coordinates: [s.lng, s.lat] },
            })),
          },
        });

        map.addLayer({
          id: "yellow-stations-layer",
          type: "circle",
          source: "yellow-stations",
          paint: {
            "circle-radius": 6,
            "circle-color": "#EAB308",
            "circle-stroke-color": isDark ? "#000000" : "#FFFFFF",
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "yellow-stations-labels",
          type: "symbol",
          source: "yellow-stations",
          layout: {
            "text-field": ["get", "name"],
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-size": 12,
          },
          paint: {
            "text-color": isDark ? "#000000" : "#333333",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1,
          },
        });

        // map.addLayer({
        //   id: "station-labels",
        //   type: "symbol",
        //   source: "stations",
        //   layout: {
        //     "text-field": ["get", "name"],
        //     "text-size": 14,
        //     "text-anchor": "center",
        //     "text-offset": [0, 1],
        //   },
        //   paint: {
        //     "text-color": "#000000",         // black text
        //     "text-halo-color": "#ffffff",    // thin border
        //     "text-halo-width": 1.5,
        //   },
        // });
      }
    };

    // 🚨 Always call immediately (map is already loaded by now)
    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.once("styledata", addLayers);
    }

    // ========== schedule-driven trains ==========
    if (animateTrains && N >= 2) {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const IST_OFFSET_MS = 330 * 60 * 1000;
      const istNowMs = () => Date.now() + IST_OFFSET_MS;

      const hhmmssToMs = (t) => {
        const [hh, mm, ss] = t.split(":").map((x) => parseInt(x, 10));
        return ((hh * 60 + mm) * 60 + (ss || 0)) * 1000;
      };

      const istMidnightEpoch = () => {
        const n = istNowMs();
        const d = new Date(n);
        const sinceMidnight =
          ((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) * 1000 +
          d.getUTCMilliseconds();
        return n - sinceMidnight;
      };

      const nowISTms = () => {
        const base = istMidnightEpoch();
        if (timeOfDayOverride) return base + hhmmssToMs(timeOfDayOverride);
        return istNowMs();
      };

      const buildTrips = () => {
        const upMap = new Map();
        const downMap = new Map();
        const dedupePush = (mapM, key, idx, time) => {
          const arr = mapM.get(key) || [];
          const sig = `${idx}|${time}`;
          if (!arr.some((e) => `${e.idx}|${e.time}` === sig)) arr.push({ idx, time });
          mapM.set(key, arr);
        };

        stations.forEach((st, idx) => {
          (st.upSchedule || []).forEach((e) => {
            const key = `UP_${e.tripNo}_${e.trainId}`;
            dedupePush(upMap, key, idx, e.time);
          });
          (st.downSchedule || []).forEach((e) => {
            const key = `DOWN_${e.tripNo}_${e.trainId}`;
            dedupePush(downMap, key, idx, e.time);
          });
        });

        const midnight = istMidnightEpoch();
        const DWELL_MS = 25000;       // <-- fixed 15s dwell
        const MIN_TRAVEL_MS = 500;    // keep at least 0.5s of movement for very short hops

        const finalize = (mapM, dir) => {
          const trips = [];
          for (const [key, raw] of mapM.entries()) {
            const ordered = raw.slice().sort((a, b) =>
              dir === "UP" ? a.idx - b.idx : b.idx - a.idx
            );

            let dayOffset = 0;
            let prevWithin = null;
            const events = ordered.map(({ idx, time }) => {
              const within = hhmmssToMs(time);
              if (prevWithin !== null && within < prevWithin) dayOffset += DAY_MS;
              const abs = midnight + dayOffset + within;
              prevWithin = within;
              return { idx, abs };
            });

            if (events.length >= 2) {
              const trainId = key.split("_").slice(2).join("_");
              const legs = [];

              for (let i = 0; i < events.length - 1; i++) {
                const a = events[i];
                const b = events[i + 1];
                if (Math.abs(b.idx - a.idx) !== 1 || b.abs <= a.abs) continue;

                const hopMs = b.abs - a.abs;

                // Try to dwell 15s, but ensure there's at least a tiny travel window
                const dwell = Math.min(DWELL_MS, Math.max(0, hopMs - MIN_TRAVEL_MS));
                const tDepart = a.abs + dwell;
                const tArrive = b.abs;
                const travelMs = Math.max(MIN_TRAVEL_MS, tArrive - tDepart);

                // 1) wait at station A
                if (dwell > 0) {
                  legs.push({ i1: a.idx, i2: a.idx, t1: a.abs, t2: tDepart });
                }
                // 2) move from A -> B using the *remaining scheduled time*
                legs.push({ i1: a.idx, i2: b.idx, t1: tDepart, t2: tArrive });
              }

              if (legs.length) trips.push({ key, dir, trainId, legs });
            }
          }
          return trips;
        };

        return [...finalize(upMap, "UP"), ...finalize(downMap, "DOWN")];
      };

      tripDefsRef.current = buildTrips();

      const lerp = (a, b, t) => a + (b - a) * t;
      const lerpPos = (p1, p2, t) => [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)];

      const ensureMarker = (key, trainId) => {
        let marker = liveMarkersRef.current.get(key);
        if (!marker) {
          const el = document.createElement("img");
          el.src = "/yellow-metro.jpg";  // image in public/
          el.style.width = "28px";       // adjust size as needed
          el.style.height = "28px";
          el.style.objectFit = "contain";
          el.style.borderRadius = "50%"; // optional, if you want circular crop
          el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)"; // optional, makes it pop

          marker = new maplibregl.Marker({
            element: el,
            anchor: "center",   // center the image on the coordinates
          }).setLngLat(points[0]).addTo(map);

          liveMarkersRef.current.set(key, marker);
        }
        return marker;
      };

      const step = () => {
        const now = nowISTms();
        for (const trip of tripDefsRef.current) {
          const firstLeg = trip.legs[0];
          const lastLeg = trip.legs[trip.legs.length - 1];
          if (now < firstLeg.t1 || now > lastLeg.t2) {
            const marker = liveMarkersRef.current.get(trip.key);
            if (marker) marker.remove();
            continue;
          }
          let moved = false;
          for (let i = 0; i < trip.legs.length; i++) {
            const leg = trip.legs[i];
            if (now >= leg.t1 && now <= leg.t2) {
              const t = (now - leg.t1) / (leg.t2 - leg.t1);
              const p1 = points[leg.i1];
              const p2 = points[leg.i2];
              ensureMarker(trip.key, trip.trainId).setLngLat(lerpPos(p1, p2, t));
              moved = true;
              break;
            }
          }
          if (!moved) {
            ensureMarker(trip.key, trip.trainId).setLngLat(points[firstLeg.i1]);
          }
        }
        rafRef.current = requestAnimationFrame(step);
      };
      step();
    }

    // cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      for (const marker of liveMarkersRef.current.values()) marker.remove();
      liveMarkersRef.current.clear();
      if (map.getLayer("yellow-line-layer")) map.removeLayer("yellow-line-layer");
      if (map.getSource("yellow-line")) map.removeSource("yellow-line");
      if (map.getLayer("yellow-stations-layer")) map.removeLayer("yellow-stations-layer");
      if (map.getLayer("yellow-stations-labels")) map.removeLayer("yellow-stations-labels");
      if (map.getSource("yellow-stations")) map.removeSource("yellow-stations");
    };
  }, [map, theme, showStations, fitOnMount, animateTrains, timeOfDayOverride]);

  return null;
}
