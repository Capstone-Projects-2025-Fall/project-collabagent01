import React from "react";

/**
 * About page component.
 * This component displays information about CLOVER and embeds the Docusaurus documentation site.
 * @returns {JSX.Element} The About page component.
 */
export const About: React.FC = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center width-container">
      <section className="w-full flex flex-col items-center justify-center text-center px-6 pt-6 pb-12">
        <h1 className="text-5xl font-extrabold text-text">
          About{"  "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#50B498] to-[#9CDBA6]">
            CLOVER
          </span>
        </h1>
        <p className="text-lg text-text max-w-3xl text-center mt-2 mb-6">
          Clover is an AI-powered code assistant, similar to Copilot that helps
          new developers learn and improve their coding skills. Below, you can
          explore our documentation for more details.
        </p>

        {/* Embedded Docusaurus Site */}
        <div className="w-full max-w-5xl h-[1000px] border border-gray-700 bg-white rounded-lg shadow-lg">
          <iframe
            src="https://capstone-projects-2025-spring.github.io/project-copilot-clone-2/"
            className="w-full h-full rounded-lg"
            title="CLOVER documentation"
          ></iframe>
        </div>
      </section>
    </div>
  );
};

export default About;
