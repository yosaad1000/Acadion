import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface InterviewSession {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questionsAsked: number;
  score: number;
  completedAt: string;
  feedback: string[];
}

interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // in seconds
}

const InterviewPractice: React.FC = () => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('general');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockSessions: InterviewSession[] = [
      {
        id: '1',
        title: 'Technical Interview Practice',
        subject: 'Computer Science',
        duration: 25,
        questionsAsked: 5,
        score: 85,
        completedAt: '2024-01-15T14:30:00',
        feedback: [
          'Good technical knowledge demonstrated',
          'Clear communication style',
          'Could improve on algorithm explanation'
        ]
      },
      {
        id: '2',
        title: 'Behavioral Interview',
        subject: 'General',
        duration: 20,
        questionsAsked: 4,
        score: 78,
        completedAt: '2024-01-14T10:15:00',
        feedback: [
          'Strong examples provided',
          'Good structure in responses',
          'Work on confidence in delivery'
        ]
      }
    ];
    setSessions(mockSessions);
  }, []);

  const mockQuestions: Question[] = [
    {
      id: '1',
      text: 'Tell me about yourself and your background in computer science.',
      category: 'Introduction',
      difficulty: 'easy',
      timeLimit: 120
    },
    {
      id: '2',
      text: 'Explain the difference between a stack and a queue, and provide use cases for each.',
      category: 'Data Structures',
      difficulty: 'medium',
      timeLimit: 180
    },
    {
      id: '3',
      text: 'Describe a challenging project you worked on and how you overcame the difficulties.',
      category: 'Behavioral',
      difficulty: 'medium',
      timeLimit: 150
    },
    {
      id: '4',
      text: 'How would you optimize a database query that is running slowly?',
      category: 'Database',
      difficulty: 'hard',
      timeLimit: 240
    }
  ];

  const startInterview = () => {
    setSessionActive(true);
    const randomQuestion = mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
    setCurrentQuestion(randomQuestion);
    setTimeRemaining(randomQuestion.timeLimit);
    startTimer(randomQuestion.timeLimit);
  };

  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Monitor audio levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average);
          if (isRecording) {
            requestAnimationFrame(updateAudioLevel);
          }
        }
      };
      updateAudioLevel();

      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Simulate real-time transcription
      setTimeout(() => {
        setTranscription('Thank you for the question. Let me think about this...');
      }, 2000);

      setTimeout(() => {
        setTranscription(prev => prev + ' I believe the key aspects to consider are...');
      }, 5000);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Simulate processing and feedback
      setTimeout(() => {
        setTranscription(prev => prev + ' [Recording completed - Processing response...]');
      }, 1000);
    }
  };

  const nextQuestion = () => {
    const randomQuestion = mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
    setCurrentQuestion(randomQuestion);
    setTimeRemaining(randomQuestion.timeLimit);
    setTranscription('');
    startTimer(randomQuestion.timeLimit);
  };

  const endSession = () => {
    setSessionActive(false);
    setCurrentQuestion(null);
    setIsRecording(false);
    setTranscription('');
    setTimeRemaining(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Add mock session result
    const newSession: InterviewSession = {
      id: Date.now().toString(),
      title: 'Practice Session',
      subject: selectedSubject,
      duration: 15,
      questionsAsked: 3,
      score: Math.floor(Math.random() * 30) + 70,
      completedAt: new Date().toISOString(),
      feedback: [
        'Good overall performance',
        'Clear communication',
        'Consider providing more specific examples'
      ]
    };
    
    setSessions(prev => [newSession, ...prev]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="py-4 sm:py-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Interview Practice
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
              Practice interviews with AI-powered questions and feedback
            </p>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6 sm:py-8">
        {!sessionActive ? (
          /* Setup Screen */
          <div className="max-w-4xl mx-auto">
            {/* Session Setup */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Start New Interview Session
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Interview Type
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="general">General Interview</option>
                    <option value="technical">Technical Interview</option>
                    <option value="behavioral">Behavioral Interview</option>
                    <option value="computer-science">Computer Science</option>
                    <option value="data-science">Data Science</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={startInterview}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                  >
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Start Interview
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Recent Sessions
                </h2>
              </div>
              
              {sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No sessions yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Start your first interview practice session
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {session.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {session.subject} • {session.duration} minutes • {session.questionsAsked} questions
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            session.score >= 80 ? 'text-green-600' : 
                            session.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {session.score}%
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(session.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {session.feedback.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active Session */
          <div className="max-w-4xl mx-auto">
            {/* Question Display */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentQuestion?.difficulty || 'medium')}`}>
                    {currentQuestion?.difficulty}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentQuestion?.category}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-lg font-mono">
                    <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
                    <span className={timeRemaining <= 30 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  
                  <button
                    onClick={endSession}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    End Session
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Question:
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentQuestion?.text}
                </p>
              </div>
              
              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-8 py-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center space-x-3 text-lg"
                  >
                    <MicrophoneIcon className="h-6 w-6" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-8 py-4 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center space-x-3 text-lg"
                  >
                    <StopIcon className="h-6 w-6" />
                    <span>Stop Recording</span>
                  </button>
                )}
                
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  <span>Next Question</span>
                </button>
              </div>
              
              {/* Audio Level Indicator */}
              {isRecording && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <SpeakerWaveIcon className="h-5 w-5 text-red-500" />
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-100"
                        style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">Recording...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transcription */}
            {transcription && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Live Transcription
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {transcription}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPractice;