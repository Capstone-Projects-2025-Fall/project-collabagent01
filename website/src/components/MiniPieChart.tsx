import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";

/**
 * MiniPieChart component displays a small pie chart with correct and incorrect answers.
 * @param {number} correct - The number of correct answers.
 * @param {number} incorrect - The number of incorrect answers.
 * @returns {JSX.Element} - A mini pie chart component.
 **/
export const MiniPieChart = ({
  correct,
  incorrect,
}: {
  correct: number;
  incorrect: number;
}) => {
  const [textColor, setTextColor] = useState("#000000");
  const total = correct + incorrect;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setTextColor(isDarkMode ? "#FFFFFF" : "#000000");
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const data = {
    labels: ["Correct", "Incorrect"],
    datasets: [
      {
        data: [correct, incorrect],
        backgroundColor: ["#50B498", "#F59E0B"],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    cutout: "80%",
    responsive: true,
    plugins: {
      legend: {
        display: false, // Hide legend
      },
      datalabels: {
        display: true,
        color: textColor,
        font: {
          size: 10,
          weight: "bold",
        },
      },
    },
  };

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <Pie data={data} options={options} />
      {total === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs">
          N/A
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color: textColor }}
        >
          {percentage}%
        </div>
      )}
    </div>
  );
};

export default MiniPieChart;
