// src/components/Favorites.jsx
import { useEffect, useMemo, useState } from "react";
import { GREEN_STATIONS } from "../stations/greenStations";
import { PURPLE_STATIONS } from "../stations/purpleStations";
import { YELLOW_STATIONS } from "../stations/yellowStations";

export default function Favorites({ theme = "light", language = "en" }) {
	// --- i18n (subset needed here) ---
	const I18N = {
		en: {
			favourites: "Favourites",
			noFav: "No favourites set",
			addFav: "Add Favourite",
			addFavStop: "Add Favourite Stop",
			line: "Line",
			stop: "Stop",
			cancel: "Cancel",
			save: "Save",
			arriving: "ARRIVING",
			select: "-- Select --",
			purpleLine: "Purple Line",
			yellowLine: "Yellow Line",
			greenLine: "Green Line",
		},
		kn: {
			favourites: "ಆಸಕ್ತಿಗಳು",
			noFav: "ಯಾವುದೇ ಆಸಕ್ತಿ ಇಲ್ಲ",
			addFav: "ಆಸಕ್ತಿ ಸೇರಿಸಿ",
			addFavStop: "ಆಸಕ್ತಿ ನಿಲ್ದಾಣ ಸೇರಿಸಿ",
			line: "ಮಾರ್ಗ",
			stop: "ನಿಲ್ದಾಣ",
			cancel: "ರದ್ದುಮಾಡಿ",
			save: "ಉಳಿಸಿ",
			arriving: "ಬರುತ್ತಿದೆ",
			select: "-- ಆಯ್ಕೆಮಾಡಿ --",
			purpleLine: "ನೇರಳೆ ಮಾರ್ಗ",
			yellowLine: "ಹಳದಿ ಮಾರ್ಗ",
			greenLine: "ಹಸಿರು ಮಾರ್ಗ",
		},
		hi: {
			favourites: "पसंदीदा",
			noFav: "कोई पसंदीदा नहीं",
			addFav: "पसंदीदा जोड़ें",
			addFavStop: "पसंदीदा स्टॉप जोड़ें",
			line: "लाइन",
			stop: "स्टॉप",
			cancel: "रद्द करें",
			save: "सेव",
			arriving: "ARRIVING",
			select: "-- चुनें --",
			purpleLine: "बैंगनी लाइन",
			yellowLine: "पीली लाइन",
			greenLine: "हरी लाइन",
		},
	};
	const T = I18N[language] ?? I18N.en;

	// Station data + helpers
	const stopsByLine = useMemo(
		() => ({
			purple: PURPLE_STATIONS,
			yellow: YELLOW_STATIONS,
			green: GREEN_STATIONS,
		}),
		[]
	);
	const lineColors = {
		purple: "#800080",
		yellow: "#EAB308",
		green: "#16A34A",
	};
	const getStationLabel = (station) => {
		if (language === "kn") return station.name_kn || station.name;
		return station.name;
	};

	// Local storage state
	const [favorites, setFavorites] = useState(() => {
		const saved = localStorage.getItem("favorites");
		return saved ? JSON.parse(saved) : [];
	});
	useEffect(() => {
		localStorage.setItem("favorites", JSON.stringify(favorites));
	}, [favorites]);

	// Add/remove + modal state
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedLine, setSelectedLine] = useState("purple");
	const [selectedStop, setSelectedStop] = useState("");

	const addFavorite = () => {
		if (!selectedStop || favorites.length >= 5) {
			setModalOpen(false);
			return;
		}
		const exists = favorites.some(
			(f) => f.line === selectedLine && f.stop === selectedStop
		);
		if (exists) {
			setModalOpen(false);
			setSelectedStop("");
			return;
		}
		setFavorites([...favorites, { line: selectedLine, stop: selectedStop }]);
		setModalOpen(false);
		setSelectedStop("");
	};

	const removeFavorite = (favToRemove) => {
		setFavorites(
			favorites.filter(
				(f) => !(f.line === favToRemove.line && f.stop === favToRemove.stop)
			)
		);
	};

	// ===== ETA calculation (IST) =====
	const [etas, setEtas] = useState({}); // key -> { toFirst, toLast, idx, firstName, lastName }

	const IST_OFFSET_MIN = 330;
	const DAY_MS = 24 * 60 * 60 * 1000;
	const hhmmssToMs = (t) => {
		const [hh, mm, ss] = t.split(":").map((x) => parseInt(x, 10));
		return ((hh * 60 + mm) * 60 + (ss || 0)) * 1000;
	};
	const nowWithinDayIST = () => {
		const n = Date.now() + IST_OFFSET_MIN * 60 * 1000; // shift to IST
		const d = new Date(n);
		return (
			((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) *
			1000 +
			d.getUTCMilliseconds()
		);
	};
	const nextEtaMinutes = (times) => {
		if (!times || !times.length) return null;
		const nowMs = nowWithinDayIST();
		const list = times
			.map((t) => (typeof t === "string" ? t : t.time))
			.filter(Boolean)
			.map(hhmmssToMs)
			.sort((a, b) => a - b);
		const idx = list.findIndex((ms) => ms >= nowMs);
		const target = idx >= 0 ? list[idx] : list[0] + DAY_MS;
		const etaMs = target - nowMs;
		const mins = Math.max(0, Math.ceil(etaMs / 60000));
		return mins;
	};

	useEffect(() => {
		const compute = () => {
			const result = {};
			for (const fav of favorites) {
				const stations = stopsByLine[fav.line] || [];
				const station = stations.find((s) => s.name === fav.stop);
				const key = `${fav.line}|${fav.stop}`;
				if (!station || stations.length === 0) {
					result[key] = null;
					continue;
				}
				const firstName = stations[0].name;
				const lastName = stations[stations.length - 1].name;
				const idx = stations.findIndex((s) => s.name === fav.stop);

				const toLast = nextEtaMinutes(station.upSchedule); // towards last
				const toFirst = nextEtaMinutes(station.downSchedule); // towards first

				result[key] = { toFirst, toLast, idx, firstName, lastName };
			}
			setEtas(result);
		};
		compute();
		const id = setInterval(compute, 15000);
		return () => clearInterval(id);
	}, [favorites, stopsByLine]);

	const etaRow = (labelText, minutes) => {
		const txt = minutes == null ? "--" : minutes < 1 ? T.arriving : `${minutes} min`;
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: 8,
					fontSize: 13,
					whiteSpace: "nowrap",
				}}
			>
				<span
					style={{
						flex: 1,
						minWidth: 0,
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					→ {labelText}
				</span>
				<span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{txt}</span>
			</div>
		);
	};

	// UI
	return (
		<section
			style={{
				marginBottom: 0,
				display: "flex",
				gap: "12px",
				overflowX: "auto",
				padding: "10px",
				scrollbarWidth: "none",
				msOverflowStyle: "none",
			}}
		>
			{/* <strong>{T.favourites}</strong> */}
			{favorites.length === 0 && (
				<div
					style={{
						flex: "0 0 180px",       // same base width as the cards
						height: "100px",         // same height as the cards
						display: "flex",
						alignItems: "center",    // vertical center
						justifyContent: "center",// horizontal center
						fontSize: 14,
						fontWeight: 500,
						color: theme === "dark" ? "#ccc" : "#555",
					}}
				>
					{T.noFav}
				</div>
			)}

			{favorites.map((fav) => {
				const key = `${fav.line}|${fav.stop}`;
				const info = etas[key];
				const col = lineColors[fav.line] || "#999";
				const stations = stopsByLine[fav.line] || [];
				const idx = info?.idx ?? stations.findIndex((s) => s.name === fav.stop);
				const firstName = info?.firstName ?? stations[0]?.name ?? "Terminal A";
				const lastName =
					info?.lastName ?? stations[stations.length - 1]?.name ?? "Terminal B";

				const showToLast = idx > -1 && idx !== stations.length - 1;
				const showToFirst = idx > 0;

				return (
					<div
						key={key}
						style={{
							flex: "0 0 180px",
							height: "100px",
							width: "250px",         // ✅ fixed uniform height
							background: theme === "dark" ? "#1e1e1e" : "#fff",
							color: theme === "dark" ? "#fff" : "#111",
							border: `2px solid ${col}`,
							borderRadius: 10,
							boxShadow:
								theme === "dark"
									? "0 2px 6px rgba(0,0,0,0.7)"
									: "0 2px 6px rgba(0,0,0,0.1)",
							padding: "10px",
							display: "flex",
							flexDirection: "column",
						}}
					>
						{/* Header */}
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span style={{ fontWeight: 700, fontSize: 15 }}>{fav.stop}</span>
							<button
								onClick={() => removeFavorite(fav)}
								style={{
									background: "transparent",
									border: "none",
									color: theme === "dark" ? "#aaa" : "#444",
									cursor: "pointer",
									fontSize: 16,
								}}
							>
								×
							</button>
						</div>

						{/* Direction ETAs */}
						<div
							style={{
								fontSize: 13,
								marginTop: 8,        // push from top
								marginBottom: 8,     // push from bottom
								display: "flex",     // stack rows as flex items
								flexDirection: "column",
								gap: 6,              // ✅ space between the two rows
							}}
						>
							{showToLast && etaRow(lastName, info?.toLast ?? null)}
							{showToFirst && etaRow(firstName, info?.toFirst ?? null)}
						</div>
					</div>
				);
			})}

			{/* Uniform Add Favourite card */}
			{favorites.length < 5 && (
				<div
					onClick={() => setModalOpen(true)}
					style={{
						flex: "0 0 180px",
						height: "100px",
						border: theme === "dark" ? "2px dashed #555" : "2px dashed #aaa",
						borderRadius: 10,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						color: theme === "dark" ? "#fff" : "#111",
						background: theme === "dark" ? "#1e1e1e" : "#fafafa",
					}}
				>
					<span style={{ fontSize: 14, fontWeight: 500 }}>+ {T.addFav}</span>
				</div>
			)}


			{/* Modal */}
			{modalOpen && (
				<div
					onClick={() => setModalOpen(false)}
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						background: "rgba(0,0,0,0.5)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 3000,
					}}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{
							background: theme === "dark" ? "#1e1e1e" : "#fff",
							color: theme === "dark" ? "#fff" : "#111",
							padding: 20,
							borderRadius: 12,
							minWidth: 280,
							position: "relative",
							boxShadow:
								theme === "dark"
									? "0 0 12px rgba(255,255,255,0.1)"
									: "0 0 12px rgba(0,0,0,0.2)",
						}}
					>
						{/* Close */}
						<button
							onClick={() => setModalOpen(false)}
							style={{
								position: "absolute",
								top: 10,
								right: 10,
								background: "transparent",
								border: "none",
								color: theme === "dark" ? "#fff" : "#111",
								fontSize: 18,
								cursor: "pointer",
							}}
						>
							×
						</button>

						<h4 style={{ marginTop: 0 }}>{T.addFavStop}</h4>

						<label style={{ display: "block", marginBottom: 12 }}>
							{T.line}:{" "}
							<select
								value={selectedLine}
								onChange={(e) => {
									setSelectedLine(e.target.value);
									setSelectedStop("");
								}}
								style={{
									width: "100%",
									marginTop: 6,
									padding: "8px",
									borderRadius: 6,
									border: theme === "dark" ? "1px solid #444" : "1px solid #ccc",
									background: theme === "dark" ? "#2a2a2a" : "#fff",
									color: theme === "dark" ? "#fff" : "#111",
								}}
							>
								<option value="purple">{T.purpleLine}</option>
								<option value="yellow">{T.yellowLine}</option>
								<option value="green">{T.greenLine}</option>
							</select>
						</label>

						<label style={{ display: "block", marginBottom: 12 }}>
							{T.stop}:{" "}
							<select
								value={selectedStop}
								onChange={(e) => setSelectedStop(e.target.value)}
								style={{
									width: "100%",
									marginTop: 6,
									padding: "8px",
									borderRadius: 6,
									border: theme === "dark" ? "1px solid #444" : "1px solid #ccc",
									background: theme === "dark" ? "#2a2a2a" : "#fff",
									color: theme === "dark" ? "#fff" : "#111",
								}}
							>
								<option value="">{T.select}</option>
								{(stopsByLine[selectedLine] || []).map((stop) => (
									<option key={stop.name} value={stop.name}>
										{getStationLabel(stop)}
									</option>
								))}
							</select>
						</label>

						<div
							style={{
								marginTop: 16,
								display: "flex",
								justifyContent: "flex-end",
								gap: 10,
							}}
						>
							<button
								onClick={() => setModalOpen(false)}
								style={{
									padding: "6px 12px",
									borderRadius: 6,
									border: "none",
									background: theme === "dark" ? "#333" : "#e0e0e0",
									color: theme === "dark" ? "#fff" : "#111",
									cursor: "pointer",
								}}
							>
								{T.cancel}
							</button>
							<button
								onClick={addFavorite}
								disabled={!selectedStop}
								style={{
									padding: "6px 12px",
									borderRadius: 6,
									border: "none",
									background: !selectedStop
										? theme === "dark"
											? "#555"
											: "#ccc"
										: theme === "dark"
											? "#4d91ff"
											: "#1976d2",
									color: "#fff",
									cursor: !selectedStop ? "not-allowed" : "pointer",
								}}
							>
								{T.save}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
