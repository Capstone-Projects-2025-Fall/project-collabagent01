import { ClassData, UserData } from "../api/types/user";
import UserSettings from "./UserSettings";

export const ClassDetailsPanel: React.FC<{
  users: UserData[];
  classDetails: ClassData | ClassData[] | null;
  isLoading?: boolean;
}> = ({ users, classDetails: classData, isLoading }) => {
  const isArray = Array.isArray(classData);
  const singleClass = isArray && classData.length === 1 ? classData[0] : null;

  if (isLoading) {
    return (
      <div className="flex-1 bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-6 overflow-y-auto">
        <ClassDetailsSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full md:flex-1 max-h-[80vh] bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-6 overflow-y-auto no-scrollbar">
      {singleClass ? (
        <div className="space-y-6">
          {/* Class Info */}
          <div>
            <h2 className="text-3xl font-bold text-primary mb-1">
              {singleClass.classTitle}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-1">
              <span className="font-medium">Class Code:</span>{" "}
              {singleClass.classCode}
            </p>
            {singleClass.instructorId && (
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Instructor:</span>{" "}
                {(() => {
                  const instructor = users.find(
                    (u) => u.id === singleClass.instructorId
                  );
                  return instructor
                    ? `${instructor.firstName} ${instructor.lastName} (${instructor.id})`
                    : singleClass.instructorId;
                })()}
              </p>
            )}
            {singleClass.classDescription && (
              <p className="text-gray-700 dark:text-gray-200 mt-2">
                {singleClass.classDescription}
              </p>
            )}
          </div>

          {/* Student List */}
          <div>
            <h3 className="text-2xl font-semibold mb-3">Students</h3>
            {singleClass.students.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {singleClass.students.map((student) => (
                  <li key={student.id} className="py-2">
                    <span className="font-medium">
                      {student.firstName} {student.lastName}
                    </span>{" "}
                    <span className="text-gray-500 text-sm">
                      ({student.email})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No students enrolled.</p>
            )}
          </div>

          {/* Class Settings */}
          <div>
            <h3 className="text-2xl font-semibold mb-3">Class Settings</h3>
            <ClassSettingsSection classData={classData} />
          </div>
        </div>
      ) : isArray && classData.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold mb-4 px-2">Class Settings</h2>
          <ClassSettingsSection classData={classData} />
        </div>
      ) : (
        <p className="text-gray-500">No class selected.</p>
      )}
    </div>
  );
};

export default ClassDetailsPanel;

const ClassSettingsSection: React.FC<{
  classData: ClassData | ClassData[] | null;
}> = ({ classData }) => {
  if (!classData) return null;

  const allStudents = Array.isArray(classData)
    ? classData.flatMap((cls) => cls.students)
    : classData.students;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-6 mb-4">
      <UserSettings user={allStudents} />
    </div>
  );
};

const SkeletonBox = ({ width = "w-full", height = "h-4" }) => (
  <div
    className={`bg-gray-300 dark:bg-gray-700 animate-pulse rounded ${width} ${height}`}
  ></div>
);

const ClassDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <SkeletonBox width="w-48" height="h-6" />
          <SkeletonBox width="w-32" height="h-4" />
        </div>
        <SkeletonBox width="w-8" height="h-8" />
      </div>

      <SkeletonBox width="w-24" height="h-4" />

      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkeletonBox key={idx} height="h-16" />
        ))}
      </div>

      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-4 space-y-3"
        >
          <SkeletonBox width="w-40" />
          <SkeletonBox />
          <SkeletonBox width="w-5/6" />
          <SkeletonBox width="w-3/4" />
        </div>
      ))}

      <div className="flex justify-end">
        <SkeletonBox width="w-24" height="h-10" />
      </div>
    </div>
  );
};
