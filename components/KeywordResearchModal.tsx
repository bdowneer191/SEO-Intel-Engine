import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, Loader2, TrendingUp } from 'lucide-react';
import { KeywordIdea } from '../types';
import { generateKeywordIdeas } from '../services/geminiService';
import { Button, Badge } from './UiComponents';

interface KeywordResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic: string;
  onApplyKeywords: (keywords: string[]) => void;
}

export const KeywordResearchModal: React.FC<KeywordResearchModalProps> = ({
  isOpen,
  onClose,
  initialTopic,
  onApplyKeywords,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialTopic);
  const [ideas, setIdeas] = useState<KeywordIdea[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with a new topic
  useEffect(() => {
    if (isOpen) {
        setSearchTerm(initialTopic);
        setIdeas([]); // Clear previous results
        setSelectedKeywords(new Set());
        setError(null);
        // Optional: Auto-search if initialTopic exists
        if (initialTopic) {
            handleSearch(initialTopic);
        }
    }
  }, [isOpen, initialTopic]);

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await generateKeywordIdeas(term);
      setIdeas(results);
    } catch (err) {
      setError("Failed to fetch suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyword = (keyword: string) => {
    const newSet = new Set(selectedKeywords);
    if (newSet.has(keyword)) {
      newSet.delete(keyword);
    } else {
      newSet.add(keyword);
    }
    setSelectedKeywords(newSet);
  };

  const handleApply = () => {
    onApplyKeywords(Array.from(selectedKeywords));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Keyword Research</h3>
              <p className="text-xs text-slate-400">Find related topics and high-potential keywords</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                placeholder="Enter a seed topic..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <Button onClick={() => handleSearch(searchTerm)} disabled={isLoading || !searchTerm}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && ideas.length === 0 && !error && (
            <div className="text-center py-12 text-slate-500">
              <Search size={48} className="mx-auto mb-3 opacity-20" />
              <p>Enter a topic to explore keyword opportunities.</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center">
              <Loader2 size={32} className="animate-spin mb-3 text-brand-500" />
              <p>Analyzing search patterns...</p>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && ideas.length > 0 && (
            <div className="grid gap-3">
              {ideas.map((idea, index) => {
                const isSelected = selectedKeywords.has(idea.keyword);
                return (
                  <div 
                    key={index}
                    onClick={() => toggleKeyword(idea.keyword)}
                    className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-brand-900/20 border-brand-500/50 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-600 text-transparent group-hover:border-slate-500'
                      }`}>
                        <Check size={12} />
                      </div>
                      <div>
                        <p className={`font-medium ${isSelected ? 'text-brand-100' : 'text-slate-200'}`}>
                          {idea.keyword}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color="bg-slate-800 text-slate-400 border-slate-700">{idea.intent}</Badge>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            idea.difficulty.toLowerCase() === 'low' ? 'border-emerald-500/30 text-emerald-400' :
                            idea.difficulty.toLowerCase() === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
                            'border-red-500/30 text-red-400'
                          }`}>
                            {idea.difficulty} Diff
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                        {idea.volume} Vol
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex justify-between items-center">
            <div className="text-sm text-slate-400">
                <span className="text-brand-400 font-bold">{selectedKeywords.size}</span> keywords selected
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleApply} disabled={selectedKeywords.size === 0}>
                    <Plus size={16} className="mr-2" />
                    Add to Context
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
