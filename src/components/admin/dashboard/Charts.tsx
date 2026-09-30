"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatToman } from "@/lib/money";
import { toPersianDigits } from "@/lib/utils";

/** رنگ‌های نمودار دایره‌ای (کنتراست کافی روی زمینه‌ی سفید) */
const PIE_COLORS = [
  "#15803d",
  "#b45309",
  "#1d4ed8",
  "#be123c",
  "#7c3aed",
  "#0f766e",
  "#4b5563",
];

/** محور فشرده: ۱٫۲ میلیون ⇒ «۱.۲م»، ۳۵۰ هزار ⇒ «۳۵۰ه» */
function compactToman(value: number): string {
  if (value >= 1_000_000) {
    return `${toPersianDigits(Number((value / 1_000_000).toFixed(1)))}م`;
  }
  if (value >= 1_000) return `${toPersianDigits(Math.round(value / 1_000))}ه`;
  return toPersianDigits(value);
}

export function SalesLineChart({
  data,
}: {
  data: { label: string; sales: number; orders: number }[];
}) {
  return (
    // نمودار چپ‌به‌راست رسم می‌شود (زمان از چپ به راست)
    <div dir="ltr" className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
          <YAxis
            tickFormatter={compactToman}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <Tooltip
            formatter={(value) => [
              `${formatToman(Number(value))} تومان`,
              "فروش",
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#15803d"
            strokeWidth={2}
            dot={data.length <= 31}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPieChart({
  data,
}: {
  data: { name: string; total: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            innerRadius="45%"
            outerRadius="80%"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatToman(Number(value))} تومان`,
              String(name),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            // در RTL متن سمت چپ مربع رنگی است؛ فاصله باید سمت راست متن باشد
            formatter={(value) => (
              <span style={{ marginRight: 6, color: "#404040" }}>
                {String(value)}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
