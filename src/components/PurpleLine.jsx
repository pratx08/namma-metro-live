// src/components/PurpleLine.jsx
import { useEffect, useRef } from "react";
import { PURPLE_STATIONS } from "../stations/purpleStations";

export default function PurpleLine({
  map,
  theme = "light",
  showStations = true,
  fitOnMount = false,
  animateTrains = true,
}) {
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const trainMarkersRef = useRef([]); // [A,B]
  const rafRef = useRef(null);
  const trainStateRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google) return;
    const g = window.google.maps;
    const isDark = theme === "dark";
    const N = PURPLE_STATIONS.length;

    // Fit map bounds if required
    if (fitOnMount && N > 0) {
      const bounds = new g.LatLngBounds();
      PURPLE_STATIONS.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }

    // --- Station markers (dots only)
    const stationDot = {
      path: "M 0,0 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0",
      scale: 1,
      fillColor: "#7C3AED",
      fillOpacity: 1,
      strokeColor: isDark ? "#000000" : "#FFFFFF",
      strokeWeight: 2,
    };
    if (showStations) {
      markersRef.current = PURPLE_STATIONS.map(
        (pos) => new g.Marker({ position: pos, icon: stationDot, map, zIndex: 20 })
      );
    }

    // --- Polyline (made thicker 🔹)
    if (N >= 2) {
      polylineRef.current = new g.Polyline({
        path: PURPLE_STATIONS,
        strokeColor: "#800080",
        strokeOpacity: 0.95,
        strokeWeight: 4, // 🔹 Bigger line
        map,
        zIndex: 10,
      });
    }

    // ====== Trains with per-segment durations ======
    if (animateTrains && N >= 2) {
      const segDurMs = PURPLE_STATIONS.slice(0, N - 1).map((s) =>
        Math.max(1, (s.toNextSec ?? 60) * 1000)
      );

      const trainIcon = {
        url: "/purple-metro.jpg",
        scaledSize: new g.Size(25, 25),
        anchor: new g.Point(15, 20),
      };

      const mkTrain = (pos) => new g.Marker({ position: pos, icon: trainIcon, map, zIndex: 50 });
      const trainA = mkTrain(PURPLE_STATIONS[0]);
      const trainB = mkTrain(PURPLE_STATIONS[N - 1]);
      trainMarkersRef.current = [trainA, trainB];

      const lerp = (a, b, t) => a + (b - a) * t;
      const lerpPos = (p1, p2, t) => ({ lat: lerp(p1.lat, p2.lat, t), lng: lerp(p1.lng, p2.lng, t) });

      const t0 = performance.now();
      trainStateRef.current = {
        A: { dir: +1, segIndex: 0, phaseStart: t0 },
        B: { dir: -1, segIndex: N - 2, phaseStart: t0 },
      };

      const advanceTrain = (state, marker, now) => {
        let { dir, segIndex, phaseStart } = state;
        while (true) {
          if (segIndex < 0 || segIndex >= segDurMs.length) {
            dir = -dir;
            segIndex = dir > 0 ? 0 : segDurMs.length - 1;
            phaseStart = now;
          }
          const duration = segDurMs[segIndex] || 1;
          const elapsed = now - phaseStart;

          if (elapsed < duration) {
            const i = segIndex;
            const p1 = dir > 0 ? PURPLE_STATIONS[i] : PURPLE_STATIONS[i + 1];
            const p2 = dir > 0 ? PURPLE_STATIONS[i + 1] : PURPLE_STATIONS[i];
            const t = elapsed / duration;
            marker.setPosition(lerpPos(p1, p2, t));
            state.dir = dir;
            state.segIndex = segIndex;
            state.phaseStart = phaseStart;
            break;
          } else {
            phaseStart += duration;
            segIndex += dir;
          }
        }
      };

      const step = () => {
        const now = performance.now();
        advanceTrain(trainStateRef.current.A, trainMarkersRef.current[0], now);
        advanceTrain(trainStateRef.current.B, trainMarkersRef.current[1], now);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    // ====== Cleanup ======
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      trainStateRef.current = null;

      trainMarkersRef.current.forEach((m) => m.setMap(null));
      trainMarkersRef.current = [];

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, theme, showStations, fitOnMount, animateTrains]);

  return null;
}
