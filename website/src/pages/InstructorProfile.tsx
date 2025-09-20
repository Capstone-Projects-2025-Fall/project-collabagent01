import { Loader2, Star } from "lucide-react";
import {
  StudentStatus,
  UserClass,
  UserData,
  UserRole,
} from "../api/types/user";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";
import ClassInfoCard from "../components/ClassInfoCard";
import { useInstructorClasses } from "../hooks/useInstructorClasses";
import { useState } from "react";
import ClassDetails from "../components/ClassDetails";
import CreateNewClassDialog from "../components/CreateNewClassDialog";
import ProfileCard from "../components/ProfileCard";

/**
 * InstructorProfile component displays the profile of an instructor.
 * It shows the instructor's avatar, name, email, ratings, and courses.
 * @param { userData } - The user data of the instructor.
 * @returns {JSX.Element} - The rendered component.
 */
export const InstructorProfile = ({ userData }: { userData: UserData }) => {
  const { originalClasses, loading: userClassLoading } = useInstructorClasses();
  const [selectedClass, setSelectedClass] = useState<{
    userClass: UserClass;
    studentStatus?: StudentStatus;
    instructorData?: UserData;
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
    instructorData?: UserData
  ) => {
    setSelectedClass({
      userClass,
      studentStatus,
      instructorData,
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
              {
                label: "Ratings",
                value: (
                  <>
                    5.0{" "}
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  </>
                ),
              },
              {
                label: "Courses",
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
                  Please create a new class
                </p>
                <CreateNewClassDialog />
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                }}
                className="w-full"
              >
                <CarouselContent>
                  {originalClasses.map((userClass, index) => (
                    <CarouselItem key={index} className="lg:basis-1/2">
                      <div className="p-1">
                        <ClassInfoCard
                          classInfo={userClass}
                          onSelect={handleClassSelect}
                          isInstructor={
                            userData.role === UserRole.INSTRUCTOR ||
                            userData.role === UserRole.ADMIN
                          }
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

export default InstructorProfile;
