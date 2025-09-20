import { Pie } from "react-chartjs-2";
import { useEffect, useState } from "react";
import InfoTooltip from "./InfoTooltip";

/**
 * PieChart component displays a pie chart with correct and incorrect answers.
 * It uses the Chart.js library to render the chart and is responsive to dark mode changes.
 * @param props - The props for the PieChart component.
 * @param {string} props.title - The title of the chart.
 * @param {number} props.correct - The number of correct answers.
 * @param {number} props.incorrect - The number of incorrect answers.
 * @returns {JSX.Element} - The rendered PieChart component.
 */
export const PieChart = ({
  title = "Correct vs Incorrect Decisions",
  correct,
  incorrect,
}: {
  title?: string;
  correct: number;
  incorrect: number;
}) => {
  const [textColor, setTextColor] = useState("#000000");

  const correctPercentage = (correct / (correct + incorrect)) * 100;

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
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: textColor,
        },
      },
    },
  };
  return (
    <div className="card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-[#50B498]">{title}</h2>
        <InfoTooltip>
          <div className="space-y-2">
            <p className="text-sm">
              This pie chart illustrates the accuracy of accepted code
              suggestions. It shows the percentage of suggestions that were
              correct versus those that contained issues or bugs.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-[#50B498]">Correct</span>:{" "}
              {correct} decisions ({correctPercentage.toFixed(1)}%)
              <br />
              <span className="font-medium text-[#F59E0B]">
                Incorrect
              </span>: {incorrect} decisions (
              {(100 - correctPercentage).toFixed(1)}%)
            </p>
          </div>
        </InfoTooltip>
      </div>
      <div className="relative w-full h-60 md:h-64 lg:h-72">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
};

export default PieChart;
