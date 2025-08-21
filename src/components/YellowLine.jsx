// src/components/YellowLine.jsx
import { useEffect, useRef } from "react";
import { YELLOW_STATIONS } from "../stations/yellowStations";

export default function YellowLine({
  map,
  theme = "light",
  showStations = true,
  fitOnMount = false,
  animateTrains = true,
  // Optional: simulate IST time-of-day (e.g., "09:15:00") for testing
  timeOfDayOverride,
}) {
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const rafRef = useRef(null);
  const tripDefsRef = useRef([]);               // [{ key, dir, trainId, legs: [{i1,i2,t1,t2}] }]
  const liveMarkersRef = useRef(new Map());     // key -> google.maps.Marker

  useEffect(() => {
    if (!map || !window.google) return;
    const g = window.google.maps;
    const isDark = theme === "dark";

    // ---------- stations/points ----------
    const stations = (YELLOW_STATIONS || []).filter(
      (s) =>
        s &&
        typeof s.lat === "number" &&
        !Number.isNaN(s.lat) &&
        typeof s.lng === "number" &&
        !Number.isNaN(s.lng)
    );
    const points = stations.map(({ lat, lng }) => ({ lat, lng }));
    const N = points.length;
    if (N === 0) return;

    if (fitOnMount) {
      const bounds = new g.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }

    // ---------- station dots ----------
    const stationDot = {
      path: "M 0,0 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0",
      scale: 1,
      fillColor: "#EAB308",
      fillOpacity: 1,
      strokeColor: isDark ? "#000000" : "#FFFFFF",
      strokeWeight: 2,
    };
    if (showStations) {
      markersRef.current = points.map(
        (pos) => new g.Marker({ position: pos, icon: stationDot, map, zIndex: 20 })
      );
    }

    // ---------- line ----------
    if (N >= 2) {
      polylineRef.current = new g.Polyline({
        path: points,
        strokeColor: "#EAB308",
        strokeOpacity: 0.95,
        strokeWeight: 4,
        map,
        zIndex: 10,
      });
    }

    // ========== schedule-driven trains ==========
    if (animateTrains && N >= 2) {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const IST_OFFSET_MIN = 330;

      const hhmmssToMs = (t) => {
        const [hh, mm, ss] = t.split(":").map((x) => parseInt(x, 10));
        return ((hh * 60 + mm) * 60 + (ss || 0)) * 1000;
      };

      // Correct IST timeline “now” (UTC epoch + IST offset)
      const nowISTms = () => {
        if (timeOfDayOverride) {
          const base = istMidnightEpoch();
          return base + hhmmssToMs(timeOfDayOverride);
        }
        return Date.now() + IST_OFFSET_MIN * 60 * 1000;
      };

      // Midnight of *today* in IST timeline (epoch shifted by IST)
      const istMidnightEpoch = () => {
        const n = Date.now() + IST_OFFSET_MIN * 60 * 1000; // IST timeline
        const d = new Date(n);
        const sinceMidnight =
          ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 +
          d.getMilliseconds();
        return n - sinceMidnight;
      };

      // Build trips by stitching same (tripNo, trainId) across stations for UP/DOWN
      const buildTrips = () => {
        const upMap = new Map();   // key -> [{idx, time}]
        const downMap = new Map(); // key -> [{idx, time}]

        const dedupePush = (map, key, idx, time) => {
          const arr = map.get(key) || [];
          const sig = `${idx}|${time}`;
          if (!arr.some((e) => `${e.idx}|${e.time}` === sig)) arr.push({ idx, time });
          map.set(key, arr);
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

        const finalize = (map, dir) => {
          const trips = [];
          for (const [key, raw] of map.entries()) {
            const ordered = raw
              .slice()
              .sort((a, b) => (dir === "UP" ? a.idx - b.idx : b.idx - a.idx));

            let dayOffset = 0;
            let prevWithin = null;
            const events = ordered.map(({ idx, time }) => {
              const within = hhmmssToMs(time);
              if (prevWithin !== null && within < prevWithin) dayOffset += DAY_MS; // crosses midnight
              const abs = midnight + dayOffset + within; // IST timeline absolute
              prevWithin = within;
              return { idx, abs };
            });

            if (events.length >= 2) {
              const parts = key.split("_");
              const trainId = parts.slice(2).join("_");
              const legs = [];
              for (let i = 0; i < events.length - 1; i++) {
                const a = events[i];
                const b = events[i + 1];
                if (b.abs > a.abs) {
                  legs.push({ i1: a.idx, i2: b.idx, t1: a.abs, t2: b.abs });
                }
              }
              if (legs.length) trips.push({ key, dir, trainId, legs });
            }
          }
          return trips;
        };

        return [...finalize(upMap, "UP"), ...finalize(downMap, "DOWN")];
      };

      tripDefsRef.current = buildTrips();

      const trainIcon = {
        url: "/yellow-metro.jpg",
        scaledSize: new g.Size(25, 25),
        anchor: new g.Point(15, 20),
      };

      const lerp = (a, b, t) => a + (b - a) * t;
      const lerpPos = (p1, p2, t) => ({
        lat: lerp(p1.lat, p2.lat, t),
        lng: lerp(p1.lng, p2.lng, t),
      });

      const ensureMarker = (key) => {
        let m = liveMarkersRef.current.get(key);
        if (!m) {
          m = new g.Marker({ position: points[0], icon: trainIcon, map, zIndex: 50 });
          liveMarkersRef.current.set(key, m);
        } else if (!m.getMap()) {
          m.setMap(map);
        }
        return m;
      };

      const placeIdle = (trip, now) => {
        const first = trip.legs[0];
        const last = trip.legs[trip.legs.length - 1];
        let idx;
        if (now < first.t1) {
          idx = first.i1; // not departed yet
        } else if (now > last.t2) {
          idx = last.i2; // finished; at terminal
        } else {
          // between legs exactly at a station
          for (let i = 0; i < trip.legs.length - 1; i++) {
            if (now > trip.legs[i].t2 && now < trip.legs[i + 1].t1) {
              idx = trip.legs[i].i2;
              break;
            }
          }
          if (idx === undefined) idx = first.i1; // safe fallback
        }
        const marker = ensureMarker(trip.key);
        marker.setPosition(points[idx]);
      };

      const step = () => {
        const now = nowISTms();

        for (const trip of tripDefsRef.current) {
          let moved = false;

          // moving on a leg?
          for (let i = 0; i < trip.legs.length; i++) {
            const leg = trip.legs[i];
            if (now >= leg.t1 && now <= leg.t2) {
              const t = (now - leg.t1) / (leg.t2 - leg.t1);
              const p1 = points[leg.i1];
              const p2 = points[leg.i2];
              ensureMarker(trip.key).setPosition(lerpPos(p1, p2, t));
              moved = true;
              break;
            }
          }

          // idle (pre, between, or post service): show parked at the correct station
          if (!moved) {
            placeIdle(trip, now);
          }
        }

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    }

    // ---------- cleanup ----------
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      for (const m of liveMarkersRef.current.values()) m.setMap(null);
      liveMarkersRef.current.current = new Map(); // reset map holder

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, theme, showStations, fitOnMount, animateTrains, timeOfDayOverride]);

  return null;
}
