import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../services/api';
import { setCurrentDocument, setError, setLoading } from '../store/slices/documentSlice';
import { 
  FileText, 
  Download, 
  MessageSquare, 
  Send, 
  Info, 
  ArrowLeft, 
  Loader2, 
  FileCheck, 
  Tag, 
  Edit3, 
  Check, 
  X,
  FileQuestion,
  BookOpen
} from 'lucide-react';

export default function DocumentDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentDocument, loading, error } = useSelector((state) => state.documents);
  const { user } = useSelector((state) => state.auth);

  // Summaries active tab: 'short', 'detailed', 'bullets'
  const [activeTab, setActiveTab] = useState('short');
  
  // Inline edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');

  // Q&A Chat states
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState('');
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const chatBottomRef = useRef(null);

  // Fetch document details
  const fetchDocDetails = async () => {
    dispatch(setLoading(true));
    try {
      const res = await api.get(`/documents/${id}`);
      dispatch(setCurrentDocument(res.data.document));
      
      // Seed edit fields
      setEditTitle(res.data.document.title);
      setEditDesc(res.data.document.description || '');
      setEditCategory(res.data.document.category);
      setEditTags(res.data.document.tags?.join(', ') || '');
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Error loading document detail'));
    }
  };

  useEffect(() => {
    fetchDocDetails();
  }, [id, dispatch]);

  // Scroll Q&A bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, sendingQuestion]);

  // Handle document details update
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.put(`/documents/${id}`, {
        title: editTitle,
        description: editDesc,
        category: editCategory,
        tags: tagsArray
      });
      dispatch(setCurrentDocument(res.data.document));
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating document details');
    }
  };

  // Submit RAG question
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const queryText = question;
    setQuestion('');
    
    // Add user query to chat history
    const userMsg = { role: 'user', text: queryText, timestamp: new Date() };
    setChatHistory((prev) => [...prev, userMsg]);
    setSendingQuestion(true);

    try {
      const res = await api.post('/documents/question-answer', {
        documentId: id,
        question: queryText
      });

      const { answer, sources } = res.data.query;
      
      const aiMsg = { 
        role: 'assistant', 
        text: answer, 
        sources: sources || [], 
        timestamp: new Date() 
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to generate answer. Check system status.';
      setChatHistory((prev) => [...prev, { role: 'assistant', text: `Error: ${errMsg}`, isError: true }]);
    } finally {
      setSendingQuestion(false);
    }
  };

  if (loading && !currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-dark-400">Analyzing document structure & indexing chunks...</p>
      </div>
    );
  }

  if (error || !currentDocument) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
        <X className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="font-bold text-white text-lg">Failed to Load Document</h3>
        <p className="text-dark-400 text-sm mt-1 mb-6">{error || 'The document index could not be retrieved.'}</p>
        <Link to="/" className="py-2.5 px-5 bg-dark-800 hover:bg-dark-700 text-white rounded-xl border border-dark-700 transition-colors text-sm font-semibold flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const categories = ['Invoice', 'Resume', 'Legal', 'Medical', 'Financial', 'Academic', 'Other'];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-dark-800/60 pb-4">
        <Link 
          to="/" 
          className="text-sm font-medium text-dark-300 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Workspace
        </Link>

        <a 
          href={currentDocument.fileUrl} 
          download
          target="_blank"
          rel="noreferrer"
          className="py-2 px-4 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
        >
          <Download className="h-3.5 w-3.5" /> Download Original File
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Metadata & AI Analytics (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Document Properties Block */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {isEditing ? (
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-400 uppercase mb-1">Title</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full bg-dark-900/40 border border-dark-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 uppercase mb-1">Description</label>
                  <textarea 
                    rows="2"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-dark-900/40 border border-dark-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-500/50 text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-dark-400 uppercase mb-1">Category</label>
                    <select 
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-dark-900/40 border border-dark-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat} className="bg-dark-950 text-white">{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-dark-400 uppercase mb-1">Tags (comma-separated)</label>
                    <input 
                      type="text" 
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="e.g. report, annual, 2024"
                      className="w-full bg-dark-900/40 border border-dark-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold text-dark-400 hover:text-white border border-transparent hover:border-dark-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="py-1.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Check className="h-3.5 w-3.5" /> Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl shrink-0">
                      <FileText className="h-6 w-6 text-brand-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white leading-snug">{currentDocument.title}</h2>
                      <p className="text-xs text-dark-400 font-medium">
                        Uploaded by {currentDocument.uploadedBy?.fullName} ({currentDocument.uploadedBy?.email})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-dark-400 hover:text-white border border-dark-800 hover:border-dark-700/60 rounded-xl bg-dark-900/20 transition-all shrink-0"
                    title="Edit Properties"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                {currentDocument.description && (
                  <p className="text-sm text-dark-300 leading-relaxed bg-dark-900/10 p-3 rounded-xl border border-dark-800/30">
                    {currentDocument.description}
                  </p>
                )}

                {/* Properties grids */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-dark-800/40 pt-4">
                  <div className="p-3 bg-dark-900/20 border border-dark-800/40 rounded-xl">
                    <span className="block text-[10px] text-dark-500 font-semibold uppercase tracking-wider mb-1">OCR Accuracy</span>
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      <FileCheck className="h-3.5 w-3.5 text-brand-400" />
                      {currentDocument.ocrConfidence || 100}%
                    </span>
                  </div>
                  <div className="p-3 bg-dark-900/20 border border-dark-800/40 rounded-xl">
                    <span className="block text-[10px] text-dark-500 font-semibold uppercase tracking-wider mb-1">Format</span>
                    <span className="text-xs font-bold text-white font-mono uppercase">
                      {currentDocument.fileType}
                    </span>
                  </div>
                  <div className="p-3 bg-dark-900/20 border border-dark-800/40 rounded-xl">
                    <span className="block text-[10px] text-dark-500 font-semibold uppercase tracking-wider mb-1">Category</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-bold border border-brand-500/10 text-xs mt-0.5">
                      {currentDocument.category}
                    </span>
                  </div>
                  <div className="p-3 bg-dark-900/20 border border-dark-800/40 rounded-xl">
                    <span className="block text-[10px] text-dark-500 font-semibold uppercase tracking-wider mb-1">Indexing Chunks</span>
                    <span className="text-sm font-bold text-white">
                      {currentDocument.chunks?.length || 0}
                    </span>
                  </div>
                </div>

                {currentDocument.tags && currentDocument.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentDocument.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-dark-800 text-dark-300 border border-dark-700">
                        <Tag className="h-3 w-3 text-brand-400" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Summaries Panel */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <BookOpen className="h-5 w-5 text-brand-500" />
              <h3 className="text-lg font-bold text-white">AI-Generated Summarization</h3>
            </div>

            {/* Tab controls */}
            <div className="flex bg-dark-900/40 p-1 rounded-xl border border-dark-800">
              <button
                onClick={() => setActiveTab('short')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'short' ? 'bg-brand-600 text-white shadow-md' : 'text-dark-400 hover:text-white'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('detailed')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'detailed' ? 'bg-brand-600 text-white shadow-md' : 'text-dark-400 hover:text-white'}`}
              >
                Detailed
              </button>
              <button
                onClick={() => setActiveTab('bullets')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'bullets' ? 'bg-brand-600 text-white shadow-md' : 'text-dark-400 hover:text-white'}`}
              >
                Bullet Points
              </button>
            </div>

            {/* Tab contents */}
            <div className="min-h-[140px] text-sm leading-relaxed text-dark-300 pt-2">
              {activeTab === 'short' && (
                <p className="bg-dark-900/10 p-4 rounded-2xl border border-dark-800/30 font-medium italic text-white/90">
                  "{currentDocument.summary?.short || 'Summary generating in progress...'}"
                </p>
              )}
              {activeTab === 'detailed' && (
                <p className="whitespace-pre-line bg-dark-900/10 p-4 rounded-2xl border border-dark-800/30">
                  {currentDocument.summary?.detailed || 'Summary generating in progress...'}
                </p>
              )}
              {activeTab === 'bullets' && (
                <ul className="list-disc pl-5 space-y-2 bg-dark-900/10 p-4 rounded-2xl border border-dark-800/30">
                  {currentDocument.summary?.bulletPoints?.map((pt, idx) => (
                    <li key={idx} className="marker:text-brand-500">{pt}</li>
                  )) || <li>Bullet points generating in progress...</li>}
                </ul>
              )}
            </div>
          </div>

          {/* Raw OCR Text Panel */}
          <div className="glass-panel rounded-3xl p-6">
            <details className="group">
              <summary className="flex items-center justify-between font-bold text-white cursor-pointer select-none list-none">
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-brand-500" />
                  <span className="text-lg">Extracted OCR Document Text</span>
                </div>
                <span className="transition group-open:rotate-180 text-dark-400">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="mt-4 pt-4 border-t border-dark-800 text-xs font-mono text-dark-300 max-h-60 overflow-y-auto whitespace-pre-line leading-relaxed bg-dark-950/40 p-4 rounded-2xl">
                {currentDocument.extractedText || 'No text content available.'}
              </div>
            </details>
          </div>

        </div>

        {/* Right Column: RAG Q&A Chat Panel (5 Columns) */}
        <div className="lg:col-span-5 h-[calc(100vh-230px)] flex flex-col">
          <div className="glass-panel rounded-3xl p-5 flex-1 flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center gap-2 border-b border-dark-800 pb-3 shrink-0">
              <MessageSquare className="h-5 w-5 text-brand-500" />
              <div>
                <h3 className="font-bold text-white">Document AI Assistant</h3>
                <span className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider">Retrieval Augmented Chat (RAG)</span>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-dark-400 space-y-3">
                  <div className="p-4 bg-dark-800/30 border border-dark-800 rounded-full">
                    <MessageSquare className="h-8 w-8 text-dark-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Ask your Document</h4>
                    <p className="text-xs max-w-xs mt-1">Questions will be answered by searching the text layers of this document using vector similarity embeddings.</p>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`
                        px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%]
                        ${msg.role === 'user' 
                          ? 'bg-brand-600 text-white rounded-br-none shadow-md shadow-brand-600/10' 
                          : msg.isError 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-dark-800/50 text-slate-100 border border-dark-800 rounded-bl-none'
                        }
                      `}
                    >
                      {msg.text}
                    </div>

                    {/* Sources Inspector */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="px-1 text-[10px] text-dark-400 max-w-[85%] self-start space-y-1">
                        <span className="font-bold text-brand-400 uppercase tracking-wider block">Source references:</span>
                        {msg.sources.map((src, sIdx) => (
                          <div 
                            key={sIdx}
                            className="bg-dark-900/40 p-2 rounded-lg border border-dark-800/50 leading-relaxed font-sans text-dark-300 italic"
                          >
                            <strong>Chunk {src.index}:</strong> {src.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Loader during answering */}
              {sendingQuestion && (
                <div className="flex items-start gap-2.5">
                  <div className="px-4 py-3 bg-dark-800/40 border border-dark-800 text-slate-100 rounded-2xl rounded-bl-none max-w-[80%] flex items-center gap-2">
                    <Loader2 className="h-4.5 w-4.5 text-brand-500 animate-spin shrink-0" />
                    <span className="text-sm text-dark-400 font-medium">Scanning index vectors...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input box */}
            <form onSubmit={handleAskQuestion} className="pt-3 border-t border-dark-800 shrink-0">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  disabled={sendingQuestion}
                  placeholder={user && !user.isVerified ? "Please verify email to unlock AI Q&A" : "Ask something about this document..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-dark-900/50 border border-dark-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 disabled:bg-dark-950/40 disabled:cursor-not-allowed"
                />
                <button 
                  type="submit"
                  disabled={!question.trim() || sendingQuestion || (user && !user.isVerified)}
                  className="absolute right-2 p-2 bg-brand-600 disabled:bg-dark-800 hover:bg-brand-500 disabled:text-dark-500 text-white rounded-lg transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
