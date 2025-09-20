import { Link } from "react-router-dom";

/**
 * Landing component for the CLOVER website.
 * @returns {JSX.Element} The landing page component.
 */
export const Landing: React.FC = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-text width-container">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center text-center px-6 pb-12">
        <br />
        <h1 className="text-5xl font-extrabold text-text">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#50B498] to-[#9CDBA6]">
            CLOVER
          </span>
        </h1>
        <p className="mt-4 text-lg text-text max-w-2xl">
          CLOVER is an AI-powered code assistant designed to help beginner
          programmers improve their skills. Unlike traditional tools, CLOVER
          tracks mistakes, encourages reflection, and reduces over-reliance on
          AI-generated code.
        </p>

        <br />

        {/* Features Section */}
        <h2 className="text-3xl font-bold text-center text-[#50B498] mt-8">
          Why Choose CLOVER?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 text-center">
          <div className="info-card">
            <h3 className="info-card-header">Smart Inline Suggestions</h3>
            <p className="info-card-para">
              Get real-time coding suggestions, including correct and incorrect
              options to encourage critical thinking.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-card-header">AI-Powered Learning</h3>
            <p className="info-card-para">
              Ask questions about code snippets, get explanations, and track
              learning patterns in real time.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-card-header">Mistake Recognition & Insights</h3>
            <p className="info-card-para">
              Monitor response times, correctness, and frequently asked
              questions to track progress.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-card-header">Instructor Dashboard</h3>
            <p className="info-card-para">
              Instructors can review student progress, identify common errors,
              and provide targeted interventions.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-card-header">Seamless IDE Integration</h3>
            <p className="info-card-para">
              CLOVER works directly inside Visual Studio Code with minimal
              disruption to workflow.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-card-header">Statistics Portal</h3>
            <p className="info-card-para">
              Users can review their coding habits, improve performance, and
              refine problem-solving skills.
            </p>
          </div>
        </div>

        <br />

        {/* Call-to-Action */}
        <h2 className="text-4xl font-bold text-text mt-10">
          Start Learning with AI Today
        </h2>
        <p className="mt-4 text-lg max-w-2xl text-gray-700 dark:text-gray-300">
          Whether you're a beginner learning to code or an instructor looking
          for insights, CLOVER is the perfect tool for guided AI-assisted
          learning.
        </p>
        <Link to="/download" className="mt-6">
          <button className="button-primary mt-6">
            Download CLOVER for VS Code
          </button>
        </Link>
      </section>
    </div>
  );
};

export default Landing;
