import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useApi from '../hooks/useApi';
import useApiQuery from '../hooks/useApiQuery';
import useApiCollection from '../hooks/useApiCollection';
import type { Conversation } from '../models/Conversation';
import type { Message } from '../models/Message';
import type { File as FileModel } from '../models/File';

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
  const {
    data: conversations = [],
    addItem: addConversation,
    updateItem: updateConversation,
    removeItem: removeConversation,
  } = useApiCollection<Conversation>(
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
    async ({
      conversationId: initialId,
      model,
      content,
      files,
    }: {
      conversationId: string | null;
      model: string;
      content: string;
      files: FileModel[];
    }) => {
      let conversationId = initialId;
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
        files,
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
        body: JSON.stringify({ role: 'user', content, file_ids: files.map((f) => f.id) }),
      });

      const assistantMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
      };
      queryClient.setQueryData<Message[]>(
        ['messages', conversationId, token],
        (old = []) => [...old, assistantMsg],
      );

      const res = await apiFetch(`/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model }),
      });

      let assistantContent = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          queryClient.setQueryData<Message[]>(
            ['messages', conversationId, token],
            (old = []) =>
              old.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: assistantContent } : m,
              ),
          );
        }
      }

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

  const handleSendMessage = (content: string, files: FileModel[]) => {
    if (!selectedModel) return;
    sendMessageMutation.mutate({
      conversationId: currentConversationId,
      model: selectedModel,
      content,
      files,
    });
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) => {
    const title = conv.title || 'New Conversation';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId,
  );

  const handleRenameCurrent = (title: string) => {
    if (!currentConversation) return;
    updateConversation({ id: currentConversation.id, data: { title } });
  };

  const handleToggleArchiveCurrent = () => {
    if (!currentConversation) return;
    updateConversation({
      id: currentConversation.id,
      data: { archived: !currentConversation.archived },
    });
  };

  const handleDeleteCurrent = async () => {
    if (!currentConversation) return;
    await removeConversation(currentConversation.id);
    const remaining = conversations.filter((c) => c.id !== currentConversation.id);
    setCurrentConversationId(remaining[0]?.id || null);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar on large screens */}
      <Sidebar
        conversations={filteredConversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => setCurrentConversationId(id)}
        onNewChat={handleNewChat}
        onRenameConversation={(id, title) =>
          updateConversation({ id, data: { title } })
        }
        onToggleArchiveConversation={(id, archived) =>
          updateConversation({ id, data: { archived } })
        }
        onDeleteConversation={async (id) => {
          await removeConversation(id);
          if (currentConversationId === id) {
            const remaining = conversations.filter((c) => c.id !== id);
            setCurrentConversationId(remaining[0]?.id || null);
          }
        }}
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
            conversationTitle={currentConversation?.title || 'Untitled Conversation'}
            isArchived={!!currentConversation?.archived}
            onRenameConversation={handleRenameCurrent}
            onToggleArchive={handleToggleArchiveCurrent}
            onDeleteConversation={handleDeleteCurrent}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;

