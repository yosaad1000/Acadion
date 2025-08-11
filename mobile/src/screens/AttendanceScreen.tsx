import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
// Note: You'll need to install @react-native-picker/picker
// For now, we'll use a simple modal with TouchableOpacity options

interface Subject {
  subject_id: string;
  name: string;
}

const AttendanceScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.front);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects] = useState<Subject[]>([
    { subject_id: 'CS101', name: 'Computer Science 101' },
    { subject_id: 'MATH201', name: 'Mathematics 201' },
    { subject_id: 'PHY101', name: 'Physics 101' },
  ]);
  const cameraRef = useRef<Camera>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!selectedSubject) {
      setShowSubjectModal(true);
      return;
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const processAttendance = async () => {
    if (!capturedImage || !selectedSubject) return;

    setProcessing(true);
    try {
      // API call to mark attendance
      const formData = new FormData();
      formData.append('file', {
        uri: capturedImage,
        type: 'image/jpeg',
        name: 'attendance.jpg',
      } as any);
      formData.append('subject_id', selectedSubject);
      formData.append('faculty_id', 'FAC001'); // This would come from auth

      const response = await fetch('/api/attendance/face-recognition', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          'Success', 
          `Attendance processed! ${result.students_marked_present?.length || 0} students marked present.`
        );
      } else {
        throw new Error('Failed to process attendance');
      }
      
      setCapturedImage(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to process attendance. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.noPermissionText}>
          Camera permission is required to mark attendance
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        </View>
        
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectLabel}>Selected Subject:</Text>
          <Text style={styles.subjectName}>
            {subjects.find(s => s.subject_id === selectedSubject)?.name || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={retakePicture}
          >
            <Ionicons name="camera-reverse" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.processButton, processing && styles.processingButton]}
            onPress={processAttendance}
            disabled={processing}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {processing ? 'Processing...' : 'Mark Attendance'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>AI Processing</Text>
          <Text style={styles.instructionsText}>
            The system will analyze faces in the image and automatically mark attendance for recognized students.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Subject Selection Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.subjectSelector}
          onPress={() => setShowSubjectModal(true)}
        >
          <Text style={styles.subjectSelectorText}>
            {selectedSubject 
              ? subjects.find(s => s.subject_id === selectedSubject)?.name 
              : 'Select Subject'
            }
          </Text>
          <Ionicons name="chevron-down" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <Camera style={styles.camera} type={type} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <View style={styles.faceFrame} />
          <Text style={styles.instructionText}>
            Position class within the frame
          </Text>
        </View>
      </Camera>
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => {
            setType(
              type === CameraType.back ? CameraType.front : CameraType.back
            );
          }}
        >
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.captureButton, !selectedSubject && styles.captureButtonDisabled]} 
          onPress={takePicture}
          disabled={!selectedSubject}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        
        <View style={styles.placeholder} />
      </View>

      {/* Subject Selection Modal */}
      <Modal
        visible={showSubjectModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            <ScrollView style={styles.subjectList}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.subject_id}
                  style={[
                    styles.subjectOption,
                    selectedSubject === subject.subject_id && styles.subjectOptionSelected
                  ]}
                  onPress={() => setSelectedSubject(subject.subject_id)}
                >
                  <Text style={[
                    styles.subjectOptionText,
                    selectedSubject === subject.subject_id && styles.subjectOptionTextSelected
                  ]}>
                    {subject.name}
                  </Text>
                  {selectedSubject === subject.subject_id && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowSubjectModal(false)}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subjectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  subjectSelectorText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 200,
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
  },
  placeholder: {
    width: 50,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f9fafb',
  },
  previewImage: {
    width: '90%',
    height: 300,
    borderRadius: 12,
  },
  subjectInfo: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  retakeButton: {
    backgroundColor: '#6b7280',
  },
  processButton: {
    backgroundColor: '#10b981',
  },
  processingButton: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructions: {
    backgroundColor: '#eff6ff',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  subjectList: {
    maxHeight: 200,
  },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subjectOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  subjectOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  subjectOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AttendanceScreen;