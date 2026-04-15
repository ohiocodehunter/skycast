
const API_KEY = "4da1da38abcb4517b0165623261504";
const BASE_URL = "https://api.weatherapi.com/v1/forecast.json";

let currentWeather = null;
let weatherCategory = "clear"; // rain | clear | cold | cloudy
let blinkTimeout = null;
let animationFrameId = null;
let cloudElements = [];
let starElements = [];
let weatherEffectActive = "";

// ─── DOM refs ────────────────────────────────
const app = document.getElementById("app");
const loaderWrap = document.getElementById("loaderWrap");
const errorWrap = document.getElementById("errorWrap");
const errorMsg = document.getElementById("errorMsg");
const weatherContent = document.getElementById("weatherContent");
const searchInput = document.getElementById("searchInput");
const locBtn = document.getElementById("locBtn");
const retryBtn = document.getElementById("retryBtn");

// Bear
const bearSvg = document.getElementById("bearSvg");
const bearMessage = document.getElementById("bearMessage");
const bearBubble = document.getElementById("bearBubble");
const bearSection = document.getElementById("bearSection");
const bearContainer = document.getElementById("bearContainer");
const leftBlink = document.getElementById("leftBlink");
const rightBlink = document.getElementById("rightBlink");
const mouthHappy = document.getElementById("mouthHappy");
const mouthSad = document.getElementById("mouthSad");
const mouthSurprised = document.getElementById("mouthSurprised");
const browsNormal = document.getElementById("browsNormal");
const browsWorried = document.getElementById("browsWorried");
const umbrella = document.getElementById("umbrella");
const scarf = document.getElementById("scarf");
const snowflakes = document.getElementById("snowflakes");
const sunRays = document.getElementById("sunRays");

// Current card
const cityName = document.getElementById("cityName");
const dateTime = document.getElementById("dateTime");
const condIcon = document.getElementById("conditionIcon");
const bigTemp = document.getElementById("bigTemp");
const condText = document.getElementById("conditionText");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const uvIndex = document.getElementById("uvIndex");
const hourlyTrack = document.getElementById("hourlyTrack");
const weeklyList = document.getElementById("weeklyList");
const bgCanvas = document.getElementById("bgCanvas");
const bgGradient = document.getElementById("bgGradient");

// ─────────────────────────────────────────────
// THEME: DAY / NIGHT based on local time
// ─────────────────────────────────────────────
function applyTheme(localtime) {
  let hour;
  if (localtime) {
    // "2024-01-15 14:35"
    hour = parseInt(localtime.split(" ")[1].split(":")[0], 10);
  } else {
    hour = new Date().getHours();
  }
  const isDay = hour >= 6 && hour < 20;
  document.body.classList.toggle("theme-day", isDay);
  document.body.classList.toggle("theme-night", !isDay);
  return isDay;
}

// ─────────────────────────────────────────────
// WEATHER CATEGORY
// ─────────────────────────────────────────────
function getWeatherCategory(code, tempC) {
  // WeatherAPI condition codes
  const rainCodes = [
    1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198,
    1201, 1240, 1243, 1246, 1273, 1276,
  ];
  const snowCodes = [
    1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222,
    1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264, 1279, 1282,
  ];
  const cloudCodes = [1003, 1006, 1009];
  const stormCodes = [1087, 1273, 1276, 1279, 1282];

  if (rainCodes.includes(code) || stormCodes.includes(code)) return "rain";
  if (snowCodes.includes(code) || tempC <= 2) return "cold";
  if (cloudCodes.includes(code)) return "cloudy";
  return "clear";
}

// ─────────────────────────────────────────────
// BEAR EMOTIONS
// ─────────────────────────────────────────────
function setBearEmotion(category) {
  weatherCategory = category;

  // Reset all bear props
  umbrella.style.display = "none";
  scarf.style.display = "none";
  snowflakes.style.display = "none";
  sunRays.style.display = "none";
  mouthHappy.style.display = "none";
  mouthSad.style.display = "none";
  mouthSurprised.style.display = "none";
  browsNormal.style.display = "none";
  browsWorried.style.display = "none";
  bearSection.classList.remove("bear-happy", "bear-cold", "bear-sad");
  bearContainer.style.animation = "";

  const messages = {
    rain: "Looks rainy out there — better grab an umbrella! ☔",
    clear: "Sunny day ahead! Stay cool and enjoy the sunshine ☀️",
    cold: "Brr, it's cold out! Wear something warm before heading out ❄️",
    cloudy: "Calm and cloudy — pretty peaceful weather today 🌤",
  };

  bearMessage.textContent = messages[category] || messages.clear;

  // Animate bubble refresh
  bearBubble.style.animation = "none";
  requestAnimationFrame(() => {
    bearBubble.style.animation =
      "bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";
  });

  switch (category) {
    case "rain":
      umbrella.style.display = "block";
      mouthSad.style.display = "block";
      browsWorried.style.display = "block";
      // Tilt right arm to hold umbrella
      gsap.set("#rightArm", { rotation: -30, transformOrigin: "136px 155px" });
      break;

    case "clear":
      sunRays.style.display = "block";
      mouthHappy.style.display = "block";
      browsNormal.style.display = "block";
      bearSection.classList.add("bear-happy");
      gsap.set("#rightArm", { rotation: 0, transformOrigin: "136px 155px" });
      break;

    case "cold":
      scarf.style.display = "block";
      snowflakes.style.display = "block";
      mouthSurprised.style.display = "block";
      browsWorried.style.display = "block";
      bearSection.classList.add("bear-cold");
      gsap.set("#rightArm", { rotation: 0, transformOrigin: "136px 155px" });
      break;

    case "cloudy":
    default:
      mouthHappy.style.display = "block";
      browsNormal.style.display = "block";
      gsap.set("#rightArm", { rotation: 0, transformOrigin: "136px 155px" });
      break;
  }
}

// ─────────────────────────────────────────────
// BEAR BLINKING
// ─────────────────────────────────────────────
function scheduleBlink() {
  const delay = 2500 + Math.random() * 4000;
  blinkTimeout = setTimeout(() => {
    doBlink();
  }, delay);
}

function doBlink() {
  // Close
  gsap.to([leftBlink, rightBlink], {
    scaleY: 1,
    duration: 0.08,
    ease: "power2.in",
    onComplete: () => {
      // Open
      gsap.to([leftBlink, rightBlink], {
        scaleY: 0,
        duration: 0.12,
        ease: "power2.out",
        onComplete: scheduleBlink,
      });
    },
  });
}

// ─────────────────────────────────────────────
// ANIMATED BACKGROUND EFFECTS
// ─────────────────────────────────────────────

/* --- Rain --- */
let raindrops = [];
function initRain() {
  bgCanvas.style.display = "block";
  const ctx = bgCanvas.getContext("2d");
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;

  raindrops = [];
  for (let i = 0; i < 120; i++) {
    raindrops.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      length: 12 + Math.random() * 20,
      speed: 8 + Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.45,
    });
  }

  function drawRain() {
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    ctx.strokeStyle = "rgba(180,220,255,";
    ctx.lineWidth = 1;
    raindrops.forEach((drop) => {
      ctx.beginPath();
      ctx.globalAlpha = drop.opacity;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 2, drop.y + drop.length);
      ctx.strokeStyle = `rgba(180,220,255,${drop.opacity})`;
      ctx.stroke();
      drop.y += drop.speed;
      drop.x -= 1.5;
      if (drop.y > bgCanvas.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * bgCanvas.width;
      }
    });
    ctx.globalAlpha = 1;
    animationFrameId = requestAnimationFrame(drawRain);
  }
  drawRain();
}

