import React from 'react';
import { FiEdit, FiArchive, FiInbox, FiTrash, FiCheck, FiX } from 'react-icons/fi';

interface ConversationItem {
  id: string;
  title?: string | null;
  archived?: boolean;
}

interface SidebarProps {
  conversations: ConversationItem[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onToggleArchiveConversation: (id: string, archived: boolean) => void;
  onDeleteConversation: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onToggleArchiveConversation,
  onDeleteConversation,
  searchTerm,
  setSearchTerm,
  models,
  selectedModel,
  onModelChange,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleRename = (id: string) => {
    onRenameConversation(id, editTitle.trim());
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className="w-72 border-r border-gray-200 bg-white flex flex-col hidden lg:flex">
      {/* New chat and model selection */}
      <div className="p-4 border-b flex flex-col space-y-2">
        <button
          onClick={onNewChat}
          className="w-full text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded"
        >
          + New Chat
        </button>
        {models.length > 0 && (
          <div>
            <label
              htmlFor="model-select"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Model
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {/* Search */}
      <div className="p-4 border-b">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search conversations..."
          className="w-full border-gray-300 rounded-md p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="text-gray-500 text-sm p-4">No conversations yet.</p>
        )}
        <ul className="divide-y divide-gray-200">
          {conversations.map((conv) => {
            const isActive = conv.id === currentConversationId;
            const title = conv.title || 'Untitled Conversation';
            const isEditing = editingId === conv.id;
            return (
              <li
                key={conv.id}
                onClick={() => !isEditing && onSelectConversation(conv.id)}
                className={`group cursor-pointer px-4 py-3 text-sm flex items-center justify-between ${
                  isActive ? 'bg-indigo-50 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center w-full space-x-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(conv.id);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      <FiCheck />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEditing();
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`truncate ${conv.archived ? 'text-gray-400 italic' : ''}`}
                    >
                      {title}
                    </span>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(conv.id, title);
                        }}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleArchiveConversation(conv.id, !conv.archived);
                        }}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        {conv.archived ? <FiInbox /> : <FiArchive />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        <FiTrash />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
