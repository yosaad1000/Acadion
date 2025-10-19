import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  CogIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  AdjustmentsHorizontalIcon,
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

interface AIAgentConfig {
  id: string;
  name: string;
  type: 'chat' | 'quiz' | 'interview' | 'general';
  personality: string;
  responseStyle: 'formal' | 'casual' | 'encouraging' | 'strict';
  difficulty: 'adaptive' | 'easy' | 'medium' | 'hard';
  language: string;
  customInstructions: string;
  isActive: boolean;
  performance: {
    accuracy: number;
    engagement: number;
    satisfaction: number;
  };
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  configA: string;
  configB: string;
  status: 'running' | 'completed' | 'paused';
  participants: number;
  results?: {
    winnerConfig: 'A' | 'B';
    confidence: number;
    metrics: { [key: string]: number };
  };
}

const TeacherAIConfig: React.FC = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<AIAgentConfig[]>([]);
  const [abTests, setABTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'configs' | 'testing' | 'performance'>('configs');
  const [selectedConfig, setSelectedConfig] = useState<AIAgentConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAIConfigs();
  }, []);

  const fetchAIConfigs = async () => {
    try {
      // Simulate API call with dummy data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConfigs([
        {
          id: '1',
          name: 'Study Buddy Chat',
          type: 'chat',
          personality: 'Friendly and encouraging tutor who helps students understand concepts',
          responseStyle: 'encouraging',
          difficulty: 'adaptive',
          language: 'English',
          customInstructions: 'Always provide examples and ask follow-up questions to ensure understanding.',
          isActive: true,
          performance: { accuracy: 92, engagement: 88, satisfaction: 90 }
        },
        {
          id: '2',
          name: 'Quiz Generator',
          type: 'quiz',
          personality: 'Analytical and precise question creator',
          responseStyle: 'formal',
          difficulty: 'medium',
          language: 'English',
          customInstructions: 'Generate questions that test both knowledge and application.',
          isActive: true,
          performance: { accuracy: 95, engagement: 82, satisfaction: 87 }
        },
        {
          id: '3',
          name: 'Interview Assistant',
          type: 'interview',
          personality: 'Professional interviewer with constructive feedback',
          responseStyle: 'formal',
          difficulty: 'adaptive',
          language: 'English',
          customInstructions: 'Focus on communication skills and subject knowledge.',
          isActive: false,
          performance: { accuracy: 89, engagement: 75, satisfaction: 85 }
        }
      ]);

      setABTests([
        {
          id: '1',
          name: 'Chat Response Style Test',
          description: 'Testing formal vs casual response styles in AI chat',
          configA: 'Formal responses',
          configB: 'Casual responses',
          status: 'running',
          participants: 45,
          results: undefined
        },
        {
          id: '2',
          name: 'Quiz Difficulty Adaptation',
          description: 'Comparing adaptive vs fixed difficulty levels',
          configA: 'Adaptive difficulty',
          configB: 'Fixed medium difficulty',
          status: 'completed',
          participants: 78,
          results: {
            winnerConfig: 'A',
            confidence: 87,
            metrics: { engagement: 15, completion: 23, satisfaction: 12 }
          }
        }
      ]);
    } catch (error) {
      console.error('Error fetching AI configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (config: AIAgentConfig) => {
    setConfigs(prev => prev.map(c => c.id === config.id ? config : c));
    setIsEditing(false);
    setSelectedConfig(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat': return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
      case 'quiz': return <DocumentTextIcon className="h-5 w-5" />;
      case 'interview': return <MicrophoneIcon className="h-5 w-5" />;
      default: return <CogIcon className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading AI configuration...</p>
        </div>
      </div>
    );
  }  ret
urn (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                AI Agent Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Customize and optimize your AI teaching assistants
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center">
                <BeakerIcon className="h-5 w-5 mr-2" />
                New A/B Test
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('configs')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'configs'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Agent Configs
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'testing'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            A/B Testing
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'performance'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Performance
          </button>
        </div>

        {/* Agent Configurations Tab */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            {configs.map((config) => (
              <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getTypeIcon(config.type)}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {config.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        config.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{config.personality}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Style:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {config.responseStyle}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Difficulty:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {config.difficulty}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Language:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                          {config.language}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Type:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {config.type}
                        </span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {config.performance.accuracy}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {config.performance.engagement}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Engagement</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {config.performance.satisfaction}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedConfig(config);
                        setIsEditing(true);
                      }}
                      className="btn-mobile bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
                      Configure
                    </button>
                    <button
                      onClick={() => {
                        const updatedConfig = { ...config, isActive: !config.isActive };
                        handleSaveConfig(updatedConfig);
                      }}
                      className={`btn-mobile text-sm ${
                        config.isActive
                          ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300'
                          : 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {config.isActive ? (
                        <>
                          <PauseIcon className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* A/B Testing Tab */}
        {activeTab === 'testing' && (
          <div className="space-y-6">
            {abTests.map((test) => (
              <div key={test.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {test.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{test.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Config A</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{test.configA}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Config B</h4>
                        <p className="text-sm text-green-800 dark:text-green-200">{test.configB}</p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Participants: {test.participants}
                    </div>

                    {test.results && (
                      <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Results: Config {test.results.winnerConfig} wins with {test.results.confidence}% confidence
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {Object.entries(test.results.metrics).map(([metric, improvement]) => (
                            <div key={metric}>
                              <span className="text-gray-500 dark:text-gray-400 capitalize">{metric}:</span>
                              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                                +{improvement}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {test.status === 'running' && (
                      <button className="btn-mobile bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-700 dark:text-yellow-300 text-sm">
                        <PauseIcon className="h-4 w-4 mr-1" />
                        Pause
                      </button>
                    )}
                    <button className="btn-mobile bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Overall Performance
              </h3>
              <div className="space-y-4">
                {configs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(config.type)}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {config.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {config.performance.accuracy}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {config.performance.engagement}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Engagement</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {config.performance.satisfaction}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Optimization Suggestions
              </h3>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    💡 Chat Agent Improvement
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Consider adding more interactive elements to increase engagement from 88% to 95%.
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    ✅ Quiz Generator Performing Well
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    High accuracy (95%) and good satisfaction. Consider replicating this configuration.
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                    ⚠️ Interview Assistant Needs Attention
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Lower engagement (75%). Try adjusting personality to be more encouraging.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {isEditing && selectedConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Configure {selectedConfig.name}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personality Description
                  </label>
                  <textarea
                    value={selectedConfig.personality}
                    onChange={(e) => setSelectedConfig({...selectedConfig, personality: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Response Style
                    </label>
                    <select
                      value={selectedConfig.responseStyle}
                      onChange={(e) => setSelectedConfig({...selectedConfig, responseStyle: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                      <option value="encouraging">Encouraging</option>
                      <option value="strict">Strict</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={selectedConfig.difficulty}
                      onChange={(e) => setSelectedConfig({...selectedConfig, difficulty: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="adaptive">Adaptive</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Instructions
                  </label>
                  <textarea
                    value={selectedConfig.customInstructions}
                    onChange={(e) => setSelectedConfig({...selectedConfig, customInstructions: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={4}
                    placeholder="Enter specific instructions for this AI agent..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedConfig(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveConfig(selectedConfig)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAIConfig;