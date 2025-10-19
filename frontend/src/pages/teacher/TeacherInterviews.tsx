import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    MicrophoneIcon,
    PlayIcon,
    PauseIcon,
    DocumentTextIcon,
    UserGroupIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    PlusIcon,
    AdjustmentsHorizontalIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

interface InterviewQuestion {
    id: string;
    question: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    expectedDuration: number;
}

interface InterviewAssignment {
    id: string;
    title: string;
    description: string;
    questions: InterviewQuestion[];
    assignedTo: string[];
    dueDate: string;
    status: 'draft' | 'active' | 'completed';
    submissions: number;
    totalStudents: number;
}

interface InterviewSubmission {
    id: string;
    studentName: string;
    studentId: string;
    assignmentId: string;
    submittedAt: string;
    duration: number;
    status: 'pending' | 'reviewed' | 'graded';
    score?: number;
    feedback?: string;
    audioUrl?: string;
    transcription?: string;
}

const TeacherInterviews: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'assignments' | 'submissions' | 'questions'>('assignments');
    const [assignments, setAssignments] = useState<InterviewAssignment[]>([]);
    const [submissions, setSubmissions] = useState<InterviewSubmission[]>([]);
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);

    useEffect(() => {
        fetchInterviewData();
    }, []);

    const fetchInterviewData = async () => {
        try {
            // Simulate API calls with dummy data
            await new Promise(resolve => setTimeout(resolve, 1000));

            setAssignments([
                {
                    id: '1',
                    title: 'Mid-term Oral Assessment',
                    description: 'Comprehensive speaking assessment covering course material',
                    questions: [
                        { id: '1', question: 'Explain the main concepts we covered this semester', difficulty: 'medium', category: 'General', expectedDuration: 300 },
                        { id: '2', question: 'Describe a practical application of what you learned', difficulty: 'hard', category: 'Application', expectedDuration: 240 }
                    ],
                    assignedTo: ['class-1', 'class-2'],
                    dueDate: '2024-12-15',
                    status: 'active',
                    submissions: 15,
                    totalStudents: 25
                },
                {
                    id: '2',
                    title: 'Final Project Presentation',
                    description: 'Present your final project and answer questions',
                    questions: [
                        { id: '3', question: 'Present your project overview', difficulty: 'medium', category: 'Presentation', expectedDuration: 600 },
                        { id: '4', question: 'Explain your methodology', difficulty: 'hard', category: 'Technical', expectedDuration: 300 }
                    ],
                    assignedTo: ['class-1'],
                    dueDate: '2024-12-20',
                    status: 'draft',
                    submissions: 0,
                    totalStudents: 15
                }
            ]);

            setSubmissions([
                {
                    id: '1',
                    studentName: 'Alice Johnson',
                    studentId: 'student-1',
                    assignmentId: '1',
                    submittedAt: '2024-11-20T10:30:00Z',
                    duration: 480,
                    status: 'pending',
                    audioUrl: '/api/audio/submission-1.mp3'
                },
                {
                    id: '2',
                    studentName: 'Bob Smith',
                    studentId: 'student-2',
                    assignmentId: '1',
                    submittedAt: '2024-11-19T14:15:00Z',
                    duration: 520,
                    status: 'reviewed',
                    score: 85,
                    feedback: 'Good understanding of concepts, clear communication',
                    audioUrl: '/api/audio/submission-2.mp3',
                    transcription: 'The main concepts we covered include...'
                }
            ]);

            setQuestions([
                { id: '1', question: 'Explain the main concepts we covered this semester', difficulty: 'medium', category: 'General', expectedDuration: 300 },
                { id: '2', question: 'Describe a practical application of what you learned', difficulty: 'hard', category: 'Application', expectedDuration: 240 },
                { id: '3', question: 'What challenges did you face in this course?', difficulty: 'easy', category: 'Reflection', expectedDuration: 180 },
                { id: '4', question: 'How would you improve the learning process?', difficulty: 'medium', category: 'Feedback', expectedDuration: 200 }
            ]);

        } catch (error) {
            console.error('Error fetching interview data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAudio = (submissionId: string) => {
        if (playingAudio === submissionId) {
            setPlayingAudio(null);
        } else {
            setPlayingAudio(submissionId);
            // Simulate audio playback
            setTimeout(() => setPlayingAudio(null), 3000);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'reviewed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'graded': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-3 text-gray-600 dark:text-gray-400">Loading interviews...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="container-responsive">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Voice Interviews
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">
                                Create and manage voice interview assessments
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <button className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center">
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Create Interview
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="container-responsive py-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center">
                            <MicrophoneIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{assignments.length}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Interviews</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center">
                            <UserGroupIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{submissions.length}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Submissions</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center">
                            <ClockIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {submissions.filter(s => s.status === 'pending').length}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center">
                            <ChartBarIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {submissions.filter(s => s.score).length > 0
                                        ? Math.round(submissions.filter(s => s.score).reduce((acc, s) => acc + (s.score || 0), 0) / submissions.filter(s => s.score).length)
                                        : 0}%
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'assignments'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                    >
                        Assignments
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'submissions'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                    >
                        Submissions
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'questions'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                    >
                        Question Bank
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'assignments' && (
                    <div className="space-y-6">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {assignment.title}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                                                {assignment.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">{assignment.description}</p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Questions:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {assignment.questions.length}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Due:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {new Date(assignment.dueDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Submissions:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {assignment.submissions}/{assignment.totalStudents}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {Math.round((assignment.submissions / assignment.totalStudents) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button className="btn-mobile bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm">
                                            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
                                            Edit
                                        </button>
                                        <button className="btn-mobile bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                                            <EyeIcon className="h-4 w-4 mr-1" />
                                            View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'submissions' && (
                    <div className="space-y-4">
                        {submissions.map((submission) => (
                            <div key={submission.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {submission.studentName}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                                                {submission.status}
                                            </span>
                                            {submission.score && (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    {submission.score}%
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {new Date(submission.submittedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {Math.floor(submission.duration / 60)}m {submission.duration % 60}s
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Assignment:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                    {assignments.find(a => a.id === submission.assignmentId)?.title || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>

                                        {submission.feedback && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Feedback:</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">{submission.feedback}</p>
                                            </div>
                                        )}

                                        {submission.transcription && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Transcription:</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">{submission.transcription}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex space-x-2">
                                        {submission.audioUrl && (
                                            <button
                                                onClick={() => handlePlayAudio(submission.id)}
                                                className="btn-mobile bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 text-sm"
                                            >
                                                {playingAudio === submission.id ? (
                                                    <PauseIcon className="h-4 w-4 mr-1" />
                                                ) : (
                                                    <PlayIcon className="h-4 w-4 mr-1" />
                                                )}
                                                {playingAudio === submission.id ? 'Pause' : 'Play'}
                                            </button>
                                        )}
                                        <button className="btn-mobile bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                                            Review
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Question Bank</h3>
                            <button className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white text-sm">
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Question
                            </button>
                        </div>

                        {questions.map((question) => (
                            <div key={question.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty)}`}>
                                                {question.difficulty}
                                            </span>
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                {question.category}
                                            </span>
                                        </div>
                                        <p className="text-gray-900 dark:text-gray-100 mb-2">{question.question}</p>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Expected duration: {Math.floor(question.expectedDuration / 60)}m {question.expectedDuration % 60}s
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button className="btn-mobile bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm">
                                            Edit
                                        </button>
                                        <button className="btn-mobile bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-sm">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherInterviews;