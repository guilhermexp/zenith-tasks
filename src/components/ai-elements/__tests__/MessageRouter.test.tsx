import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { MessageRouter } from '../MessageRouter';
import type { EnrichedChatMessage } from '@/types/chat';

// Mock AI Elements components
vi.mock('../response', () => ({
  Response: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="response">{children}</div>
  ),
}));

vi.mock('../code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <div data-testid="code-block" data-language={language}>
      {code}
    </div>
  ),
}));

vi.mock('../sources', () => ({
  Sources: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sources">{children}</div>
  ),
  SourcesTrigger: ({ count }: { count: number }) => (
    <div data-testid="sources-trigger">{count} sources</div>
  ),
  SourcesContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sources-content">{children}</div>
  ),
  Source: ({ title, href }: { title: string; href?: string }) => (
    <a data-testid="source" href={href}>
      {title}
    </a>
  ),
}));

describe('MessageRouter', () => {
  const createMessage = (
    content: string,
    metadata?: Partial<EnrichedChatMessage['metadata']>
  ): EnrichedChatMessage => ({
    id: '1',
    role: 'assistant',
    parts: [{ type: 'text', text: content }],
    metadata,
  });

  describe('Text Messages (Default)', () => {
    it('renders Response component for messages without metadata', () => {
      const message = createMessage('Hello World');
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders Response component when metadata type is undefined', () => {
      const message = createMessage('Test message', {});
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('extracts text from multiple text parts', () => {
      const message: EnrichedChatMessage = {
        id: '1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'First part ' },
          { type: 'text', text: 'Second part' },
        ],
      };
      render(<MessageRouter message={message} />);

      expect(screen.getByText('First part Second part')).toBeInTheDocument();
    });
  });

  describe('Code Type Messages', () => {
    it('renders CodeBlock for code type messages', () => {
      const message = createMessage('console.log("test")', {
        type: 'code',
        language: 'javascript',
      });
      render(<MessageRouter message={message} />);

      const codeBlock = screen.getByTestId('code-block');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock).toHaveAttribute('data-language', 'javascript');
    });

    it('defaults to typescript language when not specified', () => {
      const message = createMessage('const x = 1', {
        type: 'code',
      });
      render(<MessageRouter message={message} />);

      const codeBlock = screen.getByTestId('code-block');
      expect(codeBlock).toHaveAttribute('data-language', 'typescript');
    });
  });

  describe('Sources Type Messages', () => {
    it('renders Sources component with source list', () => {
      const message = createMessage('', {
        type: 'sources',
        sources: [
          { id: '1', title: 'Source 1', url: 'https://example.com/1' },
          { id: '2', title: 'Source 2', url: 'https://example.com/2' },
        ],
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('sources')).toBeInTheDocument();
      expect(screen.getByText('2 sources')).toBeInTheDocument();
      expect(screen.getByText('Source 1')).toBeInTheDocument();
      expect(screen.getByText('Source 2')).toBeInTheDocument();
    });

    it('returns null when sources array is empty', () => {
      const message = createMessage('', {
        type: 'sources',
        sources: [],
      });
      const { container } = render(<MessageRouter message={message} />);

      expect(container.firstChild).toBeNull();
    });

    it('returns null when sources metadata is missing', () => {
      const message = createMessage('', {
        type: 'sources',
      });
      const { container } = render(<MessageRouter message={message} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Plan Type Messages', () => {
    it('renders Response for plan type (fallback)', () => {
      const message = createMessage('Step 1: Do something', {
        type: 'plan',
        plan: [
          { id: '1', title: 'Step 1', status: 'pending', dependencies: [] },
        ],
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Reasoning Type Messages', () => {
    it('renders Response for reasoning type (fallback)', () => {
      const message = createMessage('Thinking...', {
        type: 'reasoning',
        reasoning: [{ id: '1', thought: 'First thought' }],
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Task Type Messages', () => {
    it('renders Response for task type (fallback)', () => {
      const message = createMessage('Tasks', {
        type: 'task',
        tasks: [{ id: '1', title: 'Do task', completed: false }],
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Tool Type Messages', () => {
    it('renders Response for tool type (fallback)', () => {
      const message = createMessage('Tool result', {
        type: 'tool',
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Confirmation Type Messages', () => {
    it('renders Response for confirmation type (fallback)', () => {
      const message = createMessage('Confirm action?', {
        type: 'confirmation',
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Image Type Messages', () => {
    it('renders Response for image type (fallback)', () => {
      const message = createMessage('', {
        type: 'image',
        imageUrl: 'https://example.com/image.jpg',
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Context Type Messages', () => {
    it('renders Response for context type (fallback)', () => {
      const message = createMessage('Context info', {
        type: 'context',
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Queue Type Messages', () => {
    it('renders Response for queue type (fallback)', () => {
      const message = createMessage('Queue items', {
        type: 'queue',
      });
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content gracefully', () => {
      const message = createMessage('');
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const message = createMessage('Test');
      render(<MessageRouter message={message} className="custom-class" />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });

    it('handles messages with empty parts array', () => {
      const message: EnrichedChatMessage = {
        id: '1',
        role: 'assistant',
        parts: [],
      };
      render(<MessageRouter message={message} />);

      expect(screen.getByTestId('response')).toBeInTheDocument();
    });
  });
});
