/**
 * A dropdown component for selecting a time interval (day, week, month).
 * This component is used to allow users to select a time interval for data visualization or reporting.
 * @param param0 - The component props
 * @param param0.value - The current value of the dropdown
 * @param param0.onChange - The function to call when the value changes
 * @returns A dropdown component for selecting a time interval
 */
export const TimeIntervalDropDown = ({
  value,
  onChange,
}: {
  value: "day" | "week" | "month";
  onChange: (newInterval: "day" | "week" | "month") => void;
}) => {
  return (
    <div className="border-b border-gray-300 dark:border-gray-500 rounded-lg">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "day" | "week" | "month")}
        className="card text-text rounded 
                   px-2 py-1 text-xs
                   sm:px-3 sm:py-1.5 sm:text-sm
                   md:px-4 md:py-2 md:text-base"
      >
        <option value="day">Daily</option>
        <option value="week">Weekly</option>
        <option value="month">Monthly</option>
      </select>
    </div>
  );
};

export default TimeIntervalDropDown;
