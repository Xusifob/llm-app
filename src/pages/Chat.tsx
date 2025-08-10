import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);

  // Fetch available models and conversations on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // fetch models
        const modelRes = await fetch(`${baseUrl}/v1/models`);
        if (modelRes.ok) {
          const data = await modelRes.json();
          // Data shape may vary; attempt to extract ids
          const modelIds: string[] = Array.isArray((data as any).data)
            ? (data as any).data.map((m: any) => m.id)
            : [];
          setModels(modelIds);
          if (modelIds.length > 0) setSelectedModel(modelIds[0]);
        }
        // fetch conversations
        const convRes = await fetch(`${baseUrl}/conversations`, {
          headers: token
            ? {
                'Authorization': `Bearer ${token}`,
              }
            : {},
        });
        if (convRes.ok) {
          const convs = await convRes.json();
          setConversations(convs);
          if (convs.length > 0) {
            setCurrentConversationId(convs[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch messages whenever the current conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentConversationId) {
        setMessages([]);
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/conversations/${currentConversationId}`, {
          headers: token
            ? {
                'Authorization': `Bearer ${token}`,
              }
            : {},
        });
        if (res.ok) {
          const data = await res.json();
          const msgs = Array.isArray(data.messages) ? data.messages : [];
          setMessages(msgs);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [currentConversationId, baseUrl, token]);

  // Create a new conversation and set it as active
  const handleNewChat = async () => {
    try {
      const res = await fetch(`${baseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: null }),
      });
      if (res.ok) {
        const conv: Conversation = await res.json();
        setConversations((prev) => [...prev, conv]);
        setCurrentConversationId(conv.id);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send a user message and fetch assistant response
  const handleSendMessage = async (content: string) => {
    if (!selectedModel) return;
    setLoadingReply(true);
    let conversationId = currentConversationId;
    try {
      // If no conversation yet, create one
      if (!conversationId) {
        const res = await fetch(`${baseUrl}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ title: null }),
        });
        if (res.ok) {
          const conv: Conversation = await res.json();
          setConversations((prev) => [...prev, conv]);
          conversationId = conv.id;
          setCurrentConversationId(conv.id);
        }
      }
      if (!conversationId) return;
      // Immediately add user message to state
      const userMsg: Message = {
        id: `${Date.now()}-user`,
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      // Persist user message via API
      await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: 'user', content }),
      });
      // Request assistant reply via chat completions
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Id': conversationId,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content,
            },
          ],
        }),
      });
      let assistantContent = '';
      if (res.ok) {
        const data = await res.json();
        // openai‑compatible format: data.choices[0].message.content
        const choices = (data as any).choices;
        if (Array.isArray(choices) && choices[0]?.message?.content) {
          assistantContent = choices[0].message.content;
        }
      }
      // Append assistant message locally
      const assistantMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantContent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      // Persist assistant message
      await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: 'assistant', content: assistantContent }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReply(false);
    }
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter((conv) => {
    const title = conv.title || 'New Conversation';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-screen flex bg-gray-50">
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
            loadingReply={loadingReply}
          />
        </div>
      </div>
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
    </div>
  );
};

export default Chat;