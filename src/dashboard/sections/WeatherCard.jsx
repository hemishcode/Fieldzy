import { useEffect, useState } from "react";
import { CloudSun, Droplets, Wind, CloudRain, RefreshCw } from "lucide-react";

const LATITUDE = 12.9716;
const LONGITUDE = 77.5946;

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchWeather() {
    setLoading(true);
    setError("");

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}` +
        `&longitude=${LONGITUDE}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m` +
        `&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FKolkata`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather service is temporarily unavailable.");
      }

      const data = await response.json();

      if (!data.current) {
        throw new Error("Weather data is unavailable.");
      }

      setWeather(data);
    } catch {
      setError("Couldn't load weather. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather();
  }, []);

  const current = weather?.current;

  const nextRainChance = (() => {
    if (!weather?.hourly || !current) return null;

    const currentHour = current.time.slice(0, 13);
    const index = weather.hourly.time.findIndex(
      (time) => time.slice(0, 13) === currentHour
    );

    if (index < 0) return null;

    return weather.hourly.precipitation_probability[index];
  })();

  return (
    <section className="weather-card">
      <div className="weather-card-heading">
        <div>
          <span className="weather-eyebrow">FIELD CONDITIONS</span>
          <h3>Weather Today</h3>
          <p>Bengaluru, Karnataka</p>
        </div>
        
<div className="fieldzy-sunrise" aria-label="Sunrise">
  <span className="sunrise-sun">☀</span>
  <span className="sunrise-horizon" />
</div>

        
        
      </div>

      

      {loading && <p role="status">Loading live weather...</p>}

      {error && (
        <div role="alert" className="weather-error">
          <p>{error}</p>
          <button type="button" onClick={fetchWeather}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      {current && !loading && !error && (
        <>
          <div className="weather-temperature">
            <strong>{current.temperature_2m}°C</strong>
            <span>Feels like {current.apparent_temperature}°C</span>
          </div>

          <div className="weather-metrics">
            <div>
              <Droplets size={18} />
              <span>Humidity</span>
              <strong>{current.relative_humidity_2m}%</strong>
            </div>

            <div>
              <Wind size={18} />
              <span>Wind</span>
              <strong>{current.wind_speed_10m} km/h</strong>
            </div>

            <div>
              <CloudRain size={18} />
              <span>Rain chance</span>
              <strong>
                {nextRainChance == null ? "—" : `${nextRainChance}%`}
              </strong>
            </div>
          </div>

          <p className="weather-updated">
            Weather data time: {current.time.replace("T", " ")}
          </p>
        </>
      )}

      <button
        type="button"
        className="weather-refresh"
        onClick={fetchWeather}
        disabled={loading}
      >
        <RefreshCw size={15} />
        Refresh weather
      </button>

      <p className="weather-disclaimer">
        Forecast data supports planning; it does not measure conditions
        inside your field.
      </p>
    </section>
  );
}