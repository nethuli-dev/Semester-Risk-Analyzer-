import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CATEGORICAL_COLORS, colorForIndex } from '../../theme/categoricalColors';

// Query results are arbitrary Mongo aggregation output — there's no fixed
// schema to read axes from, so this picks a reasonable label/value pair
// heuristically: the first numeric field becomes the value axis, the
// first other field becomes the label.
function pickAxes(row) {
  const keys = Object.keys(row);
  const valueKey = keys.find((k) => typeof row[k] === 'number') ?? keys[0];
  const labelKey = keys.find((k) => k !== valueKey) ?? keys[0];
  return { labelKey, valueKey };
}

function formatLabel(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ChartDisplay({ chartConfig, typeOverride }) {
  const { data } = chartConfig ?? {};
  const type = typeOverride ?? chartConfig?.type;

  if (!type || type === 'none' || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const { labelKey, valueKey } = pickAxes(data[0]);
  const chartData = data.map((row) => ({ ...row, __label: formatLabel(row[labelKey]) }));
  const wrap = (chart) => (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );

  if (type === 'bar') {
    return wrap(
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="#e1e0d9" strokeDasharray="3 3" />
        <XAxis dataKey="__label" tick={{ fill: '#898781', fontSize: 12 }} />
        <YAxis tick={{ fill: '#898781', fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey={valueKey} fill={CATEGORICAL_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  }

  if (type === 'line') {
    return wrap(
      <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="#e1e0d9" strokeDasharray="3 3" />
        <XAxis dataKey="__label" tick={{ fill: '#898781', fontSize: 12 }} />
        <YAxis tick={{ fill: '#898781', fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey={valueKey} stroke={CATEGORICAL_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    );
  }

  if (type === 'scatter') {
    const numericKeys = Object.keys(data[0]).filter((k) => typeof data[0][k] === 'number');
    if (numericKeys.length < 2) return null;
    const [xKey, yKey] = numericKeys;
    return wrap(
      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="#e1e0d9" strokeDasharray="3 3" />
        <XAxis type="number" dataKey={xKey} name={xKey} tick={{ fill: '#898781', fontSize: 12 }} />
        <YAxis type="number" dataKey={yKey} name={yKey} tick={{ fill: '#898781', fontSize: 12 }} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill={CATEGORICAL_COLORS[0]} />
      </ScatterChart>
    );
  }

  if (type === 'donut') {
    return wrap(
      <PieChart>
        <Pie data={chartData} dataKey={valueKey} nameKey="__label" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={colorForIndex(index)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  }

  return null;
}
