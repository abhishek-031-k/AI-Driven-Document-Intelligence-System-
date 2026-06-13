import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import { 
  setDocuments, 
  addDocument, 
  updateDocumentStatus, 
  removeDocument,
  setError,
  setLoading
} from '../store/slices/documentSlice';
import { 
  FileUp, 
  FileText, 
  Trash2, 
  Eye, 
  Download, 
  Loader2, 
  Search, 
  Filter, 
  Tag, 
  AlertCircle, 
  Clock, 
  Activity,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { documents, loading, error } = useSelector((state) => state.documents);

  // 1. Fetch document list
  const fetchDocs = async () => {
    dispatch(setLoading(true));
    try {
      const res = await api.get('/documents');
      dispatch(setDocuments(res.data.documents));
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Error fetching documents'));
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [dispatch]);

  // 2. Setup Socket.io updates
  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('register', user.id);
    });

    socket.on('document_status_update', (data) => {
      dispatch(updateDocumentStatus(data));
      // Re-fetch documents silently if needed, or simply let the state update
    });

    return () => {
      socket.disconnect();
    };
  }, [user, dispatch]);

  // 3. Handle File Selection
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // 4. Document upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploadProgress(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      // Add initial document to state
      dispatch(addDocument(res.data.document));
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadProgress(false);
    }
  };

  // 5. Delete document
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document? This will purge all summaries, tags, and semantic indexing.')) return;
    try {
      await api.delete(`/documents/${id}`);
      dispatch(removeDocument(id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document');
    }
  };

  // Format File Size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper for document icon representation
  const getFileIcon = (fileType) => {
    const type = fileType ? fileType.toLowerCase() : '';
    if (['png', 'jpg', 'jpeg'].includes(type)) return <FileImage className="h-8 w-8 text-indigo-400" />;
    if (['doc', 'docx'].includes(type)) return <FileText className="h-8 w-8 text-blue-400" />;
    if (['pdf'].includes(type)) return <FileSpreadsheet className="h-8 w-8 text-rose-400" />; // PDF representation
    return <FileText className="h-8 w-8 text-dark-400" />;
  };

  // Helper for rendering status labels
  const renderStatus = (status, confidence, errMsg) => {
    switch (status) {
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-800 text-dark-400 border border-dark-700">
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading
          </span>
        );
      case 'ocr_processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Loader2 className="h-3 w-3 animate-spin" /> OCR Run
          </span>
        );
      case 'chunking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Loader2 className="h-3 w-3 animate-spin" /> Splitting Text
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Loader2 className="h-3 w-3 animate-spin" /> indexing AI
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Completed ({confidence}%)
          </span>
        );
      case 'failed':
        return (
          <span 
            title={errMsg}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-help"
          >
            <AlertCircle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return null;
    }
  };

  // Filter & Search Documents
  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.tags && doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Invoice', 'Resume', 'Legal', 'Medical', 'Financial', 'Academic', 'Other'];

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Document Repository</h1>
          <p className="text-dark-400 mt-1">Upload and manage documents, extracts, and AI indexes.</p>
        </div>
      </div>

      {/* Main Grid: Upload Block + Document Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Document Panel */}
        <div className="lg:col-span-1 glass-panel rounded-3xl p-6 h-fit sticky top-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-brand-500" />
            <h3 className="text-lg font-bold text-white">Upload Document</h3>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* File Drag Box */}
            <div className="border-2 border-dashed border-dark-700 hover:border-brand-500/50 rounded-2xl p-6 transition-colors text-center cursor-pointer relative bg-dark-900/20">
              <input 
                type="file" 
                onChange={onFileChange}
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileUp className="h-10 w-10 text-dark-400 mx-auto mb-3" />
              {file ? (
                <div className="text-sm">
                  <p className="font-semibold text-brand-400 truncate max-w-[200px] mx-auto">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-1">{formatBytes(file.size)}</p>
                </div>
              ) : (
                <div className="text-xs text-dark-400">
                  <p className="font-medium">Drag and drop file here, or click to browse</p>
                  <p className="text-dark-500 mt-1">Supports PDF, DOCX, TXT, PNG, JPG, JPEG (Max 10MB)</p>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5">Document Title</label>
              <input 
                type="text" 
                placeholder="Enter title (defaults to file name)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-dark-900/40 border border-dark-800 rounded-xl py-2.5 px-3.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5">Description</label>
              <textarea 
                rows="3"
                placeholder="Optional summary or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-dark-900/40 border border-dark-800 rounded-xl py-2.5 px-3.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 text-sm resize-none"
              />
            </div>

            {/* Error Message */}
            {uploadError && (
              <p className="text-rose-500 text-xs flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {uploadError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || uploadProgress}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-dark-800 disabled:text-dark-500 text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {uploadProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Process Document'
              )}
            </button>
          </form>
        </div>

        {/* Documents Repository Grid View */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters Bar */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-500">
                <Search className="h-4 w-4" />
              </span>
              <input 
                type="text" 
                placeholder="Search by title, description, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900/30 border border-dark-800/80 rounded-xl py-2 pl-9 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/30 text-sm"
              />
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-dark-400 shrink-0" />
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-dark-900/40 border border-dark-800/80 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-500/30"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-dark-950 text-white">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Document list */}
          {loading ? (
            <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-4" />
              <p className="text-dark-400">Loading document indexes...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-dark-600 mb-4" />
              <h3 className="font-bold text-white text-lg">No Documents Found</h3>
              <p className="text-dark-400 text-sm mt-1">Upload a document on the left or try adjusting filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc._id} 
                  className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/20 transition-all duration-300 relative group overflow-hidden"
                >
                  {/* Subtle hover gradient background */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="space-y-4">
                    {/* Header: Icon + Title + Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.fileType)}
                        <div className="min-w-0">
                          <h4 className="font-bold text-white truncate max-w-[170px]" title={doc.title}>
                            {doc.title}
                          </h4>
                          <span className="text-[10px] text-dark-500 font-mono uppercase">
                            {doc.fileType} • {formatBytes(doc.fileSize)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        {doc.status === 'completed' && (
                          <Link 
                            to={`/documents/${doc._id}`}
                            className="p-1.5 text-dark-400 hover:text-brand-400 rounded-lg hover:bg-brand-500/10 border border-transparent hover:border-brand-500/10"
                            title="Open AI Studio"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                        <a 
                          href={doc.fileUrl} 
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-dark-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/10"
                          title="Download Raw File"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button 
                          onClick={() => handleDelete(doc._id)}
                          className="p-1.5 text-dark-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10"
                          title="Purge Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {doc.description && (
                      <p className="text-xs text-dark-400 line-clamp-2 min-h-[32px]">{doc.description}</p>
                    )}

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-dark-800 text-dark-300 border border-dark-700/50">
                            <Tag className="h-2.5 w-2.5 text-brand-400" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer: Date + Status */}
                  <div className="flex items-center justify-between border-t border-dark-800/60 pt-3.5 mt-4 text-[11px] text-dark-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    {renderStatus(doc.status, doc.ocrConfidence, doc.errorMessage)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
