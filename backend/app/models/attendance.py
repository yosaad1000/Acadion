from datetime import datetime
import firebase_admin
from firebase_admin import firestore

class Attendance:
    """
    Represents student attendance for a subject
    """
    def __init__(self, attendance_id, student_id, subject_id, 
                 date=None, status="present", verified_by=None,
                 session_id="default", session_name="Default Session", session_time=None):
        self.attendance_id = attendance_id  # Unique attendance ID
        self.student_id = student_id        # Student ID
        self.subject_id = subject_id        # Subject ID
        self.date = date                    # Date of attendance (will use Firestore SERVER_TIMESTAMP)
        self.status = status                # Status: present, absent, late
        self.verified_by = verified_by      # Faculty ID who verified
        self.session_id = session_id        # Session ID for multiple sessions per day
        self.session_name = session_name    # Human-readable session name
        self.session_time = session_time    # Time of the session
        self.timestamp = datetime.now()     # Timestamp of record
    
    @staticmethod
    def from_dict(source):
        """Creates an Attendance instance from a dictionary"""
        attendance = Attendance(
            attendance_id=source.get('attendance_id'),
            student_id=source.get('student_id'),
            subject_id=source.get('subject_id'),
            date=source.get('date'),
            status=source.get('status', 'present'),
            verified_by=source.get('verified_by'),
            session_id=source.get('session_id', 'default'),
            session_name=source.get('session_name', 'Default Session'),
            session_time=source.get('session_time')
        )
        if source.get('timestamp'):
            attendance.timestamp = source.get('timestamp')
        return attendance
    
    def to_dict(self):
        """Returns the attendance as a dictionary"""
        # Use current timestamp if date is not provided
        date_field = self.date if self.date is not None else firestore.SERVER_TIMESTAMP
        
        return {
            'attendance_id': self.attendance_id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'date': date_field,
            'status': self.status,
            'verified_by': self.verified_by,
            'session_id': self.session_id,
            'session_name': self.session_name,
            'session_time': self.session_time,
            'timestamp': self.timestamp
        }