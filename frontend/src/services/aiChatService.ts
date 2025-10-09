import { AIChatMessage } from '../hooks/useAIChat';

// Dummy data service for AI Chat
export class AIChatService {
  private static instance: AIChatService;
  private conversationHistory: AIChatMessage[] = [];

  private constructor() {}

  public static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  // Simulate API call to get AI response
  public async getAIResponse(userMessage: string, context?: any): Promise<AIChatMessage> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    const responses = this.getContextualResponses(userMessage, context);
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    const aiMessage: AIChatMessage = {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: randomResponse.content,
      sender: 'ai',
      timestamp: new Date(),
      type: randomResponse.type
    };

    this.conversationHistory.push(aiMessage);
    return aiMessage;
  }

  // Get contextual responses based on user message and app context
  private getContextualResponses(userMessage: string, context?: any) {
    const lowerMessage = userMessage.toLowerCase();

    // Class management responses
    if (lowerMessage.includes('class') || lowerMessage.includes('create')) {
      return [
        {
          content: "I can help you create a new class! Here's what you need to do:\n\n1. Click 'Create Class' on your dashboard\n2. Enter class name and description\n3. Set up class preferences\n4. Share the invite code with students\n\nWould you like me to walk you through any of these steps?",
          type: 'text' as const
        },
        {
          content: "To manage your existing classes:\n\n📚 View all classes on your dashboard\n✏️ Edit class details anytime\n👥 Monitor student enrollment\n📊 Check attendance statistics\n\nWhich aspect would you like to explore?",
          type: 'suggestion' as const
        }
      ];
    }

    // Attendance responses
    if (lowerMessage.includes('attendance') || lowerMessage.includes('photo') || lowerMessage.includes('tracking')) {
      return [
        {
          content: "Our AI attendance system is quite powerful! Here's how it works:\n\n📸 **Photo Method**: Take a group photo, and our AI identifies registered students\n✅ **Manual Method**: Mark attendance individually\n📊 **Reports**: View detailed analytics\n\nThe photo method is usually faster for larger classes. Want to know more about any specific method?",
          type: 'text' as const
        },
        {
          content: "Pro tip for better attendance accuracy:\n\n• Ensure good lighting when taking photos\n• Make sure students face the camera\n• Remind students to complete face registration\n• Use manual backup for any missed detections",
          type: 'suggestion' as const
        }
      ];
    }

    // Student management responses
    if (lowerMessage.includes('student') || lowerMessage.includes('enrollment') || lowerMessage.includes('invite')) {
      return [
        {
          content: "Managing students is easy:\n\n🔗 **Invite Students**: Share your class invite code\n👥 **View Roster**: See all enrolled students\n📋 **Track Progress**: Monitor individual attendance\n🎓 **Face Registration**: Help students set up their profiles\n\nWhat would you like to do with your students?",
          type: 'text' as const
        },
        {
          content: "Student enrollment tips:\n\n• Share invite codes through your preferred communication channel\n• Remind students to register their faces for automatic attendance\n• Check the student roster regularly for new enrollments\n• Help students troubleshoot any registration issues",
          type: 'suggestion' as const
        }
      ];
    }

    // Reports and analytics responses
    if (lowerMessage.includes('report') || lowerMessage.includes('analytics') || lowerMessage.includes('data')) {
      return [
        {
          content: "Our reporting system provides comprehensive insights:\n\n📊 **Attendance Reports**: Class-by-class breakdown\n📈 **Trends**: Attendance patterns over time\n👤 **Individual Records**: Per-student attendance history\n📋 **Export Options**: Download data for external use\n\nWhich type of report interests you most?",
          type: 'text' as const
        },
        {
          content: "Quick actions for reports:\n\n🔍 Filter by date range\n📱 View on mobile or desktop\n📧 Email reports to administrators\n💾 Export to CSV or PDF",
          type: 'action' as const
        }
      ];
    }

    // Technical help responses
    if (lowerMessage.includes('help') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      return [
        {
          content: "I'm here to help! Common issues and solutions:\n\n🔧 **Login Problems**: Check your credentials and internet connection\n📸 **Camera Issues**: Ensure browser permissions are granted\n👤 **Face Recognition**: Make sure students have registered their faces\n📱 **Mobile Access**: Use our mobile app for better experience\n\nWhat specific issue are you experiencing?",
          type: 'text' as const
        },
        {
          content: "Troubleshooting checklist:\n\n✅ Clear browser cache and cookies\n✅ Check internet connection\n✅ Update your browser\n✅ Disable ad blockers temporarily\n✅ Try incognito/private mode\n\nIf issues persist, I can provide more specific guidance!",
          type: 'suggestion' as const
        }
      ];
    }

    // Default responses for general queries
    return [
      {
        content: "I'm your AI assistant for the Acadion platform! I can help you with:\n\n🎓 Class management and creation\n📸 Attendance tracking with AI\n👥 Student enrollment and management\n📊 Reports and analytics\n🔧 Troubleshooting and support\n\nWhat would you like to explore today?",
        type: 'text' as const
      },
      {
        content: "That's an interesting question! While I focus on helping with platform features, I can assist you with:\n\n• Navigating the dashboard\n• Understanding attendance options\n• Managing your classes\n• Viewing reports and data\n\nIs there a specific feature you'd like to learn about?",
        type: 'text' as const
      },
      {
        content: "I'd be happy to help! Here are some popular topics:\n\n💡 Getting started with your first class\n📊 Understanding attendance reports\n🎯 Best practices for student management\n⚡ Quick tips for efficient workflows\n\nWhich one catches your interest?",
        type: 'suggestion' as const
      }
    ];
  }

  // Save conversation history (in a real app, this would sync with backend)
  public saveConversation(messages: AIChatMessage[]): void {
    this.conversationHistory = [...messages];
    // In a real implementation, you would save to localStorage or send to backend
    localStorage.setItem('aiChatHistory', JSON.stringify(messages));
  }

  // Load conversation history
  public loadConversation(): AIChatMessage[] {
    try {
      const saved = localStorage.getItem('aiChatHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure dates are properly restored
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load AI chat history:', error);
    }
    return [];
  }

  // Clear conversation history
  public clearConversation(): void {
    this.conversationHistory = [];
    localStorage.removeItem('aiChatHistory');
  }

  // Get conversation statistics
  public getConversationStats() {
    const totalMessages = this.conversationHistory.length;
    const userMessages = this.conversationHistory.filter(msg => msg.sender === 'user').length;
    const aiMessages = this.conversationHistory.filter(msg => msg.sender === 'ai').length;

    return {
      totalMessages,
      userMessages,
      aiMessages,
      conversationStarted: this.conversationHistory.length > 0 ? this.conversationHistory[0].timestamp : null
    };
  }
}

// Export singleton instance
export const aiChatService = AIChatService.getInstance();