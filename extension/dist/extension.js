"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/vsls/package.json
var require_package = __commonJS({
  "node_modules/vsls/package.json"(exports2, module2) {
    module2.exports = {
      name: "vsls",
      displayName: "VS Live Share extension API",
      description: "Enables VS Code extensions to access Live Share capabilities.",
      version: "1.0.4753",
      publisher: "ms-vsliveshare",
      main: "vscode.js",
      preview: true,
      license: "SEE LICENSE IN LICENSE.txt",
      homepage: "https://aka.ms/vsls",
      bugs: {
        url: "https://aka.ms/vsls-issues",
        email: "vsls-feedback@microsoft.com"
      },
      author: {
        name: "Microsoft"
      },
      keywords: [
        "Live Share"
      ],
      categories: [
        "Other"
      ],
      repository: {
        url: "https://github.com/MicrosoftDocs/live-share"
      },
      dependencies: {
        "@microsoft/servicehub-framework": "^2.6.74"
      }
    };
  }
});

// node_modules/vsls/vscode.js
var require_vscode = __commonJS({
  "node_modules/vsls/vscode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var vscode14 = require("vscode");
    var liveShareApiVersion = require_package().version;
    exports2.extensionId = "ms-vsliveshare.vsliveshare";
    async function getApi2(callingExtensionId) {
      const liveshareExtension = vscode14.extensions.getExtension(exports2.extensionId);
      if (!liveshareExtension) {
        return null;
      }
      const extensionApi = liveshareExtension.isActive ? liveshareExtension.exports : await liveshareExtension.activate();
      if (!extensionApi) {
        return null;
      }
      if (!extensionApi.getApi)
        return extensionApi.getApiAsync(liveShareApiVersion);
      return extensionApi.getApi(liveShareApiVersion, callingExtensionId);
    }
    exports2.getApi = getApi2;
    function getApiAsync() {
      return getApi2();
    }
    exports2.getApiAsync = getApiAsync;
    var PolicySetting;
    (function(PolicySetting2) {
      PolicySetting2["AllowGuestDebugControl"] = "allowGuestDebugControl";
      PolicySetting2["AllowGuestTaskControl"] = "allowGuestTaskControl";
      PolicySetting2["AutoShareServers"] = "autoShareServers";
      PolicySetting2["AnonymousGuestApproval"] = "anonymousGuestApproval";
      PolicySetting2["ConnectionMode"] = "connectionMode";
      PolicySetting2["AllowedDomains"] = "allowedDomains";
      PolicySetting2["AllowReadWriteTerminals"] = "allowReadWriteTerminals";
    })(PolicySetting = exports2.PolicySetting || (exports2.PolicySetting = {}));
    var Role2;
    (function(Role3) {
      Role3[Role3["None"] = 0] = "None";
      Role3[Role3["Host"] = 1] = "Host";
      Role3[Role3["Guest"] = 2] = "Guest";
    })(Role2 = exports2.Role || (exports2.Role = {}));
    var Access;
    (function(Access2) {
      Access2[Access2["None"] = 0] = "None";
      Access2[Access2["ReadOnly"] = 1] = "ReadOnly";
      Access2[Access2["ReadWrite"] = 3] = "ReadWrite";
      Access2[Access2["Owner"] = 255] = "Owner";
    })(Access = exports2.Access || (exports2.Access = {}));
    var View;
    (function(View2) {
      View2["Session"] = "liveshare.session";
      View2["ExplorerSession"] = "liveshare.session.explorer";
      View2["PlannedSessions"] = "liveshare.plannedSessions";
      View2["Contacts"] = "liveshare.contacts";
      View2["Help"] = "liveshare.help";
    })(View = exports2.View || (exports2.View = {}));
    var ViewItem;
    (function(ViewItem2) {
      ViewItem2["Participants"] = "participants";
      ViewItem2["Servers"] = "servers";
      ViewItem2["Terminals"] = "terminals";
      ViewItem2["Comments"] = "comments";
      ViewItem2["Chat"] = "chat";
      ViewItem2["CurrentUser"] = "participants.currentuser";
      ViewItem2["Guest"] = "participants.guest";
      ViewItem2["FollowedGuest"] = "participants.guest.followed";
      ViewItem2["Participant"] = "participants.participant";
      ViewItem2["FollowedParticipant"] = "participants.participant.followed";
      ViewItem2["GuestAnonymous"] = "participants.guest.anonymous";
      ViewItem2["FollowedGuestAnonymous"] = "participants.guest.followed.anonymous";
      ViewItem2["GuestElevated"] = "participants.guest.elevated";
      ViewItem2["FollowedGuestElevated"] = "participants.guest.followed.elevated";
      ViewItem2["GuestElevatedAnonymous"] = "participants.guest.elevated.anonymous";
      ViewItem2["FollowedGuestElevatedAnonymous"] = "participants.guest.followed.elevated.anonymous";
      ViewItem2["LocalServer"] = "servers.local";
      ViewItem2["RemoteServer"] = "servers.remote";
      ViewItem2["LocalTerminalReadOnly"] = "terminals.local.readonly";
      ViewItem2["LocalTerminalReadWrite"] = "terminals.local.readwrite";
      ViewItem2["RemoteTerminal"] = "terminals.remote";
      ViewItem2["SuggestedContacts"] = "contacts.suggested";
      ViewItem2["AvailableContacts"] = "contacts.available";
      ViewItem2["ContactsProvider"] = "contacts.provider";
      ViewItem2["SelfContact"] = "contacts.selfContact";
      ViewItem2["Contact"] = "contacts.contact";
      ViewItem2["ContactInvited"] = "contacts.contact.invited";
      ViewItem2["ContactOffline"] = "contacts.contact.offline";
      ViewItem2["RecentContact"] = "contacts.recentContact";
      ViewItem2["RecentContactOffline"] = "contacts.recentContact.offline";
      ViewItem2["RecentContactInvited"] = "contacts.recentContact.invited";
      ViewItem2["NoContact"] = "contacts.noContact";
      ViewItem2["RecentContacts"] = "contacts.RecentContacts";
      ViewItem2["NoSuggestedContacts"] = "contacts.NoSuggestedUsers";
      ViewItem2["NoRecentContacts"] = "contacts.NoRecentContacts";
      ViewItem2["InvitedContact"] = "contacts.invited";
      ViewItem2["SessionFeedbackQuestion"] = "help.sessionFeedback";
      ViewItem2["ReportAProblem"] = "help.reportAProblem";
      ViewItem2["TweetUsYourFeedback"] = "help.tweetUsYourFeedback";
      ViewItem2["Survey"] = "help.survey";
      ViewItem2["GoodFeedback"] = "help.goodFeedback";
      ViewItem2["BadFeedback"] = "help.badFeedback";
      ViewItem2["DontAskAgain"] = "help.dontAskAgain";
      ViewItem2["Thankyou"] = "help.thankyou";
      ViewItem2["MoreInfo"] = "help.moreinfo";
      ViewItem2["ConfigureSettings"] = "help.configureSettings";
      ViewItem2["Loading"] = "loading";
      ViewItem2["Other"] = "other";
    })(ViewItem = exports2.ViewItem || (exports2.ViewItem = {}));
    var ActivityType = class {
    };
    exports2.ActivityType = ActivityType;
    ActivityType.session = "session";
    ActivityType.workspace = "workspace";
    ActivityType.debug = "debug";
    ActivityType.terminal = "terminal";
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate,
  globalContext: () => globalContext
});
module.exports = __toCommonJS(extension_exports);
var vscode13 = __toESM(require("vscode"));

// src/commands/test-commands.ts
var vscode4 = __toESM(require("vscode"));

// src/utils/index.ts
var import_vscode = __toESM(require("vscode"));
var convertToSnakeCase = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/([A-Z])/g, "_$1").toLowerCase(),
      // Convert camelCase to snake_case
      value
    ])
  );
};
var escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
function getSettings() {
  const vendor = import_vscode.default.workspace.getConfiguration("collabAgent").get("general.vendor");
  const model = import_vscode.default.workspace.getConfiguration("collabAgent").get("general.modelSelection");
  const bug_flag = import_vscode.default.workspace.getConfiguration("collabAgent").get("debug.bugFlag");
  return { vendor, model, bug_flag };
}
var hasBugRandomly = (bugThreshold) => Math.random() < bugThreshold * 0.01;
var getColorCircle = (hex) => {
  const hue = hexToHue(hex);
  if (hue < 15) {
    return "\u{1F534} ";
  }
  if (hue < 45) {
    return "\u{1F7E0} ";
  }
  if (hue < 75) {
    return "\u{1F7E1} ";
  }
  if (hue < 165) {
    return "\u{1F7E2} ";
  }
  if (hue < 265) {
    return "\u{1F535} ";
  }
  if (hue < 345) {
    return "\u{1F7E3} ";
  }
  return "\u26AB ";
};
function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / (max - min);
        break;
      case g:
        h = 2 + (b - r) / (max - min);
        break;
      case b:
        h = 4 + (r - g) / (max - min);
        break;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return h;
}

// src/api/types/endpoints.ts
var LOCAL_ENDPOINT_URL = "http://127.0.0.1:8001";
var ENDPOINT_URL = "https://backend-639487598928.us-east5.run.app";
var TESTING = true;
var BASE_URL = TESTING ? LOCAL_ENDPOINT_URL : ENDPOINT_URL;
var AUTH_ENDPOINT = `${BASE_URL}/auth`;
var AI_SUGGESTION_ENDPOINT = `${BASE_URL}/suggestion`;
var REFINE_PROMPT_ENDPOINT = `${BASE_URL}/suggestion/refine`;
var EXPLANATION_ENDPOINT = `${BASE_URL}/suggestion/explanation`;
var LOG_SUGGESTION_ENDPOINT = `${BASE_URL}/logs/suggestion`;
var LOG_LINE_SUGGESTION_ENDPOINT = `${BASE_URL}/logs/line-suggestion`;
var HINT_ENDPOINT = `${BASE_URL}/suggestion/hint`;
var LOG_ENDPOINT = `${BASE_URL}/logs`;
var USER_ENDPOINT = `${BASE_URL}/users`;
var ANSWER_ENDPOINT = `${BASE_URL}/suggestion/answer`;

// src/api/log-api.ts
function trackEvent(logData) {
  const logDataForBackend = convertToSnakeCase(logData);
  console.log("Logging data for event:", logDataForBackend.event);
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logDataForBackend)
  }).catch((err) => console.error("Failed to log data:", err));
}
async function getLogsByUser(userId, userSectionId, userClassId) {
  try {
    const url = new URL(`${LOG_ENDPOINT}/${userId}`);
    if (userSectionId) {
      url.searchParams.append("user_section_id", userSectionId);
    }
    if (userClassId) {
      url.searchParams.append("user_class_id", userClassId);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }
    const data = await response.json();
    return { logs: data.data };
  } catch (error) {
    console.error("Error fetching logs:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// src/api/suggestion-api.ts
async function fetchSuggestions(prompt) {
  try {
    const settings = getSettings();
    const startTime = Date.now();
    let elapsedTime = null;
    const vendor = settings["vendor"] || "google";
    const model = settings["model"] || "gemini-2.0-flash";
    if (!vendor || !model) {
      console.error("Invalid vendor or model:", vendor, model);
      return {
        error: "Invalid vendor or model"
      };
    }
    const response = await fetch(AI_SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        vendor,
        model,
        isIntervened: false
      })
    });
    const endTime = Date.now();
    elapsedTime = endTime - startTime;
    if (!response.ok) {
      return {
        error: `Error: ${response.status} ${response.statusText}`
      };
    }
    const data = await response.json();
    if (!data.data) {
      return { error: "Invalid response: Missing suggestions" };
    }
    const suggestions = data.data?.response;
    if (!suggestions || suggestions.length === 0) {
      return { error: "No suggestions found" };
    }
    const logData = {
      event: "MODEL_GENERATE" /* MODEL_GENERATE */,
      timeLapse: elapsedTime,
      metadata: {
        suggestions,
        vendor,
        model
      }
    };
    trackEvent(logData);
    return { suggestions };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
async function refinePrompt(rawPrompt) {
  try {
    const response = await fetch(REFINE_PROMPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawPrompt })
    });
    const data = await response.json();
    const refinedPrompt = data?.data?.refinedPrompt;
    if (!response.ok || !refinedPrompt) {
      return {
        error: data.error || "Failed to refine prompt"
      };
    }
    return { refinedPrompt };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Prompt refinement failed"
    };
  }
}
async function saveSuggestionToDatabase(suggestion) {
  const body = JSON.stringify(suggestion);
  try {
    const response = await fetch(LOG_SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return {
      status: response.status,
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error("Error saving suggestion: ", error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}
async function updateSuggestionInDatabase(suggestionId, update) {
  try {
    const response = await fetch(`${LOG_SUGGESTION_ENDPOINT}/${suggestionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    });
    if (!response.ok) {
      throw new Error(
        `Update failed: ${response.status} ${response.statusText}`
      );
    }
    return { status: response.status, success: true };
  } catch (err) {
    console.error("Error updating suggestion:", err);
    return { status: 500, success: false, error: err.message };
  }
}
async function logLineSuggestionToDatabase(suggestion) {
  try {
    const response = await fetch(LOG_LINE_SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestion)
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return {
      status: response.status,
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error("Error logging line suggestion:", error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}
async function getHint(request) {
  const body = JSON.stringify(request);
  try {
    const response = await fetch(HINT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    if (!result || !result.data) {
      throw new Error("Invalid response from server");
    }
    const { data } = result;
    return {
      status: response.status,
      success: true,
      data: data.hint
    };
  } catch (error) {
    console.error("Error getting hint: ", error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}
async function getExplanation(request) {
  const body = JSON.stringify(request);
  console.log(JSON.stringify(request, null, 2));
  try {
    const response = await fetch(EXPLANATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    if (!result || !result.data) {
      throw new Error("Invalid response from server");
    }
    const { data } = result;
    return {
      status: response.status,
      success: true,
      data: data.explanation
    };
  } catch (error) {
    console.error("Error getting explanation: ", error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}
async function submitCode(wrongCode, fixedCode, prompt) {
  try {
    const response = await fetch(ANSWER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        wrongCode,
        fixedCode,
        prompt
      })
    });
    const data = await response.json();
    return data.data.isCorrect;
  } catch (error) {
    console.error("Error submitting fix:", error);
    return false;
  }
}
var intervenedCache = [];
var intervenedIndex = 0;
function resetIntervenedCache() {
  intervenedCache = [];
  intervenedIndex = 0;
}
async function fetchIntervenedSuggestions(prompt) {
  let index;
  if (intervenedCache.length > 0) {
    if (intervenedIndex < intervenedCache.length) {
      const suggestion2 = intervenedCache[intervenedIndex];
      index = intervenedIndex;
      intervenedIndex++;
      if (intervenedIndex >= intervenedCache.length) {
        intervenedCache = [];
        intervenedIndex = 0;
      }
      console.log("Fetching from CACHE");
      return {
        suggestion: suggestion2,
        suggestionItems: intervenedCache,
        intervenedIndex: index
      };
    }
    intervenedCache = [];
    intervenedIndex = 0;
  }
  const settings = getSettings();
  const startTime = Date.now();
  let elapsedTime = null;
  const vendor = settings["vendor"] || "google";
  const model = settings["model"] || "gemini-2.0-flash";
  if (!vendor || !model) {
    console.error("Invalid vendor or model:", vendor, model);
    return {
      error: "Invalid vendor or model"
    };
  }
  const response = await fetch(AI_SUGGESTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      vendor: settings.vendor || "google",
      model: settings.model || "gemini-2.0-flash",
      isIntervened: true
    })
  });
  const endTime = Date.now();
  elapsedTime = endTime - startTime;
  if (!response.ok) {
    return { error: `Error: ${response.status} ${response.statusText}` };
  }
  const data = await response.json();
  if (!data.data?.response?.length) {
    return { error: "No intervened suggestions found" };
  }
  intervenedCache = data.data.response;
  intervenedIndex = 0;
  index = intervenedIndex;
  const logData = {
    event: "MODEL_GENERATE" /* MODEL_GENERATE */,
    timeLapse: elapsedTime,
    metadata: {
      suggestions: intervenedCache,
      vendor,
      model
    }
  };
  trackEvent(logData);
  const suggestion = intervenedCache[intervenedIndex];
  intervenedIndex++;
  console.log("Fetching from NEW");
  return {
    suggestion,
    suggestionItems: intervenedCache,
    intervenedIndex: index
  };
}

// src/services/incorrect-tracker-service.ts
var incorrectUserChoices = /* @__PURE__ */ new Map();
function getIncorrectChoices(userId) {
  return incorrectUserChoices.get(userId) || [];
}

// src/services/auth-service.ts
var vscode3 = __toESM(require("vscode"));

// src/api/types/user.ts
var AUTH_CONTEXT = "authContext";

// src/api/user-api.ts
async function getUserStatus(userId, classId) {
  try {
    if (!classId) {
      return { data: "ACTIVE" /* ACTIVE */ };
    }
    const url = new URL(`${USER_ENDPOINT}/${userId}/class-status`);
    if (classId) {
      url.searchParams.append("class_id", classId);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.message || `Failed to get user class status: ${response.status} ${response.statusText}`
      };
    }
    if (!data.data || data.data.user_class_status === void 0) {
      return { error: "Invalid response: Missing user status" };
    }
    return { data: data.data.user_class_status.user_class_status };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function updateUserStatus(userId, status, userClassId) {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, userClassId })
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.message || `Failed to update user status: ${response.status} ${response.statusText}`
      };
    }
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function getUserByID(userID) {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userID}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.message || `Failed to get user: ${response.status} ${response.statusText}`
      };
    }
    if (!data.data) {
      return { error: "Invalid response: Missing user data" };
    }
    const userData = data.data;
    const user = {
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      isLocked: userData.is_locked,
      code_context_id: userData.code_context_id,
      isAuthenticated: true,
      userStatus: userData.status,
      role: userData.role,
      settings: userData.settings
    };
    return { user };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function getUserSection(userId, classId) {
  try {
    const url = new URL(`${USER_ENDPOINT}/${userId}/sections`);
    if (classId) {
      url.searchParams.append("class_id", classId);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.error || `Failed to get user section: ${response.status} ${response.statusText}`
      };
    }
    if (!data.data.user_section_id) {
      return { error: "Invalid response: Missing user_section_id" };
    }
    return { userSectionId: data.data.user_section_id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function updateUserSection(userId, status, userSectionId) {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userId}/sections`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        userSectionId
      })
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.error || `Failed to update/create user section: ${response.status} ${response.statusText}`
      };
    }
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function getUserClasses(userId) {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userId}/classes`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.message || `Failed to get user classes: ${response.status} ${response.statusText}`
      };
    }
    if (!Array.isArray(data.data)) {
      return { error: "Invalid response: expected an array of classes" };
    }
    const classes = data.data.map((item) => {
      const classItem = item.userClass;
      return {
        id: classItem.id,
        classTitle: classItem.class_title,
        classCode: classItem.class_code,
        instructorId: classItem.instructor_id,
        classHexColor: classItem.class_hex_color,
        classImageCover: classItem.class_image_cover,
        createdAt: classItem.created_at
      };
    });
    return { data: classes };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}

// src/api/auth-api.ts
async function signIn(email, password) {
  try {
    const response = await fetch(`${AUTH_ENDPOINT}/login?provider=email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    const data = await response.json();
    if (!response.ok || !data.data) {
      return { error: data.message || `Failed to Sign in: ${response.status} ${response.statusText}` };
    }
    return data.data;
  } catch (err) {
    console.error("Error signing in:", err);
    return { error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}
async function signUp(email, password, firstName, lastName) {
  try {
    const response = await fetch(`${AUTH_ENDPOINT}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName
      })
    });
    const data = await response.json();
    if (!response.ok || !data.data) {
      throw new Error(data.error || "Failed to sign up");
    }
    return { token: data.data.token };
  } catch (err) {
    console.error("Error signing up:", err);
    return { error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}

// src/views/notifications.ts
var vscode2 = __toESM(require("vscode"));
var showErrors = true;
async function errorNotification(message) {
  console.error(message);
  if (!showErrors) {
    return;
  }
  vscode2.window.showErrorMessage(message, { modal: false });
}
async function authNotification() {
  const choice = await vscode2.window.showInformationMessage(
    "You are not authenticated. Please sign in to track your progress!",
    "Sign In",
    "Sign Up"
  );
  if (choice === "Sign In") {
    await signInMenu();
  } else if (choice === "Sign Up") {
    await handleSignUp();
  }
}
async function authSignOutNotification(messsage) {
  const signOutChoice = await vscode2.window.showInformationMessage(
    `${messsage}`,
    "Sign Out"
  );
  if (signOutChoice === "Sign Out") {
    await handleSignOut();
  }
}
async function showAuthNotification(message) {
  const notification = vscode2.window.createStatusBarItem(
    vscode2.StatusBarAlignment.Right,
    90
  );
  notification.text = `$(info) ${message}`;
  notification.color = new vscode2.ThemeColor("statusBarItem.warningForeground");
  notification.backgroundColor = new vscode2.ThemeColor(
    "statusBarItem.warningBackground"
  );
  notification.show();
  setTimeout(() => {
    notification.hide();
    notification.dispose();
  }, 2e3);
}
async function notifyUser(message, url, isModal = false) {
  const { context, error } = await getAuthContext();
  if (error) {
    errorNotification(error);
    return;
  }
  if (!context) {
    authNotification();
    return;
  }
  if (!context.settings.show_notifications) {
    return;
  }
  vscode2.window.showInformationMessage(message, { modal: isModal }, "Review", "Ignore").then((selection) => {
    if (selection === "Review") {
      vscode2.env.openExternal(
        vscode2.Uri.parse(url || "https://clover.nickrucinski.com/")
      );
    }
  });
}

// src/services/auth-service.ts
async function setAuthContext(user) {
  try {
    if (!globalContext) {
      throw new Error("Invalid user or context provided.");
    }
    await globalContext.globalState.update(AUTH_CONTEXT, user);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function getAuthContext() {
  try {
    const context = globalContext.globalState.get(
      AUTH_CONTEXT
    );
    return { context };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
async function checkUserSignIn() {
  const { context: user, error } = await getAuthContext();
  if (error) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  if (user === void 0) {
    await authNotification();
    return;
  }
  await getUserByID(user.id).then(async ({ user: user2, error: error2 }) => {
    if (error2) {
      await errorNotification(`Failed to get user data: ${error2}`);
      return;
    }
    setAuthContext(user2);
  });
  if (user.isAuthenticated) {
    await showAuthNotification(`Welcome back, ${user.first_name}! \u{1F389}`);
    return;
  }
}
async function signInOrUpMenu() {
  const { context: user, error } = await getAuthContext();
  if (error) {
    errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  if (user && user.isAuthenticated) {
    await authSignOutNotification(
      `You are already signed in as ${user.email}.`
    );
  } else {
    const signInMethod = await vscode3.window.showQuickPick(
      ["Sign in", "Sign up"],
      { placeHolder: "Sign in or create an account" }
    );
    if (signInMethod === "Sign in") {
      signInMenu();
    } else if (signInMethod === "Sign up") {
      handleSignUp();
    }
  }
}
async function signOutMenu() {
  const { context: user, error } = await getAuthContext();
  if (error) {
    vscode3.window.showErrorMessage(`Failed to get user context: ${error}`);
    return;
  }
  if (!user || !user.isAuthenticated) {
    showAuthNotification(`You are already signed out.`);
    return;
  }
  await authSignOutNotification(`Are you sure you want to sign out?`);
}
async function signInMenu() {
  const action = await vscode3.window.showQuickPick(
    ["Sign In with Email", "Sign In with GitHub"],
    {
      placeHolder: "Select a sign-in method"
    }
  );
  if (!action) {
    return;
  }
  switch (action) {
    case "Sign In with Email":
      await handleSignIn();
      break;
    case "Sign In with GitHub":
      await signInWithGithub();
      break;
  }
}
async function handleSignIn() {
  const email = await vscode3.window.showInputBox({
    prompt: "Enter your email",
    placeHolder: "sample@gmail.com"
  });
  if (!email) {
    return;
  }
  const password = await vscode3.window.showInputBox({
    prompt: "Enter your password",
    placeHolder: "password",
    password: true
  });
  if (!password) {
    return;
  }
  const { token, error } = await signIn(email, password);
  if (error || !token) {
    vscode3.window.showErrorMessage(
      `Sign In failed. Email or password may be incorrect.`
    );
    const choice = await vscode3.window.showInformationMessage(
      "Account not found. Would you like to sign up with this Email and Password?",
      "Yes",
      "No"
    );
    if (choice === "Yes") {
      await handleSignUpProvided(email, password);
    }
    return;
  }
  const { user, error: getUserError } = await getUserByID(token);
  if (getUserError || !user) {
    vscode3.window.showErrorMessage(`Failed to get user data: ${getUserError}`);
    return;
  }
  user.isAuthenticated = true;
  const { error: authError } = await setAuthContext(user);
  if (authError) {
    vscode3.window.showErrorMessage(`Failed to set user context: ${authError}`);
    return;
  }
  await showAuthNotification("Sign In successfully! \u{1F389}");
  vscode3.commands.executeCommand("clover.authStateChanged");
  trackEvent({
    event: "USER_LOGIN" /* USER_LOGIN */,
    timeLapse: 0,
    metadata: { user_id: user.id, email }
  });
}
async function handleSignUpProvided(email, password) {
  const firstName = await vscode3.window.showInputBox({
    prompt: "Enter your first name",
    placeHolder: "Example: John"
  });
  if (!firstName) {
    return;
  }
  const lastName = await vscode3.window.showInputBox({
    prompt: "Enter your last name",
    placeHolder: "Example: Doe"
  });
  if (!lastName) {
    return;
  }
  const { token, error } = await signUp(email, password, firstName, lastName);
  if (error || !token) {
    vscode3.window.showErrorMessage(`Sign Up failed.`);
    return;
  }
  const { user, error: getUserError } = await getUserByID(token);
  if (getUserError || !user) {
    vscode3.window.showErrorMessage(`Failed to get user data: ${getUserError}`);
    return;
  }
  user.isAuthenticated = true;
  const { error: authError } = await setAuthContext(user);
  if (authError) {
    vscode3.window.showErrorMessage(`Failed to set user context: ${authError}`);
    return;
  }
  await showAuthNotification("Sign Up successfully! \u{1F389}");
  vscode3.commands.executeCommand("clover.authStateChanged");
  trackEvent({
    event: "USER_SIGNUP" /* USER_SIGNUP */,
    timeLapse: 0,
    metadata: { user_id: user.id, email }
  });
}
async function handleSignOut() {
  const { context: user, error: contextError } = await getAuthContext();
  if (contextError || !user) {
    await errorNotification(`Failed to get user context: ${contextError}`);
    return;
  }
  const { error: setAuthError } = await setAuthContext(void 0);
  if (setAuthError) {
    await errorNotification(`Failed to set user context: ${setAuthError}`);
    return;
  }
  await showAuthNotification(`Sign Out Successfully! \u{1F44B}`);
  vscode3.commands.executeCommand("clover.authStateChanged");
  trackEvent({
    event: "USER_LOGOUT" /* USER_LOGOUT */,
    timeLapse: 0,
    metadata: { user_id: user.id }
  });
}
async function handleSignUp() {
  const firstName = await vscode3.window.showInputBox({
    prompt: "Enter your first name",
    placeHolder: "Example: John"
  });
  if (!firstName) {
    return;
  }
  const lastName = await vscode3.window.showInputBox({
    prompt: "Enter your last name",
    placeHolder: "Example: Doe"
  });
  if (!lastName) {
    return;
  }
  const email = await vscode3.window.showInputBox({
    prompt: "Enter your email",
    placeHolder: "sample@gmail.com"
  });
  if (!email) {
    return;
  }
  const password = await vscode3.window.showInputBox({
    prompt: "Enter your password",
    placeHolder: "password",
    password: true
  });
  if (!password) {
    return;
  }
  const { token, error } = await signUp(email, password, firstName, lastName);
  if (error || !token) {
    await errorNotification(`Sign Up failed: ${error}`);
    await authNotification();
  } else {
    const { user, error: getUserError } = await getUserByID(token);
    if (getUserError || !user) {
      await errorNotification(`Failed to get user data: ${getUserError}`);
      await authNotification();
      return;
    }
    await showAuthNotification("Sign Up successfully! \u{1F389}");
    const { error: error2 } = await setAuthContext(user);
    if (error2) {
      await errorNotification(`Failed to register user in backend: ${error2}`);
    }
    vscode3.commands.executeCommand("clover.authStateChanged");
    trackEvent({
      event: "USER_SIGNUP" /* USER_SIGNUP */,
      timeLapse: 0,
      metadata: { user_id: user.id, email }
    });
  }
}
async function signInWithGithub() {
  try {
    await vscode3.env.openExternal(
      vscode3.Uri.parse(
        `https://backend-639487598928.us-east5.run.app/auth/login?provider=github&next=vscode://capstone-team-2.temple-capstone-clover/auth-complete`
      )
    );
  } catch (error) {
    await errorNotification(`GitHub Sign In failed: ${error.message}`);
    await authNotification();
  }
}

// src/commands/test-commands.ts
var testFetchCommand = vscode4.commands.registerCommand(
  "collabAgent.testFetch",
  async () => {
    const userInput = await vscode4.window.showInputBox({
      prompt: "Enter prompt for suggestion."
    });
    if (userInput) {
      try {
        const { suggestions, error } = await fetchSuggestions(userInput);
        if (error) {
          vscode4.window.showErrorMessage(`Error: ${error}`);
          return;
        }
        if (!suggestions) {
          vscode4.window.showErrorMessage("No suggestions received.");
          return;
        }
        vscode4.window.showInformationMessage(
          `Suggestions: ${suggestions.join(", ")}`
        );
      } catch (error) {
        vscode4.window.showErrorMessage(`Error: ${error}`);
      }
    }
  }
);
var incorrectChoicesCommand = vscode4.commands.registerCommand(
  "clover.viewIncorrectChoices",
  async () => {
    const userId = "12345";
    const incorrectChoices = getIncorrectChoices(userId);
    if (incorrectChoices.length === 0) {
      vscode4.window.showInformationMessage(
        "User does has not chosen an incorrect code suggestion."
      );
    } else {
      vscode4.window.showInformationMessage(
        `Incorrect Choices:
${incorrectChoices.map((choice) => `- ${choice.suggestion}`).join("\n")}`
      );
    }
  }
);
var fetchSettingsCommand = vscode4.commands.registerCommand(
  "collabAgent.fetchSettings",
  async () => {
    await checkUserSignIn();
  }
);

// src/commands/auth-commands.ts
var vscode5 = __toESM(require("vscode"));
var signInCommand = vscode5.commands.registerCommand(
  "collabAgent.signIn",
  async () => signInOrUpMenu()
);
var signOutCommand = vscode5.commands.registerCommand(
  "collabAgent.signOut",
  async () => signOutMenu()
);
var handleAuthUri = async (uri) => {
  if (uri.path === "/auth-complete") {
    const urlParams = new URLSearchParams(uri.query);
    const token = urlParams.get("id");
    if (!token) {
      await errorNotification("No token found in URL.");
      return;
    }
    try {
      const { user, error } = await getUserByID(token);
      if (error || !user) {
        await errorNotification(`Failed to get user data: ${error}`);
        return;
      }
      user.isAuthenticated = true;
      const { error: authError } = await setAuthContext(user);
      if (authError) {
        await errorNotification(`Failed to set user context: ${authError}`);
        return;
      }
      await showAuthNotification(`Sign In successfully! \u{1F389}`);
      vscode5.commands.executeCommand("clover.authStateChanged");
    } catch (err) {
      await errorNotification(`Unexpected error: ${err.message}`);
    }
  }
};
var uriHandlerCommand = vscode5.window.registerUriHandler({
  handleUri: handleAuthUri
});
function createAuthStatusBarItem(context) {
  const authStatusBarItem = vscode5.window.createStatusBarItem(
    vscode5.StatusBarAlignment.Right,
    100
  );
  authStatusBarItem.name = "Clover Authentication";
  authStatusBarItem.backgroundColor = new vscode5.ThemeColor(
    "statusBarItem.errorBackground"
  );
  authStatusBarItem.show();
  const updateAuthStatus = async () => {
    const { context: user } = await getAuthContext();
    if (user?.isAuthenticated) {
      authStatusBarItem.text = `$(sign-out) Sign Out`;
      authStatusBarItem.tooltip = `Signed in as ${user.email}`;
      authStatusBarItem.command = "clover.signOut";
      authStatusBarItem.backgroundColor = new vscode5.ThemeColor(
        "statusBarItem.errorBackground"
      );
    } else {
      authStatusBarItem.text = `$(key) Sign In / Sign Up`;
      authStatusBarItem.tooltip = "Authenticate with Clover";
      authStatusBarItem.command = "clover.signIn";
      authStatusBarItem.backgroundColor = new vscode5.ThemeColor(
        "statusBarItem.warningBackground"
      );
    }
  };
  updateAuthStatus();
  context.subscriptions.push(
    authStatusBarItem,
    vscode5.commands.registerCommand("clover.showAuthOptions", async () => {
      const choice = await vscode5.window.showQuickPick(
        ["Sign In with GitHub", "Sign In with Email", "Sign Up"],
        { placeHolder: "Select authentication method" }
      );
      if (choice === "Sign In with GitHub") {
        vscode5.commands.executeCommand("clover.githubLogin");
      } else if (choice === "Sign In with Email") {
        vscode5.commands.executeCommand("clover.emailLogin");
      } else if (choice === "Sign Up") {
        vscode5.commands.executeCommand("clover.signUp");
      }
    }),
    vscode5.commands.registerCommand("clover.authStateChanged", updateAuthStatus)
  );
  return authStatusBarItem;
}

// src/commands/suggestion-commands.ts
var vscode10 = __toESM(require("vscode"));

// src/services/user-service.ts
function calculateUserProgress(logs) {
  const acceptedLogs = logs.filter((log) => log.event === "USER_ACCEPT" /* USER_ACCEPT */);
  const totalAccepted = acceptedLogs.length;
  const totalWithBugs = acceptedLogs.filter(
    (log) => log.metadata.has_bug === true
  ).length;
  const percentageWithBugs = totalAccepted > 0 ? totalWithBugs / totalAccepted * 100 : 0;
  return {
    totalAccepted,
    totalWithBugs,
    percentageWithBugs
  };
}

// src/utils/userClass.ts
var vscode6 = __toESM(require("vscode"));
var tempSelectedClass = null;
function getSelectedClass() {
  return tempSelectedClass;
}
function setSelectedClass(cls) {
  tempSelectedClass = cls;
}
function registerClassSelectorCommand(context, statusBarItem) {
  const disposable = vscode6.commands.registerCommand(
    "your-extension.selectClass",
    async () => {
      const { context: user, error: authError } = await getAuthContext();
      if (authError || user === void 0) {
        vscode6.window.showErrorMessage(
          `Failed to get user context: ${authError}`
        );
        return;
      }
      const { data: userClasses, error: classError } = await getUserClasses(
        user.id
      );
      if (classError?.includes("No classes found") || !userClasses || userClasses.length === 0) {
        const selection = await vscode6.window.showInformationMessage(
          "You have no registered classes. Would you like to register one now?",
          { modal: true },
          "Open CLOVER"
        );
        if (selection === "Open CLOVER") {
          vscode6.env.openExternal(
            vscode6.Uri.parse("https://clover.nickrucinski.com/")
          );
        }
        setSelectedClass(null);
        statusBarItem.text = `\u{1F4D8} SELECT CLASS \u2304`;
        statusBarItem.color = "#FF8C00";
        return;
      }
      if (classError) {
        vscode6.window.showErrorMessage(`Error fetching classes: ${classError}`);
        return;
      }
      const picked = await vscode6.window.showQuickPick(
        [
          {
            label: "\u{1F6AB} No class",
            description: "You are not assigned to any class"
          },
          ...userClasses.map((c) => ({
            label: `${getColorCircle(c.classHexColor)} ${c.classTitle}`,
            originalTitle: c.classTitle,
            description: c.classCode,
            color: c.classHexColor
          }))
        ],
        { placeHolder: "Select the class you are working on" }
      );
      if (picked) {
        if (picked.label === "\u{1F6AB} No class") {
          setSelectedClass(null);
          statusBarItem.text = `\u{1F4D8} SELECT CLASS \u2304`;
        }
        const selectedClass = userClasses.find(
          (c) => c.classTitle === picked.originalTitle
        );
        if (selectedClass) {
          setSelectedClass(selectedClass);
          statusBarItem.text = `\u{1F4D8} CLASS: ${selectedClass.classTitle.toUpperCase()}`;
          statusBarItem.color = selectedClass.classHexColor || "#FF8C00";
        }
        await updateClassStatus(statusBarItem);
      }
      if (tempSelectedClass) {
        statusBarItem.text = `\u{1F4D8} CLASS: ${tempSelectedClass.classTitle.toUpperCase()}`;
        statusBarItem.color = tempSelectedClass.classHexColor;
      } else {
        statusBarItem.text = `\u{1F4D8} SELECT CLASS \u2304`;
        statusBarItem.color = "#FF8C00";
      }
    }
  );
  context.subscriptions.push(disposable);
}
async function setupClassStatusBarItem() {
  const statusBarItem = vscode6.window.createStatusBarItem(
    vscode6.StatusBarAlignment.Left,
    1
  );
  statusBarItem.tooltip = "\u{1F4D8} Click to change the active class";
  statusBarItem.command = "your-extension.selectClass";
  statusBarItem.show();
  await updateClassStatus(statusBarItem);
  return statusBarItem;
}
async function updateClassStatus(statusBarItem) {
  const selectedClass = getSelectedClass();
  if (selectedClass) {
    statusBarItem.text = `\u{1F4D8} CLASS: ${selectedClass.classTitle.toUpperCase()}`;
    if (selectedClass.classHexColor) {
      statusBarItem.color = selectedClass.classHexColor || "#FF8C00";
    }
  } else {
    statusBarItem.text = `\u{1F4D8} SELECT CLASS \u2304`;
    statusBarItem.color = "#FF8C00";
  }
}

// src/services/log-service.ts
var logSuggestionEvent = async (accepted, context) => {
  const { suggestionId, hasBug, startTime } = context;
  const elapsedTime = Date.now() - startTime;
  const { context: user, error } = await getAuthContext();
  if (error || user === void 0) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  const userId = user.id;
  const selectedClass = getSelectedClass();
  let userSection;
  try {
    userSection = await getUserSection(user.id, selectedClass?.id);
  } catch (error2) {
    await errorNotification(`Failed to get user section: ${error2}`);
    return;
  }
  let finalHasBug = hasBug;
  let logEventType = accepted ? "USER_ACCEPT" /* USER_ACCEPT */ : "USER_REJECT" /* USER_REJECT */;
  const response = await getUserStatus(user.id, selectedClass?.id);
  const userClassStatus = response.data || null;
  const status = userClassStatus ?? user.userStatus;
  if (status === "SUSPENDED" /* SUSPENDED */) {
    logEventType = "USER_ACCEPT" /* USER_ACCEPT */;
    finalHasBug = !accepted;
  }
  const logData = {
    event: logEventType,
    timeLapse: elapsedTime,
    metadata: {
      user_id: userId,
      suggestion_id: suggestionId,
      has_bug: finalHasBug,
      user_section_id: userSection.userSectionId,
      user_class_id: selectedClass?.id
    }
  };
  trackEvent(logData);
  const { logs, error: getLogsError } = await getLogsByUser(
    user.id,
    userSection.userSectionId
  );
  if (getLogsError || logs === null || logs === void 0 || logs.length < 2) {
    return;
  }
  await evaluateUserProgress(
    user,
    logs,
    userSection.userSectionId,
    selectedClass?.id
  );
};
var logLineSuggestionEvent = async (accepted, context) => {
  const { suggestionId, hasBug, startTime } = context;
  const elapsedTime = Date.now() - startTime;
  const { context: user, error } = await getAuthContext();
  if (error || user === void 0) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  const userId = user.id;
  const selectedClass = getSelectedClass();
  let userSection;
  try {
    userSection = await getUserSection(user.id, selectedClass?.id);
  } catch (error2) {
    await errorNotification(`Failed to get user section: ${error2}`);
    return;
  }
  let logEventType = accepted ? "USER_LINE_ACCEPT" /* USER_LINE_ACCEPT */ : "USER_LINE_REJECT" /* USER_LINE_REJECT */;
  const logData = {
    event: logEventType,
    timeLapse: elapsedTime,
    metadata: {
      user_id: userId,
      line_suggestion_id: suggestionId,
      has_bug: hasBug,
      user_section_id: userSection.userSectionId,
      user_class_id: selectedClass?.id
    }
  };
  trackEvent(logData);
};
async function evaluateUserProgress(user, logs, userSectionId, userClassId) {
  const {
    id,
    userStatus,
    settings: {
      active_threshold,
      enable_quiz,
      suspend_threshold,
      pass_rate,
      suspend_rate
    }
  } = user;
  if (!enable_quiz) {
    return;
  }
  const ACTIVE_THRESHOLD = active_threshold;
  const SUSPEND_THRESHOLD = suspend_threshold;
  const PASS_RATE = pass_rate;
  const SUSPEND_RATE = suspend_rate;
  const { totalAccepted, totalWithBugs, percentageWithBugs } = calculateUserProgress(logs);
  const bugFreeRate = 100 - percentageWithBugs;
  const response = await getUserStatus(user.id, userClassId);
  const userClassStatus = response.data || null;
  const status = userClassStatus ?? userStatus;
  const threshold = status === "SUSPENDED" /* SUSPENDED */ ? SUSPEND_THRESHOLD : ACTIVE_THRESHOLD;
  if (totalAccepted < threshold) {
    return;
  }
  if (bugFreeRate >= PASS_RATE) {
    await updateUserSection(id, "COMPLETE" /* COMPLETE */, userSectionId);
    await notifyUser(
      "Congrats! You've earned a badge!",
      "https://clover.nickrucinski.com/"
    );
  } else if (bugFreeRate >= SUSPEND_RATE) {
    if (status === "ACTIVE" /* ACTIVE */) {
      await updateUserStatus(id, "SUSPENDED" /* SUSPENDED */, userClassId);
      await notifyUser(
        "We're currently slowing you down with suggestions. Please review the next 10 suggestions carefully to improve your progress."
      );
      return;
    }
    await updateUserSection(id, "NEED_REVIEW" /* NEED_REVIEW */, userSectionId);
    await updateUserStatus(id, "LOCKED" /* LOCKED */, userClassId);
  } else {
    await updateUserSection(id, "NEED_REVIEW" /* NEED_REVIEW */, userSectionId);
    await updateUserStatus(id, "LOCKED" /* LOCKED */, userClassId);
  }
}

// src/services/suggestion-service.ts
var vscode9 = __toESM(require("vscode"));

// src/views/CodeCorrectionView.ts
var vscode7 = __toESM(require("vscode"));
var createCodeCorrectionWebview = (wrongCode, hint, suggestionContext2) => {
  const startTime = Date.now();
  const panel = vscode7.window.createWebviewPanel(
    "codeCorrection",
    "Code Review & Fix",
    vscode7.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case "submitFix":
          const fixedCode = message.code;
          const elapsedTime = Date.now() - startTime;
          const result = await submitCode(
            wrongCode,
            fixedCode,
            suggestionContext2.prompt ?? ""
          );
          panel.webview.postMessage({
            command: "showResult",
            result: result ? "Your fix is correct! \u2705" : "Your fix is incorrect. \u274C"
          });
          const { context: user, error } = await getAuthContext();
          if (error || user === void 0) {
            console.error(
              "Failed to get user context for logging suggestion event."
            );
            return;
          }
          const userId = user.id;
          const logData = {
            event: result ? "USER_ANSWER_CORRECT" /* USER_ANSWER_CORRECT */ : "USER_ANSWER_INCORRECT" /* USER_ANSWER_INCORRECT */,
            timeLapse: elapsedTime,
            metadata: {
              user_id: userId,
              suggestion_id: suggestionContext2.suggestionId,
              has_bug: suggestionContext2.hasBug
            }
          };
          trackEvent(logData);
          break;
      }
    },
    void 0,
    globalContext.subscriptions
  );
  panel.webview.html = getCorrectionWebviewContent(wrongCode, hint);
};
var getCorrectionWebviewContent = (wrongCode, hint) => {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Review & Fix</title>
            <style>
                :root {
                    --container-padding: 20px;
                    --section-padding: 16px;
                    --border-radius: 8px;
                    --border-color: #e1e4e8;
                    --section-margin: 12px;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: var(--container-padding);
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    color: #333;
                    background-color: #0e0e0e;
                    box-sizing: border-box;
                }
                
                .content {
                    flex: 1;
                    overflow: auto;
                    padding-bottom: 80px; /* Space for fixed footer */
                }
                
                .section {
                    background: white;
                    padding: var(--section-padding);
                    margin-bottom: var(--section-margin);
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                
                .code-section {
                    background-color: #f5f5f5;
                    font-family: 'Courier New', monospace;
                    white-space: pre;
                    padding: 12px;
                    border-radius: var(--border-radius);
                    overflow-x: auto;
                    color: #333;
                    border: 1px solid var(--border-color);
                    margin-top: 8px;
                }
                
                .explanation {
                    background-color: #fff8e1;
                    border-left: 4px solid #ffc107;
                }
                
                .code-editor {
                    min-height: 200px;
                    width: 100%;
                    font-family: 'Courier New', monospace;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    padding: 12px;
                    resize: vertical;
                    background-color: #f8f8f8;
                    color: #333;
                    margin-top: 8px;
                    box-sizing: border-box;
                }
                
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 16px var(--container-padding);
                    display: flex;
                    justify-content: flex-end;
                    box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
                }
                
                .submit-button {
                    padding: 8px 24px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                
                .submit-button:hover {
                    background-color: #45a049;
                }

                .submit-button:disabled {
                    background-color: #a5d6a7;
                    cursor: not-allowed;
                }
                
                h3 {
                    margin: 0 0 8px 0;
                    color: #24292e;
                    font-size: 16px;
                }
                
                #resultContainer {
                    display: none;
                    padding: var(--section-padding);
                    background-color: #e8f5e9;
                    border-left: 4px solid #4CAF50;
                    border-radius: var(--border-radius);
                    margin: var(--section-margin) 0;
                }
            </style>
        </head>
        <body>
            <div class="content">
                <div class="section">
                    <h3>Code With Potential Issues</h3>
                    <div class="code-section">${escapeHtml(wrongCode)}</div>
                </div>

                <div class="section explanation">
                    <h3>Hint:</h3>
                    <p>${hint}</p>
                </div>

                <div class="section">
                    <h3>Fix the Code</h3>
                    <textarea id="codeEditor" class="code-editor">${escapeHtml(
    wrongCode
  )}</textarea>
                </div>

                <div id="resultContainer"></div>
            </div>

            <div class="footer">
                <button class="submit-button" id="submitButton">Submit</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const submitButton = document.getElementById('submitButton');
                const codeEditor = document.getElementById('codeEditor');
                const resultContainer = document.getElementById('resultContainer');

                submitButton.addEventListener('click', () => {
                    submitButton.disabled = true; 
                    submitButton.textContent = "Submitting...";

                    const fixedCode = codeEditor.value;
                    vscode.postMessage({
                        command: 'submitFix',
                        code: fixedCode
                    });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'showResult') {
                        resultContainer.style.display = 'block';
                        resultContainer.innerHTML = \`
                            <h3>Result</h3>
                            <p>\${message.result}</p>
                        \`;
                        resultContainer.scrollIntoView({ behavior: 'smooth' });

                        submitButton.textContent = "Submit";
                    }
                });
            </script>
        </body>
        </html>
    `;
};

// src/views/CodeComparisonView.ts
var vscode8 = __toESM(require("vscode"));
var createCodeComparisonWebview = (rightCode, wrongCode, explanation) => {
  const panel = vscode8.window.createWebviewPanel(
    "codeComparison",
    "Code Comparison",
    vscode8.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  panel.webview.html = getComparisonWebviewContent(rightCode, wrongCode, explanation);
  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "closeWebview":
          panel.dispose();
          break;
      }
    },
    void 0,
    globalContext.subscriptions
  );
};
var getComparisonWebviewContent = (rightCode, wrongCode, explanation) => {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Comparison</title>
            <style>
                :root {
                    --container-padding: 20px;
                    --section-padding: 16px;
                    --border-radius: 8px;
                    --border-color: #e1e4e8;
                    --section-margin: 16px;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: var(--container-padding);
                    background-color: #0e0e0e;
                    color: #333;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    box-sizing: border-box;
                }
                
                .content {
                    flex: 1;
                    overflow: auto;
                    padding-bottom: 80px;
                }
                
                .code-block {
                    background: white;
                    padding: var(--section-padding);
                    margin-bottom: var(--section-margin);
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                
                .code-content {
                    background-color: #f5f5f5;
                    font-family: 'Courier New', monospace;
                    white-space: pre-wrap;
                    padding: 12px;
                    border-radius: calc(var(--border-radius) - 2px);
                    overflow-x: auto;
                    margin-top: 8px;
                    border: 1px solid var(--border-color);
                }
                
                h3 {
                    margin: 0 0 8px 0;
                    color: #24292e;
                    font-size: 16px;
                }

                .explanation {
                    background: rgb(224, 236, 255);
                    padding: var(--section-padding);
                    margin-bottom: var(--section-margin);
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border-left: 4px solid rgb(14, 145, 2);
                }
                
                .correct-header {
                    color: #2e7d32;
                }
                
                .incorrect-header {
                    color: #c62828;
                }
                
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: #0e0e0e;
                    padding: 16px var(--container-padding);
                    display: flex;
                    justify-content: flex-end;
                    box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
                }
                
                .close-button {
                    padding: 8px 24px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                
                .close-button:hover {
                    background-color: #45a049;
                }
            </style>
        </head>
        <body>
            <div class="content">
                <div class="code-block">
                    <h3 class="correct-header">Correct Code</h3>
                    <div class="code-content">${escapeHtml(rightCode)}</div>
                </div>
                
                <div class="code-block">
                    <h3 class="incorrect-header">Incorrect Code</h3>
                    <div class="code-content">${escapeHtml(wrongCode)}</div>
                </div>

                <div class="explanation">
                    <h3>Explanation</h3>
                    <div>${escapeHtml(explanation)}</div>
                </div>
            </div>
            
            <div class="footer">
                <button class="close-button" id="closeButton">Got it</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const closeButton = document.getElementById('closeButton');
                
                closeButton.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'closeWebview'
                    });
                });
            </script>
        </body>
        </html>
    `;
};

// src/services/suggestion-service.ts
var currentChoices = [];
var suggestionsToReview = [];
var debounceTimer = null;
var lastRequest = null;
var suggestionContext = {
  prompt: "",
  suggestions: [],
  intervenedSuggestions: [],
  suggestionId: "",
  hasBug: false,
  startTime: 0
};
var isSuspended;
var getPromptText = (document, position) => {
  const language = document.languageId;
  const fullText = document.getText();
  const cursorOffset = document.offsetAt(position);
  const before = fullText.slice(0, cursorOffset);
  const after = fullText.slice(cursorOffset);
  const prompt = `${before}# <<<FILL_HERE>>>
