import { getUserClasses } from "../api/user-api";
import { getAuthContext } from "../services/auth-service";
import { UserClass } from "../api/types/user";
import * as vscode from "vscode";
import { getColorCircle } from ".";

let tempSelectedClass: UserClass | null = null;

/**
 * Retrieves the currently selected class.
 *
 * @returns The currently selected UserClass object, or `null` if no class is selected.
 */
export function getSelectedClass(): UserClass | null {
  return tempSelectedClass;
}

/**
 * Sets the currently selected class.
 *
 * @param cls - The UserClass object to set as selected, or `null` to deselect.
 */
function setSelectedClass(cls: UserClass | null) {
  tempSelectedClass = cls;
}

/**
 * Registers the "Select Class" command in the VS Code command palette.
 *
 * Allows users to pick a class from their registered classes, or to navigate
 * to CLOVER if they have no classes registered. Updates the status bar based on the selection.
 *
 * @param context - The extension context for managing subscriptions.
 * @param statusBarItem - The status bar item to update based on class selection.
 */
export function registerClassSelectorCommand(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem
) {
  const disposable = vscode.commands.registerCommand(
    "your-extension.selectClass",
    async () => {
      const { context: user, error: authError } = await getAuthContext();

      if (authError || user === undefined) {
        vscode.window.showErrorMessage(
          `Failed to get user context: ${authError}`
        );
        return;
      }

      const { data: userClasses, error: classError } = await getUserClasses(
        user.id
      );

      if (
        classError?.includes("No classes found") ||
        !userClasses ||
        userClasses.length === 0
      ) {
        const selection = await vscode.window.showInformationMessage(
          "You have no registered classes. Would you like to register one now?",
          { modal: true },
          "Open CLOVER"
        );

        if (selection === "Open CLOVER") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://clover.nickrucinski.com/")
          );
        }

        setSelectedClass(null);
        statusBarItem.text = `📘 SELECT CLASS ⌄`;
        statusBarItem.color = "#FF8C00";
        return;
      }

      if (classError) {
        vscode.window.showErrorMessage(`Error fetching classes: ${classError}`);
        return;
      }

      const picked = await vscode.window.showQuickPick(
        [
          {
            label: "🚫 No class",
            description: "You are not assigned to any class",
          },
          ...userClasses.map((c) => ({
            label: `${getColorCircle(c.classHexColor as string)} ${
              c.classTitle
            }`,
            originalTitle: c.classTitle,
            description: c.classCode,
            color: c.classHexColor,
          })),
        ],
        { placeHolder: "Select the class you are working on" }
      );

      if (picked) {
        if (picked.label === "🚫 No class") {
          setSelectedClass(null);
          statusBarItem.text = `📘 SELECT CLASS ⌄`;
        }

        const selectedClass = userClasses.find(
          (c) => c.classTitle === (picked as any).originalTitle
        );
        if (selectedClass) {
          setSelectedClass(selectedClass);
          statusBarItem.text = `📘 CLASS: ${selectedClass.classTitle.toUpperCase()}`;
          statusBarItem.color = selectedClass.classHexColor || "#FF8C00";
        }

        await updateClassStatus(statusBarItem);
      }

      if (tempSelectedClass) {
        statusBarItem.text = `📘 CLASS: ${tempSelectedClass.classTitle.toUpperCase()}`;
        statusBarItem.color = tempSelectedClass.classHexColor;
      } else {
        statusBarItem.text = `📘 SELECT CLASS ⌄`;
        statusBarItem.color = "#FF8C00";
      }
    }
  );

  context.subscriptions.push(disposable);
}
/**
 * Sets up and initializes the class selection status bar item.
 *
 * Configures the status bar button that allows users to quickly view or change their active class.
 *
 * @returns A promise that resolves with the created StatusBarItem.
 */
export async function setupClassStatusBarItem(): Promise<vscode.StatusBarItem> {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );

  statusBarItem.tooltip = "📘 Click to change the active class";
  statusBarItem.command = "your-extension.selectClass";
  statusBarItem.show();

  await updateClassStatus(statusBarItem);

  return statusBarItem;
}

/**
 * Updates the text and color of the class selection status bar item.
 *
 * Reflects the currently selected class if available, otherwise prompts the user to select a class.
 *
 * @param statusBarItem - The status bar item to update.
 */
async function updateClassStatus(statusBarItem: vscode.StatusBarItem) {
  const selectedClass = getSelectedClass();

  if (selectedClass) {
    statusBarItem.text = `📘 CLASS: ${selectedClass.classTitle.toUpperCase()}`;
    if (selectedClass.classHexColor) {
      statusBarItem.color = selectedClass.classHexColor || "#FF8C00";
    }
  } else {
    statusBarItem.text = `📘 SELECT CLASS ⌄`;
    statusBarItem.color = "#FF8C00";
  }
}
