import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  AcademicCapIcon,
  BellIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface StudySession {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  scheduledTime: string;
  status: 'upcoming' | 'completed' | 'missed' | 'in-progress';
  type: 'study' | 'quiz' | 'review' | 'practice';
  priority: 'low' | 'medium' | 'high';
}

interface StudyGoal {
  id: string;
  title: string;
  targetHours: number;
  currentHours: number;
  deadline: string;
  subjects: string[];
}

const StudySchedule: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [showAddSession, setShowAddSession] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockSessions: StudySession[] = [
      {
        id: '1',
        title: 'Machine Learning Fundamentals',
        subject: 'Computer Science',
        duration: 60,
        scheduledTime: '2024-01-15T09:00:00',
        status: 'completed',
        type: 'study',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Data Structures Quiz',
        subject: 'Computer Science',
        duration: 30,
        scheduledTime: '2024-01-15T14:00:00',
        status: 'upcoming',
        type: 'quiz',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Algorithm Review',
        subject: 'Computer Science',
        duration: 45,
        scheduledTime: '2024-01-15T16:30:00',
        status: 'upcoming',
        type: 'review',
        priority: 'high'
      },
      {
        id: '4',
        title: 'Python Practice',
        subject: 'Programming',
        duration: 90,
        scheduledTime: '2024-01-16T10:00:00',
        status: 'upcoming',
        type: 'practice',
        priority: 'medium'
      },
      {
        id: '5',
        title: 'Database Systems',
        subject: 'Computer Science',
        duration: 75,
        scheduledTime: '2024-01-16T15:00:00',
        status: 'upcoming',
        type: 'study',
        priority: 'low'
      }
    ];

    const mockGoals: StudyGoal[] = [
      {
        id: '1',
        title: 'Complete ML Course',
        targetHours: 40,
        currentHours: 28,
        deadline: '2024-02-15',
        subjects: ['Machine Learning', 'Data Science']
      },
      {
        id: '2',
        title: 'Master Data Structures',
        targetHours: 25,
        currentHours: 15,
        deadline: '2024-01-31',
        subjects: ['Computer Science', 'Algorithms']
      }
    ];

    setSessions(mockSessions);
    setGoals(mockGoals);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'upcoming': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'missed': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'study': return <BookOpenIcon className="h-4 w-4" />;
      case 'quiz': return <AcademicCapIcon className="h-4 w-4" />;
      case 'review': return <CheckCircleIcon className="h-4 w-4" />;
      case 'practice': return <PlayIcon className="h-4 w-4" />;
      default: return <BookOpenIcon className="h-4 w-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTodaySessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(session => 
      session.scheduledTime.split('T')[0] === today
    ).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  };

  const getUpcomingSessions = () => {
    const now = new Date();
    return sessions.filter(session => 
      new Date(session.scheduledTime) > now && session.status === 'upcoming'
    ).slice(0, 3);
  };

  const generateAISchedule = () => {
    // Simulate AI schedule generation
    const newSessions: StudySession[] = [
      {
        id: Date.now().toString(),
        title: 'AI-Recommended: Advanced Algorithms',
        subject: 'Computer Science',
        duration: 60,
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'upcoming',
        type: 'study',
        priority: 'high'
      }
    ];
    
    setSessions(prev => [...prev, ...newSessions]);
  };

  const todaySessions = getTodaySessions();
  const upcomingSessions = getUpcomingSessions();
  const totalStudyTime = sessions.reduce((total, session) => 
    session.status === 'completed' ? total + session.duration : total, 0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Study Schedule
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                AI-powered study planning and time management
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateAISchedule}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center text-sm"
              >
                <AcademicCapIcon className="h-4 w-4 mr-2" />
                AI Schedule
              </button>
              
              <button
                onClick={() => setShowAddSession(true)}
                className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm inline-flex items-center justify-center"
              >
                <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Add Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6 sm:py-8">
        {/* Quick Stats */}
        <div className="grid-responsive-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {todaySessions.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Today's Sessions</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(totalStudyTime)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Study Time</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {sessions.filter(s => s.status === 'completed').length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {upcomingSessions.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Upcoming</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Today's Schedule
                </h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              
              {todaySessions.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No sessions scheduled
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Add a study session to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySessions.map((session) => (
                    <div 
                      key={session.id} 
                      className={`border-l-4 ${getPriorityColor(session.priority)} bg-gray-50 dark:bg-gray-700 rounded-r-lg p-4 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${getStatusColor(session.status)}`}>
                            {getTypeIcon(session.type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {session.title}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>{session.subject}</span>
                              <span>{formatTime(session.scheduledTime)}</span>
                              <span>{formatDuration(session.duration)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          
                          {session.status === 'upcoming' && (
                            <button className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Weekly Overview
              </h2>
              
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const dayDate = new Date();
                  dayDate.setDate(dayDate.getDate() - dayDate.getDay() + index + 1);
                  const dayString = dayDate.toISOString().split('T')[0];
                  const daySessions = sessions.filter(s => s.scheduledTime.split('T')[0] === dayString);
                  
                  return (
                    <div key={day} className="text-center">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {day}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {dayDate.getDate()}
                      </div>
                      <div className="space-y-1">
                        {daySessions.slice(0, 3).map((session, idx) => (
                          <div 
                            key={idx}
                            className={`w-full h-2 rounded ${
                              session.status === 'completed' ? 'bg-green-400' :
                              session.status === 'upcoming' ? 'bg-blue-400' :
                              session.status === 'missed' ? 'bg-red-400' : 'bg-yellow-400'
                            }`}
                          />
                        ))}
                        {daySessions.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{daySessions.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Study Goals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Study Goals
              </h2>
              
              <div className="space-y-4">
                {goals.map((goal) => {
                  const progress = (goal.currentHours / goal.targetHours) * 100;
                  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={goal.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {goal.title}
                      </h4>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{goal.currentHours}h / {goal.targetHours}h</span>
                        <span>{daysLeft} days left</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {goal.subjects.map((subject, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Next Up
              </h2>
              
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`p-2 rounded ${getStatusColor(session.status)}`}>
                      {getTypeIcon(session.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {session.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(session.scheduledTime)} • {formatDuration(session.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Actions
              </h2>
              
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  Start Study Session
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  Set Reminder
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  View Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySchedule;