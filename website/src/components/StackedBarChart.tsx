import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { UserActivityLogItem } from "../api/types/user";
import { parseISODate } from "../utils/timeConverter";
import TimeIntervalDropDown from "./TimeIntervalDropDown";
import InfoTooltip from "./InfoTooltip";

/**
 * StackedBarChart component displays a stacked bar chart of user activity log items.
 * It shows the number of correct and incorrect suggestions over time, grouped by day, week, or month.
 * @param props - The props for the StackedBarChart component.
 * @param {string?} props.title - The title of the chart.
 * @param {UserActivityLogItem[]} props.activities - The user activity log items to be displayed in the chart.
 * @returns
 */
export const StackedBarChart = ({
  title = "Correct vs Incorrect Over Time",
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

  const groupBy = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (interval === "day") return date.toISOString().split("T")[0];
    if (interval === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(day - date.getDay()); // Sunday
      return weekStart.toISOString().split("T")[0];
    }
    if (interval === "month")
      return `${year}-${String(month + 1).padStart(2, "0")}`;
    return "";
  };

  const dateMap: Record<string, { correct: number; incorrect: number }> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const key = groupBy(date);

    if (!dateMap[key]) {
      dateMap[key] = { correct: 0, incorrect: 0 };
    }

    const isCorrectCase1 =
      activity.event === "USER_ACCEPT" && !activity.metadata.hasBug;
    const isCorrectCase2 =
      activity.event === "USER_REJECT" && activity.metadata.hasBug;
    const isIncorrectCase1 =
      activity.event === "USER_ACCEPT" && activity.metadata.hasBug;
    const isIncorrectCase2 =
      activity.event === "USER_REJECT" && !activity.metadata.hasBug;

    if (isCorrectCase1 || isCorrectCase2) {
      dateMap[key].correct += 1;
    } else if (isIncorrectCase1 || isIncorrectCase2) {
      dateMap[key].incorrect += 1;
    }
  });

  const getLabelRange = () => {
    const range: string[] = [];
    const lastDate = new Date();

    if (interval === "day") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(lastDate);
        date.setDate(lastDate.getDate() - i);
        range.push(groupBy(date));
      }
    }

    if (interval === "week") {
      const lastSunday = new Date(lastDate);
      lastSunday.setDate(lastDate.getDate() - lastDate.getDay());

      for (let i = 6; i >= 0; i--) {
        const date = new Date(lastSunday);
        date.setDate(lastSunday.getDate() - i * 7);
        range.push(groupBy(date));
      }
    }

    if (interval === "month") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(lastDate);
        date.setMonth(lastDate.getMonth() - i);
        range.push(groupBy(date));
      }
    }

    return range;
  };

  const labels = getLabelRange();

  const correctData = labels.map((key) => dateMap[key]?.correct || 0);
  const incorrectData = labels.map((key) => dateMap[key]?.incorrect || 0);

  const data = {
    labels,
    datasets: [
      {
        label: "Correct",
        data: correctData,
        backgroundColor: "#50B498",
      },
      {
        label: "Incorrect",
        data: incorrectData,
        backgroundColor: "#F59E0B",
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        labels: {
          color: textColor,
        },
      },
      title: {
        display: true,
        text: "Correct vs Incorrect Suggestions",
        color: textColor,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
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
        grid: {
          color: gridColor,
        },
      },
      y: {
        beginAtZero: true,
        stacked: true,
        ticks: {
          color: textColor,
          precision: 0,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };

  return (
    <div className="card rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#50B498]">{title}</h2>
          <InfoTooltip>
            <div className="space-y-2">
              <p className="text-sm">
                This stacked bar chart visualizes the number of{" "}
                <span className="font-semibold text-[#50B498]">correct</span>{" "}
                and{" "}
                <span className="font-semibold text-[#F59E0B]">incorrect</span>{" "}
                code decisions over time. It counts each instance where a
                suggestion was accepted or rejected, and whether that decision
                was accurate or not.
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
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default StackedBarChart;
