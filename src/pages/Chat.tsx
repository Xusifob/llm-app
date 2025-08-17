import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

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
  const baseUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Models ---------------------------------------------------------------
  const fetchModels = async (): Promise<string[]> => {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return Array.isArray((data as any).data)
      ? (data as any).data.map((m: any) => m.id)
      : [];
  };

  const { data: models = [] } = useQuery([
    'models',
    token,
  ], fetchModels, {
    enabled: !!token,
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  // --- Conversations -------------------------------------------------------
  const fetchConversations = async (): Promise<Conversation[]> => {
    const res = await fetch(`${baseUrl}/conversations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  };

  const { data: conversations = [] } = useQuery([
    'conversations',
    token,
  ], fetchConversations, {
    enabled: !!token,
  });

  useEffect(() => {
    if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  // --- Messages ------------------------------------------------------------
  const fetchMessages = async (): Promise<Message[]> => {
    if (!currentConversationId) return [];
    const res = await fetch(`${baseUrl}/conversations/${currentConversationId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    return Array.isArray(data.messages) ? data.messages : [];
  };

  const { data: messages = [] } = useQuery(
    ['messages', currentConversationId, token],
    fetchMessages,
    { enabled: !!currentConversationId },
  );

  // --- Mutations -----------------------------------------------------------
  const createConversation = async (): Promise<Conversation> => {
    const res = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title: null }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  };

  const createConversationMutation = useMutation(createConversation, {
    onSuccess: (conv) => {
      queryClient.invalidateQueries(['conversations', token]);
      setCurrentConversationId(conv.id);
      queryClient.setQueryData(['messages', conv.id, token], []);
    },
  });

  const sendMessageMutation = useMutation(
    async (content: string) => {
      let conversationId = currentConversationId;
      if (!conversationId) {
        const conv = await createConversation();
        conversationId = conv.id;
        setCurrentConversationId(conv.id);
        queryClient.invalidateQueries(['conversations', token]);
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

      await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: 'user', content }),
      });

      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Id': conversationId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: 'assistant', content: assistantContent }),
      });
    },
  );

  const handleNewChat = () => {
    createConversationMutation.mutate();
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

