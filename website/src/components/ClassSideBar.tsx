import { useState, useMemo, useRef } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ClassData } from "../api/types/user";

type ClassSideBarProps = {
  classes: ClassData[];
  selectedClasses: ClassData[];
  onSelectClass: (classItem: ClassData) => void;
  onSetSelectedClasses?: (classes: ClassData[]) => void;
  loading?: boolean;
  setSelectedClassId?: (classId: string) => void;
};

/**
 * ClassSideBar component displays a list of classes with search and selection functionality.
 * It allows users to search for specific classes and select/deselect them.
 * It also supports selecting a range of classes using Shift+Click.
 * The component is styled with Tailwind CSS and includes loading states.
 * @param {ClassData[]} classes - The list of classes to display.
 * @param {ClassData[]} selectedClasses - The list of currently selected classes.
 * @param {(classItem: ClassData) => void} onSelectClass - Callback function to handle class selection.
 * @param {(classes: ClassData[]) => void} [onSetSelectedClasses] - Optional callback to set selected classes.
 * @param {boolean} [loading=false] - Optional loading state for the component.
 * @param {(classId: string) => void} [setSelectedClassId] - Optional callback to set the ID of the currently focused class.
 * @returns {JSX.Element} The rendered ClassSideBar component.
 */
export const ClassSideBar: React.FC<ClassSideBarProps> = ({
  classes,
  selectedClasses,
  onSelectClass,
  onSetSelectedClasses,
  loading = false,
  setSelectedClassId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const lastClickedIndexRef = useRef<number | null>(null);

  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes;

    const tokens = searchQuery.trim().split(/\s+/);
    const filters: Partial<Record<keyof ClassData, string>> = {};
    const keywords: string[] = [];

    for (const token of tokens) {
      if (token.startsWith("/")) {
        const [key, value] = token.slice(1).split(":");
        if (key && value) {
          filters[key as keyof ClassData] = value.toLowerCase();
        }
      } else {
        keywords.push(token.toLowerCase());
      }
    }

    return classes.filter((classItem) => {
      const keywordMatch =
        keywords.length === 0 ||
        keywords.some(
          (kw) =>
            classItem.classTitle.toLowerCase().includes(kw) ||
            classItem.classCode.toLowerCase().includes(kw) ||
            (classItem.classDescription &&
              classItem.classDescription.toLowerCase().includes(kw))
        );

      const allFiltersMatch = (
        Object.entries(filters) as [keyof ClassData, string][]
      ).every(([key, value]) => {
        const classValue = classItem[key];
        return (
          typeof classValue === "string" &&
          classValue.toLowerCase().includes(value)
        );
      });

      return keywordMatch && allFiltersMatch;
    });
  }, [classes, searchQuery]);

  const allFilteredSelected = useMemo(
    () =>
      filteredClasses.length > 0 &&
      filteredClasses.every((classItem) =>
        selectedClasses.some((sc) => sc.id === classItem.id)
      ),
    [filteredClasses, selectedClasses]
  );

  const toggleSelectAll = () => {
    if (!onSetSelectedClasses) return;

    if (allFilteredSelected) {
      const remaining = selectedClasses.filter(
        (sc) => !filteredClasses.some((fc) => fc.id === sc.id)
      );
      onSetSelectedClasses(remaining);
    } else {
      const merged = [
        ...selectedClasses,
        ...filteredClasses.filter(
          (fc) => !selectedClasses.some((sc) => sc.id === fc.id)
        ),
      ];
      onSetSelectedClasses(merged);
    }
  };

  const handleClassClick = (event: React.MouseEvent, index: number) => {
    const clickedClass = filteredClasses[index];

    if (!clickedClass || !clickedClass.id) return;
    setSelectedClassId?.(clickedClass.id);

    if (
      !event.shiftKey ||
      lastClickedIndexRef.current === null ||
      !onSetSelectedClasses
    ) {
      onSelectClass(clickedClass);
      lastClickedIndexRef.current = index;
      return;
    }

    const start = Math.min(lastClickedIndexRef.current, index);
    const end = Math.max(lastClickedIndexRef.current, index);
    const rangeClasses = filteredClasses.slice(start, end + 1);

    const newSelected = Array.from(
      new Set([...selectedClasses, ...rangeClasses])
    );

    onSetSelectedClasses(newSelected);
  };

  return (
    <div className="w-full md:w-1/4 max-h-[80vh] bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-4 overflow-y-auto no-scrollbar">
      <h2 className="text-lg font-semibold mb-2 pl-2">
        Classes ({classes.length})
      </h2>
      <input
        type="text"
        placeholder="Search classes..."
        className="border px-3 py-2 rounded w-full mb-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {onSetSelectedClasses && (
        <button
          onClick={toggleSelectAll}
          disabled={filteredClasses.length === 0}
          className="w-full mb-2 py-2 text-sm bg-[#F59E0B] hover:bg-[#FFA01D] text-text rounded disabled:opacity-50"
        >
          {allFilteredSelected
            ? "Deselect All Filtered"
            : "Select All Filtered"}
        </button>
      )}

      <ul className="space-y-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="p-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
                  </div>
                </div>
              </li>
            ))
          : filteredClasses.map((classItem, index) => {
              if (!classItem || typeof classItem.id === "undefined") {
                console.warn(
                  "ClassItem or ClassItem.id is undefined",
                  classItem
                );
                return null;
              }
              const isSelected = selectedClasses.some(
                (sc) => sc.id === classItem.id
              );
              return (
                <li
                  key={classItem.id}
                  onClick={(e) => handleClassClick(e, index)}
                  className={`p-2 rounded cursor-pointer hover:bg-green-100 dark:hover:bg-green-900 transition ${
                    isSelected ? "bg-green-200 dark:bg-green-800" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3">
                      {classItem.classImageCover ? (
                        <img
                          src={classItem.classImageCover}
                          alt={classItem.classTitle}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-[#50B498] text-white text-lg font-semibold">
                          {" "}
                          {classItem.classTitle?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {classItem.classTitle}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {classItem.classCode}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
      </ul>
    </div>
  );
};

export default ClassSideBar;
