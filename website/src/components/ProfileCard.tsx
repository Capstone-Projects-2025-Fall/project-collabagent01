import { MailIcon } from "lucide-react";
import { UserData } from "../api/types/user";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface StatItem {
  label: string;
  value: React.ReactNode;
}

interface ProfileCardProps {
  userData: UserData;
  detailsContent?: StatItem[];
}

const ProfileCard = ({ userData, detailsContent }: ProfileCardProps) => {
  const { avatar_url, firstName, lastName, email, role } = userData || {};
  return (
    <div className="card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center mb-4 justify-center">
        <Avatar className="size-16">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={`${firstName} ${lastName}`}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <AvatarFallback className="bg-[#50B498] text-white text-2xl font-semibold">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold">
          {userData.firstName} {userData.lastName}
        </h2>
        {role && <p className="text-sm dark:text-gray-400 mt-1">{role}</p>}
      </div>

      {detailsContent && detailsContent.length > 0 && (
        <div className="flex justify-center gap-12 mt-4">
          {detailsContent.map(({ label, value }, i) => (
            <div key={i}>
              <span className="font-bold block text-sm">{label}</span>
              <span className="dark:text-gray-400 flex items-center gap-1">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="h-px px-6 bg-slate-500 dark:bg-gray-300 my-6" />

      <div className="flex text-sm items-center gap-2 justify-center md:justify-start">
        <MailIcon className="w-4 h-4" />
        <p>{email}</p>
      </div>
    </div>
  );
};

export default ProfileCard;
