import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'available' | 'completed' | 'in-progress';
  score?: number;
  completedAt?: string;
  source: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const StudentQuizzes: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Mock data
  useEffect(() => {
    setQuizzes([
      {
        id: '1',
        title: 'Quadratic Equations Quiz',
        description: 'Test your understanding of quadratic equations and their solutions',
        questions: 10,
        duration: 15,
        difficulty: 'medium',
        status: 'available',
        source: 'Mathematics Chapter 5.pdf'
      },
      {
        id: '2',
        title: 'Physics Laws Quiz',
        description: 'Newton\'s laws and basic physics principles',
        questions: 8,
        duration: 12,
        difficulty: 'easy',
        status: 'completed',
        score: 85,
        completedAt: '2024-01-15T10:30:00Z',
        source: 'Physics Notes.docx'
      }
    ]);
  }, []);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setTimeLeft(quiz.duration * 60);
    
    // Mock questions
    setQuestions([
      {
        id: '1',
        question: 'What is the standard form of a quadratic equation?',
        options: ['ax + b = 0', 'ax² + bx + c = 0', 'ax³ + bx² + cx + d = 0', 'ax + by = c'],
        correctAnswer: 1,
        explanation: 'The standard form of a quadratic equation is ax² + bx + c = 0, where a ≠ 0.'
      },
      {
        id: '2',
        question: 'What is the discriminant of the quadratic equation ax² + bx + c = 0?',
        options: ['b² - 4ac', 'b² + 4ac', '4ac - b²', 'b - 4ac'],
        correctAnswer: 0,
        explanation: 'The discriminant is b² - 4ac, which determines the nature of the roots.'
      }
    ]);
  };

  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setShowResults(true);
    // Calculate score
    const correct = selectedAnswers.reduce((acc, answer, index) => {
      return acc + (answer === questions[index]?.correctAnswer ? 1 : 0);
    }, 0);
    const score = Math.round((correct / questions.length) * 100);
    
    // Update quiz status
    if (activeQuiz) {
      setQuizzes(prev => prev.map(q => 
        q.id === activeQuiz.id 
          ? { ...q, status: 'completed', score, completedAt: new Date().toISOString() }
          : q
      ));
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (activeQuiz && !showResults) {
    const currentQ = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
        <div className="container-responsive py-6">
          {/* Quiz Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {activeQuiz.title}
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentQuestion + 1} of {questions.length}
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          {currentQ && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                {currentQ.question}
              </h2>
              
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => selectAnswer(index)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedAnswers[currentQuestion] === index
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        selectedAnswers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedAnswers[currentQuestion] === index && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <span className="text-gray-900 dark:text-gray-100">{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={nextQuestion}
                  disabled={selectedAnswers[currentQuestion] === undefined}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showResults && activeQuiz) {
    const correct = selectedAnswers.reduce((acc, answer, index) => {
      return acc + (answer === questions[index]?.correctAnswer ? 1 : 0);
    }, 0);
    const score = Math.round((correct / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
        <div className="container-responsive py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <TrophyIcon className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Quiz Completed!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              You scored {score}% ({correct} out of {questions.length} correct)
            </p>
            
            <div className="space-y-4 mb-8">
              {questions.map((question, index) => (
                <div key={question.id} className="text-left p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-start space-x-2">
                    {selectedAnswers[index] === question.correctAnswer ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{question.question}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{question.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveQuiz(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Personalized Quizzes
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            AI-generated quizzes based on your uploaded documents
          </p>
        </div>

        {/* Quizzes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {quiz.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(quiz.difficulty)}`}>
                  {quiz.difficulty}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {quiz.description}
              </p>
              
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 space-x-4">
                <span>{quiz.questions} questions</span>
                <span>{quiz.duration} min</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                {quiz.source}
              </div>

              {quiz.status === 'completed' && quiz.score !== undefined && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Completed: {quiz.score}%
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => startQuiz(quiz)}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                {quiz.status === 'completed' ? 'Retake Quiz' : 'Start Quiz'}
              </button>
            </div>
          ))}
        </div>

        {quizzes.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No quizzes available
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload documents to generate personalized quizzes
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentQuizzes;