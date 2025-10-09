import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAIChat } from '../../hooks/useAIChat';

describe('useAIChat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAIChat());
    
    expect(result.current.isOpen).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isTyping).toBe(false);
  });

  it('toggles chat open/closed state', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.toggleChat();
    });
    
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.toggleChat();
    });
    
    expect(result.current.isOpen).toBe(false);
  });

  it('opens and closes chat', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.openChat();
    });
    
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.closeChat();
    });
    
    expect(result.current.isOpen).toBe(false);
  });

  it('sends user message and triggers AI response', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.sendMessage('Hello');
    });
    
    // Should add user message immediately
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
    expect(result.current.messages[0].sender).toBe('user');
    expect(result.current.isTyping).toBe(true);
    
    // Fast-forward timers to trigger AI response
    act(() => {
      vi.runAllTimers();
    });
    
    // Should add AI response and stop typing
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].sender).toBe('ai');
    expect(result.current.isTyping).toBe(false);
  });

  it('ignores empty messages', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.sendMessage('   ');
    });
    
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isTyping).toBe(false);
  });

  it('clears messages', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.sendMessage('Test message');
    });
    
    expect(result.current.messages).toHaveLength(1);
    
    act(() => {
      result.current.clearMessages();
    });
    
    expect(result.current.messages).toHaveLength(0);
  });
});