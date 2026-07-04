import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { KBArticle } from '../utils/api';
import { BookOpen, Plus, Save, Trash2, Edit3, Eye, Loader2, Sparkles } from 'lucide-react';

export const KBManager: React.FC = () => {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Mode: Edit vs Preview
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const fetchArticles = async () => {
    try {
      const data = await api.kb.list();
      setArticles(data.articles);
    } catch (err: any) {
      setError(err.message || 'Failed to load Knowledge Base articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSelectArticle = (art: KBArticle) => {
    setSelectedArticle(art);
    setTitle(art.title);
    setContent(art.content);
    setIsNew(false);
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setSelectedArticle(null);
    setTitle('');
    setContent('');
    setIsNew(true);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);

    try {
      if (isNew) {
        const data = await api.kb.create({ title, content });
        setArticles((prev) => [data.article, ...prev]);
        setSelectedArticle(data.article);
        setIsNew(false);
      } else if (selectedArticle) {
        const data = await api.kb.update(selectedArticle.id, { title, content });
        setArticles((prev) =>
          prev.map((a) => (a.id === selectedArticle.id ? data.article : a))
        );
        setSelectedArticle(data.article);
      }
      alert('Article saved successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to save article.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedArticle || !window.confirm('Are you sure you want to delete this article?')) return;

    try {
      await api.kb.delete(selectedArticle.id);
      setArticles((prev) => prev.filter((a) => a.id !== selectedArticle.id));
      setSelectedArticle(null);
      setTitle('');
      setContent('');
      setIsNew(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete article.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-8 animate-fadeIn">
      {/* Left panel: sidebar list of articles */}
      <div className="w-80 bg-slate-900/20 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-400" />
            Articles List
          </h3>
          <button
            onClick={handleCreateNew}
            className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {articles.map((art) => (
            <button
              key={art.id}
              onClick={() => handleSelectArticle(art)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                selectedArticle?.id === art.id
                  ? 'bg-violet-600/10 border-violet-500/30 text-violet-300'
                  : 'bg-transparent border-slate-800/50 hover:bg-slate-800/40 text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="truncate text-sm font-bold text-slate-200 mb-1">{art.title}</div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>By {art.author?.email || 'System'}</span>
                <span>
                  {new Date(art.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: editing / viewing window */}
      <div className="flex-1 bg-slate-900/10 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden">
        {selectedArticle || isNew ? (
          <form onSubmit={handleSave} className="flex-1 flex flex-col h-full">
            {/* Header toolbar */}
            <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    !isEditing
                      ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Live
                </button>
              </div>

              <div className="flex items-center gap-3">
                {!isNew && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving || !title.trim() || !content.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>

            {/* Editing and preview views */}
            <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
              <input
                type="text"
                placeholder="Article Title (e.g. Connecting to Wi-Fi)"
                value={title}
                disabled={!isEditing}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-b border-slate-800 text-xl font-bold text-white placeholder-slate-600 pb-3 focus:outline-none focus:border-violet-500 transition-all"
              />

              {isEditing ? (
                <textarea
                  placeholder="Compose article in Markdown format here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 bg-transparent text-slate-300 text-sm leading-relaxed placeholder-slate-600 focus:outline-none resize-none font-mono"
                />
              ) : (
                <div className="flex-1 text-slate-300 prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              )}
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="w-12 h-12 text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No article selected</h3>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Select an existing article from the list or click the add button in the sidebar to write a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
