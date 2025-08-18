import React, { useEffect, useRef, useState } from 'react';
import useApi from '../hooks/useApi';
import type { Message } from '../models/Message';
import type { File as FileModel } from '../models/File';
import { FiEdit, FiArchive, FiInbox, FiTrash, FiCheck, FiX } from 'react-icons/fi';

interface ChatWindowProps {
  messages: Message[];
  onSend: (content: string, files: FileModel[]) => void;
  onUpdateMessage: (id: string, content: string) => void;
  loadingReply: boolean;
  conversationTitle: string;
  isArchived: boolean;
  onRenameConversation: (title: string) => void;
  onToggleArchive: () => void;
  onDeleteConversation: () => void;
}

/**
 * Displays chat messages and a composer for sending new messages.
 */
const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSend,
  onUpdateMessage,
  loadingReply,
  conversationTitle,
  isArchived,
  onRenameConversation,
  onToggleArchive,
  onDeleteConversation,
}) => {
  const apiFetch = useApi();
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FileModel[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');

  const handleFiles = async (fileList: FileList) => {
    const arr = Array.from(fileList);
    for (const file of arr) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/upload/file', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => [
          ...prev,
          { id: data.id, name: data.name || file.name, public_url: data.public_url },
        ]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = async (id: string) => {
    await apiFetch(`/files/${id}`, {
      method: 'DELETE',
    });
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed, files);
    setInput('');
    setFiles([]);
  };

  const handleUpdate = () => {
    if (!editingMessageId) return;
    const trimmed = editingMessageContent.trim();
    if (!trimmed) return;
    onUpdateMessage(editingMessageId, trimmed);
    setEditingMessageId(null);
    setEditingMessageContent('');
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingReply]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-white">
        {editingTitle ? (
          <div className="flex items-center space-x-2">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="border border-gray-300 rounded px-1 text-sm"
              autoFocus
            />
            <button
              onClick={() => {
                onRenameConversation(editTitle.trim());
                setEditingTitle(false);
              }}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              <FiCheck />
            </button>
            <button
              onClick={() => {
                setEditingTitle(false);
                setEditTitle('');
              }}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              <FiX />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <h2 className="truncate text-sm font-medium">
              {conversationTitle}
            </h2>
            <button
              onClick={() => {
                setEditingTitle(true);
                setEditTitle(conversationTitle);
              }}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              <FiEdit />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleArchive}
            className="text-gray-500 hover:text-gray-700 text-xs"
            title={isArchived ? 'Unarchive' : 'Archive'}
          >
            {isArchived ? <FiInbox /> : <FiArchive />}
          </button>
          <button
            onClick={onDeleteConversation}
            className="text-gray-500 hover:text-gray-700 text-xs"
            title="Delete"
          >
            <FiTrash />
          </button>
        </div>
      </div>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="space-y-1">
              {editingMessageId === msg.id ? (
                <div className="max-w-sm">
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={editingMessageContent}
                    onChange={(e) => setEditingMessageContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2 mt-1 text-xs">
                    <button
                      onClick={handleUpdate}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FiCheck />
                    </button>
                    <button
                      onClick={() => {
                        setEditingMessageId(null);
                        setEditingMessageContent('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`max-w-sm p-3 rounded-lg text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <button
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setEditingMessageContent(msg.content);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      <FiEdit />
                    </button>
                  )}
                </>
              )}
              {msg.files && msg.files.length > 0 && (
                <div className="mt-1 text-xs">
                  {msg.files.map((file) => (
                    <div key={file.id}>
                      <a
                        href={file.public_url}
                        className="underline text-blue-600"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {file.name}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loadingReply && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="max-w-sm p-3 rounded-lg text-sm bg-gray-200 text-gray-900 rounded-bl-none italic opacity-75">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Composer */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center space-x-2 bg-gray-100 px-2 py-1 rounded"
              >
                <span className="text-xs">{f.name}</span>
                <button
                  onClick={() => handleRemoveFile(f.id)}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <textarea
            className="flex-1 resize-none border border-gray-300 rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            rows={2}
            value={input}
            placeholder="Type your message..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          />
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-200 px-2 py-2 rounded-md text-sm"
          >
            Attach
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loadingReply}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

