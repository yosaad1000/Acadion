import React, { useState, useEffect } from 'react';
import { ClassSchedule, ScheduleInstance } from '../../types';
import { 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface CalendarViewProps {
  schedules: ClassSchedule[];
  onEditSchedule?: (schedule: ClassSchedule) => void;
  onDeleteSchedule?: (scheduleId: number) => void;
  onViewDetails?: (schedule: ClassSchedule) => void;
  userRole: 'teacher' | 'student';
  loading?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  schedules: ClassSchedule[];
}

const CalendarView: React.FC<CalendarViewProps> = ({
  schedules,
  onEditSchedule,
  onDeleteSchedule,
  onViewDetails,
  userRole,
  loading = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, schedules]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month and adjust for Monday start
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const daySchedules = schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_datetime);
        return (
          scheduleDate.getDate() === date.getDate() &&
          scheduleDate.getMonth() === date.getMonth() &&
          scheduleDate.getFullYear() === date.getFullYear()
        );
      });

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        schedules: daySchedules
      });
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaySchedules = (date: Date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_datetime);
      return (
        scheduleDate.getDate() === date.getDate() &&
        scheduleDate.getMonth() === date.getMonth() &&
        scheduleDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[100px] p-2 border border-gray-100 rounded-md cursor-pointer hover:bg-gray-50 ${
                !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${
                isToday(day.date) ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => setSelectedDate(day.date)}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday(day.date) ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.date.getDate()}
              </div>
              
              {day.schedules.slice(0, 2).map(schedule => (
                <div
                  key={schedule.id}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1 truncate"
                  title={`${schedule.title} - ${formatTime(schedule.start_datetime)}`}
                >
                  {formatTime(schedule.start_datetime)} {schedule.title}
                </div>
              ))}
              
              {day.schedules.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{day.schedules.length - 2} more
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {formatDate(selectedDate)}
          </h3>
          
          {getDaySchedules(selectedDate).length === 0 ? (
            <p className="text-gray-500">No classes scheduled for this day.</p>
          ) : (
            <div className="space-y-3">
              {getDaySchedules(selectedDate).map(schedule => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{schedule.title}</div>
                      <div className="text-sm text-gray-600">
                        {formatTime(schedule.start_datetime)} - {schedule.duration_minutes} minutes
                      </div>
                      {schedule.description && (
                        <div className="text-sm text-gray-500 mt-1">{schedule.description}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewDetails?.(schedule)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    
                    {userRole === 'teacher' && (
                      <>
                        <button
                          onClick={() => onEditSchedule?.(schedule)}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-md"
                          title="Edit Schedule"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteSchedule?.(schedule.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-md"
                          title="Delete Schedule"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;