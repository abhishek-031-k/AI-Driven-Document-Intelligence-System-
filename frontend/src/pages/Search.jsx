import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { setSearchResults, setError, setLoading } from '../store/slices/documentSlice';
import { 
  Search as SearchIcon, 
  BrainCircuit, 
  Eye, 
  Sparkles, 
  FileText, 
  ArrowRight, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const dispatch = useDispatch();
  const { searchResults, loading, error } = useSelector((state) => state.documents);
  const { user } = useSelector((state) => state.auth);

  // Suggestions for developers to test
  const suggestions = [
    "What are the payment terms?",
    "Find details about applicant's work experience",
    "Medical treatment prescriptions or details",
    "Academic research methodologies"
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    dispatch(setLoading(true));
    try {
      const res = await api.post('/documents/search', { query });
      dispatch(setSearchResults(res.data.results));
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Error executing semantic search'));
    }
  };

  const selectSuggestion = (sug) => {
    setQuery(sug);
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <BrainCircuit className="h-8 w-8 text-brand-500 animate-pulse-slow" />
          Semantic Vector Search
        </h1>
        <p className="text-dark-400 mt-1">
          Perform context-aware similarity searches across all document chunks using vector embeddings.
        </p>
      </div>

      {/* Main Search Panel */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-500">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input 
              type="text" 
              disabled={user && !user.isVerified}
              placeholder={user && !user.isVerified ? "Verify email to unlock search operations" : "Type a question or search query (e.g. quarterly balance sheet totals)..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-dark-900/50 border border-dark-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500/50 text-sm shadow-inner disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim() || (user && !user.isVerified)}
            className="px-6 bg-brand-600 hover:bg-brand-500 disabled:bg-dark-800 disabled:text-dark-500 text-white font-bold rounded-2xl transition-colors flex items-center gap-2 text-sm shadow-md"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Search
          </button>
        </form>

        {/* Suggestion tags */}
        <div className="space-y-2">
          <span className="text-[11px] text-dark-500 font-bold uppercase tracking-wider block">Suggested searches:</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(sug)}
                className="py-1.5 px-3 bg-dark-800/40 hover:bg-dark-800 border border-dark-800 hover:border-dark-700/60 text-dark-300 hover:text-white rounded-xl text-xs transition-all"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-4" />
            <p className="text-dark-400">Comparing query vector against document index matrices...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <SearchIcon className="h-10 w-10 text-dark-600 mb-4" />
            <h4 className="font-bold text-white text-md">No Semantic Matches</h4>
            <p className="text-xs text-dark-400 mt-1 max-w-sm">Enter a search query to search across the database index.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-dark-400 font-bold uppercase tracking-wider">
                Showing top similarity matches
              </span>
              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/10">
                {searchResults.length} Results Found
              </span>
            </div>

            <div className="space-y-4">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  className="glass-panel rounded-2xl p-5 hover:border-brand-500/20 transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-5 relative group"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-brand-400 shrink-0" />
                      <h3 className="font-bold text-white truncate text-base leading-snug">
                        {result.document.title}
                      </h3>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-400 font-bold border border-brand-500/10 uppercase">
                        {result.document.category}
                      </span>
                    </div>

                    {/* Excerpt text snippet */}
                    <div className="bg-dark-950/40 p-4 rounded-xl border border-dark-800 text-xs font-mono text-dark-300 leading-relaxed italic relative">
                      <span className="text-brand-500 font-bold not-italic block mb-1 uppercase text-[9px] tracking-wider">Matching section:</span>
                      "{result.snippet}"
                    </div>
                  </div>

                  {/* Similarity score progress circle */}
                  <div className="flex items-center md:flex-col justify-between md:justify-start gap-4 shrink-0 md:border-l border-dark-800 md:pl-6 pt-3 md:pt-0">
                    <div className="text-left md:text-center">
                      <span className="block text-[10px] text-dark-500 font-bold uppercase tracking-wider">Similarity Score</span>
                      <span className="text-xl font-black text-brand-400 mt-0.5 block">
                        {result.relevanceScore}%
                      </span>
                    </div>

                    <Link
                      to={`/documents/${result.document._id}`}
                      className="py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      Open Studio
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
