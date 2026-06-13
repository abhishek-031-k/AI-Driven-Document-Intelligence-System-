import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  documents: [],
  currentDocument: null,
  searchResults: [],
  loading: false,
  error: null
};

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    clearError(state) {
      state.error = null;
    },
    setDocuments(state, action) {
      state.documents = action.payload;
      state.loading = false;
      state.error = null;
    },
    addDocument(state, action) {
      state.documents.unshift(action.payload);
    },
    updateDocumentInState(state, action) {
      const updatedDoc = action.payload;
      state.documents = state.documents.map((doc) =>
        doc._id === updatedDoc._id ? { ...doc, ...updatedDoc } : doc
      );
      if (state.currentDocument && state.currentDocument._id === updatedDoc._id) {
        state.currentDocument = { ...state.currentDocument, ...updatedDoc };
      }
    },
    updateDocumentStatus(state, action) {
      const { documentId, status, ocrConfidence, category, tags, errorMessage } = action.payload;
      state.documents = state.documents.map((doc) =>
        doc._id === documentId
          ? { ...doc, status, ocrConfidence, category, tags, errorMessage }
          : doc
      );
      if (state.currentDocument && state.currentDocument._id === documentId) {
        state.currentDocument = {
          ...state.currentDocument,
          status,
          ocrConfidence,
          category,
          tags,
          errorMessage
        };
      }
    },
    removeDocument(state, action) {
      const docId = action.payload;
      state.documents = state.documents.filter((doc) => doc._id !== docId);
      if (state.currentDocument && state.currentDocument._id === docId) {
        state.currentDocument = null;
      }
    },
    setCurrentDocument(state, action) {
      state.currentDocument = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSearchResults(state, action) {
      state.searchResults = action.payload;
      state.loading = false;
      state.error = null;
    }
  }
});

export const {
  setLoading,
  setError,
  clearError,
  setDocuments,
  addDocument,
  updateDocumentInState,
  updateDocumentStatus,
  removeDocument,
  setCurrentDocument,
  setSearchResults
} = documentSlice.actions;

export default documentSlice.reducer;
