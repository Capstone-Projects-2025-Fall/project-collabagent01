import { useEffect, useState } from "react";
import { AIStats } from "../api/types/suggestion";
import { ChartOptions } from "chart.js";
import DatePicker from "react-datepicker";
import { Line } from "react-chartjs-2";

/**
 * AIStatGraph component
 * Only available in the developer dashboard.
 * @param {aiStats[]} The AI statistics data to be displayed in the graph.
 * @returns {JSX.Element} - The AIStatGraph component.
 */
export const AIStatGraph = ({
  aiStats,
}: {
  aiStats: AIStats[] | undefined;
}) => {
  const [textColor, setTextColor] = useState("#000000");
  const [gridColor, setGridColor] = useState("rgba(0,0,0,0.1)");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setTextColor(isDarkMode ? "#FFFFFF" : "#000000");
      setGridColor(isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)");
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const groupedStats = new Map<string, number>();

  aiStats?.forEach((stat) => {
    const dateObj = new Date(stat.created_at);
    const dateStr = dateObj.toISOString().split("T")[0];
    groupedStats.set(
      dateStr,
      (groupedStats.get(dateStr) ?? 0) + stat.total_tokens
    );
  });

  let firstDate = startDate;
  let lastDate = endDate;

  if (!firstDate || !lastDate) {
    const dates = aiStats
      ?.map((s) => new Date(s.created_at))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!firstDate && dates?.[0]) firstDate = dates[0];
    if (!lastDate && dates?.[dates.length - 1])
      lastDate = dates[dates.length - 1];
  }

  const allDates: string[] = [];
  if (firstDate && lastDate) {
    const curr = new Date(firstDate);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(lastDate);
    end.setHours(0, 0, 0, 0);

    while (curr <= end) {
      allDates.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
  }

  const sortedDates = allDates;
  const tokensByDate = sortedDates.map((date) => groupedStats.get(date) ?? 0);

  const chartData = {
    labels: sortedDates,
    datasets: [
      {
        label: "Total Tokens Used",
        data: tokensByDate,
        borderColor: "#50B498",
        backgroundColor: "rgba(80, 180, 152, 0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
  };

  return (
    <div className="w-full h-auto bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-4 pb-12">
      {/* Header with responsive flex layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 px-2">
        <h2 className="text-lg font-semibold">AI Stats</h2>

        {/* Date pickers with responsive layout */}
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-4 items-start xs:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap w-12">
              From:
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              className="dark:bg-black border text-sm w-full min-w-[120px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap w-12">
              To:
            </label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              className="dark:bg-black border text-sm w-full min-w-[120px]"
            />
          </div>
        </div>
      </div>

      {/* Responsive chart container */}
      <div
        className="relative w-full"
        style={{ height: "clamp(200px, 30vh, 400px)" }}
      >
        <Line
          data={chartData}
          options={{
            ...chartOptions,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              ...chartOptions.plugins,
              legend: {
                ...chartOptions.plugins?.legend,
                position: "bottom",
              },
            },
          }}
        />
      </div>
    </div>
  );
};
