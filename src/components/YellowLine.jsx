// src/components/YellowLine.jsx
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { YELLOW_STATIONS } from "../stations/yellowStations";
import yellowData from "../stations/yellowSchedule.json"; // your new schedule data

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

    const stations = YELLOW_STATIONS.filter(
      (s) => typeof s.lat === "number" && typeof s.lng === "number"
    );
    const points = stations.map(({ lat, lng }) => [lng, lat]);
    const N = points.length;
    if (N === 0) return;

    if (fitOnMount) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new maplibregl.LngLatBounds(points[0], points[0])
      );
      map.fitBounds(bounds, { padding: 40 });
    }

    const addLayers = () => {
      if (map.getLayer("yellow-line-layer")) map.removeLayer("yellow-line-layer");
      if (map.getSource("yellow-line")) map.removeSource("yellow-line");
      if (map.getLayer("yellow-stations-layer")) map.removeLayer("yellow-stations-layer");
      if (map.getLayer("yellow-stations-labels")) map.removeLayer("yellow-stations-labels");
      if (map.getSource("yellow-stations")) map.removeSource("yellow-stations");

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
      }
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once("styledata", addLayers);

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
        const directionMap = {
          UP: yellowData?.["UP Line"] || {},
          DOWN: yellowData?.["DN Line"] || {},
        };

        const stationIdToIndex = new Map();
        stations.forEach((s, idx) => stationIdToIndex.set(s.station_id, idx));

        const midnight = istMidnightEpoch();
        const allTrips = [];

        for (const dir of ["UP", "DOWN"]) {
          const line = directionMap[dir];
          const tripMap = new Map();

          for (const [stationId, stationObj] of Object.entries(line)) {
            const trips = stationObj.trips || [];
            const idx = stationIdToIndex.get(stationId);
            if (idx === undefined) continue;

            for (const t of trips) {
              const key = `${dir}_${t.tripNumber}_${t.trainId}`;
              const arr = tripMap.get(key) || [];
              arr.push({ idx, time: t.time });
              tripMap.set(key, arr);
            }
          }

          for (const [key, raw] of tripMap.entries()) {
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

              for (let i = 0; i < events.length; i++) {
                const curr = events[i];
                const next = events[i + 1];

                if (i === events.length - 1) {
                  legs.push({ i1: curr.idx, i2: curr.idx, t1: curr.abs, t2: curr.abs + 15000 });
                  break;
                }

                if (Math.abs(next.idx - curr.idx) !== 1 || next.abs <= curr.abs) continue;

                const departTime = curr.abs + 15000;
                const arriveTime = next.abs;

                if (arriveTime > departTime) {
                  legs.push({ i1: curr.idx, i2: curr.idx, t1: curr.abs, t2: departTime });
                  legs.push({ i1: curr.idx, i2: next.idx, t1: departTime, t2: arriveTime });
                } else {
                  legs.push({ i1: curr.idx, i2: next.idx, t1: curr.abs, t2: arriveTime });
                }
              }

              if (legs.length) allTrips.push({ key, dir, trainId, legs });
            }
          }
        }

        return allTrips;
      };

      tripDefsRef.current = buildTrips();

      const lerp = (a, b, t) => a + (b - a) * t;
      const lerpPos = (p1, p2, t) => [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)];

      const ensureMarker = (key, trainId) => {
        let marker = liveMarkersRef.current.get(key);
        if (!marker) {
          const el = document.createElement("img");
          el.src = "/yellow-metro.jpg";
          el.style.width = "28px";
          el.style.height = "28px";
          el.style.objectFit = "contain";
          el.style.borderRadius = "50%";
          el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
          marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(points[0]).addTo(map);
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
            if (marker) {
              marker.remove();
              liveMarkersRef.current.delete(trip.key); // ✅ important
            }
            continue;
          }
          let moved = false;
          for (const leg of trip.legs) {
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
            const marker = liveMarkersRef.current.get(trip.key);
            if (marker) {
              marker.remove();
              liveMarkersRef.current.delete(trip.key);
            }
          }
        }
        rafRef.current = requestAnimationFrame(step);
      };
      step();
    }

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
