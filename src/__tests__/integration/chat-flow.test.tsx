/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'test-user-123' } }),
}));

jest.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock AI Elements components
jest.mock('@/components/ai-elements/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">Empty State</div>,
}));

jest.mock('@/components/ai-elements/conversation', () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation-content">{children}</div>
  ),
}));

jest.mock('@/components/ai-elements/message', () => ({
  Message: ({ children, from }: { children: React.ReactNode; from: string }) => (
    <div data-testid={`message-${from}`}>{children}</div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-content">{children}</div>
  ),
}));

jest.mock('@/components/ai-elements/MessageRouter', () => ({
  MessageRouter: ({ message }: any) => (
    <div data-testid="message-router">{message.parts[0]?.text}</div>
  ),
}));

jest.mock('@/components/ai-elements/AIElementErrorBoundary', () => ({
  AIElementErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <div data-testid="loader">Loading...</div>,
}));

jest.mock('@/components/ai-elements/suggestion', () => ({
  Suggestion: ({
    suggestion,
    onClick,
  }: {
    suggestion: string;
    onClick: () => void;
  }) => (
    <button data-testid={`suggestion-${suggestion}`} onClick={onClick}>
      {suggestion}
    </button>
  ),
}));

jest.mock('@/components/ModelSelector', () => ({
  ModelSelector: ({ value, onChange }: any) => (
    <select
      data-testid="model-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Default</option>
      <option value="gpt-4">GPT-4</option>
    </select>
  ),
}));

jest.mock('@/components/ui/SiriOrb', () => ({
  __esModule: true,
  default: () => <div data-testid="siri-orb">Orb</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, ...props }: any) => (
    <button onClick={onClick} type={type} {...props}>
      {children}
    </button>
  ),
}));

// Import after mocks
import { MorphSurface } from '@/components/ui/AiInput';

describe('Chat Flow Integration Tests', () => {
  // Mock fetch for API calls
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode('Hello'),
                })
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(' World'),
                })
                .mockResolvedValueOnce({ done: true }),
            }),
          },
        } as any)
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('renders empty state when no messages', async () => {
    render(<MorphSurface />);

    // Open modal
    const aiButton = screen.getByText('AI');
    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  it('renders suggestions in empty state', async () => {
    render(<MorphSurface />);

    const aiButton = screen.getByText('AI');
    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(
        screen.getByTestId('suggestion-What are the latest trends in AI?')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('suggestion-How does machine learning work?')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('suggestion-Explain quantum computing')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('suggestion-Best practices for React hooks')
      ).toBeInTheDocument();
    });
  });

  it('click suggestion populates input and submits', async () => {
    const user = userEvent.setup();
    render(<MorphSurface />);

    // Open modal
    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    // Click suggestion
    const suggestion = await screen.findByTestId(
      'suggestion-What are the latest trends in AI?'
    );
    await user.click(suggestion);

    // Verify API was called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/assistant/act?stream=1',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('What are the latest trends in AI?'),
        })
      );
    });
  });

  it('renders messages after submission', async () => {
    const user = userEvent.setup();
    render(<MorphSurface />);

    // Open modal
    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    // Type message
    const input = await screen.findByPlaceholderText(/Pergunte algo/i);
    await user.type(input, 'Test message');

    // Submit
    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    // Check for user message
    await waitFor(() => {
      expect(screen.getByTestId('message-user')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Check for assistant message
    await waitFor(() => {
      expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  it('shows loader during isLoading true', async () => {
    const user = userEvent.setup();

    // Mock slow response
    fetchMock.mockRestore();
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                body: {
                  getReader: () => ({
                    read: jest.fn().mockResolvedValue({ done: true }),
                  }),
                },
              } as any),
            100
          );
        })
    );

    render(<MorphSurface />);

    // Open modal
    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    // Type and submit
    const input = await screen.findByPlaceholderText(/Pergunte algo/i);
    await user.type(input, 'Test');

    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    // Check for loader
    await waitFor(() => {
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  it('renders AI response after loading completes', async () => {
    const user = userEvent.setup();
    render(<MorphSurface />);

    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    const input = await screen.findByPlaceholderText(/Pergunte algo/i);
    await user.type(input, 'Hello');

    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    // Wait for response
    await waitFor(
      () => {
        expect(screen.getByText('Hello World')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock error response
    fetchMock.mockRestore();
    fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Network error')
    );

    render(<MorphSurface />);

    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    const input = await screen.findByPlaceholderText(/Pergunte algo/i);
    await user.type(input, 'Test');

    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Erro:/)).toBeInTheDocument();
    });
  });

  it('allows model selection', async () => {
    const user = userEvent.setup();
    render(<MorphSurface />);

    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    const modelSelector = await screen.findByTestId('model-selector');
    await user.selectOptions(modelSelector, 'gpt-4');

    expect(modelSelector).toHaveValue('gpt-4');
  });

  it('closes modal on ESC key press', async () => {
    const user = userEvent.setup();
    render(<MorphSurface />);

    const aiButton = screen.getByText('AI');
    await user.click(aiButton);

    const input = await screen.findByPlaceholderText(/Pergunte algo/i);
    await user.type(input, '{Escape}');

    // Modal should close (check if input is no longer in document)
    await waitFor(() => {
      expect(input).not.toBeInTheDocument();
    });
  });
});
