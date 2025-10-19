import React, { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  ChartBarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface TutorialItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
}

const Help: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'tutorials' | 'api' | 'support'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I upload documents for AI processing?',
      answer: 'Navigate to the Documents page, drag and drop your files (PDF, DOCX, TXT), or click the upload button. The AI will automatically process your documents for chat and quiz generation.',
      category: 'documents'
    },
    {
      id: '2',
      question: 'How does the AI chat work with my documents?',
      answer: 'The AI chat uses RAG (Retrieval Augmented Generation) to answer questions based on your uploaded documents. It will cite specific sections and provide accurate, contextual responses.',
      category: 'chat'
    },
    {
      id: '3',
      question: 'Can I customize the difficulty of generated quizzes?',
      answer: 'Yes! You can set difficulty levels (easy, medium, hard) and question types. The AI adapts to your learning progress and can generate personalized quizzes.',
      category: 'quizzes'
    },
    {
      id: '4',
      question: 'How do voice interviews work?',
      answer: 'Voice interviews use speech recognition to transcribe your responses and AI analysis to provide feedback on content, clarity, and communication skills.',
      category: 'interviews'
    },
    {
      id: '5',
      question: 'What analytics are available for teachers?',
      answer: 'Teachers can view student engagement metrics, performance analytics, feature usage statistics, and receive AI-powered insights for improving teaching effectiveness.',
      category: 'analytics'
    },
    {
      id: '6',
      question: 'How do I configure AI agents for my classes?',
      answer: 'Go to AI Configuration in the teacher dashboard to customize AI personalities, response styles, difficulty levels, and run A/B tests to optimize performance.',
      category: 'configuration'
    }
  ];

  const tutorials: TutorialItem[] = [
    {
      id: '1',
      title: 'Getting Started with Document Upload',
      description: 'Learn how to upload and process your study materials',
      duration: '3 min',
      difficulty: 'beginner',
      videoUrl: '/tutorials/document-upload.mp4'
    },
    {
      id: '2',
      title: 'Mastering AI Chat Features',
      description: 'Advanced tips for effective AI conversations',
      duration: '5 min',
      difficulty: 'intermediate',
      videoUrl: '/tutorials/ai-chat-advanced.mp4'
    },
    {
      id: '3',
      title: 'Creating Effective Quizzes',
      description: 'Best practices for quiz generation and customization',
      duration: '4 min',
      difficulty: 'intermediate',
      videoUrl: '/tutorials/quiz-creation.mp4'
    },
    {
      id: '4',
      title: 'Voice Interview Preparation',
      description: 'How to prepare for and excel in voice interviews',
      duration: '6 min',
      difficulty: 'beginner',
      videoUrl: '/tutorials/voice-interviews.mp4'
    },
    {
      id: '5',
      title: 'Understanding Analytics Dashboard',
      description: 'Interpreting your learning analytics and progress',
      duration: '7 min',
      difficulty: 'advanced',
      videoUrl: '/tutorials/analytics-dashboard.mp4'
    },
    {
      id: '6',
      title: 'Teacher: AI Agent Configuration',
      description: 'Advanced AI customization for educators',
      duration: '8 min',
      difficulty: 'advanced',
      videoUrl: '/tutorials/ai-configuration.mp4'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', icon: BookOpenIcon },
    { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
    { id: 'chat', name: 'AI Chat', icon: ChatBubbleLeftRightIcon },
    { id: 'quizzes', name: 'Quizzes', icon: QuestionMarkCircleIcon },
    { id: 'interviews', name: 'Interviews', icon: MicrophoneIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'configuration', name: 'Configuration', icon: CogIcon }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Help & Support
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Find answers, tutorials, and get support for the LMS platform
            </p>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'faq'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'tutorials'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Tutorials
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'api'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            API Docs
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'support'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Contact Support
          </button>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Categories</h3>
              <nav className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {category.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* FAQ List */}
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div key={faq.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {faq.question}
                        </h3>
                        <span className="ml-6 flex-shrink-0">
                          {expandedFAQ === faq.id ? (
                            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <div key={tutorial.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <VideoCameraIcon className="h-12 w-12 text-gray-400" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(tutorial.difficulty)}`}>
                      {tutorial.difficulty}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{tutorial.duration}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {tutorial.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {tutorial.description}
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                    Watch Tutorial
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Documentation Tab */}
        {activeTab === 'api' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              API Documentation
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Available APIs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">File Processing API</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Upload and process documents for RAG</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">POST /api/files</code>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">AI Chat API</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Send messages to AI chat agents</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">POST /api/chat/message</code>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Quiz Generator API</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Generate quizzes from content</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">POST /api/quiz/generate</code>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Voice Interview API</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Process voice interview submissions</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">POST /api/interview/submit-audio</code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Authentication</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    All API requests require authentication using JWT tokens:
                  </p>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block">
                    Authorization: Bearer &lt;your-jwt-token&gt;
                  </code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Rate Limits</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    API requests are limited to 100 requests per minute per user. Exceeding this limit will result in a 429 status code.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Support Tab */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Contact Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-6 w-6 text-blue-500 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Email Support</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">support@acadion.com</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <PhoneIcon className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Phone Support</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">+1 (555) 123-4567</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-500 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Live Chat</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Available 24/7</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Support Hours</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div>Monday - Friday: 9:00 AM - 6:00 PM EST</div>
                  <div>Saturday - Sunday: 10:00 AM - 4:00 PM EST</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Send us a Message
              </h2>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option>Technical Issue</option>
                    <option>Feature Request</option>
                    <option>Account Problem</option>
                    <option>General Question</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Describe your issue or question..."
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;