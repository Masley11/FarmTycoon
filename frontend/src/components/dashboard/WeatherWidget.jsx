import { Sun, Cloud, CloudRain, Zap, ThermometerSun, Wind, Droplets } from "lucide-react";

const WEATHER_VIS = {
  sunny: { icon: Sun, label: "Ensoleillé", color: "text-amber-600", bg: "from-amber-50 to-white" },
  cloudy: { icon: Cloud, label: "Nuageux", color: "text-stone-500", bg: "from-stone-100 to-white" },
  rainy: { icon: CloudRain, label: "Pluie", color: "text-blue-600", bg: "from-blue-50 to-white" },
  storm: { icon: Zap, label: "Tempête", color: "text-violet-700", bg: "from-stone-100 to-white" },
  drought: { icon: ThermometerSun, label: "Sécheresse", color: "text-orange-700", bg: "from-orange-50 to-white" },
};

export function WeatherWidget({ weather }) {
  if (!weather) return null;
  const vis = WEATHER_VIS[weather.condition] || WEATHER_VIS.sunny;
  const Icon = vis.icon;

  return (
    <div
      data-testid="weather-widget"
      className={`solid-card p-6 bg-gradient-to-br ${vis.bg} overflow-hidden relative`}
    >
      <div className="absolute -right-6 -top-6 opacity-10">
        <Icon className="h-32 w-32" strokeWidth={1} />
      </div>
      <div className="relative">
        <span className="ft-label">Météo du jour</span>
        <div className="mt-4 flex items-center gap-4">
          <Icon className={`h-12 w-12 ${vis.color}`} strokeWidth={1.5} />
          <div>
            <div className="font-display text-3xl font-semibold text-stone-900 leading-none">
              {weather.temperature_c}°C
            </div>
            <div className="text-sm text-stone-600 mt-1">{vis.label}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-stone-200/60">
          <div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[10px] uppercase tracking-wide">
              <Droplets className="h-3 w-3" strokeWidth={1.7} />
              Humidité
            </div>
            <div className="text-sm font-semibold text-stone-900 mt-1">{weather.humidity}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[10px] uppercase tracking-wide">
              <Wind className="h-3 w-3" strokeWidth={1.7} />
              Vent
            </div>
            <div className="text-sm font-semibold text-stone-900 mt-1">{weather.wind_kmh} km/h</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[10px] uppercase tracking-wide">
              <ThermometerSun className="h-3 w-3" strokeWidth={1.7} />
              Sécheresse
            </div>
            <div className="text-sm font-semibold text-stone-900 mt-1">
              {Math.round((weather.drought_index || 0) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
