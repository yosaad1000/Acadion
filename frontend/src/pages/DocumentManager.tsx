import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  DocumentArrowUpIcon,
  DocumentTextIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
}

const DocumentManager: React.FC = () => {
  const { user, currentRole } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Mock data for demonstration
  useEffect(() => {
    const mockDocuments: Document[] = [
      {
        id: '1',
        name: 'Introduction to Machine Learning.pdf',
        type: 'PDF',
        size: 2048000,
        uploadDate: '2024-01-15',
        status: 'completed'
      },
      {
        id: '2',
        name: 'Data Structures Notes.docx',
        type: 'DOCX',
        size: 1024000,
        uploadDate: '2024-01-14',
        status: 'processing',
        progress: 75
      },
      {
        id: '3',
        name: 'Algorithm Analysis.txt',
        type: 'TXT',
        size: 512000,
        uploadDate: '2024-01-13',
        status: 'completed'
      }
    ];
    setDocuments(mockDocuments);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setSelectedFiles(files);
    setLoading(true);

    // Simulate file upload and processing
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const newDoc: Document = {
        id: Date.now().toString() + i,
        name: file.name,
        type: file.type.split('/')[1].toUpperCase(),
        size: file.size,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'processing',
        progress: 0
      };

      setDocuments(prev => [...prev, newDoc]);

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(prev => ({ ...prev, [newDoc.id]: progress }));
        
        if (progress === 100) {
          setDocuments(prev => 
            prev.map(doc => 
              doc.id === newDoc.id 
                ? { ...doc, status: 'completed' as const }
                : doc
            )
          );
        }
      }
    }

    setLoading(false);
    event.target.value = '';
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="py-4 sm:py-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Document Manager
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
              Upload and manage your study materials for AI processing
            </p>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6 sm:py-8">
        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Upload Documents
          </h2>
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="mb-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Drop files here or click to upload
                </span>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supports PDF, DOC, DOCX, TXT files up to 10MB each
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your Documents ({filteredDocuments.length})
            </h2>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No documents found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search terms' : 'Upload your first document to get started'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <DocumentTextIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {doc.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.type} • {formatFileSize(doc.size)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {doc.status === 'processing' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span>Processing...</span>
                              <span>{uploadProgress[doc.id] || doc.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[doc.id] || doc.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(doc.status, doc.progress)}
                      
                      <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Processing Status */}
        {documents.some(doc => doc.status === 'processing') && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Processing Documents
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  Your documents are being processed for AI analysis. This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;