import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  BellIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface StudyTask {
  id: string;
  title: string;
  subject: string;
  type: 'study' | 'quiz' | 'review' | 'assignment';
  duration: number;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completed: boolean;
  aiGenerated: boolean;
}

interface ScheduleDay {
  date: string;
  tasks: StudyTask[];
  totalHours: number;
}

const StudentSchedule: React.FC = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    subject: '',
    type: 'study' as const,
    duration: 60,
    priority: 'medium' as const
  });

  // Mock data
  useEffect(() => {
    const today = new Date();
    const scheduleData: ScheduleDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const tasks: StudyTask[] = [
        {
          id: `${i}-1`,
          title: 'Review Quadratic Equations',
          subject: 'Mathematics',
          type: 'review',
          duration: 45,
          priority: 'high',
          dueDate: dateStr,
          completed: i < 2,
          aiGenerated: true
        },
        {
          id: `${i}-2`,
          title: 'Physics Problem Set',
          subject: 'Physics',
          type: 'assignment',
          duration: 90,
          priority: 'medium',
          dueDate: dateStr,
          completed: i < 1,
          aiGenerated: false
        }
      ];
      
      scheduleData.push({
        date: dateStr,
        tasks: i === 0 ? tasks : i === 1 ? [tasks[0]] : [],
        totalHours: i === 0 ? 2.25 : i === 1 ? 0.75 : 0
      });
    }
    
    setSchedule(scheduleData);
  }, []);

  const addTask = () => {
    const task: StudyTask = {
      id: Date.now().toString(),
      title: newTask.title,
      subject: newTask.subject,
      type: newTask.type,
      duration: newTask.duration,
      priority: newTask.priority,
      dueDate: selectedDate,
      completed: false,
      aiGenerated: false
    };

    setSchedule(prev => prev.map(day => 
      day.date === selectedDate 
        ? { 
            ...day, 
            tasks: [...day.tasks, task],
            totalHours: day.totalHours + (newTask.duration / 60)
          }
        : day
    ));

    setNewTask({
      title: '',
      subject: '',
      type: 'study',
      duration: 60,
      priority: 'medium'
    });
    setShowAddTask(false);
  };

  const toggleTaskComplete = (taskId: string) => {
    setSchedule(prev => prev.map(day => ({
      ...day,
      tasks: day.tasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    })));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz': return '📝';
      case 'review': return '📖';
      case 'assignment': return '📋';
      default: return '📚';
    }
  };

  const selectedDay = schedule.find(day => day.date === selectedDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Study Schedule
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              AI-optimized study plan based on your learning patterns
            </p>
          </div>
          
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Task
          </button>
        </div>

        {/* Weekly Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            This Week
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {schedule.slice(0, 7).map((day, index) => {
              const date = new Date(day.date);
              const isSelected = day.date === selectedDate;
              const isToday = day.date === new Date().toISOString().split('T')[0];
              
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : isToday
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {weekDays[date.getDay()]}
                  </div>
                  <div className="text-lg font-bold mb-1">
                    {date.getDate()}
                  </div>
                  <div className="text-xs">
                    {day.totalHours > 0 ? `${day.totalHours}h` : ''}
                  </div>
                  {day.tasks.length > 0 && (
                    <div className="flex justify-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        day.tasks.some(t => !t.completed) ? 'bg-red-400' : 'bg-green-400'
                      }`}></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Tasks */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                {selectedDay && selectedDay.totalHours > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedDay.totalHours} hours planned
                  </p>
                )}
              </div>
              
              <div className="p-6">
                {selectedDay?.tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      No tasks scheduled
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Add a task to get started with your study plan
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay?.tasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <button
                          onClick={() => toggleTaskComplete(task.id)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            task.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                          }`}
                        >
                          {task.completed && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{getTypeIcon(task.type)}</span>
                            <h4 className={`font-medium ${
                              task.completed 
                                ? 'text-gray-500 dark:text-gray-400 line-through' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {task.title}
                            </h4>
                            {task.aiGenerated && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">
                                AI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{task.subject}</span>
                            <span className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {task.duration} min
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Study Stats & AI Insights */}
          <div className="space-y-6">
            {/* Today's Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
                Today's Progress
              </h3>
              
              {selectedDay && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Tasks Completed</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {selectedDay.tasks.filter(t => t.completed).length}/{selectedDay.tasks.length}
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: selectedDay.tasks.length > 0 
                            ? `${(selectedDay.tasks.filter(t => t.completed).length / selectedDay.tasks.length) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Study Time</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {selectedDay.totalHours}h planned
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Study Tips */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <BellIcon className="h-5 w-5 mr-2 text-yellow-500" />
                AI Study Tips
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200">
                    Your peak focus time is 2-4 PM. Schedule difficult topics during this window.
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-800 dark:text-green-200">
                    Take a 10-minute break every 45 minutes for optimal retention.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-purple-800 dark:text-purple-200">
                    Review Mathematics concepts before your Physics study session for better understanding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Add Study Task
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., Review Chapter 5"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newTask.subject}
                    onChange={(e) => setNewTask(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., Mathematics"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="study">Study</option>
                      <option value="review">Review</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      value={newTask.duration}
                      onChange={(e) => setNewTask(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      min="15"
                      step="15"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  disabled={!newTask.title || !newTask.subject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSchedule;