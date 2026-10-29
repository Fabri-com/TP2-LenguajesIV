/** @typedef {import('leaflet')} */

const STORAGE_KEY = "historial-recorrido";
const INITIAL_POSITION = [-24.789, -65.41];

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const clearButton = document.getElementById("clearButton");
const statusText = document.getElementById("status");
const historyList = document.getElementById("historyList");

let watchId = null;
let marker = null;
let positions = loadHistory();

const map = L.map("map").setView(INITIAL_POSITION, 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const route = L.polyline([], {
  color: "red",
  weight: 4
}).addTo(map);

showSavedHistory();

startButton.addEventListener("click", startTracking);
stopButton.addEventListener("click", stopTracking);
clearButton.addEventListener("click", clearHistory);

window.addEventListener("load", () => {
  setTimeout(() => map.invalidateSize(), 100);
});

window.addEventListener("resize", () => map.invalidateSize());

function startTracking() {
  if (!navigator.geolocation) {
    statusText.textContent = "Este navegador no permite usar la geolocalización.";
    return;
  }

  if (watchId !== null) return;
  statusText.textContent = "Buscando ubicación...";
  startButton.disabled = true;
  stopButton.disabled = false;

  watchId = navigator.geolocation.watchPosition(
    addPosition,
    showError,
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000
    }
  );
}
function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  startButton.disabled = false;
  stopButton.disabled = true;
  statusText.textContent = "Seguimiento detenido.";
}
function addPosition(position) {
  const point = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    time: position.timestamp || Date.now()
  };
  positions.push(point);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));

  drawPoint(point, true);
  renderHistory();
  statusText.textContent = "Seguimiento activo.";
}
function drawPoint(point, centerMap) {
  const coordinates = [point.latitude, point.longitude];
  if (marker === null) {
    marker = L.marker(coordinates).addTo(map);
  } else {
    marker.setLatLng(coordinates);
  }
  marker.bindPopup("Tu ubicación actual");
  route.addLatLng(coordinates);
  if (centerMap) {
    map.setView(coordinates, 17);
  }
}
function clearHistory() {
  positions = [];
  localStorage.removeItem(STORAGE_KEY);
  route.setLatLngs([]);
  if (marker !== null) {
    map.removeLayer(marker);
    marker = null;
  }
  map.setView(INITIAL_POSITION, 15);
  renderHistory();
  statusText.textContent = "Historial eliminado.";
}
function renderHistory() {
  historyList.innerHTML = "";
  if (positions.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.id = "emptyMessage";
    emptyMessage.textContent = "Todavía no hay posiciones guardadas.";
    historyList.appendChild(emptyMessage);
    return;
  }
  positions.forEach((point, index) => {
    const item = document.createElement("li");
    const time = new Date(point.time).toLocaleTimeString("es-AR");
    item.textContent = `#${index + 1} - Lat: ${point.latitude.toFixed(6)}, Lng: ${point.longitude.toFixed(6)} - ${time}`;
    historyList.appendChild(item);
  });
}
function showSavedHistory() {
  renderHistory();
  positions.forEach((point) => drawPoint(point, false));
  if (positions.length > 0) {
    const lastPoint = positions[positions.length - 1];
    map.setView([lastPoint.latitude, lastPoint.longitude], 17);
  }
}
function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function showError(error) {
  const messages = {
    1: "Permiso de ubicación denegado.",
    2: "No se pudo obtener la ubicación.",
    3: "La ubicación tardó demasiado en responder."
  };
  stopTracking();
  statusText.textContent = messages[error.code] || "Error al obtener la ubicación.";
}