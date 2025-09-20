import { Bar } from "react-chartjs-2";
import { AISuggestion } from "../api/types/suggestion";
import { useEffect, useState } from "react";

/**
 * BarChart component displays a bar chart of user activity over time.
 * It aggregates user activity data and visualizes it using Chart.js.
 * @param {Object} props - The component props.
 * @param {AISuggestion[]} props.activities - The user activity data to be displayed in the chart.
 * @return {JSX.Element} - A React component that renders a bar chart of user activity.
 **/
export const BarChart = ({ activities }: { activities: AISuggestion[] }) => {
  // Aggregate user activity per day
  const activityMap: Record<string, number> = {};

  const [textColor, setTextColor] = useState("#000000"); // Default to black

  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setTextColor(isDarkMode ? "#FFFFFF" : "#000000");
    };

    checkDarkMode(); // Run on mount

    // Optional: Listen for class changes (if you dynamically toggle dark mode)
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  activities.forEach((activity) => {
    const date = new Date(activity.created_at).toISOString().split("T")[0]; // Extract YYYY-MM-DD
    activityMap[date] = (activityMap[date] || 0) + 1;
  });

  // Convert object to sorted array
  const dataPoints = Object.entries(activityMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date

  const getRandomColor = () =>
    `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;

  const labels = dataPoints.map((entry) => entry.date);
  const values = dataPoints.map((entry) => entry.count);
  const colors = labels.map(() => getRandomColor());

  return (
    <div className="relative w-full h-80 md:h-64 lg:h-65">
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderColor: colors.map((color) => color.replace("0.6", "1")),
              borderWidth: 1,
            },
          ],
        }}
        options={{
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: "User Activity Over Time",
              color: textColor,
            },
          },
          maintainAspectRatio: false,
          responsive: true,
          scales: {
            x: {
              ticks: {
                color: textColor,
              },
              grid: {
                color: textColor,
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: textColor,
              },
              grid: {
                color: textColor,
              },
            },
          },
        }}
      />
    </div>
  );
};
export default BarChart;
