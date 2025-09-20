import { useState } from "react";
import { ChevronUp, ChevronDown, Plus, Minus } from "lucide-react";
import InstallFromVSIX from "../assets/InstallFromVSIX.gif";

// List of sections and subsections
const sections = [
  {
    id: "install-vscode",
    title: "0. Install Visual Studio Code",
    content: (
      <div className="text-text">
        <p className="mb-4">
          To use CLOVER, you need to install Visual Studio Code. You can
          download it from the official website:
        </p>
        <a
          href="https://code.visualstudio.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Download Visual Studio Code
        </a>
      </div>
    ),
  },
  {
    id: "install-extension",
    title: "1. Install the CLOVER Extension",
    subsections: [
      {
        id: "install-extension-1",
        title: "Install from VS Code",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>
                Follow{" "}
                <a
                  href="vscode:extension/capstone-team-2.temple-capstone-clover"
                  className="text-blue-500 underline"
                  target="_blank"
                >
                  this
                </a>{" "}
                link
              </li>
              <li>
                You should be redirected to Visual Studio Code and prompted to
                install the CLOVER extension.
              </li>
              <li>
                If that fails, you can also open Visual Studio Code and go to
                the Extensions view by clicking on the Extensions icon in the
                Activity Bar on the side of the window and search for "CLOVER".
              </li>
            </ol>
            <p className="mb-4">
              Once installed, you can find CLOVER in the Extensions view.
            </p>
          </div>
        ),
      },
      {
        id: "install-extension-2",
        title: "Install from VSIX File",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>Open Visual Studio Code.</li>
              <li>
                Go to the Extensions view by clicking on the Extensions icon in
                the Activity Bar on the side of the window.
              </li>
              <li>Search for "CLOVER" in the Extensions Marketplace.</li>
              <li>Click on the "Install" button for the CLOVER extension.</li>
            </ol>
            <p className="mb-4">
              Once installed, you can find CLOVER in the Extensions view.
            </p>
            <img src={InstallFromVSIX} />
          </div>
        ),
      },
      {
        id: "install-extension-3",
        title: "Uninstall Extension",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>Open Visual Studio Code.</li>
              <li>
                Go to the Extensions view by clicking on the Extensions icon in
                the Activity Bar on the side of the window.
              </li>
              <li>Search for "CLOVER" in the list of installed extensions.</li>
              <li>Click on the extension and navigate to it's page.</li>
              <li>Finally, click "Uninstall".</li>
            </ol>
          </div>
        ),
      },
    ],
  },
  {
    id: "sign-in-sign-out",
    title: "2. Sign up or Sign in",
    content: (
      <p>To use CLOVER right now you need to create an account with us.</p>
    ),
    subsections: [
      {
        id: "sign-up",
        title: "Sign up",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>
                When first starting up the extension you will receive a popup in
                the bottom right telling you to sign up or sign in.
                Alternatively, sign up can be done on the website by clicking
                the "Sign Up" button in the top right corner.
              </li>
              <li>
                If you miss the notification you may interact with the Sign In
                button in the bottom right of the VS Code interface or with the
                command available through the command palette by pressing
                Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac).
              </li>
              <li>
                From there you will directed to enter your first and last name,
                email, and a password that is 6 or more characters
              </li>
              <li>
                After everything goes through you will receive a welcome
                notification and have access to all the features of the
                extension.
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: "sign-in",
        title: "Sign in",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>
                When first starting up the extension you will receive a popup in
                the bottom right telling you to sign up or sign in.
              </li>
              <li>
                If you miss the notification the command to do so will be
                available through the command pallete by pressing Ctrl+Shift+P
                (Windows/Linux) or Cmd+Shift+P (Mac).
              </li>
              <li>
                From there you will directed to enter your email and password.
                Alternatively, you can sign in through one of our providers
                (currently only Github).
              </li>
              <li>
                When signing in with a provider you will be redirected to their
                website to sign in and authorize our application. After that,
                you will be redirected back to vscode where you will
                automatically be logged in.
              </li>
              <li>
                After everything goes through you will receive a welcome
                notification and have access to all the features of the
                extension.
              </li>
            </ol>
          </div>
        ),
      },
    ],
  },
  {
    id: "first-use",
    title: "3. Using CLOVER for the First Time",
    subsections: [
      {
        id: "first-use-1",
        title: "Inline Suggestions",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>
                Open one of your project files or create a new one. If you
                create a new file, make sure to save it with a supported file
                extension (e.g., .js, .py, .java, etc.) otherwise suggestions
                will not be available.
              </li>
              <li>
                Start typing like you normally would and when you stop for a
                short period a suggestion will appear inline with the rest of
                the text.
              </li>
              <li>
                Pressing tab will accept the suggestion and pressing Ctrl+Space
                (Window/Linux) or CMD+R (Mac) will reject the suggestion.
              </li>
              <li>
                Suggestions can either be correct or incorrect with a small
                error that the you will need to find. Suggestions are tracked in
                our system and accepting too many incorrect suggestions will
                require additional intervention before continuing.
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: "first-use-2",
        title: "Joining a Class",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>
                By default all suggestions will be general and collected into
                the "Non-Class Activities" section on the dashboard. Joining
                will group all suggestions and rejections under that class'
                statistics.
              </li>
              <li>
                If you are a student, you can join a class by clicking the "Join
                Class" button in the bottom left of the VS Code interface.
              </li>
              <li>
                Classes can be created by instructors on the CLOVER website.
                Once a class is created, it will be available to select in the
                student dashboard. By default, students will be put on a wait
                list until the instructor approves their request.
              </li>
              <li>
                Once accepted into a class it will appear in the join class list
                in VSCode and you can select it to set your class for that
                session.
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: "first-use-3",
        title: "Reviewing Code",
        content: (
          <div className="text-text">
            <ol className="list-decimal list-inside mb-4 space-y-2">
              <li>
                When getting inline suggestions, if a incorrect suggestion is
                accepted then you will be warned that it is incorrect through a
                notification. You will be presented with three options, Review
                Code, Correct Code, and Ignore.
                <ul className="list-disc list-inside space-y-1 mb-4 px-4">
                  <li>
                    Review Code will open a side view to compare the correct and
                    incorrect code.
                  </li>
                  <li>
                    Correct Code will open a side view and give you a chance to
                    correct what you accepted before continuing.
                  </li>
                  <li>Ignore Code will allow you continue writing code.</li>
                </ul>
              </li>
              <li>Choose one of the options to continue writing code.</li>
              <li>
                After accepting too many incorrect suggestions you will be
                locked out from receiving more suggestions and a notification
                will appear that links to the website to do a quiz and unlock
                the account.
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: "first-use-4",
        title: "Seeing your statistics",
        content: (
          <div className="text-text">
            <p>
              User statistics are available after logging into this website and
              navigating to the dashboard page from the navbar at the top.
            </p>
          </div>
        ),
      },
    ],
  },
];

