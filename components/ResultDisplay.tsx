import React from 'react';
import { Copy, Check, FileText, Tag, Search, Globe, Hash, Folder } from 'lucide-react';
import { SeoResult } from '../types';
import { Card, Badge } from './UiComponents';

interface ResultDisplayProps {
  result: SeoResult;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-slate-500 hover:text-brand-400 transition-colors p-1 rounded-md hover:bg-slate-700/50"
      title="Copy to clipboard"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  
  const getDifficultyColor = (score: number) => {
    if (score < 30) return 'bg-emerald-500 text-emerald-500';
    if (score < 60) return 'bg-yellow-500 text-yellow-500';
    return 'bg-red-500 text-red-500';
  };

  const diffColor = getDifficultyColor(result.keywordDifficulty);
  const [bgColor, textColor] = diffColor.split(' ');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Keyword */}
        <Card className="relative overflow-hidden group hover:border-brand-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <CopyButton text={result.primaryKeyword} />
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
                <Search size={20} />
              </div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Primary Keyword</h3>
            </div>
            
            <div className="flex flex-col items-end gap-1 group relative cursor-help">
                {/* Custom Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 translate-y-2 group-hover:translate-y-0">
                  <div className="text-xs text-slate-300 leading-relaxed space-y-3">
                    <div>
                        <p className="font-bold text-white text-sm mb-1">Keyword Difficulty (KD)</p>
                        <p className="text-slate-400">Estimates ranking competition (0-100).</p>
                    </div>
                    <div className="space-y-2 border-t border-slate-800 pt-2">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2 text-emerald-400 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 0-30</span> 
                            <span className="text-slate-400">Easy</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2 text-yellow-400 font-medium"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> 31-60</span> 
                            <span className="text-slate-400">Medium (Quality Content)</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2 text-red-400 font-medium"><span className="w-2 h-2 rounded-full bg-red-500"></span> 61-100</span> 
                            <span className="text-slate-400">Hard (Needs Authority)</span>
                        </div>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full right-6 -mt-[1px] border-8 border-transparent border-t-slate-700/50"></div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${textColor}`}>KD {result.keywordDifficulty}</span>
                    <div className="h-1.5 w-16 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${bgColor} transition-all duration-500`} 
                            style={{ width: `${result.keywordDifficulty}%` }}
                        />
                    </div>
                </div>
            </div>
          </div>
          <p className="text-xl font-bold text-white">{result.primaryKeyword}</p>
        </Card>

         {/* SEO Title */}
         <Card className="relative overflow-hidden group hover:border-brand-500/30 transition-colors md:col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={result.seoTitle} />
          </div>
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Globe size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">SEO Title</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${result.seoTitle.length > 65 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {result.seoTitle.length} chars
            </span>
          </div>
          <p className="text-lg font-medium text-white leading-relaxed">{result.seoTitle}</p>
        </Card>
      </div>

      {/* Meta Description */}
      <Card className="relative overflow-hidden group hover:border-brand-500/30 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={result.metaDescription} />
        </div>
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <FileText size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Meta Description</h3>
           <span className={`text-xs px-2 py-0.5 rounded-full ${result.metaDescription.length > 160 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {result.metaDescription.length} chars
            </span>
        </div>
        <p className="text-slate-300 leading-relaxed">{result.metaDescription}</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <Card className="relative group hover:border-brand-500/30 transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={result.category.join(", ")} />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Folder size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Category</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.category.map((cat, i) => (
              <Badge key={i} color="bg-teal-900/30 text-teal-200 border-teal-700/50">{cat}</Badge>
            ))}
          </div>
        </Card>

        {/* Secondary Keywords */}
        <Card className="relative group hover:border-brand-500/30 transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={result.secondaryKeywords.join(", ")} />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
              <Hash size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Secondary Keywords</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.secondaryKeywords.map((kw, i) => (
              <Badge key={i} color="bg-slate-700 text-slate-200 border-slate-600">{kw}</Badge>
            ))}
          </div>
        </Card>

        {/* Tags */}
        <Card className="relative group hover:border-brand-500/30 transition-colors md:col-span-2">
           <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={result.tags.join(", ")} />
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
              <Tag size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag, i) => (
              <Badge key={i} color="bg-slate-700 text-slate-200 border-slate-600">#{tag}</Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};