// src/components/PurpleLine.jsx
import { useEffect, useRef } from "react";
import { PURPLE_STATIONS } from "../stations/purpleStations";

/**
 * Purple Line layer:
 * - Station dots + theme-/language-aware labels (EN/KN via `language`)
 * - Polyline
 * - TWO animated trains (both ends)
 * Uses per-segment durations from station.toNextSec (seconds).
 * Labels always on the left of station.
 */
export default function PurpleLine({
	map,
	theme = "light",
	language = "en",
	showStations = true,
	fitOnMount = false,
	animateTrains = true,
}) {
	const markersRef = useRef([]);
	const polylineRef = useRef(null);
	const overlaysRef = useRef([]);

	const trainMarkersRef = useRef([]); // [A,B]
	const rafRef = useRef(null);
	const trainStateRef = useRef(null);

	useEffect(() => {
		if (!map || !window.google) return;
		const g = window.google.maps;
		const isDark = theme === "dark";
		const N = PURPLE_STATIONS.length;

		const getLabel = (s) => {
			if (language === "kn" && s.name_kn) return s.name_kn;
			return s.name;
		};

		// Fit map bounds if required
		if (fitOnMount && N > 0) {
			const bounds = new g.LatLngBounds();
			PURPLE_STATIONS.forEach((p) => bounds.extend(p));
			map.fitBounds(bounds, 40);
		}

		// --- Station markers
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

		// --- Labels (always on the left)
		class LabelOverlay extends g.OverlayView {
			constructor(position, text) {
				super();
				this.position = new g.LatLng(position.lat, position.lng);
				this.text = text;
				this.div = null;
			}
			onAdd() {
				const div = document.createElement("div");
				div.style.position = "absolute";
				div.style.background = isDark ? "rgba(55,55,55,0.85)" : "rgba(255,255,255,0.85)";
				div.style.padding = "5px 10px";
				div.style.borderRadius = "6px";
				div.style.fontSize = "10px";
				div.style.fontWeight = "600";
				div.style.whiteSpace = "nowrap";
				div.style.boxShadow = isDark
					? "0 1px 3px rgba(0,0,0,0.6)"
					: "0 1px 3px rgba(0,0,0,0.3)";
				div.style.color = isDark ? "#ffffff" : "#111111";
				div.style.pointerEvents = "none";
				div.style.zIndex = "30";
				div.textContent = this.text;

				// Always place on left side of station
				div.style.transform = "translate(-110%, -50%)";
				div.style.textAlign = "right";

				this.div = div;
				this.getPanes().overlayMouseTarget.appendChild(div);
			}
			draw() {
				if (!this.div) return;
				const proj = this.getProjection();
				const pt = proj.fromLatLngToDivPixel(this.position);
				if (pt) {
					this.div.style.left = `${pt.x}px`;
					this.div.style.top = `${pt.y}px`;
				}
			}
			onRemove() {
				if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
				this.div = null;
			}
		}

		overlaysRef.current = PURPLE_STATIONS.map((s) => {
			const overlay = new LabelOverlay(s, getLabel(s));
			overlay.setMap(map);
			return overlay;
		});

		// --- Polyline
		if (N >= 2) {
			polylineRef.current = new g.Polyline({
				path: PURPLE_STATIONS,
				strokeColor: "#800080",
				strokeOpacity: 0.9,
				strokeWeight: 4,
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
				url: "/purple-metro.jpg", // or train-yellow.png, train-green.png
				scaledSize: new g.Size(25, 25),  // resize to fit map scale
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

			overlaysRef.current.forEach((o) => o.setMap(null));
			overlaysRef.current = [];

			if (polylineRef.current) {
				polylineRef.current.setMap(null);
				polylineRef.current = null;
			}
		};
	}, [map, theme, language, showStations, fitOnMount, animateTrains]);

	return null;
}
