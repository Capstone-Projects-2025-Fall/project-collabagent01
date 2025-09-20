import { useEffect, useMemo, useState } from "react";
import MiniPieChart from "./MiniPieChart";
import { calculateProgress } from "../utils/calculateProgress";
import { StudentStatus, UserActivityLogItem } from "../api/types/user";
import { supabase } from "../supabaseClient";
import StudentStatusBadge from "./StudentStatusBadge";
import PaginatedTable from "./PaginatedTable";
import { Input } from "./ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "./ui/select";
import StudentDashboardCard from "./StudentDashboardCard";

interface StudentClassData {
  fullName?: string;
  classTitle: string;
  studentStatus?: StudentStatus;
  totalAccepted: number;
  correctSuggestions: number;
  percentageCorrect: number;
  lastActivity: string;
  logs?: UserActivityLogItem[];
}

/**
 * A row in the student data table.
 * It displays the student's information and allows for interaction.
 * @param param0 - The props for the StudentRow component.
 * @param {StudentClassData} param0.student - The student data to be displayed.
 * @param {number} param0.index - The index of the student in the list.
 * @param {boolean} [param0.isLoading] - Whether the row is in a loading state.
 * @param {function} param0.onClick - The function to call when the row is clicked.
 * @returns {JSX.Element} - The rendered row element.
 */
export const StudentRow = ({
  student,
  index,
  isLoading = false,
  onClick,
}: {
  student: StudentClassData;
  index: number;
  isLoading?: boolean;
  onClick: (student: StudentClassData) => void;
}) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const datePart = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm">{datePart}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {timePart}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <tr>
        <td className="p-2 w-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </td>
        <td className="p-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
        </td>
        <td className="p-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
        </td>
        <td className="p-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
        </td>
        <td className="p-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-8"></div>
          </div>
        </td>
        <td className="p-2 w-40">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      onClick={() => onClick(student)}
      className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
    >
      <td className="p-2">{index + 1}</td>
      <td className="p-2">{student.classTitle}</td>
      <td className="p-2">{student.fullName}</td>
      <td className="p-2">
        <StudentStatusBadge
          status={student.studentStatus as StudentStatus}
          size="sm"
        />
      </td>
      <td className="p-2">
        <div className="flex flex-col items-center sm:flex-row sm:items-center gap-1">
          <MiniPieChart
            correct={student.correctSuggestions}
            incorrect={student.totalAccepted - student.correctSuggestions}
          />
          <span className="text-xs text-gray-500">
            ({student.correctSuggestions}/{student.totalAccepted})
          </span>
        </div>
      </td>
      <td className="p-2 w-40">{formatTimestamp(student.lastActivity)}</td>
    </tr>
  );
};

/**
 * A table component that displays student data and allows for filtering and sorting.
 * It fetches data from Supabase and displays it in a paginated format.
 * @param param0 - The props for the StudentDataTable component.
 * @param {UserActivityLogItem[]} param0.logs - The logs to be displayed in the table.
 * @param {"all" | "class"} [param0.classFilter="all"] - The filter for the class type.
 * @returns
 */
export const StudentDataTable = ({
  logs,
  classFilter = "all",
}: {
  logs: UserActivityLogItem[];
  classFilter?: "all" | "class";
}) => {
  const [loading, setLoading] = useState(true);
  const [classDataMap, setClassDataMap] = useState<
    Record<string, { classTitle: string }>
  >({});
  const [selectedStudent, setSelectedStudent] =
    useState<StudentClassData | null>(null);

  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "ALL">(
    "ALL"
  );

  const [fullDataStudents, setFullDataStudents] = useState<StudentClassData[]>(
    []
  );

  useEffect(() => {
    const fetchClassData = async () => {
      const uniqueClassIds = [
        ...new Set(logs.map((log) => log.metadata.userClassId)),
      ].filter(Boolean);

      if (uniqueClassIds.length === 0) return;

      const { data } = await supabase
        .from("classes")
        .select("id, class_title")
        .in("id", uniqueClassIds);

      if (data) {
        const map = data.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.id]: { classTitle: curr.class_title },
          }),
          {}
        );
        setClassDataMap(map);
      }
    };

    fetchClassData();
  }, [logs]);

  useEffect(() => {
    const buildData = async () => {
      setLoading(true);
      const activityLogsMap = new Map<string, UserActivityLogItem[]>();

      for (const log of logs) {
        const userId = log.metadata.userId ?? "Unknown";
        const classId = log.metadata.userClassId ?? "Unknown";
        const compositeKey =
          classFilter === "all" ? `${userId}&${classId}` : userId;

        if (!activityLogsMap.has(compositeKey)) {
          activityLogsMap.set(compositeKey, []);
        }
        activityLogsMap.get(compositeKey)!.push(log);
      }

      const baseData = Array.from(activityLogsMap.entries()).map(
        ([compositeKey, userLogs]) => {
          const [userId, classId] =
            classFilter === "all"
              ? compositeKey.split("&")
              : [compositeKey, userLogs[0]?.metadata.userClassId ?? "Unknown"];

          const { percentageCorrect, correctSuggestions, totalAccepted } =
            calculateProgress(userLogs);

          const lastActivity = userLogs.reduce(
            (latest, log) =>
              new Date(log.timestamp) > new Date(latest)
                ? log.timestamp
                : latest,
            userLogs[0].timestamp
          );

          const classTitle = classDataMap[classId]?.classTitle || "Unknown";

          return {
            userId,
            classId,
            classTitle,
            totalAccepted,
            correctSuggestions,
            percentageCorrect: Math.round(percentageCorrect),
            lastActivity,
            logs: userLogs,
          };
        }
      );

      const additionalData = await Promise.all(
        baseData.map(async (student) => {
          const [userData, studentStatus] = await Promise.all([
            fetchUserData(student.userId),
            fetchStudentStatus(student.userId, student.classId),
          ]);

          return {
            ...student,
            fullName:
              `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim(),
            studentStatus: studentStatus,
          };
        })
      );

      setFullDataStudents(additionalData);
      setLoading(false);
    };

    buildData();
  }, [logs, classFilter, classDataMap]);

  const filteredStudents = useMemo(() => {
    return fullDataStudents.filter((s) => {
      const matchName = s
        .fullName!.toLowerCase()
        .includes(nameFilter.toLowerCase());
      const matchStatus =
        statusFilter === "ALL" || s.studentStatus === statusFilter;
      return matchName && matchStatus;
    });
  }, [fullDataStudents, nameFilter, statusFilter]);

  const fetchUserData = async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();
    return data
      ? { firstName: data.first_name, lastName: data.last_name }
      : null;
  };

  const fetchStudentStatus = async (userId: string, classId: string) => {
    const { data } = await supabase
      .from("class_users")
      .select("user_class_status")
      .match({ student_id: userId, class_id: classId })
      .single();
    return data?.user_class_status ?? null;
  };

  const handleRowClick = (student: StudentClassData) => {
    setSelectedStudent(student);
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
  };

  if (loading) {
    return (
      <table className="w-full text-sm text-left text-text">
        <thead>
          <tr className="border-b border-gray-900 dark:border-gray-100 font-semibold">
            <th className="p-2 font-bold w-4">No.</th>
            <th className="p-2">Class</th>
            <th className="p-2">Name</th>
            <th className="p-2">Status</th>
            <th className="p-2">Accuracy</th>
            <th className="p-2 w-40">Last Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400 dark:divide-gray-100">
          {Array.from({ length: 5 }).map((_, index) => (
            <StudentRow
              key={`loading-${index}`}
              student={{
                classTitle: "",
                studentStatus: undefined,
                totalAccepted: 0,
                correctSuggestions: 0,
                percentageCorrect: 0,
                lastActivity: new Date().toISOString(),
              }}
              index={index}
              isLoading={true}
              onClick={() => {}}
            />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <StudentFilters
          nameFilter={nameFilter}
          setNameFilter={setNameFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredStudents.length}{" "}
            {filteredStudents.length == 1 ? "student" : "students"} found
          </span>
        </div>
      </div>

      <PaginatedTable
        data={filteredStudents}
        renderTable={(currentItems, startIndex) => (
          <table className="w-full text-sm text-left text-text">
            <thead>
              <tr className="border-b border-gray-900 dark:border-gray-100 font-semibold">
                <th className="p-2 w-4">No.</th>
                <th className="p-2">Class</th>
                <th className="p-2">Name</th>
                <th className="p-2">Status</th>
                <th className="p-2">Accuracy</th>
                <th className="p-2 w-40">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400 dark:divide-gray-100">
              {currentItems.map((student, index) => (
                <StudentRow
                  key={index}
                  student={student}
                  index={startIndex + index}
                  onClick={handleRowClick}
                />
              ))}
            </tbody>
          </table>
        )}
      />

      {selectedStudent && (
        <StudentDashboardCard
          student={selectedStudent}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default StudentDataTable;

interface StudentFiltersProps {
  nameFilter: string;
  setNameFilter: (value: string) => void;
  statusFilter: StudentStatus | "ALL";
  setStatusFilter: (value: StudentStatus | "ALL") => void;
}

/**
 * A component that provides filters for the student data table.
 * It allows filtering by name and status.
 * @param param0 - The props for the StudentFilters component.
 * @param {string} param0.nameFilter - The current name filter value.
 * @param {function} param0.setNameFilter - The function to set the name filter value.
 * @param {StudentStatus | "ALL"} param0.statusFilter - The current status filter value.
 * @param {function} param0.setStatusFilter - The function to set the status filter value.
 * @returns {JSX.Element} - The rendered filters component.
 */
export function StudentFilters({
  nameFilter,
  setNameFilter,
  statusFilter,
  setStatusFilter,
}: StudentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 my-4">
      <Input
        type="text"
        placeholder="Filter by name"
        className="w-64 border-b-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-0"
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
      />

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          setStatusFilter(value as StudentStatus | "ALL")
        }
      >
        <SelectTrigger className="w-64 sm:w-32 border-b-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-0">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value={StudentStatus.ACTIVE}>Active</SelectItem>
          <SelectItem value={StudentStatus.SUSPENDED}>Suspended</SelectItem>
          <SelectItem value={StudentStatus.LOCKED}>Locked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
