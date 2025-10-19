import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface InterviewSession {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questions: string[];
  status: 'pending' | 'in-progress' | 'completed';
  score?: number;
  feedback?: string;
  createdAt: string;
  completedAt?: string;
}

const StudentInterview: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responses, setResponses] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Mock data
  useEffect(() => {
    setSessions([
      {
        id: '1',
        title: 'Mathematics Interview',
        subject: 'Mathematics',
        duration: 15,
        questions: [
          'Explain the concept of quadratic equations',
          'How do you solve a quadratic equation?',
          'What is the discriminant and what does it tell us?'
        ],
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        title: 'Physics Concepts',
        subject: 'Physics',
        duration: 12,
        questions: [
          'Describe Newton\'s first law of motion',
          'What is the relationship between force, mass, and acceleration?'
        ],
        status: 'completed',
        score: 88,
        feedback: 'Good understanding of basic concepts. Work on providing more detailed explanations.',
        createdAt: '2024-01-14T14:00:00Z',
        completedAt: '2024-01-14T14:15:00Z'
      }
    ]);
  }, []);

  const startInterview = (session: InterviewSession) => {
    setActiveSession(session);
    setCurrentQuestion(0);
    setResponses([]);
    setTranscript('');
    setShowResults(false);
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        // Handle audio data - in real app, send to speech-to-text API
        console.log('Audio data available:', event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Mock transcription
      const mockTranscript = "This is a mock transcription of the student's response...";
      setTranscript(mockTranscript);
      
      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      setTimeout(() => {
        clearInterval(timer);
      }, 60000); // Max 1 minute per question

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      
      // Save response
      const newResponses = [...responses];
      newResponses[currentQuestion] = transcript;
      setResponses(newResponses);
    }
  };

  const nextQuestion = () => {
    if (activeSession && currentQuestion < activeSession.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setTranscript('');
    } else {
      finishInterview();
    }
  };

  const finishInterview = () => {
    setShowResults(true);
    // Mock scoring and feedback
    const score = Math.floor(Math.random() * 20) + 80; // 80-100
    const feedback = "Good performance overall. Continue practicing to improve fluency and depth of explanations.";
    
    if (activeSession) {
      setSessions(prev => prev.map(s => 
        s.id === activeSession.id 
          ? { 
              ...s, 
              status: 'completed', 
              score, 
              feedback,
              completedAt: new Date().toISOString() 
            }
          : s
      ));
    }
  };

  if (activeSession && !showResults) {
    const progress = ((currentQuestion + 1) / activeSession.questions.length) * 100;
    const currentQ = activeSession.questions[currentQuestion];

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
        <div className="container-responsive py-6">
          {/* Interview Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {activeSession.title}
              </h1>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestion + 1} of {activeSession.questions.length}
              </span>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
              {currentQ}
            </h2>
            
            {/* Recording Controls */}
            <div className="text-center mb-6">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <MicrophoneIcon className="h-6 w-6 mr-2" />
                  Start Recording
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <StopIcon className="h-6 w-6 mr-2" />
                    Stop Recording
                  </button>
                </div>
              )}
            </div>

            {/* Live Transcript */}
            {transcript && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Live Transcript:
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {transcript}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={nextQuestion}
                disabled={!responses[currentQuestion]}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestion === activeSession.questions.length - 1 ? 'Finish' : 'Next Question'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults && activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
        <div className="container-responsive py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <ChartBarIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Interview Completed!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Your performance score: 88%
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                AI Feedback
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Good performance overall. Continue practicing to improve fluency and depth of explanations.
              </p>
            </div>

            <button
              onClick={() => setActiveSession(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Interviews
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
            Voice Interview Practice
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Practice speaking about your subjects with AI-powered feedback
          </p>
        </div>

        {/* Sessions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {session.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  session.status === 'completed' 
                    ? 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                    : 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  {session.status}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 space-x-4">
                <span>{session.questions.length} questions</span>
                <span>{session.duration} min</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                {session.subject}
              </div>

              {session.status === 'completed' && session.score !== undefined && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Score: {session.score}%
                    </span>
                    <ClockIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              )}

              <button
                onClick={() => startInterview(session)}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                {session.status === 'completed' ? 'Practice Again' : 'Start Interview'}
              </button>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No interviews available
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload documents to generate interview questions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentInterview;