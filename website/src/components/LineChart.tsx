import { useState, useEffect } from "react";
import { UserActivityLogItem } from "../api/types/user";
import { Line } from "react-chartjs-2";
import TimeIntervalDropDown from "./TimeIntervalDropDown";
import { parseISODate } from "../utils/timeConverter";
import InfoTooltip from "./InfoTooltip";

/**
 * LineChart component displays a line chart of user activity over time.
 * @param {string} title - The title of the chart.
 * @param {Array} activities - An array of user activity log items.
 * @returns {JSX.Element} - A line chart component.
 **/
export const LineChart = ({
  title = "Decision Over Time",
  activities,
}: {
  title?: string;
  activities: UserActivityLogItem[];
}) => {
  const [interval, setInterval] = useState<"day" | "week" | "month">("day");
  const [textColor, setTextColor] = useState("#000000");
  const [gridColor, setGridColor] = useState("rgba(255,255,255,0.1)");

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

  const groupBy = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    if (interval === "day") return date.toISOString().split("T")[0];
    if (interval === "week") {
      const firstDay = new Date(date);
      firstDay.setDate(date.getDate() - date.getDay());

      const year = firstDay.getFullYear();
      const month = String(firstDay.getMonth() + 1).padStart(2, "0");
      const day = String(firstDay.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }
    if (interval === "month")
      return `${year}-${String(month + 1).padStart(2, "0")}`;
  };

  const acceptedMap: Record<string, number> = {};
  const rejectedMap: Record<string, number> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const key = groupBy(date);
    if (key) {
      if (activity.event === "USER_ACCEPT") {
        acceptedMap[key] = (acceptedMap[key] || 0) + 1;
      } else if (activity.event === "USER_REJECT") {
        rejectedMap[key] = (rejectedMap[key] || 0) + 1;
      }
    }
  });

  const getLabelRange = () => {
    const range: string[] = [];
    const today = new Date();

    if (interval === "day") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        range.push(groupBy(date)!);
      }
    }

    if (interval === "week") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i * 7);
        range.push(groupBy(date)!);
      }
    }

    if (interval === "month") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        range.push(groupBy(date)!);
      }
    }

    return range;
  };

  const labels = getLabelRange();
  const acceptedValues = labels.map((key) => acceptedMap[key] || 0);
  const rejectedValues = labels.map((key) => rejectedMap[key] || 0);

  return (
    <div className="card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#50B498]">{title}</h2>
          <InfoTooltip>
            <div className="space-y-2">
              <p className="text-sm">
                This line chart shows how many code suggestions users{" "}
                <span className="font-semibold text-[#50B498]">accepted</span>{" "}
                or{" "}
                <span className="font-semibold text-[#F59E0B]">rejected</span>{" "}
                over time.
              </p>
              <p className="text-xs text-muted-foreground">
                Time range can be adjusted (daily/weekly/monthly)
              </p>
            </div>
          </InfoTooltip>
        </div>
        <TimeIntervalDropDown value={interval} onChange={setInterval} />
      </div>
      <div className="relative w-full h-60 md:h-64 lg:h-72">
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Accepted Suggestions",
                data: acceptedValues,
                borderColor: "#50B498",
                backgroundColor: "#50B498",
                borderWidth: 2,
                tension: 0.3,
                fill: false,
                pointBackgroundColor: "#50B498",
                pointBorderColor: "#FFFFFF",
                pointBorderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
              {
                label: "Rejected Suggestions",
                data: rejectedValues,
                borderColor: "#F59E0B",
                backgroundColor: "#F59E0B",
                borderWidth: 2,
                tension: 0.3,
                fill: false,
                pointBackgroundColor: "#F59E0B",
                pointBorderColor: "#FFFFFF",
                pointBorderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
            ],
          }}
          options={{
            plugins: {
              legend: {
                labels: { color: textColor },
              },
              title: {
                display: true,
                text: "User Activity",
                color: textColor,
              },
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                ticks: {
                  color: textColor,
                  callback: function (value: unknown) {
                    const label = labels[value as number];
                    const date = parseISODate(label + "T00:00:00");

                    if (interval === "month")
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      });
                    if (interval === "week")
                      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  },
                },
                grid: { color: gridColor },
              },
              y: {
                beginAtZero: true,
                ticks: { color: textColor, precision: 0 },
                grid: { color: gridColor },
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default LineChart;
