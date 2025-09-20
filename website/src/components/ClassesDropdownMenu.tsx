import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { UserClass } from "../api/types/user";

interface ClassesDropdownMenuProps {
  classes: UserClass[];
  onClassSelect: (selection: {
    id: string | null;
    type: "all" | "class" | "non-class";
  }) => void;
  selectedId?: string | null;
  placeholder?: string;
}

/**
 * ClassesDropdownMenu component renders a dropdown menu for selecting classes.
 * It allows users to select a specific class or view all classes.
 * @param {Object} props - The props for the ClassesDropdownMenu component.
 * @param {UserClass[]} props.classes - The list of classes to display in the dropdown.
 * @param props.onClassSelect - The function to call when a class is selected.
 * @param {string | null | undefined} props.selectedId - The currently selected class ID.
 * @param {string | undefined} props.placeholder - The placeholder text for the dropdown.
 * @returns {JSX.Element} - A React component that renders a dropdown menu for selecting classes.
 */
export const ClassesDropdownMenu = ({
  classes,
  onClassSelect,
  selectedId,
  placeholder = "Select a class...",
}: ClassesDropdownMenuProps) => {
  const selectValue =
    selectedId === undefined
      ? undefined
      : selectedId === null
        ? "all"
        : selectedId;

  return (
    <Select
      value={selectValue}
      onValueChange={(value) => {
        if (value === "all") {
          onClassSelect({ id: null, type: "all" });
        } else if (value === "non-class") {
          onClassSelect({ id: null, type: "non-class" });
        } else {
          onClassSelect({ id: value, type: "class" });
        }
      }}
    >
      <SelectTrigger className="w-full border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {classes.map((cls) => (
            <SelectItem key={cls.id} value={cls.id || "all"}>
              <div className="flex items-center gap-2">
                {cls.classHexColor && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cls.classHexColor }}
                  />
                )}
                <span>
                  {cls.classTitle}{" "}
                  <span
                    className={
                      cls.id === "all" || cls.id === "non-class" ? "hidden" : ""
                    }
                  >
                    - {cls.classCode}
                  </span>
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default ClassesDropdownMenu;