/* --- Stars (night) --- */
function initStars() {
  clearStars();
  if (!document.body.classList.contains("theme-night")) return;
  const count = 80;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const size = 1 + Math.random() * 2.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}vw;
      top:${Math.random() * 60}vh;
      --dur:${2 + Math.random() * 4}s;
      --delay:${Math.random() * 5}s;
      --min-op:${0.2 + Math.random() * 0.4};
    `;
    document.body.appendChild(s);
    starElements.push(s);
  }
}

function clearStars() {
  starElements.forEach((s) => s.remove());
  starElements = [];
}

/* --- Clouds --- */
function initClouds() {
  clearClouds();
  const isNight = document.body.classList.contains("theme-night");
  const layer = document.createElement("div");
  layer.className = "cloud-layer";
  layer.id = "cloudLayer";

  const count = 5;
  for (let i = 0; i < count; i++) {
    const c = document.createElement("div");
    c.className = "cloud";
    const w = 200 + Math.random() * 320;
    const h = w * 0.35;
    c.style.cssText = `
      width:${w}px; height:${h}px;
      top:${5 + Math.random() * 40}%;
      left:${-200 - Math.random() * 400}px;
      --dur:${50 + Math.random() * 80}s;
      animation-delay:-${Math.random() * 80}s;
      background: rgba(255,255,255,${isNight ? 0.04 : 0.14});
    `;
    layer.appendChild(c);
    cloudElements.push(c);
  }
  document.body.appendChild(layer);
}

function clearClouds() {
  const old = document.getElementById("cloudLayer");
  if (old) old.remove();
  cloudElements = [];
}

/* --- Sun glow --- */
function initSunGlow() {
  let g = document.getElementById("sunGlow");
  if (!g) {
    g = document.createElement("div");
    g.id = "sunGlow";
    g.className = "sun-glow";
    document.body.appendChild(g);
  }
}

function removeSunGlow() {
  const g = document.getElementById("sunGlow");
  if (g) g.remove();
}

/* --- Stoop animation --- */
function stopCanvas() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  const ctx = bgCanvas.getContext("2d");
  ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
}

/* --- Apply BG effects by category --- */
function applyWeatherEffects(category, isDay) {
  // Clear previous
  stopCanvas();
  clearClouds();
  removeSunGlow();
  if (weatherEffectActive !== "stars") clearStars();
  weatherEffectActive = category;

  if (!isDay) initStars();

  switch (category) {
    case "rain":
      initRain();
      break;
    case "clear":
      if (isDay) initSunGlow();
      break;
    case "cloudy":
    case "cold":
      initClouds();
      break;
  }
}

// ─────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────
function formatDay(dateStr, isToday) {
  if (isToday) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatHour(timeStr) {
  const [, time] = timeStr.split(" ");
  const [h] = time.split(":");
  const hour = parseInt(h, 10);
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function formatLocalTime(localtime) {
  const [, time] = localtime.split(" ");
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 || 12;
  const date = new Date(localtime.replace(" ", "T"));
  const dayStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return `${dayStr} · ${h12}:${m} ${ampm}`;
}

// ─────────────────────────────────────────────
// RENDER WEATHER DATA
// ─────────────────────────────────────────────
function renderWeather(data) {
  const cur = data.current;
  const loc = data.location;
  const fore = data.forecast.forecastday;

  const isDay = applyTheme(loc.localtime);
  const code = cur.condition.code;
  const tempC = cur.temp_c;
  const cat = getWeatherCategory(code, tempC);

  applyWeatherEffects(cat, isDay);
  setBearEmotion(cat);

  // Current card
  cityName.textContent = `${loc.name}, ${loc.country}`;
  dateTime.textContent = formatLocalTime(loc.localtime);
  condIcon.src = "https:" + cur.condition.icon.replace("64x64", "128x128");
  bigTemp.textContent = `${Math.round(cur.temp_c)}°`;
  condText.textContent = cur.condition.text;
  feelsLike.textContent = `Feels like ${Math.round(cur.feelslike_c)}°C`;
  humidity.textContent = `${cur.humidity}%`;
  windSpeed.textContent = `${Math.round(cur.wind_kph)} km/h`;
  uvIndex.textContent = `UV ${cur.uv}`;

  // Hourly
  const nowHour = parseInt(loc.localtime.split(" ")[1].split(":")[0], 10);
  const todayHours = fore[0].hour;
  const tomorrowHours = fore[1] ? fore[1].hour : [];
  const allHours = [...todayHours, ...tomorrowHours];
  const startIdx = allHours.findIndex((h) => {
    const hH = parseInt(h.time.split(" ")[1].split(":")[0], 10);
    return hH >= nowHour;
  });

  hourlyTrack.innerHTML = "";
  const sliceStart = startIdx >= 0 ? startIdx : 0;
  allHours.slice(sliceStart, sliceStart + 24).forEach((h, i) => {
    const hH = parseInt(h.time.split(" ")[1].split(":")[0], 10);
    const isCurrent = i === 0;
    const card = document.createElement("div");
    card.className = `hour-card${isCurrent ? " current-hour" : ""}`;
    card.innerHTML = `
      <span class="hour-time">${isCurrent ? "Now" : formatHour(h.time)}</span>
      <img class="hour-icon" src="https:${h.condition.icon}" alt="${h.condition.text}" loading="lazy"/>
      <span class="hour-temp">${Math.round(h.temp_c)}°</span>
    `;
    hourlyTrack.appendChild(card);
  });

  // 7-day forecast
  weeklyList.innerHTML = "";
  // Temp range across all days for relative bar
  let absMin = Infinity,
    absMax = -Infinity;
  fore.forEach((d) => {
    if (d.day.mintemp_c < absMin) absMin = d.day.mintemp_c;
    if (d.day.maxtemp_c > absMax) absMax = d.day.maxtemp_c;
  });
  const range = absMax - absMin || 1;

  fore.forEach((d, i) => {
    const isToday = i === 0;
    const barW = Math.round(((d.day.maxtemp_c - absMin) / range) * 100);
    const row = document.createElement("div");
    row.className = `day-row${isToday ? " today" : ""}`;
    row.innerHTML = `
      <span class="day-name">${formatDay(d.date, isToday)}</span>
      <img class="day-icon" src="https:${d.day.condition.icon}" alt="${d.day.condition.text}" loading="lazy"/>
      <span class="day-condition">${d.day.condition.text}</span>
      <div class="day-bar-wrap"><div class="day-bar-fill" style="width:${barW}%"></div></div>
      <div class="day-temps">
        <span class="day-hi">${Math.round(d.day.maxtemp_c)}°</span>
        <span class="day-lo">${Math.round(d.day.mintemp_c)}°</span>
      </div>
    `;
    weeklyList.appendChild(row);
  });

  showWeather();
}

// ─────────────────────────────────────────────
// UI STATE HELPERS
// ─────────────────────────────────────────────
function showLoader() {
  loaderWrap.style.display = "flex";
  errorWrap.style.display = "none";
  weatherContent.style.display = "none";
}

function showError(msg) {
  loaderWrap.style.display = "none";
  errorWrap.style.display = "flex";
  weatherContent.style.display = "none";
  errorMsg.textContent = msg;
}

function showWeather() {
  loaderWrap.style.display = "none";
  errorWrap.style.display = "none";
  weatherContent.style.display = "block";

  // GSAP entrance
  const kids = weatherContent.children;
  gsap.fromTo(
    kids,
    { y: 30, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.1,
      ease: "power3.out",
      clearProps: "all",
    },
  );
}

// ─────────────────────────────────────────────
// API FETCH
// ─────────────────────────────────────────────
async function fetchWeather(query) {
  showLoader();
  try {
    const url = `${BASE_URL}?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=no&alerts=no`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Weather data unavailable.");
    }
    const data = await res.json();
    currentWeather = data;
    renderWeather(data);
  } catch (e) {
    console.error(e);
    if (e.message.includes("API key") || API_KEY === "YOUR_API_KEY_HERE") {
      showError(
        "Please add your WeatherAPI key in script.js to enable live weather.",
      );
    } else {
      showError(e.message || "Unable to fetch weather. Check your connection.");
    }
  }
}

// ─────────────────────────────────────────────
// GEOLOCATION
// ─────────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) {
    fetchWeather("London");
    return;
  }
  showLoader();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      fetchWeather(`${lat},${lon}`);
    },
    () => {
      fetchWeather("London");
    },
    { timeout: 8000 },
  );
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && searchInput.value.trim()) {
    fetchWeather(searchInput.value.trim());
    searchInput.blur();
  }
});

locBtn.addEventListener("click", () => {
  searchInput.value = "";
  getLocation();
});

retryBtn.addEventListener("click", () => {
  if (currentWeather) {
    renderWeather(currentWeather);
  } else {
    getLocation();
  }
});

// Resize canvas
window.addEventListener("resize", () => {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
});

// ─────────────────────────────────────────────
// GSAP ENTRY ANIMATION
// ─────────────────────────────────────────────
gsap.from("#searchWrap", {
  y: -30,
  opacity: 0,
  duration: 0.7,
  ease: "power3.out",
  delay: 0.1,
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
(function init() {
  // Apply theme immediately from local clock
  applyTheme(null);
  initStars(); // night stars if applicable
  scheduleBlink();
  getLocation();
})();
