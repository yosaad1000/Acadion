import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ClassSchedulingForm from '../ClassSchedulingForm';
import { ClassScheduleCreate } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockSubjects = [
  { id: '1', name: 'Mathematics', code: 'MATH101' },
  { id: '2', name: 'Physics', code: 'PHYS101' }
];

describe('ClassSchedulingForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSubjects)
    });
  });

  it('renders form fields correctly', async () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create Class Schedule')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Class Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date & Time')).toBeInTheDocument();
    expect(screen.getByLabelText('Duration (minutes)')).toBeInTheDocument();
  });

  it('loads subjects on mount', async () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/subjects', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Mathematics (MATH101)')).toBeInTheDocument();
      expect(screen.getByText('Physics (PHYS101)')).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mathematics (MATH101)')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Class Title'), { target: { value: 'Algebra Class' } });
    fireEvent.change(screen.getByLabelText('Description (Optional)'), { target: { value: 'Basic algebra concepts' } });
    fireEvent.change(screen.getByLabelText('Start Date & Time'), { target: { value: '2024-01-15T10:00' } });
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '90' } });

    // Submit form
    fireEvent.click(screen.getByText('Create Schedule'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        subject_id: 1,
        title: 'Algebra Class',
        description: 'Basic algebra concepts',
        start_datetime: '2024-01-15T10:00',
        duration_minutes: 90,
        recurrence_pattern: undefined
      });
    });
  });

  it('shows recurrence options when enabled', async () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Click add recurrence
    fireEvent.click(screen.getByText('Add Recurrence'));

    expect(screen.getByLabelText('Repeat Type')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Days of Week')).toBeInTheDocument();
  });

  it('handles recurrence pattern selection', async () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mathematics (MATH101)')).toBeInTheDocument();
    });

    // Enable recurrence
    fireEvent.click(screen.getByText('Add Recurrence'));

    // Select custom recurrence
    fireEvent.change(screen.getByLabelText('Repeat Type'), { target: { value: 'custom' } });
    
    expect(screen.getByLabelText('Every X Weeks')).toBeInTheDocument();
    
    // Set interval
    fireEvent.change(screen.getByLabelText('Every X Weeks'), { target: { value: '2' } });

    // Select days
    fireEvent.click(screen.getByText('Mon'));
    fireEvent.click(screen.getByText('Wed'));

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Class Title'), { target: { value: 'Test Class' } });
    fireEvent.change(screen.getByLabelText('Start Date & Time'), { target: { value: '2024-01-15T10:00' } });

    // Submit
    fireEvent.click(screen.getByText('Create Schedule'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_pattern: {
            type: 'custom',
            interval: 2,
            days_of_week: [0, 2], // Monday and Wednesday
            end_date: '',
            occurrence_count: undefined
          }
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('populates form with initial data when editing', async () => {
    const initialData: Partial<ClassScheduleCreate> = {
      subject_id: 1,
      title: 'Existing Class',
      description: 'Existing description',
      start_datetime: '2024-01-15T10:00',
      duration_minutes: 120,
      recurrence_pattern: {
        type: 'weekly',
        interval: 1,
        days_of_week: [0, 2],
        end_date: '2024-06-15'
      }
    };

    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByText('Edit Class Schedule')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Class')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15T10:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(
      <ClassSchedulingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without filling required fields
    fireEvent.click(screen.getByText('Create Schedule'));

    // Form should not submit (mockOnSubmit should not be called)
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});