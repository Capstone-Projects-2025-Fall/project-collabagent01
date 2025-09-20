import { Loader2 } from "lucide-react";
import { StudentStatus, UserClass, UserData } from "../api/types/user";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";
import { useUserClasses } from "../hooks/useUserClasses";
import ClassInfoCard from "../components/ClassInfoCard";
import { useState } from "react";
import ClassDetails from "../components/ClassDetails";
import RegisterClassDialog from "../components/RegisterClassDialog";
import ProfileCard from "../components/ProfileCard";

/**
 * StudentProfile component that displays user profile and classes.
 * @param userData - The user data to display in the student profile.
 * @module Pages
 * @returns
 */
export const StudentProfile = ({ userData }: { userData: UserData }) => {
  const { originalClasses, loading: userClassLoading } = useUserClasses();
  const [selectedClass, setSelectedClass] = useState<{
    userClass: UserClass;
    studentStatus?: StudentStatus;
    instructorData?: UserData;
    studentCount?: number;
  } | null>(null);

  if (userClassLoading) {
    return (
      <div className="flex min-h-screen justify-center items-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  const handleClassSelect = (
    userClass: UserClass,
    studentStatus?: StudentStatus,
    instructorData?: UserData,
    studentCount?: number
  ) => {
    setSelectedClass({
      userClass,
      studentStatus,
      instructorData,
      studentCount,
    });
  };

  const handleCloseDetails = () => {
    setSelectedClass(null);
  };

  return (
    <>
      <div className="width-container grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 lg:col-span-1 space-y-4">
          <ProfileCard
            userData={userData}
            detailsContent={[
              { label: "Level", value: "Beginner" },
              {
                label: "Enrolled",
                value: originalClasses?.length ?? 0,
              },
            ]}
          />
        </div>

        <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-4">
          <div className="card flex w-full justify-center">
            {originalClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-16 text-center">
                <p className="text-lg font-medium">
                  You currently have no classes
                </p>
                <p className="text-muted-foreground mb-6">
                  Please register a new class
                </p>
                <RegisterClassDialog />
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                }}
                className="w-full"
              >
                <CarouselContent>
                  {originalClasses.map((userClassInfo, index) => (
                    <CarouselItem key={index} className="lg:basis-1/2">
                      <div className="p-1">
                        <ClassInfoCard
                          classInfo={userClassInfo}
                          onSelect={handleClassSelect}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {originalClasses.length > 1 && (
                  <div
                    className={`flex justify-between w-full ${originalClasses.length <= 2 && "lg:hidden"}`}
                  >
                    <CarouselPrevious className="ml-4" />
                    <CarouselNext className="mr-4" />
                  </div>
                )}
              </Carousel>
            )}
          </div>
        </div>
      </div>

      {selectedClass && (
        <ClassDetails
          userClass={selectedClass.userClass}
          instructorData={selectedClass.instructorData as UserData}
          onClose={handleCloseDetails}
        />
      )}
    </>
  );
};

export default StudentProfile;
