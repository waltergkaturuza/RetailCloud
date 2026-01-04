/**
 * AI CEO Chatbot Page
 * Premium Feature - AI Chatbot Module
 */
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: any
  created_at: string
}

interface ChatConversation {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
  last_message_preview?: string
  messages?: ChatMessage[]
}

export default function AIChatbot() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery<ChatConversation[]>({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      try {
        const response = await api.get('/ai-chatbot/conversations/')
        return response.data?.results || response.data || []
      } catch (err: any) {
        if (err.response?.status === 403) {
          toast.error('AI CEO Chatbot module is not activated. Please activate it to use this feature.')
        }
        throw err
      }
    },
  })

  // Fetch selected conversation details
  const { data: conversationDetail, refetch: refetchConversation } = useQuery<ChatConversation>({
    queryKey: ['chat-conversation', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null
      const response = await api.get(`/ai-chatbot/conversations/${selectedConversation}/`)
      return response.data
    },
    enabled: !!selectedConversation,
  })

  // Create new conversation mutation
  const newConversationMutation = useMutation({
    mutationFn: async (firstMessage: string) => {
      const response = await api.post('/ai-chatbot/conversations/new_conversation/', {
        message: firstMessage,
      })
      return response.data
    },
    onSuccess: (data) => {
      setSelectedConversation(data.id)
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      queryClient.setQueryData(['chat-conversation', data.id], data)
      setMessage('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create conversation')
    },
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: number; message: string }) => {
      const response = await api.post(`/ai-chatbot/conversations/${conversationId}/send_message/`, {
        message,
      })
      return response.data
    },
    onSuccess: () => {
      refetchConversation()
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      setMessage('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send message')
    },
  })

  // Archive conversation mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/ai-chatbot/conversations/${id}/archive/`)
      return response.data
    },
    onSuccess: () => {
      if (selectedConversation) {
        setSelectedConversation(null)
      }
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })

  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData)
    }
  }, [conversationsData])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationDetail?.messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    if (!selectedConversation) {
      // Create new conversation
      newConversationMutation.mutate(message)
    } else {
      // Send message to existing conversation
      sendMessageMutation.mutate({ conversationId: selectedConversation, message })
    }
  }

  const handleNewChat = () => {
    setSelectedConversation(null)
    setMessage('')
  }

  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id)
  }

  const handleArchive = (id: number) => {
    if (confirm('Are you sure you want to archive this conversation?')) {
      archiveMutation.mutate(id)
    }
  }

  const currentMessages = conversationDetail?.messages || []

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '16px', padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Sidebar - Conversations List */}
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Conversations</h2>
            <Button size="small" variant="primary" onClick={handleNewChat}>
              + New
            </Button>
          </div>
          {conversationsLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d', fontSize: '14px' }}>
              No conversations yet. Start a new chat!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedConversation === conv.id ? '#e3f2fd' : '#f8f9fa',
                    border: selectedConversation === conv.id ? '2px solid #2196f3' : '1px solid #e9ecef',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedConversation !== conv.id) {
                      e.currentTarget.style.background = '#f0f0f0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedConversation !== conv.id) {
                      e.currentTarget.style.background = '#f8f9fa'
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
                    {conv.title || 'Untitled Conversation'}
                  </div>
                  {conv.last_message_preview && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {conv.last_message_preview}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{conv.message_count} messages</span>
                    <span>{format(new Date(conv.updated_at), 'MMM dd')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedConversation && !newConversationMutation.isPending ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🤖</div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px', color: '#2c3e50' }}>
              AI CEO Chatbot
            </h1>
            <p style={{ fontSize: '16px', color: '#7f8c8d', marginBottom: '32px', maxWidth: '600px' }}>
              Your virtual CEO assistant. Ask questions about your business, get insights, recommendations, and generate reports.
            </p>
            <div style={{ width: '100%', maxWidth: '600px' }}>
              <form onSubmit={handleSend}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask me anything about your business..."
                    className="input"
                    style={{ flex: 1, padding: '16px', fontSize: '16px' }}
                    autoFocus
                  />
                  <Button type="submit" variant="primary" disabled={!message.trim() || newConversationMutation.isPending}>
                    Send
                  </Button>
                </div>
              </form>
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', textAlign: 'left' }}>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 Example Questions:</div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    • "What are my best-selling products?"<br />
                    • "Show me sales trends"<br />
                    • "Recommend promotions"
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>📊 Capabilities:</div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    • Business insights<br />
                    • Data analysis<br />
                    • Report generation
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {conversationDetail?.title || 'New Conversation'}
                </h2>
                {conversationDetail && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {conversationDetail.message_count} messages
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedConversation && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => handleArchive(selectedConversation)}
                    disabled={archiveMutation.isPending}
                  >
                    Archive
                  </Button>
                )}
                <Button size="small" variant="secondary" onClick={handleNewChat}>
                  New Chat
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? '#2196f3' : '#f0f0f0',
                      color: msg.role === 'user' ? 'white' : '#333',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}
                    <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '8px' }}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              {(newConversationMutation.isPending || sendMessageMutation.isPending) && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#f0f0f0',
                      color: '#666',
                      fontSize: '14px',
                    }}
                  >
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{ padding: '16px', borderTop: '1px solid #e9ecef' }}>
              <form onSubmit={handleSend}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="input"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={newConversationMutation.isPending || sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!message.trim() || newConversationMutation.isPending || sendMessageMutation.isPending}
                  >
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

