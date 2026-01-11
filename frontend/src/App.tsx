import { useState, useEffect, useRef } from 'react';
import { Send, Zap, User, Bot, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing effect loop
  useEffect(() => {
    if (streamBuffer.length === 0) return;

    const interval = Number(Math.max(5, 30 - streamBuffer.length / 2));
    
    const timeout = setTimeout(() => {
      const char = streamBuffer[0];
      setStreamBuffer(prev => prev.slice(1));
      
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'ai') {
          return [
            ...newMessages.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + char }
          ];
        }
        return newMessages;
      });
    }, interval);

    return () => clearTimeout(timeout);
  }, [streamBuffer]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    setStreamBuffer('');

    // Create a new entry for the AI response
    setMessages((prev) => [...prev, { role: 'ai', content: '' }]);

    const eventSource = new EventSource(
      `http://localhost:3000/gemini/stream?prompt=${encodeURIComponent(userMessage)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const text = data.text;
        setStreamBuffer(prev => prev + text);
      } catch (e) {
        console.error('Error parsing stream chunk:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
      // Wait a bit to ensure typing finishes before showing "Ready"
      setTimeout(() => setIsStreaming(false), 500);
    };
  };

  const clearChat = () => {
    setMessages([]);
    setIsStreaming(false);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-left">
          <div className="logo-icon">
            <Sparkles size={18} color="#fff" />
          </div>
          <div className="header-text">
            <h2>Gemini 2.5 Flash</h2>
            <span className="status">
              {(isStreaming || streamBuffer.length > 0) ? 'Streaming...' : 'Ready'}
            </span>
          </div>
        </div>
        <button className="clear-btn" onClick={clearChat} title="Clear conversation">
          <Trash2 size={18} />
        </button>
      </header>

      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <Zap size={48} className="zap-icon" />
            <h3>How can I help you today?</h3>
            <p>Ready to stream powerful insights from Gemini.</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.role}`}>
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className="message-content">
              <div className="role-label">
                {msg.role === 'user' ? 'You' : 'Gemini'}
              </div>
              <div className="text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
                {(isStreaming || streamBuffer.length > 0) && i === messages.length - 1 && msg.role === 'ai' && (
                  <span className="cursor" />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            disabled={isStreaming || streamBuffer.length > 0}
          />
          <button 
            className="send-btn" 
            onClick={handleSend} 
            disabled={isStreaming || streamBuffer.length > 0 || !input.trim()}
          >
            <Send size={18} />
          </button>
        </div>
        <footer className="footer-note">
          Gemini may provide inaccurate info. Verification recommended.
        </footer>
      </div>
    </div>
  );
}

export default App;
