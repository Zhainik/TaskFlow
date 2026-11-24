const cityForm = document.getElementById('cityForm');
const cityInput = document.getElementById('cityInput');
const statusMessage = document.getElementById('statusMessage');
const weatherContent = document.getElementById('weatherContent');

const WMO_CODES = {
  0: { text: 'Ясно', icon: '☀️' },
  1: { text: 'Преимущественно ясно', icon: '🌤️' },
  2: { text: 'Переменная облачность', icon: '⛅' },
  3: { text: 'Пасмурно', icon: '☁️' },
  45: { text: 'Туман', icon: '🌫️' },
  48: { text: 'Изморозь', icon: '🌫️' },
  51: { text: 'Лёгкая морось', icon: '🌦️' },
  61: { text: 'Небольшой дождь', icon: '🌧️' },
  63: { text: 'Умеренный дождь', icon: '🌧️' },
  65: { text: 'Сильный дождь', icon: '⛈️' },
  71: { text: 'Небольшой снег', icon: '🌨️' },
  73: { text: 'Снегопад', icon: '❄️' },
  75: { text: 'Сильный снегопад', icon: '❄️' },
  95: { text: 'Гроза', icon: '⛈️' }
};

function decodeWeather(code) {
  return WMO_CODES[code] || { text: 'Облачно', icon: '⛅' };
}

function showStatus(text) {
  statusMessage.textContent = text;
  statusMessage.hidden = false;
}

function hideStatus() {
  statusMessage.hidden = true;
}

async function fetchWeatherByCity(cityName) {
  showStatus('Загрузка данных о погоде...');
  weatherContent.hidden = true;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName
    )}&count=1&language=ru&format=json`;

    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error('Ошибка геокодинга');
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showStatus(`Город «${cityName}» не найден. Попробуйте уточнить название.`);
      return;
    }

    const place = geoData.results[0];
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=auto&forecast_days=5`;

    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error('Ошибка получения прогноза');
    const weatherData = await weatherRes.json();

    renderWeather(place, weatherData);
    hideStatus();
    weatherContent.hidden = false;
  } catch (err) {
    showStatus('Не удалось загрузить погоду. Проверьте подключение к интернету.');
  }
}

function renderWeather(place, data) {
  const current = data.current;
  const info = decodeWeather(current.weather_code);

  const country = place.country ? `, ${place.country}` : '';
  document.getElementById('locationName').textContent = `${place.name}${country}`;
  document.getElementById('currentTemp').textContent = `${Math.round(current.temperature_2m)}°`;
  document.getElementById('currentIcon').textContent = info.icon;
  document.getElementById('weatherDesc').textContent = info.text;
  document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°`;
  document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('windSpeed').textContent = `${current.wind_speed_10m} м/с`;

  const grid = document.getElementById('forecastGrid');
  grid.innerHTML = '';

  data.daily.time.forEach((dateStr, idx) => {
    const dateObj = new Date(dateStr);
    const dayLabel = dateObj.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    const dayInfo = decodeWeather(data.daily.weather_code[idx]);
    const maxT = Math.round(data.daily.temperature_2m_max[idx]);
    const minT = Math.round(data.daily.temperature_2m_min[idx]);

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-name">${dayLabel}</div>
      <div class="day-icon">${dayInfo.icon}</div>
      <div class="day-temps">${maxT}° <span>/ ${minT}°</span></div>
    `;
    grid.appendChild(card);
  });
}

cityForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) fetchWeatherByCity(city);
});

document.getElementById('quickCities').addEventListener('click', (e) => {
  if (e.target.dataset.city) {
    cityInput.value = e.target.dataset.city;
    fetchWeatherByCity(e.target.dataset.city);
  }
});

fetchWeatherByCity('Уральск');
