import { useState, useCallback, useRef } from 'react';

export interface AIChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'suggestion' | 'action';
}

export interface AIChatState {
  isOpen: boolean;
  messages: AIChatMessage[];
  isTyping: boolean;
}

// Dummy AI responses for realistic conversation flows
const AI_RESPONSES = [
  {
    content: "Hello! I'm your AI assistant. I can help you with managing classes, understanding attendance features, and navigating the platform. What would you like to know?",
    type: 'text' as const
  },
  {
    content: "To create a new class:\n\n1. Click the 'Create Class' button on your dashboard\n2. Fill in the class name and description\n3. Set up your class preferences\n4. Share the invite code with students\n\nWould you like me to guide you through any specific step?",
    type: 'text' as const
  },
  {
    content: "For attendance tracking:\n\n📸 **Photo Upload**: Take a group photo and our AI will identify students\n✅ **Manual Check**: Mark attendance manually for each student\n📊 **Reports**: View detailed attendance reports and analytics\n\nWhich method would you like to learn more about?",
    type: 'text' as const
  },
  {
    content: "Here are the key features available:\n\n🎓 **Class Management**: Create and organize classes\n👥 **Student Enrollment**: Easy invite codes for students\n📸 **AI Attendance**: Facial recognition from group photos\n📊 **Analytics**: Detailed attendance reports\n📱 **Mobile App**: Access from any device\n\nIs there a specific feature you'd like to explore?",
    type: 'text' as const
  },
  {
    content: "I can help you with:\n\n• Creating and managing classes\n• Understanding attendance features\n• Troubleshooting common issues\n• Navigating the dashboard\n• Setting up face registration\n• Viewing reports and analytics\n\nWhat specific topic interests you?",
    type: 'suggestion' as const
  },
  {
    content: "Great question! Let me break that down for you step by step. The facial recognition system works by analyzing group photos and identifying registered students automatically. This saves time and ensures accurate attendance records.",
    type: 'text' as const
  },
  {
    content: "Quick tip: Make sure students have registered their faces in the system for the best attendance tracking results. You can remind them to complete face registration from their student dashboard.",
    type: 'suggestion' as const
  },
  {
    content: "Would you like me to:\n\n🚀 Show you how to create your first class\n📊 Explain the attendance reports\n👥 Help with student management\n⚙️ Walk through settings and preferences",
    type: 'action' as const
  }
];

// Keywords that trigger specific responses
const RESPONSE_TRIGGERS = [
  { keywords: ['create', 'class', 'new'], responseIndex: 1 },
  { keywords: ['attendance', 'tracking', 'photo'], responseIndex: 2 },
  { keywords: ['features', 'available', 'what'], responseIndex: 3 },
  { keywords: ['help', 'assist', 'support'], responseIndex: 4 },
  { keywords: ['face', 'recognition', 'facial'], responseIndex: 5 },
  { keywords: ['tip', 'advice', 'suggestion'], responseIndex: 6 },
  { keywords: ['quick', 'action', 'show'], responseIndex: 7 }
];

export const useAIChat = () => {
  const [state, setState] = useState<AIChatState>({
    isOpen: false,
    messages: [],
    isTyping: false
  });

  const responseTimeoutRef = useRef<NodeJS.Timeout>();

  const generateAIResponse = useCallback((userMessage: string): AIChatMessage => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Find matching response based on keywords
    let responseIndex = 0; // Default greeting response
    
    for (const trigger of RESPONSE_TRIGGERS) {
      if (trigger.keywords.some(keyword => lowerMessage.includes(keyword))) {
        responseIndex = trigger.responseIndex;
        break;
      }
    }
    
    // If no specific trigger found, use a random helpful response
    if (responseIndex === 0 && state.messages.length > 0) {
      responseIndex = Math.floor(Math.random() * AI_RESPONSES.length);
    }
    
    const response = AI_RESPONSES[responseIndex];
    
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: response.content,
      sender: 'ai',
      timestamp: new Date(),
      type: response.type
    };
  }, [state.messages.length]);

  const toggleChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: !prev.isOpen
    }));
  }, []);

  const openChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true
    }));
  }, []);

  const closeChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));

    // Clear any existing timeout
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
    }

    // Simulate AI thinking time (1-3 seconds)
    const thinkingTime = Math.random() * 2000 + 1000;
    
    responseTimeoutRef.current = setTimeout(() => {
      const aiResponse = generateAIResponse(content);
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        isTyping: false
      }));
    }, thinkingTime);
  }, [generateAIResponse]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: []
    }));
  }, []);

  const addWelcomeMessage = useCallback(() => {
    if (state.messages.length === 0) {
      const welcomeMessage = generateAIResponse('hello');
      setState(prev => ({
        ...prev,
        messages: [welcomeMessage]
      }));
    }
  }, [state.messages.length, generateAIResponse]);

  return {
    ...state,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
    addWelcomeMessage
  };
};