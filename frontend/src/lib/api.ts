import { supabase } from './supabase';

// API configuration for the frontend
export const API_BASE_URL = 'http://localhost:8000';

// Helper function for making API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Add default headers (but don't set Content-Type for FormData)
  const defaultHeaders: Record<string, string> = {};
  
  // Only set Content-Type if body is not FormData
  if (options.body && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  
  // Merge with provided headers
  Object.assign(defaultHeaders, options.headers);

  // Get Supabase session token
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
    console.log('🔑 Making API call with token:', session.access_token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️ No session token found for API call');
  }

  console.log('🌐 API Call:', options.method || 'GET', url);
  
  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
  });

  console.log('📡 API Response:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error Response:', errorText);
  }

  return response;
};

// Helper function to get JSON response
export const apiCallJson = async (endpoint: string, options: RequestInit = {}) => {
  const response = await apiCall(endpoint, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  return response.json();
};

// Convenience functions
export const getSubjects = () => apiCallJson('/api/subjects');

// Specific API functions
export const api = {
  // Subjects
  getSubjects: () => apiCall('/api/subjects'),
  createSubject: (data: any) => apiCall('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  joinSubject: (data: any) => apiCall('/api/subjects/join', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Students
  getStudents: () => apiCall('/api/students'),
  createStudent: (data: any) => apiCall('/api/students', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Attendance
  uploadAttendance: (formData: FormData) => apiCall('/api/attendance/face-recognition', {
    method: 'POST',
    body: formData,
    headers: {}, // Don't set Content-Type for FormData
  }),
  saveManualAttendance: (data: any) => apiCall('/api/attendance/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Auth
  registerFace: (data: any) => apiCall('/api/auth/register-face', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};