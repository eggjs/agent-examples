import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ProgressEvent } from '../types';
import { modifyTask, getChatHistory, subscribeToProgress, getFiles, getFileContent } from '../services/api';

interface ChatPanelProps {
  taskId: string;
  onFilesUpdated: (files: string[]) => void;
  onFileContentUpdated: (file: string, content: string) => void;
  selectedFile: string;
}

const eventTypeStyles: Record<string, string> = {
  status: 'text-blue-500',
  thinking: 'text-gray-400',
  tool_call: 'text-purple-500',
  tool_result: 'text-green-500',
  file_created: 'text-emerald-500',
  modify_started: 'text-blue-500',
  modify_completed: 'text-green-600',
  error: 'text-red-500',
};

export default function ChatPanel({ taskId, onFilesUpdated, onFileContentUpdated, selectedFile }: ChatPanelProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [modifyEvents, setModifyEvents] = useState<ProgressEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const modifyStartTimeRef = useRef<number>(0);

  // Load chat history on mount
  useEffect(() => {
    getChatHistory(taskId).then(setChatHistory).catch(() => {});
  }, [taskId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, modifyEvents]);

  const handleSend = useCallback(async () => {
    const instruction = input.trim();
    if (!instruction || isModifying) return;

    setInput('');
    setIsModifying(true);
    setModifyEvents([]);
    modifyStartTimeRef.current = Date.now();

    // Optimistically add user message
    const userMsg: ChatMessage = { role: 'user', content: instruction, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);

    try {
      await modifyTask(taskId, instruction);

      // Subscribe to SSE for modification progress
      unsubscribeRef.current = subscribeToProgress(
        taskId,
        (event) => {
          const ev = event as ProgressEvent;
          // Filter out events from before the modification started
          if (ev.timestamp < modifyStartTimeRef.current) return;
          setModifyEvents(prev => [...prev, ev]);

          if (ev.type === 'completed' || ev.type === 'modify_completed') {
            // Refresh chat history, files, and selected file content
            getChatHistory(taskId).then(history => {
              setChatHistory(history);
              setModifyEvents([]);
              setIsModifying(false);
            });

            getFiles(taskId).then(onFilesUpdated);

            if (selectedFile) {
              getFileContent(taskId, selectedFile).then(content => {
                onFileContentUpdated(selectedFile, content);
              }).catch(() => {});
            }
          }

          if (ev.type === 'error') {
            setIsModifying(false);
          }
        },
        () => {
          // SSE connection closed
        }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}`, timestamp: Date.now() }]);
      setIsModifying(false);
    }
  }, [input, isModifying, taskId, onFilesUpdated, onFileContentUpdated, selectedFile]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <span className="text-sm font-medium text-gray-600">Modify Project</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {chatHistory.length === 0 && !isModifying && (
          <div className="text-center text-gray-400 text-sm py-8">
            Describe changes to modify the generated project
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Modification progress events */}
        {isModifying && modifyEvents.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-2 space-y-1">
            {modifyEvents.map((ev, i) => (
              <div key={i} className={`text-xs font-mono ${eventTypeStyles[ev.type] || 'text-gray-500'}`}>
                {ev.message}
              </div>
            ))}
          </div>
        )}

        {isModifying && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            Modifying...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isModifying}
            placeholder="Describe modifications... (Ctrl+Enter to send)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={isModifying || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed self-end transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