/**
 * Help component that displays a list of sections and subsections with
 * information about using the CLOVER extension. Each section can be expanded
 * or collapsed to show or hide its content.
 * @returns {JSX.Element} The Help component.
 */
export const Help = () => {
  const [openSections, setOpenSection] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, true]))
  );

  const toggleSection = (id: string) => {
    setOpenSection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    setOpenSection(
      Object.fromEntries(
        sections.flatMap((s) => [
          [s.id, true],
          ...(s.subsections ? s.subsections.map((sub) => [sub.id, true]) : []),
        ])
      )
    );
  };

  const collapseAll = () => {
    setOpenSection(
      Object.fromEntries(
        sections.flatMap((s) => [
          [s.id, false],
          ...(s.subsections ? s.subsections.map((sub) => [sub.id, false]) : []),
        ])
      )
    );
  };

  const handleNavClick = (id: string) => {
    if (!openSections[id]) {
      toggleSection(id);
    }

    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 width-container">
      <div className="sticky pt-8 top-16 hidden md:block h-[calc(100vh-6rem)]">
        <h2 className="text-xl font-bold mb-4">Getting Started</h2>
        <nav className="space-y-2">
          {sections.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => handleNavClick(section.id)}
                className="w-full text-left text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white py-2 transition-all"
              >
                {section.title}
              </button>

              {/* Subsection links if they exist */}
              {section.subsections && (
                <div className="ml-4 space-y-1">
                  {section.subsections.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleNavClick(sub.id)}
                      className="w-full text-left text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white py-1 transition-all"
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-8 left-8 flex gap-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg z-10">
          <button
            onClick={expandAll}
            className="text-blue-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Expand all"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={collapseAll}
            className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Collapse all"
          >
            <Minus size={20} />
          </button>
        </div>
      </div>

      <div className="flex-grow p-8 col-span-1 md:col-span-2 lg:col-span-3">
        <h1 className="text-4xl font-extrabold text-center mb-6">
          Getting Started
        </h1>

        {sections.map((section) => (
          <div
            id={section.id}
            key={section.id}
            className="info-card p-6 rounded-lg shadow-lg mb-6 scroll-mt-24" // scroll-mt for sticky header offset
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full text-left text-xl font-bold flex justify-between items-center"
            >
              {section.title}
              <span className="text-gray-800 dark:text-gray-400">
                {openSections[section.id] ? (
                  <ChevronUp size={24} />
                ) : (
                  <ChevronDown size={24} />
                )}
              </span>
            </button>

            <div
              className={`transition-all duration-300 overflow-hidden ${openSections[section.id] ? "max-h-[2000px] mt-4" : "max-h-0"}`}
            >
              <div className="text-text">
                {section.content}

                {/* Subsections */}
                {section.subsections?.map((sub) => (
                  <div
                    id={sub.id}
                    key={sub.id}
                    className="info-card-secondary p-4 mt-4 rounded-lg scroll-mt-24"
                  >
                    <button
                      onClick={() => toggleSection(sub.id)}
                      className="w-full text-left text-lg font-semibold flex justify-between items-center"
                    >
                      {sub.title}
                      <span className="text-gray-800 dark:text-gray-400">
                        {openSections[sub.id] ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </span>
                    </button>

                    <div
                      className={`transition-all duration-300 overflow-hidden ${openSections[sub.id] ? "max-h-[2000px] mt-2" : "max-h-0"}`}
                    >
                      {sub.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Help;
