import { useState } from "react";
import { Button } from "../components/ui/button";
import { useUserData } from "../hooks/useUserData";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Plus } from "lucide-react";
import { createClass } from "../api/classes";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { UserClass } from "../api/types/user";

// Color Options for the class color picker
const colorOptions = [
  "#FFDE57",
  "#00FF00",
  "#FF6EC7",
  "#40E0D0",
  "#FFA500",
  "#1E90FF",
  "#FF1493",
  "#8A2BE2",
  "#FF4500",
  "#7FFF00",
];

/**
 * CreateNewClassDialog component allows users to create a new class.
 * It includes a form for entering class details such as title, code, description, and color.
 * It uses a modal dialog to display the form and handles form submission to create a new class.
 * @returns {JSX.Element} - A React component that renders a dialog for creating a new class.
 */
export const CreateNewClassDialog = () => {
  const { userData } = useUserData();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      classTitle: "",
      classCode: "",
      classDescription: "",
      classHexColor: colorOptions[0],
    },
  });

  const onSubmit = async () => {
    const newClass: UserClass = {
      classTitle: form.getValues("classTitle"),
      classCode: form.getValues("classCode"),
      instructorId: userData?.id,
      classHexColor: form.getValues("classHexColor"),
      classImageCover: null,
      classDescription: form.getValues("classDescription") || null,
    };

    const result = await createClass(newClass);

    if (result.error) {
      toast.error(
        "Error creating class. Please check your input and try again."
      );
      return;
    }

    toast.success(
      `Your class ${newClass.classTitle} has been created successfully!`
    );

    setOpen(false);
    form.reset();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default">
            <Plus />
            <span className="hidden sm:block ml-1">Add New Class</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-zinc-900 rounded-xl shadow shadow-gray-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Add a New Class</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 mt-4"
            >
              <FormField
                control={form.control}
                name="classTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Intro to Java" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. CS101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the course content and objectives..."
                        {...field}
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classHexColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Color</FormLabel>
                    <div className="grid grid-cols-5 gap-4 !mt-6">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`size-14 ml-3 rounded-full border-4 ${
                            field.value === color
                              ? "border-black dark:border-white"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full !mt-8 font-semibold text-lg !py-5"
              >
                Create
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateNewClassDialog;
