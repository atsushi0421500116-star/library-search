const APPKEY = '42d0138967df242385647170b8663972';
const API_LIBRARY = 'https://api.calil.jp/library';

const cityInput = document.getElementById('city-input');
const cityBtn   = document.getElementById('city-btn');
const locateBtn = document.getElementById('locate-btn');
const statusBar = document.getElementById('status-bar');
const mapEl     = document.getElementById('map');
const resultsEl = document.getElementById('results');

let map = null;
let markers = [];

// ── JSONP helper ──────────────────────────────────────
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = '__calil_' + Date.now();
    const script = document.createElement('script');
    script.src = `${url}&callback=${cb}`;
    window[cb] = data => {
      document.head.removeChild(script);
      delete window[cb];
      resolve(data);
    };
    script.onerror = () => {
      document.head.removeChild(script);
      delete window[cb];
      reject(new Error('network error'));
    };
    document.head.appendChild(script);
  });
}

// ── Status ────────────────────────────────────────────
function setStatus(msg, type = 'loading') {
  statusBar.className = `status-bar ${type}`;
  statusBar.innerHTML = type === 'loading'
    ? `<span class="spin"></span>${msg}`
    : msg;
}

function clearStatus() {
  statusBar.className = 'status-bar hidden';
}

// ── Map ───────────────────────────────────────────────
function initMap(lat, lng) {
  mapEl.classList.remove('hidden');
  if (!map) {
    map = L.map('map').setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
  } else {
    map.setView([lat, lng], 14);
    markers.forEach(m => m.remove());
    markers = [];
  }
}

function addMarker(lat, lng, name, url) {
  const icon = L.divIcon({
    html: `<div style="
      background:#2563eb;color:#fff;border-radius:8px;
      padding:3px 7px;font-size:11px;font-weight:600;
      white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);
      font-family:Inter,sans-serif;
    ">${name}</div>`,
    className: '',
    iconAnchor: [0, 0]
  });
  const m = L.marker([lat, lng], { icon })
    .addTo(map)
    .bindPopup(url ? `<a href="${url}" target="_blank">${name}</a>` : name);
  markers.push(m);
}

// ── Render results ────────────────────────────────────
const CATEGORY_LABEL = {
  '0': '公共図書館', '1': '大学図書館', '2': '専門図書館',
  '3': '学校図書館', '4': 'その他'
};

function renderLibraries(libs, centerLat, centerLng) {
  resultsEl.innerHTML = '';

  if (!libs || libs.length === 0) {
    resultsEl.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        図書館が見つかりませんでした
      </div>`;
    return;
  }

  const header = document.createElement('div');
  header.className = 'result-header';
  header.textContent = `${libs.length} 件の図書館が見つかりました`;
  resultsEl.appendChild(header);

  libs.forEach((lib, i) => {
    const [lngL, latL] = (lib.geocode || '').split(',').map(Number);
    const hasGeo = latL && lngL;

    if (hasGeo) addMarker(latL, lngL, lib.short || lib.name, lib.url_pc);

    // Distance
    let distStr = '';
    if (hasGeo && centerLat && centerLng) {
      const d = getDistKm(centerLat, centerLng, latL, lngL);
      distStr = d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
    }

    const card = document.createElement('div');
    card.className = 'lib-card';
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="lib-card-header">
        <div class="lib-name">${lib.name}</div>
        ${lib.category !== undefined
          ? `<span class="lib-category">${CATEGORY_LABEL[lib.category] || 'その他'}</span>`
          : ''}
      </div>
      <div class="lib-meta">
        ${lib.address ? `
          <div class="lib-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>${lib.address}${distStr ? `　<strong>${distStr}</strong>` : ''}</span>
          </div>` : ''}
        ${lib.tel ? `
          <div class="lib-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.34
                2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81
                a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6 6l.92-.92
                a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>${lib.tel}</span>
          </div>` : ''}
      </div>
      <div class="lib-actions">
        ${lib.url_pc
          ? `<a class="lib-link primary" href="${lib.url_pc}" target="_blank" rel="noopener">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                 <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                 <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
               </svg>
               ウェブサイト
             </a>`
          : ''}
        ${hasGeo
          ? `<a class="lib-link secondary"
               href="https://www.google.com/maps/search/?api=1&query=${latL},${lngL}"
               target="_blank" rel="noopener">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                 <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                 <circle cx="12" cy="10" r="3"/>
               </svg>
               地図
             </a>`
          : ''}
      </div>
    `;
    resultsEl.appendChild(card);
  });
}

// ── Haversine distance ────────────────────────────────
function getDistKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Search by geocode ─────────────────────────────────
async function searchByGeocode(lat, lng) {
  setStatus('近くの図書館を検索中…');
  initMap(lat, lng);

  // current location marker
  L.circleMarker([lat, lng], {
    radius: 8, fillColor: '#2563eb', color: '#fff',
    weight: 3, fillOpacity: 1
  }).addTo(map).bindPopup('現在地');

  try {
    const data = await jsonp(
      `${API_LIBRARY}?appkey=${APPKEY}&geocode=${lng},${lat}&limit=20&format=json`
    );
    clearStatus();
    renderLibraries(Array.isArray(data) ? data : [], lat, lng);
    if (markers.length) map.fitBounds(markers.map(m => m.getLatLng()), { padding: [30, 30] });
  } catch (e) {
    setStatus('取得に失敗しました。しばらくしてから再試行してください。', 'error');
  }
}

// ── Search by city name ───────────────────────────────
async function searchByCity(city) {
  if (!city.trim()) return;
  setStatus(`「${city}」の図書館を検索中…`);
  resultsEl.innerHTML = '';

  try {
    const data = await jsonp(
      `${API_LIBRARY}?appkey=${APPKEY}&city=${encodeURIComponent(city)}&limit=30&format=json`
    );
    const libs = Array.isArray(data) ? data : [];
    clearStatus();

    // Center map on first geocoded library
    const first = libs.find(l => l.geocode);
    if (first) {
      const [lng, lat] = first.geocode.split(',').map(Number);
      initMap(lat, lng);
    } else {
      mapEl.classList.add('hidden');
    }

    renderLibraries(libs, null, null);
    if (markers.length) map.fitBounds(markers.map(m => m.getLatLng()), { padding: [40, 40] });
  } catch (e) {
    setStatus('取得に失敗しました。しばらくしてから再試行してください。', 'error');
  }
}

// ── Events ────────────────────────────────────────────
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('このブラウザは位置情報に対応していません。', 'error');
    return;
  }
  setStatus('位置情報を取得中…');
  navigator.geolocation.getCurrentPosition(
    pos => searchByGeocode(pos.coords.latitude, pos.coords.longitude),
    () => setStatus('位置情報の取得に失敗しました。ブラウザの許可設定を確認してください。', 'error')
  );
});

cityBtn.addEventListener('click', () => searchByCity(cityInput.value));
cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchByCity(cityInput.value); });

// ── Initial state ─────────────────────────────────────
resultsEl.innerHTML = `
  <div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
    「現在地」ボタンまたは市区町村名で検索してください
  </div>`;
