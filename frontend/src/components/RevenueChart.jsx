import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function RevenueChart({ data }) {
  const chartData = data.map((item) => ({
    ...item,
    day: new Date(item.date).toLocaleDateString(
      "en-IN",
      {
          day: "numeric",
          month: "short",
      }
    ),
  }));

  return (
    <div className="revenue-chart">
      <ResponsiveContainer
        width="100%"
        height={320}
      >
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="day" />

          <YAxis />

          <Tooltip
            formatter={(value) => [
              `₹${value}`,
              "Revenue",
            ]}
          />

          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#e67e22"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueChart;