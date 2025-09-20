import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Info } from "lucide-react";
import { ReactNode } from "react";

interface InfoTooltipProps {
  children: ReactNode;
  className?: string;
}

export const InfoTooltip = ({ children }: InfoTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="tooltip-container">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InfoTooltip;
