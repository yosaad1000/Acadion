import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CalendarView from '../CalendarView';
import { ClassSchedule } from '../../../types';

const mockSchedules: ClassSchedule[] = [
  {
    id: 1,
    teacher_id: 1,
    subject_id: 1,
    title: 'Mathematics Class',
    description: 'Algebra basics',
    start_datetime: '2024-01-15T10:00:00Z',
    duration_minutes: 60,
    google_event_id: 'event1',
    is_active: true,
    recurrence_pattern: {
      type: 'weekly',
      interval: 1,
      days_of_week: [0, 2, 4]
    }
  },
  {
    id: 2,
    teacher_id: 1,
    subject_id: 2,
    title: 'Physics Class',
    description: 'Mechanics',
    start_datetime: '2024-01-16T14:00:00Z',
    duration_minutes: 90,
    google_event_id: 'event2',
    is_active: true
  }
];

describe('CalendarView', () => {
  const mockOnEditSchedule = vi.fn();
  const mockOnDeleteSchedule = vi.fn();
  const mockOnViewDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar header correctly', () => {
    render(
      <CalendarView
        schedules={mockSchedules}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    const currentDate = new Date();
    const expectedMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    expect(screen.getByText(expectedMonth)).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders weekday headers', () => {
    render(
      <CalendarView
        schedules={mockSchedules}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    weekdays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('navigates between months', () => {
    render(
      <CalendarView
        schedules={mockSchedules}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    const currentDate = new Date();
    
    // Click next month
    const nextButton = screen.getByLabelText('Next month');
    fireEvent.click(nextButton);

    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    const expectedNextMonth = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    expect(screen.getByText(expectedNextMonth)).toBeInTheDocument();
  });

  it('returns to current month when Today button is clicked', () => {
    render(
      <CalendarView
        schedules={mockSchedules}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    // Navigate to next month first
    const nextButton = screen.getByLabelText('Next month');
    fireEvent.click(nextButton);

    // Click Today button
    fireEvent.click(screen.getByText('Today'));

    const currentDate = new Date();
    const expectedMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    expect(screen.getByText(expectedMonth)).toBeInTheDocument();
  });

  it('displays schedules on calendar days', () => {
    // Create a schedule for today to ensure it appears
    const today = new Date();
    const todaySchedule: ClassSchedule = {
      ...mockSchedules[0],
      start_datetime: today.toISOString()
    };

    render(
      <CalendarView
        schedules={[todaySchedule]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    // The schedule should appear on the calendar
    expect(screen.getByText(/Mathematics Class/)).toBeInTheDocument();
  });

  it('shows selected date details when day is clicked', () => {
    const today = new Date();
    const todaySchedule: ClassSchedule = {
      ...mockSchedules[0],
      start_datetime: today.toISOString()
    };

    render(
      <CalendarView
        schedules={[todaySchedule]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    // Click on today's date
    const todayElement = screen.getByText(today.getDate().toString());
    fireEvent.click(todayElement.closest('div')!);

    // Should show the selected date details
    const expectedDate = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('shows teacher action buttons for teacher role', () => {
    const today = new Date();
    const todaySchedule: ClassSchedule = {
      ...mockSchedules[0],
      start_datetime: today.toISOString()
    };

    render(
      <CalendarView
        schedules={[todaySchedule]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    // Click on today's date to show details
    const todayElement = screen.getByText(today.getDate().toString());
    fireEvent.click(todayElement.closest('div')!);

    // Should show edit and delete buttons for teachers
    expect(screen.getByTitle('Edit Schedule')).toBeInTheDocument();
    expect(screen.getByTitle('Delete Schedule')).toBeInTheDocument();
  });

  it('hides teacher action buttons for student role', () => {
    const today = new Date();
    const todaySchedule: ClassSchedule = {
      ...mockSchedules[0],
      start_datetime: today.toISOString()
    };

    render(
      <CalendarView
        schedules={[todaySchedule]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="student"
      />
    );

    // Click on today's date to show details
    const todayElement = screen.getByText(today.getDate().toString());
    fireEvent.click(todayElement.closest('div')!);

    // Should not show edit and delete buttons for students
    expect(screen.queryByTitle('Edit Schedule')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete Schedule')).not.toBeInTheDocument();
    
    // But should show view details button
    expect(screen.getByTitle('View Details')).toBeInTheDocument();
  });

  it('calls callback functions when action buttons are clicked', () => {
    const today = new Date();
    const todaySchedule: ClassSchedule = {
      ...mockSchedules[0],
      start_datetime: today.toISOString()
    };

    render(
      <CalendarView
        schedules={[todaySchedule]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    // Click on today's date to show details
    const todayElement = screen.getByText(today.getDate().toString());
    fireEvent.click(todayElement.closest('div')!);

    // Click edit button
    fireEvent.click(screen.getByTitle('Edit Schedule'));
    expect(mockOnEditSchedule).toHaveBeenCalledWith(todaySchedule);

    // Click delete button
    fireEvent.click(screen.getByTitle('Delete Schedule'));
    expect(mockOnDeleteSchedule).toHaveBeenCalledWith(todaySchedule.id);

    // Click view details button
    fireEvent.click(screen.getByTitle('View Details'));
    expect(mockOnViewDetails).toHaveBeenCalledWith(todaySchedule);
  });

  it('displays loading state', () => {
    render(
      <CalendarView
        schedules={[]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
        loading={true}
      />
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('shows no classes message when no schedules for selected date', () => {
    render(
      <CalendarView
        schedules={[]}
        onEditSchedule={mockOnEditSchedule}
        onDeleteSchedule={mockOnDeleteSchedule}
        onViewDetails={mockOnViewDetails}
        userRole="teacher"
      />
    );

    // Click on today's date
    const today = new Date();
    const todayElement = screen.getByText(today.getDate().toString());
    fireEvent.click(todayElement.closest('div')!);

    expect(screen.getByText('No classes scheduled for this day.')).toBeInTheDocument();
  });
});