${after}`;
  return `Language ${language}. Prompt:
${prompt}`;
};
var resetSuggestionContext = () => {
  suggestionContext = {
    suggestions: [],
    intervenedSuggestions: [],
    suggestionId: "",
    hasBug: false,
    startTime: 0
  };
  suggestionsToReview = [];
};
var resetDebounceTimeout = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};
var lastSuggestionDurationMs = 0;
var setDebounceTimeout = (resolve) => {
  let typingPause = 1e3;
  getAuthenticatedUser().then(async (user) => {
    if (!user) {
      await authNotification();
      return;
    }
    typingPause = user.settings.intervened ? 500 : 700;
    debounceTimer = setTimeout(async () => {
      const requestStart = performance.now();
      if (shouldSkipSuggestion()) {
        return;
      }
      const status = await getAndHandleUserStatus(user.id);
      if (status === null) {
        return;
      }
      isSuspended = status === "SUSPENDED" /* SUSPENDED */;
      if (lastRequest) {
        await handleSuggestionRequest(
          user,
          lastRequest,
          isSuspended,
          (items) => {
            lastSuggestionDurationMs = performance.now() - requestStart;
            console.log(
              `Suggestion duration: ${lastSuggestionDurationMs.toFixed(1)} ms`
            );
            resolve(items);
          }
        );
      }
    }, typingPause);
  });
};
var setLastRequest = (document, position, context, token) => {
  lastRequest = { document, position, context, token };
};
function shouldSkipSuggestion() {
  return suggestionsToReview.length > 0;
}
async function getAuthenticatedUser() {
  const { context: user, error } = await getAuthContext();
  if (error || user === void 0) {
    await errorNotification(`Failed to get user context: ${error}`);
    return null;
  }
  if (!user.isAuthenticated) {
    const selection = await vscode9.window.showInformationMessage(
      "You are not authenticated. Please sign in to track your progress!",
      "Sign In"
    );
    if (selection === "Sign In") {
      handleSignIn();
    }
    return null;
  }
  return user;
}
async function getAndHandleUserStatus(userId) {
  const selectedClass = getSelectedClass();
  const { data: userStatus, error: statusError } = await getUserStatus(
    userId,
    selectedClass?.id
  );
  if (statusError) {
    await errorNotification(`Failed to get user status: ${statusError}`);
    return null;
  }
  const { context: user, error: authError } = await getAuthContext();
  if (authError || user === void 0) {
    await errorNotification(`Failed to get user context: ${authError}`);
    return null;
  }
  if (!user.settings.enable_quiz) {
    return "ACTIVE" /* ACTIVE */;
  }
  const status = userStatus ?? user.userStatus;
  if (status === "LOCKED" /* LOCKED */) {
    if (user.settings.show_notifications) {
      const selection = await vscode9.window.showInformationMessage(
        "Your suggestions are locked. Please review your progress to unlock it.",
        "Review",
        "Ignore"
      );
      if (selection === "Review") {
        vscode9.env.openExternal(
          vscode9.Uri.parse("https://clover.nickrucinski.com/")
        );
      }
    }
  }
  if (status !== void 0) {
    return status;
  }
  return null;
}
async function handleSuggestionRequest(user, request, isSuspended2, resolve) {
  if (!request) {
    return;
  }
  const prompt = getPromptText(request.document, request.position);
  if (!prompt || prompt.trim() === "") {
    return;
  }
  if (user.settings.intervened) {
    const { suggestion, suggestionItems, intervenedIndex: intervenedIndex2, error } = await fetchIntervenedSuggestions(prompt);
    if (error || !suggestion) {
      await errorNotification(`Failed to get intervened suggestions: ${error}`);
      return;
    }
    suggestionContext = {
      prompt,
      intervenedSuggestions: [suggestion],
      suggestions: [],
      hasBug: suggestion.hasBug,
      suggestionId: "",
      startTime: Date.now()
    };
    (async () => {
      try {
        const lineSuggestion = {
          mainLine: suggestion.mainLine,
          fixedLine: suggestion.fixedLine || "",
          hasBug: suggestion.hasBug,
          lineIndex: intervenedIndex2 || 0,
          suggestionItems: suggestionItems ?? null
        };
        const result = await logLineSuggestionToDatabase(lineSuggestion);
        if (result.success) {
          suggestionContext.suggestionId = result.data;
          console.log("Id is ", result.data);
        }
      } catch (err) {
        console.warn("Background line-suggestion logging failed:", err);
      }
    })();
    const completionItems = await buildIntervenedCompletionItems(suggestion);
    resolve(completionItems);
    return;
  } else {
    const { suggestions, error } = await fetchSuggestions(prompt);
    if (error || !suggestions?.length) {
      await errorNotification(`Failed to get code-block suggestions: ${error}`);
      return;
    }
    const hasBug = hasBugRandomly(user.settings.bug_percentage);
    const suggestion = {
      id: "",
      prompt,
      suggestionArray: suggestions,
      hasBug,
      model: getSettings()["model"],
      vendor: getSettings()["vendor"],
      userSectionId: ""
    };
    const result = await saveSuggestionToDatabase(suggestion);
    if (!result.success) {
      await errorNotification("Failed to save suggestion");
      return;
    }
    const suggestionId = result.data;
    suggestionContext = {
      prompt,
      suggestions,
      hasBug,
      suggestionId,
      startTime: Date.now()
    };
    (async () => {
      try {
        const selectedClass = getSelectedClass();
        const [userSection, { refinedPrompt }] = await Promise.all([
          getUserSection(user.id, selectedClass?.id),
          refinePrompt(prompt)
        ]);
        await updateSuggestionInDatabase(suggestionId, {
          prompt: refinedPrompt,
          userSectionId: userSection.userSectionId
        });
      } catch (err) {
        console.warn("Background metadata/save failed:", err);
      }
    })();
    const completionItems = await buildCompletionItems(
      suggestions,
      hasBug,
      isSuspended2
    );
    resolve(completionItems);
    return;
  }
}
async function buildIntervenedCompletionItems(intervened) {
  const item = new vscode9.InlineCompletionItem(intervened.mainLine);
  return [item];
}
async function buildCompletionItems(suggestions, hasBug, isSuspended2) {
  const items = [];
  if (isSuspended2) {
    const instructionItem = new vscode9.InlineCompletionItem(
      "\u26A0\uFE0F Please hover and select the correct answer below"
    );
    items.push(instructionItem);
    const correctChoice = {
      text: suggestions[0],
      isCorrect: true,
      index: 0
    };
    const incorrectChoice = {
      text: suggestions[1],
      isCorrect: false,
      index: 1
    };
    currentChoices = [correctChoice, incorrectChoice];
    const shuffled = [correctChoice, incorrectChoice].sort(
      () => Math.random() - 0.5
    );
    shuffled.forEach((choice) => {
      const item = new vscode9.InlineCompletionItem(choice.text);
      item.command = {
        command: "clover.suggestionSelected",
        title: "Track Suggestion Selection",
        arguments: [choice]
      };
      items.push(item);
    });
  } else {
    const selected = hasBug ? suggestions[1] : suggestions[0];
    items.push(new vscode9.InlineCompletionItem(selected));
  }
  return items;
}
async function handleBuggedSuggestionReview(context) {
  const { suggestions, prompt } = context;
  if (!suggestions || suggestions.length < 2) {
    await errorNotification("Missing regular suggestions to review.");
    return;
  }
  suggestionsToReview = suggestions;
  const rightCode = suggestions[0];
  const wrongCode = suggestions[1];
  const { context: user, error } = await getAuthContext();
  if (error || user === void 0) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  if (!user.settings.show_notifications) {
    return;
  }
  const selection = await vscode9.window.showWarningMessage(
    "Warning: The accepted suggestion may contain a bug. Please review the code carefully.",
    { modal: false },
    "Review Code",
    "Correct Code",
    "Ignore"
  );
  const request = {
    wrongCode,
    rightCode,
    prompt
  };
  if (selection === "Review Code") {
    const result = await getExplanation(request);
    if (!result.success) {
      await errorNotification("Failed to get explanation from backend.");
      return;
    }
    createCodeComparisonWebview(rightCode, wrongCode, result.data);
  } else if (selection === "Correct Code") {
    const result = await getHint(request);
    const hint = result.success && result.data;
    if (!hint) {
      await errorNotification("Failed to get hint from backend.");
      return;
    }
    createCodeCorrectionWebview(wrongCode, hint, context);
  }
}
async function handleIncorrectSuggestionSelection(wrongCode, rightCode, prompt) {
  const { context: user, error } = await getAuthContext();
  if (error || user === void 0) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  if (!user.settings.show_notifications) {
    return;
  }
  const selection = await vscode9.window.showWarningMessage(
    "That might not be the best solution. Consider reviewing the alternatives.",
    "Show Explanation"
  );
  if (selection === "Show Explanation") {
    const request = { prompt, wrongCode, rightCode };
    const result = await getExplanation(request);
    if (result.success) {
      createCodeComparisonWebview(rightCode, wrongCode, result.data);
    } else {
      await errorNotification("Failed to get explanation from backend.");
    }
  }
}

// src/commands/suggestion-commands.ts
function registerSuggestionCommands() {
  const accept = vscode10.commands.registerCommand(
    "collabAgent.acceptInlineSuggestion",
    async () => {
      const editor = vscode10.window.activeTextEditor;
      if (!editor) {
        return;
      }
      if (isSuspended) {
        vscode10.window.showInformationMessage(
          "Please hover over the suggestions and select the correct one manually",
          { modal: false }
        );
        return;
      }
      const { context } = await getAuthContext();
      await vscode10.commands.executeCommand(
        "editor.action.inlineSuggest.commit"
      );
      if (context?.settings.intervened) {
        logLineSuggestionEvent(true, suggestionContext);
        resetSuggestionContext();
        return;
      } else {
        logSuggestionEvent(true, suggestionContext);
        if (suggestionContext.hasBug) {
          await handleBuggedSuggestionReview(suggestionContext);
        }
        resetSuggestionContext();
      }
    }
  );
  const reject = vscode10.commands.registerCommand(
    "collabAgent.rejectInlineSuggestion",
    async () => {
      const editor = vscode10.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const { context } = await getAuthContext();
      if (context?.settings.intervened) {
        logLineSuggestionEvent(false, suggestionContext);
        resetSuggestionContext();
        resetIntervenedCache();
      } else {
        await vscode10.commands.executeCommand(
          "editor.action.inlineSuggest.hide"
        );
        await vscode10.commands.executeCommand("hideSuggestWidget");
        logSuggestionEvent(false, suggestionContext);
        resetSuggestionContext();
      }
    }
  );
  const track = vscode10.commands.registerCommand(
    "clover.suggestionSelected",
    async (choice) => {
      logSuggestionEvent(choice.isCorrect, suggestionContext);
      if (!choice.isCorrect) {
        const rightCode = currentChoices.find((c) => c.isCorrect)?.text || "";
        await handleIncorrectSuggestionSelection(
          choice.text,
          rightCode,
          suggestionContext.prompt
        );
      }
    }
  );
  const onTypeListener = vscode10.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode10.window.activeTextEditor;
    if (!editor || event.document !== editor.document) {
      return;
    }
    const isIntervenedActive = (suggestionContext?.intervenedSuggestions?.length ?? 0) > 0;
    if (!isIntervenedActive) {
      return;
    }
    const isUserTyping = event.contentChanges.some(
      (change) => change.text && !change.text.includes("\n")
    );
    if (isUserTyping) {
      console.log(
        "\u270F\uFE0F User typed during intervened suggestion \u2014 resetting cache"
      );
      resetIntervenedCache();
      resetSuggestionContext();
    }
  });
  return [accept, reject, track, onTypeListener];
}

// src/commands/completion-provider.ts
var vscode11 = __toESM(require("vscode"));
var inlineCompletionProvider = vscode11.languages.registerInlineCompletionItemProvider(
  { scheme: "file" },
  {
    provideInlineCompletionItems
  }
);
async function provideInlineCompletionItems(document, position, context, token) {
  const { context: userContext, error } = await getAuthContext();
  if (error) {
    await errorNotification(`Failed to get user context: ${error}`);
    return [];
  }
  if (!userContext) {
    await authNotification();
    return [];
  }
  if (!userContext.settings.give_suggestions) {
    return [];
  }
  resetDebounceTimeout();
  setLastRequest(document, position, context, token);
  return await new Promise((resolve) => setDebounceTimeout(resolve));
}

// src/views/CollabAgentPanel.ts
var vscode12 = __toESM(require("vscode"));
var vsls = __toESM(require_vscode());
var CollabAgentPanelProvider = class {
  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
  }
  static viewType = "collabAgent.teamActivity";
  _view;
  _liveShareApi = null;
  async resolveWebviewView(webviewView, context, _token) {
    console.log("CollabAgentPanel: resolveWebviewView called");
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    console.log("CollabAgentPanel: HTML set, webview should be ready");
    await this.initializeLiveShare();
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        console.log("Received message from webview:", message);
        switch (message.command) {
          case "startLiveShare":
            console.log("Handling startLiveShare command");
            this.startLiveShareSession();
            return;
          case "joinLiveShare":
            console.log("Handling joinLiveShare command");
            this.joinLiveShareSession();
            return;
          case "endLiveShare":
            console.log("Handling endLiveShare command");
            this.endLiveShareSession();
            return;
          case "leaveLiveShare":
            console.log("Handling leaveLiveShare command");
            this.leaveLiveShareSession();
            return;
          case "sendTeamMessage":
            console.log("Handling sendTeamMessage command");
            this.sendTeamMessage(message.text);
            return;
          default:
            console.log("Unknown command received:", message.command);
        }
      },
      void 0,
      []
    );
  }
  async initializeLiveShare() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      this._liveShareApi = await vsls.getApi();
      if (this._liveShareApi) {
        console.log("Live Share API initialized successfully.");
        this.setupLiveShareEventListeners();
        return true;
      } else {
        console.log("Live Share extension not available.");
        setTimeout(() => {
          console.log("Retrying Live Share initialization...");
          this.initializeLiveShare();
        }, 3e3);
        return false;
      }
    } catch (error) {
      console.error("Failed to initialize Live Share API:", error);
      setTimeout(() => {
        console.log("Retrying Live Share initialization after error...");
        this.initializeLiveShare();
      }, 5e3);
      return false;
    }
  }
  setupLiveShareEventListeners() {
    if (!this._liveShareApi) {
      return;
    }
    try {
      this._liveShareApi.onDidChangeSession((sessionChangeEvent) => {
        console.log("Live Share session changed:", sessionChangeEvent);
        this.handleSessionChange(sessionChangeEvent);
      });
      this.monitorSessionState();
    } catch (error) {
      console.error("Error setting up Live Share event listeners:", error);
    }
  }
  handleSessionChange(sessionChangeEvent) {
    const session = sessionChangeEvent.session;
    console.log("handleSessionChange called with session:", session);
    console.log("Session change event details:", {
      changeType: sessionChangeEvent.changeType,
      session: session ? {
        id: session.id,
        role: session.role,
        peerNumber: session.peerNumber,
        user: session.user
      } : null
    });
    if (session) {
      console.log("Session active:", {
        id: session.id,
        role: session.role,
        uri: session.uri?.toString(),
        peerNumber: session.peerNumber,
        user: session.user
      });
      if (!this.sessionStartTime || sessionChangeEvent.changeType === "joined") {
        this.sessionStartTime = /* @__PURE__ */ new Date();
        console.log("Session start time set to:", this.sessionStartTime);
      }
      const isHost = session.role === vsls.Role.Host;
      let status = "joined";
      if (isHost) {
        status = "hosting";
      } else if (session.role === vsls.Role.Guest) {
        status = "joined";
      }
      const sessionLink = session.uri?.toString() || "";
      let participantCount = session.peerNumber || 1;
      if (isHost && participantCount === 1) {
        setTimeout(() => {
          this.updateParticipantInfo();
        }, 1e3);
      }
      console.log("Sending updateSessionStatus message:", {
        status,
        link: sessionLink,
        participants: participantCount,
        role: session.role,
        duration: this.getSessionDuration(),
        isHost
      });
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status,
          link: sessionLink,
          participants: participantCount,
          role: session.role,
          duration: this.getSessionDuration()
        });
      }
      this.startParticipantMonitoring();
    } else {
      console.log("Session ended - clearing session start time");
      this.sessionStartTime = void 0;
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status: "ended",
          link: "",
          participants: 0
        });
        setTimeout(() => {
          if (this._view) {
            this._view.webview.postMessage({
              command: "updateSessionStatus",
              status: "none",
              link: "",
              participants: 0
            });
          }
        }, 2e3);
      }
      this.stopParticipantMonitoring();
    }
  }
  monitorSessionState() {
    console.log("monitorSessionState: Checking session state...");
    console.log("monitorSessionState: _liveShareApi exists:", !!this._liveShareApi);
    console.log("monitorSessionState: _liveShareApi.session exists:", !!this._liveShareApi?.session);
    if (this._liveShareApi?.session) {
      const session = this._liveShareApi.session;
      console.log("monitorSessionState: Session details:", {
        id: session.id,
        role: session.role,
        isValid: !!(session.id && (session.role === vsls.Role.Host || session.role === vsls.Role.Guest))
      });
      if (session.id && (session.role === vsls.Role.Host || session.role === vsls.Role.Guest)) {
        console.log("Found existing active session:", session);
        this.handleSessionChange({ session, changeType: "existing" });
      } else {
        console.log("Found invalid or inactive session, clearing UI state");
        if (this._view) {
          this._view.webview.postMessage({
            command: "updateSessionStatus",
            status: "none",
            link: "",
            participants: 0
          });
        }
      }
    } else {
      console.log("No existing session found, clearing UI state");
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status: "none",
          link: "",
          participants: 0
        });
      }
    }
    setInterval(() => {
      this.periodicSessionCheck();
    }, 5e3);
  }
  periodicSessionCheck() {
    if (!this._liveShareApi) {
      return;
    }
    const hasSession = !!this._liveShareApi.session;
    const hasValidSession = hasSession && this._liveShareApi.session.id && (this._liveShareApi.session.role === vsls.Role.Host || this._liveShareApi.session.role === vsls.Role.Guest);
    console.log("periodicSessionCheck:", { hasSession, hasValidSession, sessionId: this._liveShareApi.session?.id });
    if (!hasValidSession && this._view) {
      console.log("periodicSessionCheck: No valid session, ensuring UI shows none");
      this._view.webview.postMessage({
        command: "updateSessionStatus",
        status: "none",
        link: "",
        participants: 0
      });
      this.sessionStartTime = void 0;
      this.stopParticipantMonitoring();
    }
  }
  participantMonitoringInterval;
  sessionStartTime;
  startParticipantMonitoring() {
    this.stopParticipantMonitoring();
    this.participantMonitoringInterval = setInterval(() => {
      this.updateParticipantInfo();
    }, 2e3);
    this.updateParticipantInfo();
  }
  stopParticipantMonitoring() {
    if (this.participantMonitoringInterval) {
      clearInterval(this.participantMonitoringInterval);
      this.participantMonitoringInterval = void 0;
    }
  }
  async updateParticipantInfo() {
    if (!this._liveShareApi?.session) {
      console.log("updateParticipantInfo: No session available");
      return;
    }
    try {
      const session = this._liveShareApi.session;
      let participantCount = 1;
      let detectionMethod = "fallback";
      if (session.peerNumber !== void 0 && session.peerNumber > 0) {
        participantCount = session.peerNumber;
        detectionMethod = "peerNumber";
      }
      if (session.role === vsls.Role.Host) {
        try {
          const liveShareExtension = vscode12.extensions.getExtension("ms-vsliveshare.vsliveshare");
          if (liveShareExtension && liveShareExtension.isActive) {
            const participants2 = await vscode12.commands.executeCommand("liveshare.participants.list");
            if (participants2 && Array.isArray(participants2) && participants2.length > 0) {
              participantCount = participants2.length + 1;
              detectionMethod = "liveshare-command";
              console.log("Host: Found participants via command:", participants2.length);
            }
          }
        } catch (error) {
          console.log("Could not get participants via command:", error);
        }
        if (participantCount === 1 && this.sessionStartTime) {
          const sessionAge = Date.now() - this.sessionStartTime.getTime();
          if (sessionAge > 5e3) {
            console.log("Host: Checking for delayed participant detection...");
            setTimeout(() => {
              this.updateParticipantInfo();
            }, 2e3);
          }
        }
      }
      const currentDuration = this.getSessionDuration();
      console.log("updateParticipantInfo:", {
        participantCount,
        detectionMethod,
        duration: currentDuration,
        sessionStartTime: this.sessionStartTime,
        role: session.role === vsls.Role.Host ? "Host" : "Guest",
        sessionId: session.id,
        rawPeerNumber: session.peerNumber
      });
      const participants = [];
      participants.push({
        name: session.user?.displayName || "You",
        email: session.user?.emailAddress || "",
        role: session.role === vsls.Role.Host ? "Host" : "Guest"
      });
      if (participantCount > 1) {
        for (let i = 1; i < participantCount; i++) {
          participants.push({
            name: `Teammate ${i}`,
            email: "",
            role: session.role === vsls.Role.Host ? "Guest" : "Host"
          });
        }
      }
      console.log("Sending participant update:", { participants, count: participantCount, method: detectionMethod });
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateParticipants",
          participants,
          count: participantCount
        });
        const isHost = session.role === vsls.Role.Host;
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status: isHost ? "hosting" : "joined",
          link: "",
          // Session link not available in participant monitoring
          participants: participantCount,
          role: session.role,
          duration: currentDuration
        });
      }
    } catch (error) {
      console.error("Error updating participant info:", error);
    }
  }
  async endLiveShareSession() {
    try {
      console.log("Attempting to end Live Share session...");
      if (!this._liveShareApi) {
        console.log("Live Share API not available");
        vscode12.window.showWarningMessage("Live Share API not available.");
        return;
      }
      if (!this._liveShareApi.session) {
        console.log("No active session found");
        vscode12.window.showWarningMessage("No active Live Share session to end.");
        return;
      }
      console.log("Current session role:", this._liveShareApi.session.role);
      console.log("Host role constant:", vsls.Role.Host);
      if (this._liveShareApi.session.role !== vsls.Role.Host) {
        vscode12.window.showWarningMessage("Only the session host can end the session.");
        return;
      }
      console.log("Calling end() on Live Share API...");
      await this._liveShareApi.end();
      console.log("Live Share end() completed");
      this.sessionStartTime = void 0;
      this.stopParticipantMonitoring();
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status: "none",
          link: "",
          participants: 0
        });
      }
      vscode12.window.showInformationMessage("Live Share session ended successfully.");
    } catch (error) {
      console.error("Error ending Live Share session:", error);
      vscode12.window.showErrorMessage("Failed to end Live Share session: " + error);
    }
  }
  async leaveLiveShareSession() {
    try {
      console.log("Attempting to leave Live Share session...");
      if (!this._liveShareApi) {
        console.log("Live Share API not available");
        vscode12.window.showWarningMessage("Live Share API not available.");
        return;
      }
      if (!this._liveShareApi.session) {
        console.log("No active session found");
        vscode12.window.showWarningMessage("No active Live Share session to leave.");
        return;
      }
      const session = this._liveShareApi.session;
      console.log("Current session role:", session.role);
      if (session.role === vsls.Role.Host) {
        vscode12.window.showWarningMessage('Hosts cannot leave their own session. Use "End Session" instead.');
        return;
      }
      console.log("Calling end() on Live Share API to leave session...");
      await this._liveShareApi.end();
      console.log("Live Share leave completed");
      this.sessionStartTime = void 0;
      this.stopParticipantMonitoring();
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status: "none",
          link: "",
          participants: 0
        });
      }
      vscode12.window.showInformationMessage("Successfully left the Live Share session.");
    } catch (error) {
      console.error("Error leaving Live Share session:", error);
      vscode12.window.showErrorMessage("Failed to leave Live Share session: " + error);
    }
  }
  getSessionDuration() {
    if (!this.sessionStartTime) {
      return "0m";
    }
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - this.sessionStartTime.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  }
  async startLiveShareSession() {
    if (!this._liveShareApi) {
      vscode12.window.showErrorMessage("Live Share API not available. Please install Live Share extension.");
      return;
    }
    try {
      vscode12.window.showInformationMessage("Starting Live Share session...");
      const session = await this._liveShareApi.share();
      if (session && session.toString()) {
        const inviteLink = session.toString();
        vscode12.window.showInformationMessage(`Live Share session started! Invite link ${inviteLink}`);
        if (this._view) {
          this._view.webview.postMessage({
            command: "updateSessionStatus",
            status: "hosting",
            link: inviteLink
          });
        }
      } else {
        vscode12.window.showErrorMessage("Failed to start Live Share session");
      }
    } catch (error) {
      console.error("Error starting Live Share session:", error);
      vscode12.window.showErrorMessage("Error starting Live Share session: " + error);
    }
  }
  async joinLiveShareSession() {
    if (!this._liveShareApi) {
      vscode12.window.showErrorMessage("Live Share API not available. Please install Live Share extension.");
      return;
    }
    try {
      const inviteLink = await vscode12.window.showInputBox({
        prompt: "Enter Live Share invite link",
        placeHolder: "https://prod.liveshare.vsengsaas.visualstudio.com/join?...",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Please enter a valid invite link";
          }
          return null;
        }
      });
      if (!inviteLink) {
        return;
      }
      vscode12.window.showInformationMessage("Joining Live Share session...");
      const inviteUri = vscode12.Uri.parse(inviteLink.trim());
      await this._liveShareApi.join(inviteUri);
      vscode12.window.showInformationMessage("Successfully joined Live Share session!");
      if (this._view) {
        this._view.webview.postMessage({
          command: "updateSessionStatus",
          status: "joined",
          link: inviteLink
        });
      }
    } catch (error) {
      console.error("Error joining Live Share session:", error);
      vscode12.window.showErrorMessage("Error joining Live Share session: " + error);
    }
  }
  sendTeamMessage(message) {
    vscode12.window.showInformationMessage(`Team message: ${message}`);
    if (this._view) {
      this._view.webview.postMessage({
        command: "addMessage",
        message,
        sender: "You",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      });
    }
  }
  updateTeamActivity(activity) {
    if (this._view) {
      this._view.webview.postMessage({
        command: "updateActivity",
        activity
      });
    }
  }
  // @ts-ignore
  _getHtmlForWebview(webview) {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Collab Agent</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sideBar-background);
                    padding: 16px;
                    margin: 0;
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--vscode-descriptionForeground);
                    margin-right: 8px;
                }
                
                .status-indicator.active {
                    background-color: #4CAF50;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .status-active {
                    color: var(--vscode-textLink-foreground);
                }
                
                .status-inactive {
                    color: var(--vscode-descriptionForeground);
                }
                
                .session-info {
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .session-link {
                    margin-top: 4px;
                    word-break: break-all;
                }
                
                .session-link code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                    font-size: 11px;
                }
                
                .participant-list {
                    margin-top: 12px;
                    padding: 8px;
                    background-color: var(--vscode-textCodeBlock-background);
                    border-radius: 4px;
                }
                
                .participant-list h4 {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    color: var(--vscode-textLink-foreground);
                }
                
                .participant-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .participant-item:last-child {
                    border-bottom: none;
                }
                
                .participant-name {
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .participant-role {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 10px;
                }
                
                .chat-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: max(12px, min(14px, 2.5vw));
                    font-family: var(--vscode-font-family);
                    margin-top: 8px;
                    outline: none;
                    resize: none;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .chat-input:focus {
                    border-color: var(--vscode-focusBorder);
                    background-color: var(--vscode-input-background);
                }
                
                .chat-input::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                    font-size: max(11px, min(13px, 2.3vw));
                }
                
                /* Responsive adjustments for different panel sizes */
                @media (max-width: 250px) {
                    .chat-input {
                        font-size: 11px;
                        padding: 6px 8px;
                    }
                    .chat-input::placeholder {
                        font-size: 10px;
                    }
                }
                
                @media (min-width: 350px) {
                    .chat-input {
                        font-size: 13px;
                    }
                    .chat-input::placeholder {
                        font-size: 12px;
                    }
                }
                
                .chat-messages {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-bottom: 8px;
                    padding: 4px 0;
                }
                
                .chat-message {
                    margin-bottom: 8px;
                    font-size: 12px;
                    line-height: 1.4;
                }
                
                .end-session-btn {
                    background-color: var(--vscode-errorForeground) !important;
                    color: white !important;
                    margin-top: 8px;
                    font-size: 12px;
                    padding: 6px 12px;
                    border: none !important;
                    border-radius: 4px;
                    cursor: pointer;
                    width: auto !important;
                    height: auto !important;
                    display: inline-block !important;
                }

                .end-session-btn:hover {
                    background-color: var(--vscode-errorForeground) !important;
                    opacity: 0.8;
                }

                .leave-session-btn {
                    background-color: var(--vscode-charts-orange) !important;
                    color: white !important;
                    margin-top: 8px;
                    font-size: 12px;
                    padding: 6px 12px;
                    border: none !important;
                    border-radius: 4px;
                    cursor: pointer;
                    width: auto !important;
                    height: auto !important;
                    display: inline-block !important;
                }

                .leave-session-btn:hover {
                    background-color: var(--vscode-charts-orange) !important;
                    opacity: 0.8;
                }

                .section {
                    margin-bottom: 20px;
                    padding: 12px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    background-color: var(--vscode-editor-background);
                }
                
                .section-title {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-textBlockQuote-foreground);
                }
                
                .button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    margin: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .activity-item {
                    padding: 8px;
                    margin: 4px 0;
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    border-radius: 4px;
                    border-left: 3px solid var(--vscode-textLink-foreground);
                }
                
                .chat-messages {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-bottom: 8px;
                    padding: 4px 0;
                }
                
                .chat-message {
                    margin-bottom: 8px;
                    font-size: 12px;
                    line-height: 1.4;
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--vscode-charts-green);
                    margin-right: 6px;
                }
                
                .offline {
                    background-color: var(--vscode-charts-red);
                }
            </style>
        </head>
        <body>
            <div class="section">
                <div class="section-title">\u{1F680} Live Share Session</div>
                <button class="button" onclick="startLiveShare()">Start Session</button>
                <button class="button" onclick="joinLiveShare()">Join Session</button>
                <div id="sessionStatus">No active session</div>
            </div>
            
            <div class="section">
                <div class="section-title">\u{1F465} Team Activity</div>
                <div id="teamActivity">
                    <div class="activity-item">
                        <span class="status-indicator"></span>
                        <strong>You:</strong> Ready to collaborate
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">\u{1F4AC} Team Chat</div>
                <div id="chatMessages" class="chat-messages">
                    <div class="chat-message">
                        <strong>Collab Agent:</strong> Welcome! Start collaborating with your team.
                    </div>
                </div>
                <input type="text" id="chatInput" class="chat-input" placeholder="Type a message to your team..." onkeypress="handleChatInput(event)">
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function startLiveShare() {
                    vscode.postMessage({
                        command: 'startLiveShare'
                    });
                }
                
                function joinLiveShare() {
                    vscode.postMessage({
                        command: 'joinLiveShare'
                    });
                }
                
                function handleChatInput(event) {
                    if (event.key === 'Enter') {
                        const input = event.target;
                        const message = input.value.trim();
                        if (message) {
                            vscode.postMessage({
                                command: 'sendTeamMessage',
                                text: message
                            });
                            input.value = '';
                        }
                    }
                }
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'addMessage':
                            addChatMessage(message.sender, message.message, message.timestamp);
                            break;
                        case 'updateActivity':
                            updateTeamActivity(message.activity);
                            break;
                        case 'updateSessionStatus':
                            updateSessionStatus(message.status, message.link, message.participants, message.role);
                            break;
                        case 'updateParticipants':
                            updateParticipants(message.participants, message.count);
                            break;
                    }
                });
                
                function addChatMessage(sender, text, timestamp) {
                    const chatMessages = document.getElementById('chatMessages');
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'chat-message';
                    messageDiv.innerHTML = \`<strong>\${sender}:</strong> \${text} <small>(\${timestamp})</small>\`;
                    chatMessages.appendChild(messageDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                
                function updateTeamActivity(activity) {
                    // TODO: Update team activity display
                    console.log('Activity update:', activity);
                }

                function updateSessionStatus(status, link, participants, role, duration) {
                    const statusDiv = document.getElementById('sessionStatus');
                    const participantCount = participants || 1;
                    const sessionDuration = duration || '0m';
                    
                    if (status === 'hosting') {
                        statusDiv.innerHTML = \`
                            <div class="status-active">
                                <span class="status-indicator active"></span>
                                <strong>Hosting Live Share Session</strong>
                                <div class="session-info">
                                    <div>Participants: \${participantCount}</div>
                                    <div>Duration: \${sessionDuration}</div>
                                    <div class="session-link">Link: <code>\${link}</code></div>
                                    <button class="button end-session-btn" onclick="endSession()">End Session</button>
                                </div>
                            </div>
                        \`;
                    } else if (status === 'joined') {
                        statusDiv.innerHTML = \`
                            <div class="status-active">
                                <span class="status-indicator active"></span>
                                <strong>Joined Live Share Session</strong>
                                <div class="session-info">
                                    <div>Participants: \${participantCount}</div>
                                    <div>Duration: \${sessionDuration}</div>
                                    <div>Role: Guest</div>
                                    <button class="button leave-session-btn" onclick="leaveSession()">Leave Session</button>
                                </div>
                            </div>
                        \`;
                    } else if (status === 'ended') {
                        statusDiv.innerHTML = \`
                            <div class="status-inactive">
                                <span class="status-indicator"></span>
                                <strong>Session Ended</strong>
                            </div>
                        \`;
                    } else {
                        // Default: no active session (status === 'none' or anything else)
                        statusDiv.innerHTML = \`
                            <div class="status-inactive">
                                <span class="status-indicator"></span>
                                No active session
                            </div>
                        \`;
                    }
                }

                function endSession() {
                    console.log('End Session button clicked');
                    vscode.postMessage({
                        command: 'endLiveShare'
                    });
                    console.log('Sent endLiveShare message to extension');
                }

                function leaveSession() {
                    console.log('Leave Session button clicked');
                    vscode.postMessage({
                        command: 'leaveLiveShare'
                    });
                    console.log('Sent leaveLiveShare message to extension');
                }

                function updateParticipants(participants, count) {
                    console.log('updateParticipants called with:', participants, count);
                    
                    // Update the existing Team Activity section
                    const teamActivityDiv = document.getElementById('teamActivity');
                    if (teamActivityDiv && participants && participants.length > 0) {
                        console.log('Updating team activity with participants:', participants);
                        
                        teamActivityDiv.innerHTML = \`
                            <div class="participant-list">
                                <h4>Active Participants (\${count})</h4>
                                \${participants.map((p, index) => \`
                                    <div class="participant-item">
                                        <span class="status-indicator active"></span>
                                        <span class="participant-name">\${p.name}</span>
                                        <span class="participant-role">\${p.role}</span>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                        
                        console.log('Team activity updated successfully');
                    } else {
                        console.log('No team activity div found or no participants:', { teamActivityDiv, participants });
                    }
                }  
            </script>
        </body>
        </html>`;
  }
  dispose() {
    this.stopParticipantMonitoring();
    this._view = void 0;
    this._liveShareApi = void 0;
  }
};

