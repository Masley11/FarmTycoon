import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export function RevenueChart({ history }) {
  const data = (history || []).filter(Boolean).map((h) => ({
    day: `J${h?.day ?? "—"}`,
    revenu: h?.revenue ?? 0,
    dépenses: h?.expenses ?? 0,
    trésorerie: h?.cash ?? 0,
  }));

  if (data.length === 0) {
    // Seed empty
    for (let i = 0; i < 7; i++) data.push({ day: `J${i + 1}`, revenu: 0, dépenses: 0, trésorerie: 0 });
  }

  return (
    <div data-testid="revenue-chart" className="solid-card p-6 h-full min-h-[360px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="ft-label">Analytics financiers</span>
          <h3 className="font-display text-lg font-semibold tracking-tight text-stone-900 mt-1">
            Flux de trésorerie (14 derniers jours)
          </h3>
        </div>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 84% 25%)" stopOpacity={0.32} />
                <stop offset="95%" stopColor="hsl(160 84% 25%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(47 90% 50%)" stopOpacity={0.32} />
                <stop offset="95%" stopColor="hsl(47 90% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(27 87% 47%)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="hsl(27 87% 47%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 6% 90%)" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(25 5% 45%)" tick={{ fontSize: 11 }} />
            <YAxis stroke="hsl(25 5% 45%)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid hsl(20 6% 90%)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="trésorerie" stroke="hsl(160 84% 25%)" strokeWidth={2} fill="url(#colorCash)" />
            <Area type="monotone" dataKey="revenu" stroke="hsl(47 90% 35%)" strokeWidth={2} fill="url(#colorRev)" />
            <Area type="monotone" dataKey="dépenses" stroke="hsl(27 87% 47%)" strokeWidth={2} fill="url(#colorExp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
