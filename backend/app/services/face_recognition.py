import face_recognition
import numpy as np
from pinecone import Pinecone
from typing import List, Optional, Tuple
import os
from PIL import Image
import io
import base64
from ..config import settings

class FaceRecognitionService:
    def __init__(self):
        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = self.pc.Index(settings.PINECONE_INDEX_NAME)
        self.face_threshold = settings.FACE_THRESHOLD
    
    def extract_face_encoding(self, image_data: bytes) -> Optional[np.ndarray]:
        """Extract face encoding from image bytes"""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            print(f"🖼️  Image loaded: {image.size} pixels, mode: {image.mode}")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
                print("🔄 Converted image to RGB")
            
            # Convert PIL to numpy array
            image_array = np.array(image)
            print(f"📊 Image array shape: {image_array.shape}")
            
            # Find face locations
            print("🔍 Detecting faces...")
            print(f"📐 Image array shape: {image_array.shape}, dtype: {image_array.dtype}")
            print(f"📊 Image array min: {image_array.min()}, max: {image_array.max()}")
            
            # Try different face detection models
            face_locations = face_recognition.face_locations(image_array, model="hog")
            print(f"👥 Found {len(face_locations)} face(s) using HOG model")
            
            # If HOG doesn't find faces, try CNN model (more accurate but slower)
            if len(face_locations) == 0:
                print("🔄 Trying CNN model for better accuracy...")
                face_locations = face_recognition.face_locations(image_array, model="cnn")
                print(f"👥 Found {len(face_locations)} face(s) using CNN model")
            
            if not face_locations:
                print("❌ No faces detected in image")
                return None
            
            # Log face locations
            for i, (top, right, bottom, left) in enumerate(face_locations):
                print(f"👤 Face {i+1}: top={top}, right={right}, bottom={bottom}, left={left}")
            
            # Get face encodings (use first face if multiple)
            print("🧠 Extracting face encodings...")
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            print(f"✅ Generated {len(face_encodings)} face encoding(s)")
            
            if face_encodings:
                encoding = face_encodings[0]
                print(f"🎯 Using first face encoding (shape: {encoding.shape})")
                return encoding
            
            print("❌ Failed to generate face encodings")
            return None
            
        except Exception as e:
            print(f"💥 Error extracting face encoding: {e}")
            return None
    
    def store_face_encoding(self, student_id: str, encoding: np.ndarray) -> bool:
        """Store face encoding in Pinecone"""
        try:
            # Convert numpy array to list for Pinecone
            encoding_list = encoding.tolist()
            
            # Store in Pinecone with student_id as the vector ID
            self.index.upsert(
                vectors=[{
                    "id": student_id,
                    "values": encoding_list,
                    "metadata": {
                        "student_id": student_id,
                        "created_at": str(np.datetime64('now'))
                    }
                }]
            )
            
            return True
            
        except Exception as e:
            print(f"Error storing face encoding: {e}")
            return False
    
    def find_matching_student(self, encoding: np.ndarray) -> Optional[Tuple[str, float]]:
        """Find matching student by face encoding"""
        try:
            # Convert numpy array to list for Pinecone query
            encoding_list = encoding.tolist()
            print(f"🔍 Querying Pinecone with encoding vector (length: {len(encoding_list)})")
            
            # Query Pinecone for similar faces
            results = self.index.query(
                vector=encoding_list,
                top_k=5,  # Get top 5 matches for better debugging
                include_metadata=True
            )
            
            print(f"📊 Pinecone returned {len(results.matches)} matches")
            
            # Log all matches for debugging
            for i, match in enumerate(results.matches):
                student_id = match.metadata.get('student_id', 'Unknown')
                print(f"🎯 Match {i+1}: Student {student_id}, Score: {match.score:.4f}")
            
            if results.matches and len(results.matches) > 0:
                match = results.matches[0]
                similarity_score = match.score
                threshold = 1 - self.face_threshold
                
                print(f"🎚️  Threshold: {threshold:.4f}, Best Score: {similarity_score:.4f}")
                
                # Check if similarity is above threshold
                if similarity_score >= threshold:
                    student_id = match.metadata.get('student_id')
                    print(f"✅ MATCH FOUND! Student: {student_id}, Confidence: {similarity_score:.4f}")
                    return student_id, similarity_score
                else:
                    print(f"❌ No match above threshold. Best score {similarity_score:.4f} < {threshold:.4f}")
            else:
                print("❌ No matches returned from Pinecone")
            
            return None
            
        except Exception as e:
            print(f"💥 Error finding matching student: {e}")
            return None
    
    def delete_face_encoding(self, student_id: str) -> bool:
        """Delete face encoding from Pinecone"""
        try:
            self.index.delete(ids=[student_id])
            return True
        except Exception as e:
            print(f"Error deleting face encoding: {e}")
            return False
    
    def update_face_encoding(self, student_id: str, new_encoding: np.ndarray) -> bool:
        """Update existing face encoding"""
        try:
            # Delete old encoding
            self.delete_face_encoding(student_id)
            
            # Store new encoding
            return self.store_face_encoding(student_id, new_encoding)
            
        except Exception as e:
            print(f"Error updating face encoding: {e}")
            return False
    
    def process_student_photo(self, student_id: str, image_data: bytes) -> dict:
        """Process student photo and store face encoding"""
        try:
            # Extract face encoding
            encoding = self.extract_face_encoding(image_data)
            
            if encoding is None:
                return {
                    "success": False,
                    "message": "No face detected in the image"
                }
            
            # Store encoding in Pinecone
            success = self.store_face_encoding(student_id, encoding)
            
            if success:
                return {
                    "success": True,
                    "message": "Face encoding stored successfully",
                    "encoding_stored": True
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to store face encoding"
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Error processing photo: {str(e)}"
            }
    
    def recognize_student(self, image_data: bytes) -> dict:
        """Recognize student from photo with detailed analysis"""
        try:
            print("🚀 Starting face recognition process...")
            
            # Convert bytes to PIL Image for analysis
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image.convert('RGB'))
            
            # Find all faces in the image
            face_locations = face_recognition.face_locations(image_array)
            print(f"👥 Total faces detected: {len(face_locations)}")
            
            if not face_locations:
                return {
                    "success": False,
                    "message": "No faces detected in the image",
                    "faces_detected": 0,
                    "faces_recognized": 0,
                    "faces_unrecognized": 0
                }
            
            # Get encodings for all faces
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            print(f"🧠 Face encodings generated: {len(face_encodings)}")
            
            recognized_students = {}  # Track unique students only
            face_results = []  # Track each face result
            best_match_overall = None
            best_score_overall = 0
            
            # Process each face
            for i, encoding in enumerate(face_encodings):
                print(f"\n🔍 Processing face {i+1}/{len(face_encodings)}")
                
                # Find matching student
                match_result = self.find_matching_student(encoding)
                
                if match_result:
                    student_id, similarity_score = match_result
                    
                    face_data = {
                        "face_index": i + 1,
                        "student_id": student_id,
                        "similarity_score": similarity_score,
                        "location": face_locations[i],
                        "recognized": True
                    }
                    face_results.append(face_data)
                    
                    # Only keep the best match per student (prevent duplicates)
                    if student_id not in recognized_students or similarity_score > recognized_students[student_id]["similarity_score"]:
                        recognized_students[student_id] = face_data
                        
                        # Track the overall best match
                        if similarity_score > best_score_overall:
                            best_match_overall = face_data
                            best_score_overall = similarity_score
                        
                        print(f"✅ Face {i+1} recognized as student {student_id} (score: {similarity_score:.4f}) - NEW BEST")
                    else:
                        print(f"🔄 Face {i+1} recognized as student {student_id} (score: {similarity_score:.4f}) - DUPLICATE (ignoring)")
                else:
                    face_data = {
                        "face_index": i + 1,
                        "location": face_locations[i],
                        "recognized": False
                    }
                    face_results.append(face_data)
                    print(f"❌ Face {i+1} not recognized")
            
            # Calculate correct counts
            total_faces = len(face_locations)
            unique_students_count = len(recognized_students)
            unrecognized_faces_count = total_faces - unique_students_count
            
            # Create unrecognized faces list (all faces that don't belong to recognized students)
            unrecognized_faces = []
            recognized_face_indices = set()
            
            # Mark the best face for each recognized student
            for student_data in recognized_students.values():
                recognized_face_indices.add(student_data["face_index"])
            
            # All other faces are unrecognized
            for face_data in face_results:
                if face_data["face_index"] not in recognized_face_indices:
                    unrecognized_faces.append({
                        "face_index": face_data["face_index"],
                        "location": face_data["location"]
                    })
            
            print(f"\n📊 SUMMARY:")
            print(f"   Total faces: {total_faces}")
            print(f"   Unique students recognized: {unique_students_count}")
            print(f"   Unrecognized faces: {unrecognized_faces_count}")
            print(f"🧮 Math check: {total_faces} = {unique_students_count} + {unrecognized_faces_count}")
            
            # Return detailed results
            if best_match_overall:
                return {
                    "success": True,
                    "student_id": best_match_overall["student_id"],
                    "similarity_score": best_match_overall["similarity_score"],
                    "message": f"Best match: Student {best_match_overall['student_id']} with {best_match_overall['similarity_score']:.2%} confidence",
                    "faces_detected": total_faces,
                    "faces_recognized": unique_students_count,
                    "faces_unrecognized": unrecognized_faces_count,
                    "recognized_students": list(recognized_students.values()),
                    "unrecognized_faces": unrecognized_faces,
                    "all_face_locations": face_locations,
                    "best_match": best_match_overall
                }
            else:
                return {
                    "success": False,
                    "message": f"No registered students found among {total_faces} detected face(s)",
                    "faces_detected": total_faces,
                    "faces_recognized": 0,
                    "faces_unrecognized": total_faces,
                    "recognized_students": [],
                    "unrecognized_faces": [{"face_index": i+1, "location": face_locations[i]} for i in range(total_faces)],
                    "all_face_locations": face_locations
                }
                
        except Exception as e:
            print(f"💥 Error in recognize_student: {e}")
            return {
                "success": False,
                "message": f"Error recognizing student: {str(e)}",
                "faces_detected": 0,
                "faces_recognized": 0,
                "faces_unrecognized": 0
            }

# Global instance
face_recognition_service = FaceRecognitionService()