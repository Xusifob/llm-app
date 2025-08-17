import React from 'react';

interface ConversationItem {
  id: string;
  title?: string | null;
}

interface SidebarProps {
  conversations: ConversationItem[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
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
  searchTerm,
  setSearchTerm,
  models,
  selectedModel,
  onModelChange,
}) => {
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
            return (
              <li
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`cursor-pointer px-4 py-3 text-sm ${
                  isActive ? 'bg-indigo-50 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                {title}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;