// src/extension.ts
var globalContext;
async function activate(context) {
  globalContext = context;
  console.log("Collab Agent Activated");
  vscode13.window.showInformationMessage("Collab Agent: Extension activated!");
  await vscode13.commands.executeCommand("setContext", "collabAgent.showPanel", true);
  checkUserSignIn();
  const authButtonStatusBar = await setupClassStatusBarItem();
  registerClassSelectorCommand(context, authButtonStatusBar);
  const authStatusBar = createAuthStatusBarItem(context);
  const suggestionCommands = registerSuggestionCommands();
  console.log("Registering CollabAgentPanelProvider...");
  vscode13.window.showInformationMessage("Collab Agent: Registering webview provider...");
  const collabPanelProvider = new CollabAgentPanelProvider(context.extensionUri);
  const disposable = vscode13.window.registerWebviewViewProvider(
    "collabAgent.teamActivity",
    // Use the exact string instead of static property
    collabPanelProvider
  );
  context.subscriptions.push(disposable);
  console.log("CollabAgentPanelProvider registered successfully");
  vscode13.window.showInformationMessage("Collab Agent: Webview provider registered!");
  const refreshCommand = vscode13.commands.registerCommand("collabAgent.refreshPanel", () => {
    vscode13.commands.executeCommand("workbench.view.extension.collabAgent");
  });
  context.subscriptions.push(refreshCommand);
  context.subscriptions.push(
    ...suggestionCommands,
    authStatusBar,
    incorrectChoicesCommand,
    signInCommand,
    signOutCommand,
    uriHandlerCommand,
    testFetchCommand,
    inlineCompletionProvider,
    fetchSettingsCommand
  );
}
function deactivate() {
  console.log("AI Extension Deactivated");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate,
  globalContext
});
//# sourceMappingURL=extension.js.map
