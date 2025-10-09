import React from 'react';

interface GoogleFallbackProps {
  feature: 'calendar' | 'drive' | 'meet' | 'general';
  onManualAction?: () => void;
  className?: string;
  showAlternatives?: boolean;
}

export const GoogleFallback: React.FC<GoogleFallbackProps> = ({
  feature,
  onManualAction,
  className = '',
  showAlternatives = true,
}) => {
  const getFeatureConfig = () => {
    switch (feature) {
      case 'calendar':
        return {
          icon: '📅',
          title: 'Calendar Integration Unavailable',
          description: 'Google Calendar integration is currently unavailable.',
          alternatives: [
            'Create events manually in Google Calendar',
            'Use the session scheduling without calendar sync',
            'Export session details to your preferred calendar app',
          ],
          manualActionText: 'Open Google Calendar',
          manualActionUrl: 'https://calendar.google.com',
        };
      case 'drive':
        return {
          icon: '💾',
          title: 'Drive Integration Unavailable',
          description: 'Google Drive integration is currently unavailable.',
          alternatives: [
            'Upload files directly to Google Drive',
            'Share Drive links manually in assignments',
            'Use local file storage for now',
          ],
          manualActionText: 'Open Google Drive',
          manualActionUrl: 'https://drive.google.com',
        };
      case 'meet':
        return {
          icon: '📹',
          title: 'Meet Integration Unavailable',
          description: 'Google Meet integration is currently unavailable.',
          alternatives: [
            'Create Meet links manually',
            'Use alternative video conferencing tools',
            'Schedule meetings directly in Google Meet',
          ],
          manualActionText: 'Open Google Meet',
          manualActionUrl: 'https://meet.google.com',
        };
      default:
        return {
          icon: '🔗',
          title: 'Google Integration Unavailable',
          description: 'Google Workspace integration is currently unavailable.',
          alternatives: [
            'Use Google services directly in separate tabs',
            'Check your internet connection',
            'Try reconnecting your Google account',
          ],
          manualActionText: 'Open Google Workspace',
          manualActionUrl: 'https://workspace.google.com',
        };
    }
  };

  const config = getFeatureConfig();

  const handleManualAction = () => {
    if (onManualAction) {
      onManualAction();
    } else {
      window.open(config.manualActionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`google-fallback ${className}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <div className="text-4xl mb-3" role="img" aria-label={config.title}>
            {config.icon}
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{config.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{config.description}</p>
          
          <button
            onClick={handleManualAction}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">🔗</span>
            {config.manualActionText}
          </button>
        </div>
        
        {showAlternatives && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3 text-sm">Alternative Options:</h4>
            <ul className="space-y-2">
              {config.alternatives.map((alternative, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{alternative}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>💡</span>
            <span>Tip: Try refreshing the page or reconnecting your Google account</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleFallback;