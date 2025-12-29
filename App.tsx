import React, { useState, useEffect } from 'react';
import { generateSeoData } from './services/geminiService';
import { fetchSheetTabs, fetchTopicAndUrl } from './services/sheetsService';
import { SeoRequest, SeoResult, AppStatus, SheetState } from './types';
import { ResultDisplay } from './components/ResultDisplay';
import { SheetIntegration } from './components/SheetIntegration';
import { KeywordResearchModal } from './components/KeywordResearchModal';
import { Button, InputLabel, Card, Badge } from './components/UiComponents';
import { Sparkles, Target, MapPin, Briefcase, MessageSquare, AlertCircle, CheckCircle, Database, PenTool, ExternalLink, RefreshCw, ArrowDownCircle, Microscope, X, Layers, AlertTriangle, Trash2, Link, Lock, Settings } from 'lucide-react';
import { DEFAULT_SPREADSHEET_ID, CONTENT_TYPES } from './constants';

export default function App() {
  // Input Mode State
  const [inputMode, setInputMode] = useState<'manual' | 'sheet'>('manual');
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false); // Toggle for token visibility

  // SEO Request State
  const [request, setRequest] = useState<SeoRequest>({
    topic: '',
    geo: 'USA', 
    industry: '',
    context: '',
    contentType: 'blog',
  });

  // Sheet Configuration State
  const [sheetState, setSheetState] = useState<SheetState>(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('sheet_config');
      const savedToken = localStorage.getItem('google_access_token');
      let config = { spreadsheetId: '', accessToken: '', selectedTab: '', rowNumber: '', tabs: [] };
      
      try {
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          config = { ...config, ...parsed, tabs: [] };
        }
        if (savedToken) config.accessToken = savedToken;
      } catch (e) {}
      return config;
    }
    return { spreadsheetId: '', accessToken: '', selectedTab: '', rowNumber: '', tabs: [] };
  });

  // Initialize tabs if we have a saved sheet ID on load
  useEffect(() => {
    if (sheetState.spreadsheetId && sheetState.accessToken && sheetState.tabs.length === 0) {
       // Attempt to restore session (optional, can be triggered manually to avoid errors on load)
       // handleFetchTabs(); 
    }
  }, []);

  const [result, setResult] = useState<SeoResult | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('sheet_config', JSON.stringify({
      spreadsheetId: sheetState.spreadsheetId,
      selectedTab: sheetState.selectedTab,
      rowNumber: sheetState.rowNumber
    }));
    if (sheetState.accessToken) {
        localStorage.setItem('google_access_token', sheetState.accessToken);
    }
  }, [sheetState]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 8000);
  };

  // --- Handlers ---

  const handleFetchTabs = async () => {
    if (!sheetState.spreadsheetId) return showNotification('error', 'Enter a Spreadsheet ID');
    if (!sheetState.accessToken) return showNotification('error', 'Google Token is required to access your sheet.');
    
    setStatus(AppStatus.FETCHING_SHEET);
    try {
      const tabs = await fetchSheetTabs(sheetState.spreadsheetId, sheetState.accessToken);
      setSheetState(prev => ({ 
          ...prev, 
          tabs,
          selectedTab: tabs.length > 0 ? tabs[0].title : '' 
      }));
      setShowTokenInput(false); // Auto-hide token on success
      showNotification('success', 'Sheet connected successfully.');
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to load tabs.');
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleDisconnectSheet = () => {
    setSheetState(prev => ({ ...prev, spreadsheetId: '', tabs: [], selectedTab: '', rowNumber: '' }));
    showNotification('success', 'Sheet disconnected. Saved URL removed.');
  };

  const handleFetchTopic = async () => {
    if (!sheetState.selectedTab) return showNotification('error', 'Select a tab first.');
    setStatus(AppStatus.FETCHING_SHEET);
    try {
      const { topic, url, row } = await fetchTopicAndUrl(
        sheetState.spreadsheetId, 
        sheetState.selectedTab, 
        sheetState.accessToken,
        sheetState.rowNumber ? parseInt(sheetState.rowNumber) : undefined
      );
      setRequest(prev => ({ ...prev, topic, context: `Source URL: ${url}` }));
      setSheetState(prev => ({ ...prev, rowNumber: row.toString() }));
      showNotification('success', `Fetched Row ${row}: "${topic.substring(0, 20)}..."`);
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.topic) return showNotification('error', 'Please enter a topic first.');
    setStatus(AppStatus.GENERATING);
    setResult(null);
    try {
      const data = await generateSeoData(request);
      setResult(data);
      setStatus(AppStatus.SUCCESS);
      showNotification('success', 'SEO Data generated successfully.');
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      showNotification('error', error.message || 'Generation failed.');
    }
  };

  const isSheetConnected = sheetState.tabs.length > 0;
  const hasSavedToken = !!sheetState.accessToken && sheetState.accessToken.length > 10;

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-200 font-sans selection:bg-brand-500/30">
      
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-brand-400 to-brand-600 text-white p-2 rounded-lg shadow-lg shadow-brand-500/20">
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SEO Intel Engine</h1>
              <p className="text-xs text-slate-500 font-medium">Vercel Edge Edition</p>
            </div>
          </div>
          <Badge color="bg-emerald-900/30 text-emerald-400 border-emerald-700/30">v4.0 Edge</Badge>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {notification && (
          <div className={`fixed top-20 right-4 z-50 animate-in slide-in-from-right-4 duration-300 ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-green-500/10 border-green-500/50 text-green-200'} border backdrop-blur-md px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 max-w-md`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: Configuration */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Input Engine</h2>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setInputMode('manual')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${inputMode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Manual</button>
                    <button onClick={() => setInputMode('sheet')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${inputMode === 'sheet' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Sheets</button>
                </div>
            </div>

            {/* SHEET MODE CONFIGURATION */}
            {inputMode === 'sheet' && (
                <Card className="bg-slate-900/80 border-brand-500/30 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4">
                        
                        {/* 1. ACCESS TOKEN (Collapsible) */}
                        <div className="border-b border-slate-800 pb-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <Lock size={12} className={hasSavedToken ? "text-green-400" : "text-slate-500"} />
                                    <InputLabel label="Google Access Token" />
                                </div>
                                <button 
                                    onClick={() => setShowTokenInput(!showTokenInput)} 
                                    className="text-[10px] text-brand-400 hover:text-brand-300 underline"
                                >
                                    {showTokenInput ? 'Hide' : (hasSavedToken ? 'Configure' : 'Add Token')}
                                </button>
                            </div>
                            
                            {/* Hidden State */}
                            {!showTokenInput && hasSavedToken && (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/10 p-2 rounded border border-green-900/30">
                                    <CheckCircle size={12} />
                                    <span>Token saved securely in browser.</span>
                                </div>
                            )}

                            {/* Visible Input State */}
                            {(showTokenInput || !hasSavedToken) && (
                                <div className="animate-in fade-in duration-200">
                                    <input
                                        type="password"
                                        value={sheetState.accessToken}
                                        onChange={(e) => setSheetState({...sheetState, accessToken: e.target.value})}
                                        placeholder="Paste OAuth token (ya29...)"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 font-mono"
                                    />
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-[10px] text-slate-500">Required for Sheet Read/Write access.</p>
                                        <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white">
                                            Get Token <ExternalLink size={10}/>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. SPREADSHEET URL / ID */}
                        <div>
                             <InputLabel label="Spreadsheet Connection" />
                             
                             {isSheetConnected ? (
                                 // CONNECTED STATE
                                 <div className="bg-brand-900/20 border border-brand-500/30 rounded-lg p-3 flex items-start justify-between group animate-in zoom-in-95">
                                     <div className="overflow-hidden">
                                         <p className="text-xs font-bold text-brand-200 mb-0.5 flex items-center gap-1">
                                             <Database size={12} /> Connected
                                         </p>
                                         <p className="text-[10px] text-brand-400/80 font-mono truncate max-w-[200px]" title={sheetState.spreadsheetId}>
                                             ID: {sheetState.spreadsheetId.slice(0, 15)}...{sheetState.spreadsheetId.slice(-4)}
                                         </p>
                                     </div>
                                     <button 
                                        onClick={handleDisconnectSheet}
                                        className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded transition-colors"
                                        title="Disconnect and Remove Saved URL"
                                     >
                                         <Trash2 size={14} />
                                     </button>
                                 </div>
                             ) : (
                                 // INPUT STATE
                                 <div className="flex gap-2">
                                    <input
                                        value={sheetState.spreadsheetId}
                                        onChange={(e) => setSheetState({...sheetState, spreadsheetId: e.target.value})}
                                        placeholder="Paste Sheet URL or ID..."
                                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 font-mono"
                                    />
                                    <Button variant="secondary" onClick={handleFetchTabs} isLoading={status === AppStatus.FETCHING_SHEET} className="px-3">
                                        <Link size={14} />
                                    </Button>
                                </div>
                             )}
                        </div>

                        {/* 3. ROW SELECTION (Only visible if connected) */}
                        {isSheetConnected && (
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/50">
                                <div>
                                    <InputLabel label="Tab Name" />
                                    <select
                                        value={sheetState.selectedTab}
                                        onChange={(e) => setSheetState({...sheetState, selectedTab: e.target.value})}
                                        className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs"
                                    >
                                        {sheetState.tabs.map(t => <option key={t.sheetId} value={t.title}>{t.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel label="Row #" />
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={sheetState.rowNumber}
                                            onChange={(e) => setSheetState({...sheetState, rowNumber: e.target.value})}
                                            placeholder="Auto"
                                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs"
                                        />
                                        {sheetState.rowNumber && (
                                            <button onClick={() => setSheetState({...sheetState, rowNumber: ''})} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={10}/></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button 
                            variant="outline" 
                            className="w-full border-brand-500/30 text-brand-300 hover:bg-brand-900/20"
                            onClick={handleFetchTopic}
                            disabled={!isSheetConnected}
                            isLoading={status === AppStatus.FETCHING_SHEET}
                        >
                            <ArrowDownCircle size={14} className="mr-2"/> 
                            {sheetState.rowNumber ? 'Fetch Row Data' : 'Auto-Find Next Empty'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* GENERATOR FORM */}
            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Content Type */}
              <div>
                 <InputLabel label="Content Archetype" htmlFor="contentType" />
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><Layers size={16} /></div>
                    <select
                      id="contentType"
                      value={request.contentType}
                      onChange={(e) => setRequest({...request, contentType: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer hover:bg-slate-800/50"
                    >
                        {CONTENT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </select>
                 </div>
              </div>

              {/* Topic & Keyword Research */}
              <div>
                <div className="flex justify-between items-center">
                   <InputLabel label="Target Topic" htmlFor="topic" />
                   <button 
                      type="button"
                      onClick={() => setIsResearchModalOpen(true)}
                      className="text-[10px] font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded transition-colors"
                    >
                        <Microscope size={10} /> Research Keywords
                   </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><Target size={16} /></div>
                  <input
                    id="topic"
                    type="text"
                    required
                    value={request.topic}
                    onChange={(e) => setRequest({ ...request, topic: e.target.value })}
                    placeholder={inputMode === 'sheet' ? "Fetch from sheet..." : "e.g. Enterprise SaaS Marketing"}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Geo & Industry */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputLabel label="Target Geo" htmlFor="geo" />
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><MapPin size={16} /></div>
                    <input id="geo" value={request.geo} onChange={(e) => setRequest({ ...request, geo: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
                <div>
                  <InputLabel label="Industry" htmlFor="industry" />
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><Briefcase size={16} /></div>
                    <input id="industry" value={request.industry} onChange={(e) => setRequest({ ...request, industry: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-4 text-lg font-bold shadow-brand-500/20 hover:shadow-brand-500/40"
                isLoading={status === AppStatus.GENERATING}
                disabled={status === AppStatus.GENERATING}
              >
                {status === AppStatus.GENERATING ? 'Generating...' : 'Generate Intelligence'}
              </Button>
            </form>
          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="lg:col-span-8">
            {result ? (
              <>
                <ResultDisplay result={result} />
                <SheetIntegration 
                    seoResult={result} 
                    sheetState={sheetState} 
                    onStatusChange={(s, m) => { setStatus(s); if(m) showNotification(s === AppStatus.ERROR ? 'error' : 'success', m); }}
                    onTokenUpdate={(t) => setSheetState(prev => ({...prev, accessToken: t}))}
                />
              </>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8 text-center">
                <div className="bg-slate-900 p-4 rounded-full mb-4"><Sparkles size={32} className="text-slate-500" /></div>
                <h3 className="text-xl font-semibold text-slate-400 mb-2">Ready to Generate</h3>
                <p className="max-w-md mx-auto text-sm">Enter your topic or fetch data from Google Sheets to generate high-performance, intent-optimized SEO metadata.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Keyword Modal (Already linked to backend API) */}
      <KeywordResearchModal 
        isOpen={isResearchModalOpen} 
        onClose={() => setIsResearchModalOpen(false)}
        initialTopic={request.topic}
        onApplyKeywords={(keywords) => {
            const kwString = keywords.join(", ");
            setRequest(prev => ({...prev, context: prev.context ? `${prev.context}\n\nKeywords: ${kwString}` : `Keywords: ${kwString}`}));
            showNotification('success', `Added ${keywords.length} keywords.`);
        }}
      />
    </div>
  );
}
