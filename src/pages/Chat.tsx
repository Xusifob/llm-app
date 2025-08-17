import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useApi from '../hooks/useApi';
import useApiQuery from '../hooks/useApiQuery';
import useApiCollection from '../hooks/useApiCollection';

interface Conversation {
  id: string;
  title?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

const Chat: React.FC = () => {
  const { token } = useAuth();
  const apiFetch = useApi();
  const queryClient = useQueryClient();

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Models ---------------------------------------------------------------
  const { data: models = [] } = useApiQuery<string[]>(['models', token], {
    path: '/v1/models',
    enabled: !!token,
    transform: (data: any) =>
      Array.isArray(data.data) ? data.data.map((m: any) => m.id) : [],
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  // --- Conversations -------------------------------------------------------
  const { data: conversations = [], addItem: addConversation } = useApiCollection<
    Conversation
  >(
    ['conversations', token],
    {
      path: '/conversations',
      enabled: !!token,
      getId: (c) => c.id,
    },
  );

  useEffect(() => {
    if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  // --- Messages ------------------------------------------------------------
  const { data: messages = [] } = useApiQuery<Message[]>(
    ['messages', currentConversationId, token],
    {
      path: `/conversations/${currentConversationId}`,
      enabled: !!currentConversationId,
      transform: (data: any) =>
        Array.isArray(data.messages) ? data.messages : [],
    },
  );

  // --- Mutations -----------------------------------------------------------
  const sendMessageMutation = useMutation(
    async (content: string) => {
      let conversationId = currentConversationId;
      if (!conversationId) {
        const conv = await addConversation({ title: null });
        conversationId = conv.id;
        setCurrentConversationId(conv.id);
        queryClient.setQueryData(['messages', conv.id, token], []);
      }

      const userMsg: Message = {
        id: `${Date.now()}-user`,
        role: 'user',
        content,
      };
      queryClient.setQueryData<Message[]>(
        ['messages', conversationId, token],
        (old = []) => [...old, userMsg],
      );

      await apiFetch(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'user', content }),
      });

      const res = await apiFetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Id': conversationId,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content }],
        }),
      });

      let assistantContent = '';
      if (res.ok) {
        const data = await res.json();
        const choices = (data as any).choices;
        if (Array.isArray(choices) && choices[0]?.message?.content) {
          assistantContent = choices[0].message.content;
        }
      }

      const assistantMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantContent,
      };
      queryClient.setQueryData<Message[]>(
        ['messages', conversationId, token],
        (old = []) => [...old, assistantMsg],
      );

      await apiFetch(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'assistant', content: assistantContent }),
      });
    },
  );

  const handleNewChat = async () => {
    const conv = await addConversation({ title: null });
    setCurrentConversationId(conv.id);
    queryClient.setQueryData(['messages', conv.id, token], []);
  };

  const handleSendMessage = (content: string) => {
    if (!selectedModel) return;
    sendMessageMutation.mutate(content);
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) => {
    const title = conv.title || 'New Conversation';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar on large screens */}
      <Sidebar
        conversations={filteredConversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => setCurrentConversationId(id)}
        onNewChat={handleNewChat}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
      <div className="flex flex-col flex-1">
        {/* Top bar for small screens */}
        <div className="lg:hidden p-4 border-b bg-white space-y-2">
          <div className="flex justify-between items-center space-x-2">
            <button
              onClick={handleNewChat}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded"
            >
              + New Chat
            </button>
            {models.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full border-gray-300 rounded-md p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        {/* Chat window */}
        <div className="flex-1 overflow-y-auto">
          <ChatWindow
            messages={messages}
            onSend={handleSendMessage}
            loadingReply={sendMessageMutation.isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;

