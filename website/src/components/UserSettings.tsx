import { useState, useEffect, useMemo } from "react";
import { saveUserSettings } from "../api/user";
import { UserData, UserSettings as UserSettingsType } from "../api/types/user";

type UserSettingsProps = {
  user: UserData | UserData[] | null;
};

const defaultSettings: UserSettingsType = {
  bug_percentage: 50,
  give_suggestions: false,
  show_notifications: false,
  enable_quiz: true,
  active_threshold: 20,
  suspend_threshold: 30,
  pass_rate: 80,
  suspend_rate: 50,
};

/**
 * UserSettings component allows users to view and modify their settings.
 * It supports both single user and bulk user settings.
 *
 * @param {UserData | UserData[] | null} user - The user data or an array of user data.
 * @returns {JSX.Element} The rendered component.
 */
export const UserSettings: React.FC<UserSettingsProps> = ({ user }) => {
  const isMulti = Array.isArray(user);
  const initialSettings: UserSettingsType = useMemo(() => {
    if (!user) return defaultSettings;
    if (isMulti) return defaultSettings;
    return user.settings ?? defaultSettings;
  }, [user, isMulti]);

  const [bugPercentage, setBugPercentage] = useState(
    initialSettings.bug_percentage
  );
  const [giveSuggestions, setGiveSuggestions] = useState(
    initialSettings.give_suggestions
  );
  const [showNotifications, setShowNotifications] = useState(
    initialSettings.show_notifications
  );
  const [enableQuiz, setEnableQuiz] = useState(initialSettings.enable_quiz);
  const [active_threshold, setActiveThreshold] = useState(
    initialSettings.active_threshold
  );
  const [suspend_threshold, setSuspendThreshold] = useState(
    initialSettings.suspend_threshold
  );
  const [pass_rate, setPassRate] = useState(initialSettings.pass_rate);
  const [suspend_rate, setSuspendRate] = useState(initialSettings.suspend_rate);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    setBugPercentage(initialSettings.bug_percentage);
    setGiveSuggestions(initialSettings.give_suggestions);
    setShowNotifications(initialSettings.show_notifications);
    setEnableQuiz(initialSettings.enable_quiz);
    setActiveThreshold(initialSettings.active_threshold);
    setSuspendThreshold(initialSettings.suspend_threshold);
    setPassRate(initialSettings.pass_rate);
    setSuspendRate(initialSettings.suspend_rate);
  }, [initialSettings]);

  const handleSave = async () => {
    setStatus("saving");

    const settings: UserSettingsType = {
      bug_percentage: bugPercentage,
      show_notifications: showNotifications,
      give_suggestions: giveSuggestions,
      enable_quiz: enableQuiz,
      active_threshold,
      suspend_threshold,
      pass_rate,
      suspend_rate,
    };

    try {
      if (!user) {
        setStatus("error");
        return;
      }

      const users = isMulti ? user : [user];
      const results = await Promise.all(
        users.map((u) =>
          saveUserSettings({
            user_id: u.id,
            settings,
          })
        )
      );

      const allSuccessful = results.every((r) => r === true);
      setStatus(allSuccessful ? "saved" : "error");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div>
      <h2 className="text-md font-semibold text-[#50B498] mb-4">
        {isMulti ? "Bulk User Settings" : "User Settings"}
      </h2>

      {/* Bug Percentage Slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text mb-1">
          Bug Threshold Percentage:
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            value={bugPercentage}
            onChange={(e) => setBugPercentage(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            style={{ accentColor: "#50B498" }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={bugPercentage}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 0 && value <= 100) {
                setBugPercentage(value);
              }
            }}
            className="w-16 px-2 py-1 border border-black dark:border-white card text-center"
          />
          <span className="text-[#50B498] font-semibold">%</span>
        </div>
      </div>

      <ToggleInput
        label="Show Notifications"
        value={showNotifications}
        onChange={setShowNotifications}
      />
      <ToggleInput
        label="Enable AI Suggestions"
        value={giveSuggestions}
        onChange={setGiveSuggestions}
      />
      <ToggleInput
        label="Enable Quiz"
        value={enableQuiz}
        onChange={setEnableQuiz}
      />
      <NumberInput
        label="Active Threshold"
        value={active_threshold}
        onChange={setActiveThreshold}
      />
      <NumberInput
        label="Suspend Threshold"
        value={suspend_threshold}
        onChange={setSuspendThreshold}
      />
      <NumberInput label="Pass Rate" value={pass_rate} onChange={setPassRate} />
      <NumberInput
        label="Suspend Rate"
        value={suspend_rate}
        onChange={setSuspendRate}
      />

      {/* Save Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          className="bg-[#50B498] hover:bg-[#3a9b80] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Save
        </button>
      </div>

      {status === "saving" && (
        <p className="text-sm text-gray-500 mt-2">Saving...</p>
      )}
      {status === "saved" && (
        <p className="text-sm text-green-500 mt-2">Settings saved!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500 mt-2">
          Error saving settings. Please try again.
        </p>
      )}
    </div>
  );
};

export default UserSettings;

const NumberInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between mb-6">
    <span className="text-sm text-text">{label}</span>
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-16 px-2 py-1 border border-black dark:border-white card text-center"
    />
  </div>
);

const ToggleInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between mb-6">
    <span className="text-sm text-text">{label}</span>
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      className="toggle toggle-success"
      style={{ accentColor: "#50B498" }}
    />
  </div>
);
