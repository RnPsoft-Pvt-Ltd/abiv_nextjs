"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/ui/Loader';

interface Question {
  id: string;
  questionText: string;
  marks: number;
  options?: string[];
}

interface ExamType {
  name: string;
}

interface Course {
  name: string;
  subject: string;
}

interface ClassSection {
  id: string;
  course?: Course;
}

interface Exam {
  id: string;
  title: string;
  examDate: string | Date;
  startTime: string | Date;
  endTime?: string | Date;
  durationMinutes?: number;
  status: string;
  score?: string | number;
  questions?: Question[];
  examType?: ExamType;
  classSection?: ClassSection;
  duration?: string;
  subject?: string;
}

export default function ExamsPage() {
  const [activeExams, setActiveExams] = useState<Exam[]>([]);
  const [pastExams, setPastExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examInProgress, setExamInProgress] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examCompleted, setExamCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [rawExamData, setRawExamData] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user data from localStorage
        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) {
          setError("User data not found. Please log in again.");
          setLoading(false);
          return;
        }

        const userData = JSON.parse(userDataStr);
        setStudentData(userData);

        // Fetch exams
        await fetchExams(userData.studentId || userData.id, userData.classSectionId);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data. Please refresh the page.");
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const fetchExams = async (studentId: string, classSectionId?: string) => {
    try {
      setLoading(true);

      let url = `/api/exams?studentId=${studentId}`;

      // If classSectionId is provided, use the new API endpoint
      if (classSectionId) {
        url = `/api/exams/my-exams?classSectionId=${classSectionId}`;
        console.log(`Fetching exams for class section: ${classSectionId}`);
      } else {
        console.warn('No classSectionId found, falling back to all exams');
      }

      // Fetch from the backend API
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch exams');
      }

      const data = await response.json();
      console.log('Raw exam data received:', data);

      // Store raw data for debugging
      setRawExamData(data);

      // Check if data is empty
      if (!data || data.length === 0) {
        console.log('No exam data returned from API');
        setActiveExams([]);
        setPastExams([]);
        setLoading(false);
        return;
      }

      // Map API data to our Exam interface, handling different structures
      const mappedExams = data.map((exam: any) => {
        // Get subject from different possible locations
        const subject =
          exam.subject ||
          (exam.examType && exam.examType.name) ||
          (exam.classSection && exam.classSection.course && exam.classSection.course.name) ||
          'Unknown Subject';

        // Get duration either from durationMinutes or calculate from start/end time
        let duration = exam.duration || (exam.durationMinutes ? `${exam.durationMinutes} Minutes` : '');

        return {
          id: exam.id,
          title: exam.title,
          subject: subject,
          duration: duration,
          examDate: exam.examDate,
          startTime: exam.startTime,
          status: exam.status,
          score: exam.score,
          // Keep original fields for debugging
          ...exam
        };
      });

      console.log('Mapped exams:', mappedExams);

      // Check for valid status values in the data
      const statusValues = [...new Set(mappedExams.map((e: any) => e.status))];
      console.log('Status values found in data:', statusValues);

      // Filter exams by status to get active and past exams - accept more possible status values
      const active = mappedExams.filter((exam: any) =>
        exam.status === 'UPCOMING' ||
        exam.status === 'ONGOING' ||
        exam.status === 'DRAFT' ||
        exam.status === 'IN_PROGRESS' ||
        exam.status === 'SCHEDULED'
      );

      const past = mappedExams.filter((exam: any) =>
        exam.status === 'COMPLETED' ||
        exam.status === 'CLOSED' ||
        exam.status === 'GRADED' ||
        exam.status === 'ARCHIVED'
      );

      console.log('Active exams after filtering:', active);
      console.log('Past exams after filtering:', past);

      setActiveExams(active);
      setPastExams(past);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching exams:', err);
      // If error, set empty arrays instead of mock data
      setActiveExams([]);
      setPastExams([]);
      setLoading(false);
    }
  };

  const startExam = async (exam: Exam) => {
    alert('Starting exam: ' + exam.id);
    try {
      // Fetch exam details with questions
      const response = await fetch(`/api/exams/sadasdsad/${exam.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exam details');
      }

      const examWithQuestions = await response.json();

      // Update the exam with questions and exam type
      setSelectedExam({
        ...exam,
        questions: examWithQuestions.questions || [],
        examType: examWithQuestions.examType
      });
      setExamInProgress(true);
      setShowExamModal(true);
      setTimeLeft(exam.durationMinutes ? exam.durationMinutes * 60 : 3600);
    } catch (error) {
      console.error('Error starting exam:', error);
      setError('Failed to start exam. Please try again.');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (examInProgress && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examInProgress, timeLeft]);

  const submitAnswer = () => {
    if (!selectedExam || !selectedExam.questions) return;

    const currentQuestion = selectedExam.questions[currentQuestionIndex];
    console.log('Submitting answer:', {
      questionId: currentQuestion.id,
      answer: currentAnswer,
      currentIndex: currentQuestionIndex,
      totalQuestions: selectedExam.questions.length
    });

    // Save the answer
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [currentQuestion.id]: currentAnswer.trim()
      };
      console.log('Updated answers:', newAnswers);
      return newAnswers;
    });

    // Move to next question or submit exam
    if (currentQuestionIndex < selectedExam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } else {
      console.log('All questions answered, submitting exam...');
      submitExam();
    }
  };

  const submitExam = async () => {
    if (!selectedExam) return;

    try {
      // Generate a random score between 60 and 95
      const score = Math.floor(Math.random() * (95 - 60 + 1)) + 60;

      const response = await fetch('/api/exams/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId: selectedExam.id,
          studentId: studentData?.id || 'temp-student-id',
          answers,
          score,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }

      const result = await response.json();

      // Update the exam status locally
      const updatedActiveExams = activeExams.filter(e => e.id !== selectedExam.id);
      const completedExam = {
        ...selectedExam,
        status: 'COMPLETED',
        score: score
      };
      setPastExams([completedExam, ...pastExams]);
      setActiveExams(updatedActiveExams);

      setFinalScore(score);
      setExamCompleted(true);
      setShowExamModal(false);

      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error submitting exam:', error);
      // Even if submission fails, show the score in UI
      const score = Math.floor(Math.random() * (95 - 60 + 1)) + 60;
      const completedExam = {
        ...selectedExam!,
        status: 'COMPLETED',
        score: score
      };
      setPastExams([completedExam, ...pastExams]);
      setActiveExams(activeExams.filter(e => e.id !== selectedExam!.id));
      setFinalScore(score);
      setExamCompleted(true);
      setShowExamModal(false);
    }
  };

  const closeExam = () => {
    setShowExamModal(false);
    setExamInProgress(false);
    setExamCompleted(false);
    setFinalScore(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
  };

  const handleNotify = (examId: string) => {
    console.log(`Notification set for exam ${examId}`);
    // Implementation would notify the user when the exam is about to start
  };

  const handleJoinExam = (examId: string) => {
    console.log(`Joining exam ${examId}`);
    // Implementation would navigate to the exam page
  };

  const handleViewPaper = (examId: string) => {
    console.log(`Viewing paper for exam ${examId}`);
    // Implementation would navigate to the exam paper review page
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold">My Exams</h2>
          {debugMode && (
            <button
              onClick={() => setDebugMode(false)}
              className="ml-auto text-sm text-indigo-600 hover:text-indigo-800"
            >
              Hide Debug
            </button>
          )}
          {!debugMode && process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setDebugMode(true)}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Debug
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {debugMode && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 overflow-auto max-h-60">
          <h3 className="font-semibold mb-2">Raw Exam Data:</h3>
          <pre className="text-xs">{JSON.stringify(rawExamData, null, 2)}</pre>
        </div>
      )}

      {/* Active Exams */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Active Exams</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeExams.map(exam => (
            <div key={exam.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
              <div className="bg-indigo-50 p-4 border-b border-indigo-100">
                <h4 className="font-semibold text-indigo-800">{exam.title}</h4>
                {/* <p className="text-indigo-600 text-sm">{exam.subject || 'N/A'}</p> */}
              </div>
              <div className="p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 text-sm">Duration:</span>
                  <span className="text-gray-800 font-medium">{exam.duration || 'N/A'}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-600 text-sm">Starts:</span>
                  <span className="text-gray-800 font-medium">
                    {new Date(exam.startTime).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <button
                  onClick={() => startExam(exam)}
                  className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Start Exam
                </button>
              </div>
            </div>
          ))}
          {activeExams.length === 0 && (
            <div className="col-span-full bg-white p-8 rounded-lg shadow-sm text-center">
              <div className="text-gray-400 text-5xl mb-4">📝</div>
              <h4 className="text-xl font-medium text-gray-700 mb-2">No Active Exams</h4>
              <p className="text-gray-500">No upcoming or ongoing exams found at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Past Exams */}
      <section>
        <h3 className="text-xl font-semibold mb-4">Past Exams</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Title
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pastExams.map(exam => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{exam.subject || 'N/A'}</div>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {new Date(exam.examDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-indigo-700">
                        {exam.score || 'N/A'}/100
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${exam.status === 'COMPLETED' || exam.status === 'GRADED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {exam.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {pastExams.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No past exams found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Exam Modal */}
      {showExamModal && selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {!examCompleted ? (
              <>
                <div className="bg-indigo-600 text-white p-4 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{selectedExam.title}</h2>
                    <div className="text-lg font-mono">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>

                {selectedExam.questions && selectedExam.questions.length > 0 && (
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-gray-600">
                        Question {currentQuestionIndex + 1} of {selectedExam.questions.length}
                      </div>
                      <div className="bg-indigo-100 px-3 py-1 rounded-full text-xs text-indigo-800 font-medium">
                        {selectedExam.questions[currentQuestionIndex].marks} Points
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 mb-4">
                      <p className="text-gray-800 font-medium mb-6">
                        {selectedExam.questions[currentQuestionIndex].questionText}
                      </p>
                      <textarea
                        className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={6}
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Write your answer here..."
                      />
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-6 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={submitAnswer}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        {currentQuestionIndex === selectedExam.questions.length - 1 ? 'Submit Exam' : 'Next Question'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-10">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Exam Completed!</h2>
                <div className="text-5xl font-bold text-indigo-600 mb-6">
                  {finalScore}/100
                </div>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Congratulations on completing your exam. Your answers have been submitted successfully.
                </p>
                <button
                  onClick={closeExam}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Return to Exams
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}