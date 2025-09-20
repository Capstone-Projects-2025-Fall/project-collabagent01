import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { BASE_ENDPOINT } from "../api/endpoints";
import { useUserClasses } from "../hooks/useUserClasses";
import ClassesDropdownMenu from "../components/ClassesDropdownMenu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  userSectionId: string;
};

type QuizResult = {
  quiz_id: string;
  score: number | null;
  submitted_at: string;
};

/**
 * Quiz component that allows users to generate and review quizzes.
 * It fetches quiz questions from the server, allows users to select answers,
 * and submit their answers for scoring.
 * @returns {JSX.Element} The Quiz component.
 */
export const Quiz: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { classes, handleClassSelect, selectedClassId } = useUserClasses(
    user?.id || ""
  );

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previousQuizzes, setPreviousQuizzes] = useState<QuizResult[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const [score, setScore] = useState<number>(0);
  const [passed, setPassed] = useState(false);

  const quizId = quiz[0]?.userSectionId || "";

  const generateQuiz = async (userId: string) => {
    try {
      if (!userId) {
        throw new Error("Missing userId or userSectionId");
      }

      if (selectedClassId === "all") {
        toast.warning("Please select a specific class to generate a quiz.");
        return;
      }

      setIsGenerating(true);
      const response = await fetch(`${BASE_ENDPOINT}/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_class_id: selectedClassId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 404 &&
          data.message?.includes("no sections that need review")
        ) {
          const selectedClass = classes.find(
            (cls) => cls.id === selectedClassId
          );

          toast.success(
            `You're doing great! No sections need review${
              selectedClassId === "non-class"
                ? " for your non-class activities"
                : selectedClass
                  ? ` in you class: ${selectedClass.classTitle}`
                  : ""
            }.`
          );
          return;
        }

        throw new Error(data?.message || "Failed to generate quiz");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quizQuestion = data.data.quiz.map((question: any) => ({
        id: question.id,
        question: question.question,
        choices: question.choices,
        answerIndex: question.answer_index,
        explanation: question.explanation,
        userSectionId: question.user_section_id,
      }));

      setQuiz(quizQuestion);

      console.log(
        "Quiz generated successfully:",
        JSON.stringify(quizQuestion, null, 2)
      );
    } catch (error) {
      console.error("Error generating quiz prompt:", error);
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelection = (questionId: string, selectedIndex: number) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: selectedIndex,
    }));
  };

  const isAllAnswered = quiz.every(
    (question) =>
      answers[question.id] !== null && answers[question.id] !== undefined
  );

  const handleSubmit = async () => {
    setSubmitting(true);

    const calculatedScore = quiz.reduce((total, q) => {
      const userAnswer = answers[q.id];
      return userAnswer === q.answerIndex ? total + 1 : total;
    }, 0);

    setScore(calculatedScore);

    setPassed(calculatedScore / quiz.length >= 0.8);
    const currentTime = new Date().toISOString();
    const userClassId =
      selectedClassId === "non-class" ? null : selectedClassId;

    const updatePromises = quiz.map((q) => {
      return supabase
        .from("user_section_questions")
        .update({
          user_answer_index: answers[q.id] ?? null,
        })
        .eq("id", q.id);
    });

    const updateResults = await Promise.all(updatePromises);
    const updateErrors = updateResults.filter((res) => res.error);

    if (updateErrors.length > 0) {
      console.error("Error updating user answers:", updateErrors);
      return;
    }

    const { data: existingResults, error: checkError } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("quiz_id", quizId);

    if (checkError) {
      console.error("Error checking existing quiz result:", checkError);
      return;
    }

    if (existingResults && existingResults.length > 0) {
      const { error: updateScoreError } = await supabase
        .from("quiz_results")
        .update({
          score: calculatedScore,
          submitted_at: currentTime,
        })
        .eq("quiz_id", quizId);

      if (updateScoreError) {
        console.error("Error updating quiz result:", updateScoreError);
      }
    } else {
      const { error: insertError } = await supabase
        .from("quiz_results")
        .insert({
          quiz_id: quizId,
          submitted_at: currentTime,
          score: calculatedScore,
          user_id: user?.id,
          user_class_id: userClassId,
        });

      if (insertError) {
        console.error("Error inserting quiz result:", insertError);
      }
    }
  };

  useEffect(() => {
    if (passed && user?.id && quiz.length > 0) {
      updateUserProgress(
        user.id,
        quizId,
        selectedClassId === "non-class" ? null : selectedClassId
      );
    }
  });

  useEffect(() => {
    const fetchPreviousQuizzes = async () => {
      if (!user?.id) return;

      let query = supabase
        .from("quiz_results")
        .select("quiz_id, score, submitted_at")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (selectedClassId && selectedClassId !== "all") {
        if (selectedClassId === "non-class") {
          query = query.is("user_class_id", null);
        } else {
          query = query.eq("user_class_id", selectedClassId);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch previous quizzes: ", error);
      } else {
        setPreviousQuizzes((data as QuizResult[]) || []);
      }
    };

    fetchPreviousQuizzes();
  }, [user, selectedClassId]);

  const fetchQuizData = async (quizId: string) => {
    try {
      const { data: quizResult, error: resultError } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("quiz_id", quizId)
        .single();

      if (resultError) throw resultError;

      const { data: questions, error: questionsError } = await supabase
        .from("user_section_questions")
        .select("*")
        .eq("user_section_id", quizId)
        .order("created_at");

      if (questionsError) throw questionsError;

      if (quizResult && questions) {
        setQuiz(
          questions.map((q) => ({
            id: q.id,
            question: q.question,
            choices: q.choices,
            answerIndex: q.correct_answer_index,
            explanation: q.explanation,
            userSectionId: q.user_section_id,
          }))
        );

        const userAnswers = questions.reduce(
          (acc, q) => {
            acc[q.id] = q.user_answer_index;
            return acc;
          },
          {} as Record<string, number | null>
        );

        setAnswers(userAnswers);
        setScore(quizResult.score || 0);
      }
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      toast.error("Failed to load quiz");
    }
  };

  const handleQuizSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedQuizId(e.target.value || null);
  };

  const handleOpenQuiz = async () => {
    if (!selectedQuizId) {
      toast.warning("Please select a quiz first");
      return;
    }

    await fetchQuizData(selectedQuizId);
  };

  const resetQuiz = () => {
    setAnswers({});
    setSubmitting(false);
    setScore(0);
  };

  const updateUserProgress = async (
    userId?: string,
    userSectionId?: string,
    userClassId?: string | null
  ) => {
    try {
      if (!userSectionId) return;

      console.log("Updating progress...");

      const { error: sectionError } = await supabase
        .from("user_sections")
        .update({ status: "COMPLETE" })
        .eq("section_id", userSectionId);

      if (sectionError) throw sectionError;

      if (userClassId) {
        const { error: classError } = await supabase
          .from("class_users")
          .update({ user_class_status: "ACTIVE" })
          .eq("student_id", userId)
          .eq("class_id", userClassId);

        if (classError) throw classError;
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress status");
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center bg-gradient-to-b from-white to-green-50 dark:from-black dark:to-gray-900 transition-colors">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 transition-colors">
        <div className="mb-6 w-full grid grid-cols-3 sm:grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select a class (if any):
            </label>
            <ClassesDropdownMenu
              classes={classes}
              onClassSelect={handleClassSelect}
              selectedId={selectedClassId}
            />
          </div>

          <div className="flex col-span-1 items-end justify-center pb-1">
            <button
              onClick={() => generateQuiz(user?.id || "")}
              disabled={isGenerating}
              className="bg-blue-500 hover:bg-blue-800 text-white text-sm font-semibold rounded h-8 w-24 transition-transform hover:scale-105 flex items-center justify-center"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : "Generate"}
            </button>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              View Previous Quizes (if any):
            </label>
            <select
              className="w-full px-4 py-2 border text-sm rounded bg-white dark:bg-gray-800 border-black dark:border-white"
              onChange={handleQuizSelect}
            >
              <option value="">-- Select Previous Quiz --</option>
              {previousQuizzes.map((q) => (
                <option key={q.quiz_id} value={q.quiz_id}>
                  {new Date(q.submitted_at).toLocaleString()} – Score: {q.score}{" "}
                  /10
                </option>
              ))}
            </select>
          </div>

          <div className="flex col-span-1 items-end justify-center pb-1">
            <button
              onClick={handleOpenQuiz}
              disabled={isGenerating}
              className="bg-blue-500 hover:bg-blue-800 text-white text-sm font-semibold rounded h-8 w-24 transition-transform hover:scale-105 flex items-center justify-center"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : "Open"}
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#50B498] mb-6">Review Quiz</h1>
        <p className="text-sm font-semibold text-[#50B498] mb-6">
          *You Will Only Be Able To Submit Once All Questions Have Been
          Answered*
        </p>

        <div className="space-y-10 max-h-[70vh] overflow-y-auto pr-2">
          {quiz.length > 0 &&
            quiz.map((question, index) => (
              <div key={question.id}>
                <p className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
                  {index + 1}. {question.question}
                </p>
                <div className="space-y-2">
                  {question.choices.map((option, index) => (
                    <label
                      key={index}
                      className={`block border rounded-md px-4 py-2 cursor-pointer transition-colors ${
                        submitting && answers[question.id] === index
                          ? question.choices[question.answerIndex] === option
                            ? "bg-green-200 dark:bg-green-800 border-green-900"
                            : "bg-red-200 dark:bg-red-800 border-red-700"
                          : answers[question.id] === index
                            ? "bg-blue-100 dark:bg-blue-900"
                            : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        onChange={() => handleSelection(question.id, index)}
                        className="hidden"
                        checked={answers[question.id] === index}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {submitting && (
                  <p className="mt-2 text-lg text-[#50B498] dark:text-green-400 font-semibold">
                    {answers[question.id] === question.answerIndex
                      ? "Explanation: "
                      : "Hint: "}
                    {question.explanation}
                  </p>
                )}
              </div>
            ))}
          {quiz.length > 0 && (
            <div className="mt-10 pt-6 text-center">
              {isAllAnswered && !submitting && (
                <button
                  onClick={handleSubmit}
                  className="bg-green-500 hover:bg-green-800 hover:scale-105 text-white font-bold py-2 px-4 rounded"
                >
                  Submit
                </button>
              )}
              {submitting && (
                <>
                  <p className="mt-4 text-green-600 font-semibold">
                    Your answers have been submitted!
                  </p>
                  <div className="mt-4">
                    <p className="text-lg font-bold">
                      Your Score: {score} / {quiz.length}
                    </p>
                    <p className="text-lg font-bold">
                      Percentage: {((score / quiz.length) * 100).toFixed(2)}%
                    </p>

                    {passed ? (
                      <>
                        <p className="text-2xl text-green-600 font-bold mt-4">
                          Congratulations! 🎉 You passed!
                        </p>
                        <button
                          onClick={() => navigate("/dashboard")}
                          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Back to Dashboard
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl text-red-600 font-bold mt-4">
                          Keep practicing! You'll do better next time!
                        </p>
                        <button
                          onClick={resetQuiz}
                          className="mt-4 bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Try Again
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
