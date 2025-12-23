
import React, { useState, useEffect } from 'react';
import { generateSeoData } from './services/geminiService';
import { fetchSheetTabs, fetchTopicAndUrl } from './services/sheetsService';
import { SeoRequest, SeoResult, AppStatus, SheetState } from './types';
import { ResultDisplay } from './components/ResultDisplay';
import { SheetIntegration } from './components/SheetIntegration';
import { KeywordResearchModal } from './components/KeywordResearchModal';
import { Button, InputLabel, Card, Badge } from './components/UiComponents';
import { Sparkles, Target, MapPin, Briefcase, MessageSquare, AlertCircle, CheckCircle, Database, PenTool, ExternalLink, RefreshCw, ArrowDownCircle, Microscope, X, Layers, AlertTriangle, Trash2 } from 'lucide-react';
import { DEFAULT_SPREADSHEET_ID, CONTENT_TYPES } from './constants';

export default function App() {
  // Input Mode State
  const [inputMode, setInputMode] = useState<'manual' | 'sheet'>('manual');
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);

  // SEO Request State - Geo defaults to USA
  const [request, setRequest] = useState<SeoRequest>({
    topic: '',
    geo: 'USA', 
    industry: '',
    context: '',
    contentType: 'blog', // Default
  });

  // Sheet Configuration State (Lifted) - Initialized from localStorage if available
  const [sheetState, setSheetState] = useState<SheetState>(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('sheet_config');
      const savedToken = localStorage.getItem('google_access_token');

      let config = {
        spreadsheetId: DEFAULT_SPREADSHEET_ID,
        accessToken: '',
        selectedTab: '',
        rowNumber: '',
        tabs: []
      };

      try {
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          config = { ...config, ...parsed, tabs: [] };
        }
        // Prioritize the specific token key if it exists
        if (savedToken) {
            config.accessToken = savedToken;
        }
      } catch (e) {
        console.warn("Failed to parse saved sheet config", e);
      }
      return config;
    }
    return {
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      accessToken: '',
      selectedTab: '',
      rowNumber: '',
      tabs: []
    };
  });

  const [result, setResult] = useState<SeoResult | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Effect to persist sheet configuration changes
  useEffect(() => {
    const configToSave = {
      spreadsheetId: sheetState.spreadsheetId,
      accessToken: sheetState.accessToken,
      selectedTab: sheetState.selectedTab,
      rowNumber: sheetState.rowNumber
    };
    localStorage.setItem('sheet_config', JSON.stringify(configToSave));
    
    // Also save token specifically as requested
    if (sheetState.accessToken) {
        localStorage.setItem('google_access_token', sheetState.accessToken);
    }
  }, [sheetState.spreadsheetId, sheetState.accessToken, sheetState.selectedTab, sheetState.rowNumber]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 8000); // Increased duration for errors
  };

  // --- Sheet Handlers ---

  const handleFetchTabs = async () => {
    if (!sheetState.spreadsheetId) return;
    setStatus(AppStatus.FETCHING_SHEET);
    try {
      const tabs = await fetchSheetTabs(sheetState.spreadsheetId, sheetState.accessToken);
      
      // Update state, ensuring selectedTab exists in the new list of tabs
      setSheetState(prev => {
        const currentTabExists = tabs.some(t => t.title === prev.selectedTab);
        // If current selected tab doesn't exist in new list, default to first tab, or empty string if no tabs
        const newSelectedTab = currentTabExists 
            ? prev.selectedTab 
            : (tabs.length > 0 ? tabs[0].title : '');
            
        return { 
            ...prev, 
            tabs,
            selectedTab: newSelectedTab 
        };
      });

      showNotification('success', 'Tabs loaded successfully.');
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to load tabs.');
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleFetchTopic = async () => {
    if (!sheetState.selectedTab) {
      showNotification('error', 'Please select a tab first.');
      return;
    }
    
    setStatus(AppStatus.FETCHING_SHEET);
    try {
      // Uses strict validation: checks for Headers "Topic" and "Source/URL" and existence of data
      const { topic, url, row } = await fetchTopicAndUrl(
        sheetState.spreadsheetId, 
        sheetState.selectedTab, 
        sheetState.accessToken,
        sheetState.rowNumber ? parseInt(sheetState.rowNumber) : undefined
      );
      
      setRequest(prev => ({ 
        ...prev, 
        topic,
        context: `Source URL: ${url}` // Pre-fill context with the URL
      }));
      
      // Update the row number in state if it was auto-discovered
      setSheetState(prev => ({ ...prev, rowNumber: row.toString() }));
      
      showNotification('success', `Fetched Row ${row}: "${topic.substring(0, 20)}..."`);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to fetch data.');
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleTokenUpdate = (newToken: string) => {
    setSheetState(prev => ({ ...prev, accessToken: newToken }));
  };

  // --- Research Handlers ---
  const handleApplyResearchKeywords = (keywords: string[]) => {
    if (keywords.length === 0) return;
    
    const keywordString = keywords.join(", ");
    setRequest(prev => ({
      ...prev,
      context: prev.context 
        ? `${prev.context}\n\nFocus on these keywords: ${keywordString}` 
        : `Focus on these keywords: ${keywordString}`
    }));
    
    showNotification('success', `Added ${keywords.length} keywords to context.`);
  };

  // --- Generation Handler ---

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.topic) {
      showNotification('error', 'Please enter a topic first.');
      return;
    }

    setStatus(AppStatus.GENERATING);
    setResult(null);
    
    try {
      const data = await generateSeoData(request);
      setResult(data);
      setStatus(AppStatus.SUCCESS);
      showNotification('success', 'SEO Data generated successfully.');
    } catch (error) {
      setStatus(AppStatus.ERROR);
      showNotification('error', 'Generation failed. Please try again.');
    }
  };

  const handleStatusChange = (newStatus: AppStatus, message?: string) => {
    setStatus(newStatus);
    if (message) {
      showNotification(newStatus === AppStatus.ERROR ? 'error' : 'success', message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-200 font-sans selection:bg-brand-500/30">
      
      {/* Navigation / Header */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-brand-400 to-brand-600 text-white p-2 rounded-lg shadow-lg shadow-brand-500/20">
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SEO Intel Engine</h1>
              <p className="text-xs text-slate-500 font-medium">AI-Powered Metadata Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Badge color="bg-emerald-900/30 text-emerald-400 border-emerald-700/30">
                <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    v3.3 Stable
                </span>
             </Badge>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Notifications */}
        {notification && (
          <div className={`fixed top-20 right-4 z-50 animate-in slide-in-from-right-4 duration-300 ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-green-500/10 border-green-500/50 text-green-200'} border backdrop-blur-md px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 max-w-md`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Input & Config */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Configuration</h2>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button 
                        onClick={() => setInputMode('manual')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${inputMode === 'manual' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <span className="flex items-center gap-1"><PenTool size={12}/> Manual</span>
                    </button>
                    <button 
                        onClick={() => setInputMode('sheet')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${inputMode === 'sheet' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                         <span className="flex items-center gap-1"><Database size={12}/> Sheets</span>
                    </button>
                </div>
            </div>

            {/* SHEET MODE CONFIG */}
            {inputMode === 'sheet' && (
                <Card className="bg-slate-900/80 border-brand-500/30 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <InputLabel label="Google Access Token" htmlFor="token" />
                                <a href="https://developers.google.com/oauthplayground/?scope=https://www.googleapis.com/auth/spreadsheets&prompt=select_account&approval_prompt=force" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 uppercase font-bold tracking-wide">
                                    Get Token <ExternalLink size={10}/>
                                </a>
                            </div>
                            <div className="relative group">
                                <input
                                    id="token"
                                    type="password"
                                    value={sheetState.accessToken}
                                    onChange={(e) => handleTokenUpdate(e.target.value)}
                                    placeholder="Paste token here..."
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono"
                                />
                                {sheetState.accessToken && (
                                    <button 
                                        onClick={() => handleTokenUpdate('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                        title="Clear Token"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                             <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                <AlertCircle size={10} className="text-slate-600"/>
                                Must be signed in as Sheet Owner/Editor.
                            </p>
                        </div>

                        <div>
                            <InputLabel label="Spreadsheet ID" htmlFor="sheetId" />
                            <div className="flex gap-2">
                                <input
                                    id="sheetId"
                                    value={sheetState.spreadsheetId}
                                    onChange={(e) => setSheetState({...sheetState, spreadsheetId: e.target.value})}
                                    placeholder="1BxiMVs..."
                                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-mono"
                                />
                                <Button variant="secondary" onClick={handleFetchTabs} isLoading={status === AppStatus.FETCHING_SHEET} className="px-3">
                                    <RefreshCw size={14} />
                                </Button>
                            </div>
                             <p className="text-[10px] text-slate-500 mt-1">Paste ID or full URL.</p>
                             {sheetState.spreadsheetId === DEFAULT_SPREADSHEET_ID && (
                                <div className="mt-2 p-2 bg-amber-900/20 border border-amber-900/50 rounded flex items-start gap-2 text-amber-200/80 text-[10px]">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    <p>You are using the public Template ID. You cannot write to this sheet. Please make a copy and use your own Sheet ID.</p>
                                </div>
                             )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <InputLabel label="Tab" />
                                <select
                                    value={sheetState.selectedTab}
                                    onChange={(e) => setSheetState({...sheetState, selectedTab: e.target.value})}
                                    disabled={sheetState.tabs.length === 0}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                >
                                    <option value="" disabled>Select Tab</option>
                                    {sheetState.tabs.map(t => <option key={t.sheetId} value={t.title}>{t.title}</option>)}
                                </select>
                            </div>
                             <div>
                                <InputLabel label="Row #" />
                                <div className="relative group">
                                    <input
                                        type="number"
                                        placeholder="Auto"
                                        value={sheetState.rowNumber}
                                        onChange={(e) => setSheetState({...sheetState, rowNumber: e.target.value})}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 placeholder-slate-600"
                                    />
                                    {sheetState.rowNumber && (
                                        <button 
                                            onClick={() => setSheetState({...sheetState, rowNumber: ''})}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 hover:bg-slate-700 rounded-full transition-colors"
                                            title="Clear to enable Auto-Find"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full border-brand-500/30 text-brand-300 hover:bg-brand-900/20"
                            onClick={handleFetchTopic}
                            disabled={!sheetState.selectedTab}
                            isLoading={status === AppStatus.FETCHING_SHEET}
                        >
                            <ArrowDownCircle size={14} className="mr-2"/> {sheetState.rowNumber ? 'Fetch Topic & Source' : 'Find First & Fetch'}
                        </Button>
                    </div>
                </Card>
            )}

            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Content Type Selector */}
              <div>
                 <InputLabel label="Content Type" htmlFor="contentType" />
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Layers size={16} />
                    </div>
                    <select
                      id="contentType"
                      value={request.contentType}
                      onChange={(e) => setRequest({...request, contentType: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none transition-all cursor-pointer hover:bg-slate-800/50"
                    >
                        {CONTENT_TYPES.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                            {CONTENT_TYPES.find(t => t.id === request.contentType)?.tone}
                        </span>
                    </div>
                 </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                   <InputLabel label="Target Topic" htmlFor="topic" />
                   <button 
                      type="button"
                      onClick={() => setIsResearchModalOpen(true)}
                      className="text-[10px] font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded transition-colors"
                    >
                        <Microscope size={10} /> Keyword Research
                   </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Target size={16} />
                  </div>
                  <input
                    id="topic"
                    type="text"
                    required
                    value={request.topic}
                    onChange={(e) => setRequest({ ...request, topic: e.target.value })}
                    placeholder={inputMode === 'sheet' ? "Fetch from sheet..." : "e.g. Enterprise SaaS Marketing"}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputLabel label="Target Geo" htmlFor="geo" />
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <MapPin size={16} />
                    </div>
                    <input
                      id="geo"
                      type="text"
                      value={request.geo}
                      onChange={(e) => setRequest({ ...request, geo: e.target.value })}
                      placeholder="e.g. USA"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <InputLabel label="Industry" htmlFor="industry" />
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Briefcase size={16} />
                    </div>
                    <input
                      id="industry"
                      type="text"
                      value={request.industry}
                      onChange={(e) => setRequest({ ...request, industry: e.target.value })}
                      placeholder="e.g. Fintech"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <InputLabel label="Additional Context" htmlFor="context" />
                <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none text-slate-500">
                      <MessageSquare size={16} />
                    </div>
                    <textarea
                      id="context"
                      rows={3}
                      value={request.context}
                      onChange={(e) => setRequest({ ...request, context: e.target.value })}
                      placeholder="Paste URL, key points, or specific instructions..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-4 text-lg font-semibold shadow-brand-500/20 hover:shadow-brand-500/40 transform hover:-translate-y-0.5 transition-all"
                isLoading={status === AppStatus.GENERATING}
                disabled={status === AppStatus.GENERATING}
              >
                {status === AppStatus.GENERATING ? 'Analyzing & Generating...' : 'Generate SEO Intelligence'}
              </Button>
            </form>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {result ? (
              <>
                <ResultDisplay result={result} />
                <SheetIntegration 
                    seoResult={result} 
                    sheetState={sheetState} 
                    onStatusChange={handleStatusChange}
                    onTokenUpdate={handleTokenUpdate}
                />
              </>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8 text-center">
                <div className="bg-slate-900 p-4 rounded-full mb-4">
                    <Sparkles size={32} className="text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-400 mb-2">Ready to Generate</h3>
                <p className="max-w-md mx-auto">
                  Enter your topic or fetch data from Google Sheets to generate high-performance, intent-optimized SEO metadata.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md text-left text-sm">
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                        <span className="block text-brand-400 font-bold mb-1">Auto-Easy Win</span>
                        Analyzes intent gaps to find low-competition angles.
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                        <span className="block text-brand-400 font-bold mb-1">Smart Limits</span>
                        Strict pixel-width checks for Title & Meta.
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                        <span className="block text-brand-400 font-bold mb-1">Context Aware</span>
                        Adapts to News, E-comm, or Blog styles.
                    </div>
                     <div className="p-3 bg-slate-900 rounded border border-slate-800">
                        <span className="block text-brand-400 font-bold mb-1">Sheet Sync</span>
                        Reads URL/Topic and writes back SEO data.
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Keyword Research Modal */}
      <KeywordResearchModal 
        isOpen={isResearchModalOpen} 
        onClose={() => setIsResearchModalOpen(false)}
        initialTopic={request.topic}
        onApplyKeywords={handleApplyResearchKeywords}
      />
    </div>
  );
}
