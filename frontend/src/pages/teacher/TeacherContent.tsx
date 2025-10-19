import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ShareIcon,
  TrashIcon,
  EyeIcon,
  FolderIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface ContentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  tags: string[];
  uploadedAt: string;
  sharedWith: string[];
  downloads: number;
  status: 'processing' | 'ready' | 'failed';
}

const TeacherContent: React.FC = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);

  const categories = ['all', 'lectures', 'assignments', 'resources', 'exams'];

  // Mock data
  useEffect(() => {
    setContent([
      {
        id: '1',
        name: 'Calculus Fundamentals.pdf',
        type: 'application/pdf',
        size: 3145728,
        category: 'lectures',
        tags: ['calculus', 'mathematics', 'derivatives'],
        uploadedAt: '2024-01-15T10:00:00Z',
        sharedWith: ['MATH301', 'MATH401'],
        downloads: 45,
        status: 'ready'
      },
      {
        id: '2',
        name: 'Physics Lab Manual.docx',
        type: 'application/docx',
        size: 2097152,
        category: 'resources',
        tags: ['physics', 'laboratory', 'experiments'],
        uploadedAt: '2024-01-14T14:30:00Z',
        sharedWith: ['PHYS101'],
        downloads: 28,
        status: 'ready'
      },
      {
        id: '3',
        name: 'Midterm Exam Questions.pdf',
        type: 'application/pdf',
        size: 1048576,
        category: 'exams',
        tags: ['exam', 'midterm', 'assessment'],
        uploadedAt: '2024-01-13T09:15:00Z',
        sharedWith: [],
        downloads: 0,
        status: 'processing'
      }
    ]);
  }, []);

  const handleFileUpload = (files: FileList) => {
    setUploading(true);
    // Mock upload process
    setTimeout(() => {
      const newContent: ContentItem = {
        id: Date.now().toString(),
        name: files[0].name,
        type: files[0].type,
        size: files[0].size,
        category: 'resources',
        tags: [],
        uploadedAt: new Date().toISOString(),
        sharedWith: [],
        downloads: 0,
        status: 'processing'
      };
      setContent(prev => [newContent, ...prev]);
      setUploading(false);
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredContent = selectedCategory === 'all' 
    ? content 
    : content.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Content Library
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage and share educational content with your classes
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                  Upload content
                </span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
              </label>
              <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              PDF, DOC, PPT, TXT up to 50MB
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                selectedCategory === category
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContent.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'ready' 
                    ? 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                    : item.status === 'processing'
                    ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Category and Tags */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <FolderIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {item.category}
                  </span>
                </div>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sharing Info */}
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Shared with: {item.sharedWith.length} classes</span>
                  <span>{item.downloads} downloads</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </button>
                <button 
                  onClick={() => setShowShareModal(item.id)}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ShareIcon className="h-4 w-4" />
                </button>
                <button className="flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredContent.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No content in this category
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload your first document to get started
            </p>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Share Content
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-gray-100">MATH301 - Advanced Mathematics</span>
                  <input type="checkbox" className="rounded" />
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-gray-100">PHYS101 - Physics Fundamentals</span>
                  <input type="checkbox" className="rounded" />
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-gray-100">CHEM101 - Chemistry Basics</span>
                  <input type="checkbox" className="rounded" />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowShareModal(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherContent;