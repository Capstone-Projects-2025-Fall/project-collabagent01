import { USER_ENDPOINT } from "./types/endpoints";
import { User, UserClass, UserSectionStatus, UserStatus } from "./types/user";

/**
 * Updates the lock status of a user in the backend.
 *
 * @param userID - The user's unique identifier.
 * @param isLocked - Whether the user should be locked (`true`) or unlocked (`false`).
 * @returns An object indicating success or containing an error message.
 */
export async function updateLockUserInDatabase(
  userID: string,
  isLocked: boolean
): Promise<{ error?: string }> {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userID}/lock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userID,
        is_locked: isLocked,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to lock user: ${response.status} ${response.statusText}`,
      };
    }

    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Retrieves the user's current class-specific status.
 *
 * @param userId - The user's unique ID.
 * @param classId - (Optional) The class ID to filter status retrieval.
 * @returns An object containing the user's status or an error message.
 */
export async function getUserStatus(
  userId: string,
  classId?: string
): Promise<{ data?: UserStatus; error?: string }> {
  try {
    if (!classId) {
      return { data: UserStatus.ACTIVE };
    }

    const url = new URL(`${USER_ENDPOINT}/${userId}/class-status`);
    if (classId) {
      url.searchParams.append("class_id", classId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to get user class status: ${response.status} ${response.statusText}`,
      };
    }

    if (!data.data || data.data.user_class_status === undefined) {
      return { error: "Invalid response: Missing user status" };
    }

    return { data: data.data.user_class_status.user_class_status };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Updates the overall status (e.g., ACTIVE, SUSPENDED) of a user.
 *
 * @param userId - The user's unique ID.
 * @param status - The new status to assign.
 * @param userClassId - (Optional) Class ID if updating class-specific status.
 * @returns An object indicating success or an error message.
 */
export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  userClassId?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, userClassId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to update user status: ${response.status} ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Fetches detailed user information by their unique ID.
 *
 * @param userID - The user's unique identifier.
 * @returns An object containing the user data or an error message.
 */
export async function getUserByID(
  userID: string
): Promise<{ user?: User; error?: string }> {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userID}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to get user: ${response.status} ${response.statusText}`,
      };
    }

    if (!data.data) {
      return { error: "Invalid response: Missing user data" };
    }

    const userData = data.data;

    const user: User = {
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      isLocked: userData.is_locked,
      code_context_id: userData.code_context_id,
      auth_token: userID,
      isAuthenticated: true,
      userStatus: userData.status,
      role: userData.role,
      settings: userData.settings,
    };
    return { user: user };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Retrieves the section ID associated with a user.
 *
 * @param userId - The user's unique ID.
 * @param classId - (Optional) Class ID to filter sections.
 * @returns An object containing the user section ID or an error.
 */
export async function getUserSection(
  userId: string,
  classId?: string
): Promise<{ userSectionId?: string; error?: string }> {
  try {
    const url = new URL(`${USER_ENDPOINT}/${userId}/sections`);
    if (classId) {
      url.searchParams.append("class_id", classId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.error ||
          `Failed to get user section: ${response.status} ${response.statusText}`,
      };
    }

    if (!data.data.user_section_id) {
      return { error: "Invalid response: Missing user_section_id" };
    }

    return { userSectionId: data.data.user_section_id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Updates or creates a user section with a new status.
 *
 * @param userId - The user's unique ID.
 * @param status - The new status to assign to the section.
 * @param userSectionId - (Optional) Specific user section ID to update.
 * @returns An object indicating success or an error message.
 */
export async function updateUserSection(
  userId: string,
  status: UserSectionStatus,
  userSectionId?: string
): Promise<{ newUserSectionID?: string; error?: string }> {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userId}/sections`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        userSectionId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.error ||
          `Failed to update/create user section: ${response.status} ${response.statusText}`,
      };
    }

    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Fetches all classes associated with a given user.
 *
 * @param userId - The user's unique ID.
 * @returns A promise resolving to an array of `UserClass` objects or an error.
 */
export async function getUserClasses(
  userId: string
): Promise<{ data?: UserClass[]; error?: string }> {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userId}/classes`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to get user classes: ${response.status} ${response.statusText}`,
      };
    }

    if (!Array.isArray(data.data)) {
      return { error: "Invalid response: expected an array of classes" };
    }

    const classes = data.data.map((item: any) => {
      const classItem = item.userClass;
      return {
        id: classItem.id,
        classTitle: classItem.class_title,
        classCode: classItem.class_code,
        instructorId: classItem.instructor_id,
        classHexColor: classItem.class_hex_color,
        classImageCover: classItem.class_image_cover,
        createdAt: classItem.created_at,
      } as UserClass;
    });

    return { data: classes };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
