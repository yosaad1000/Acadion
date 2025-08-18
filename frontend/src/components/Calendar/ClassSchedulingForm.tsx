import React, { useState, useEffect } from 'react';
import { ClassScheduleCreate, RecurrencePattern, Subject } from '../../types';
import { 
  CalendarIcon, 
  ClockIcon, 
  ArrowPathIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';

interface ClassSchedulingFormProps {
  onSubmit: (schedule: ClassScheduleCreate) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ClassScheduleCreate>;
  loading?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' }
];

const ClassSchedulingForm: React.FC<ClassSchedulingFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  loading = false
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState<ClassScheduleCreate>({
    subject_id: initialData?.subject_id || 0,
    title: initialData?.title || '',
    description: initialData?.description || '',
    start_datetime: initialData?.start_datetime || '',
    duration_minutes: initialData?.duration_minutes || 60,
    recurrence_pattern: initialData?.recurrence_pattern || undefined
  });
  
  const [showRecurrence, setShowRecurrence] = useState(!!initialData?.recurrence_pattern);
  const [recurrenceData, setRecurrenceData] = useState<RecurrencePattern>({
    type: 'weekly',
    interval: 1,
    days_of_week: [],
    end_date: '',
    occurrence_count: undefined
  });

  useEffect(() => {
    fetchSubjects();
    if (initialData?.recurrence_pattern) {
      setRecurrenceData(initialData.recurrence_pattern);
    }
  }, [initialData]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subjects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const handleInputChange = (field: keyof ClassScheduleCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecurrenceChange = (field: keyof RecurrencePattern, value: any) => {
    setRecurrenceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleDayOfWeek = (day: number) => {
    setRecurrenceData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const scheduleData: ClassScheduleCreate = {
      ...formData,
      recurrence_pattern: showRecurrence ? recurrenceData : undefined
    };

    await onSubmit(scheduleData);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <CalendarIcon className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          {initialData ? 'Edit Class Schedule' : 'Create Class Schedule'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              id="subject"
              value={formData.subject_id}
              onChange={(e) => handleInputChange('subject_id', parseInt(e.target.value))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0}>Select a subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Class Title
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Mathematics - Algebra"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional details about the class..."
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_datetime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time
            </label>
            <input
              id="start_datetime"
              type="datetime-local"
              value={formData.start_datetime}
              onChange={(e) => handleInputChange('start_datetime', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <div className="relative">
              <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                min={15}
                max={480}
                step={15}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Recurrence Pattern */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Recurrence Pattern
            </label>
            <button
              type="button"
              onClick={() => setShowRecurrence(!showRecurrence)}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <PlusIcon className="h-4 w-4" />
              <span>{showRecurrence ? 'Remove Recurrence' : 'Add Recurrence'}</span>
            </button>
          </div>

          {showRecurrence && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="repeat_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Repeat Type
                  </label>
                  <select
                    id="repeat_type"
                    value={recurrenceData.type}
                    onChange={(e) => handleRecurrenceChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {recurrenceData.type === 'custom' && (
                  <div>
                    <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-2">
                      Every X Weeks
                    </label>
                    <input
                      id="interval"
                      type="number"
                      value={recurrenceData.interval}
                      onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                      min={1}
                      max={52}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    id="end_date"
                    type="date"
                    value={recurrenceData.end_date}
                    onChange={(e) => handleRecurrenceChange('end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDayOfWeek(day.value)}
                      className={`px-3 py-2 text-sm font-medium rounded-md border ${
                        recurrenceData.days_of_week.includes(day.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              initialData ? 'Update Schedule' : 'Create Schedule'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassSchedulingForm;