
import React, { useState, useEffect } from 'react';
import { generateSeoData } from './services/geminiService';
import { fetchSheetTabs, fetchTopicAndUrl } from './services/sheetsService';
import { SeoRequest, SeoResult, AppStatus, SheetState } from './types';
import { ResultDisplay } from './components/ResultDisplay';
import { SheetIntegration } from './components/SheetIntegration';
import { KeywordResearchModal } from './components/KeywordResearchModal';
import { Button, InputLabel, Card, Badge } from './components/UiComponents';
import { Sparkles, Target, MapPin, Briefcase, MessageSquare, AlertCircle, CheckCircle, Database, PenTool, ExternalLink, RefreshCw, ArrowDownCircle, Microscope, X, Layers, AlertTriangle, Trash2, Save } from 'lucide-react';
import { DEFAULT_SPREADSHEET_ID, CONTENT_TYPES } from './constants';

export default function App() {
  const [inputMode, setInputMode] = useState<'manual' | 'sheet'>('manual');
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  
  const [request, setRequest] = useState<SeoRequest>({
    topic: '',
    geo: 'USA', 
    industry: '',
    context: '',
    contentType: 'blog',
  });

  const [sheetState, setSheetState] = useState<SheetState>(() => {
    const savedConfig = localStorage.getItem('sheet_config');
    const savedToken = localStorage.getItem('google_access_token');
    let config = { spreadsheetId: DEFAULT_SPREADSHEET_ID, accessToken: '', selectedTab: '', rowNumber: '', tabs: [] };
    try {
      if (savedConfig) config = { ...config, ...JSON.parse(savedConfig), tabs: [] };
      if (savedToken) config.accessToken = savedToken;
    } catch (e) {}
    return config;
  });

  const [result, setResult] = useState<SeoResult | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('sheet_config', JSON.stringify({
      spreadsheetId: sheetState.spreadsheetId,
      selectedTab: sheetState.selectedTab,
      rowNumber: sheetState.rowNumber
    }));
    if (sheetState.accessToken) localStorage.setItem('google_access_token', sheetState.accessToken);
  }, [sheetState]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleFetchTabs = async () => {
    if (!sheetState.accessToken) return showNotification('error', "Enter a Google Access Token first.");
    setStatus(AppStatus.FETCHING_SHEET);
    try {
      const tabs = await fetchSheetTabs(sheetState.spreadsheetId, sheetState.accessToken);
      setSheetState(prev => ({ ...prev, tabs, selectedTab: tabs[0]?.title || '' }));
      showNotification('success', 'Sheet structure synchronized.');
    } catch (e: any) { showNotification('error', e.message); }
    finally { setStatus(AppStatus.IDLE); }
  };

  const handleFetchTopic = async () => {
    if (!sheetState.selectedTab) return showNotification('error', 'Select a tab.');
    setStatus(AppStatus.FETCHING_SHEET);
    try {
      const { topic, url, row } = await fetchTopicAndUrl(
        sheetState.spreadsheetId, sheetState.selectedTab, sheetState.accessToken,
        sheetState.rowNumber ? parseInt(sheetState.rowNumber) : undefined
      );
      setRequest(prev => ({ ...prev, topic, context: `Source: ${url}` }));
      setSheetState(prev => ({ ...prev, rowNumber: row.toString() }));
      showNotification('success', `Ready to optimize Row ${row}.`);
    } catch (e: any) { showNotification('error', e.message); }
    finally { setStatus(AppStatus.IDLE); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.topic) return;
    setStatus(AppStatus.GENERATING);
    setResult(null);
    try {
      const data = await generateSeoData(request);
      setResult(data);
      setStatus(AppStatus.SUCCESS);
      showNotification('success', 'AI Generation Complete.');
    } catch (e: any) {
      setStatus(AppStatus.ERROR);
      showNotification('error', e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-brand-500/30">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-lg"><Sparkles size={20}/></div>
            <h1 className="text-xl font-bold">SEO Intel Engine <span className="text-[10px] text-brand-400 font-mono ml-2 border border-brand-900 px-1 rounded">PRO</span></h1>
          </div>
          <Badge color="bg-emerald-900/30 text-emerald-400 border-emerald-700/30">Vercel Ready</Badge>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {notification && (
          <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-2xl flex items-center gap-3 border backdrop-blur-md ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50'}`}>
            <AlertCircle size={20}/>
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Input Engine</h2>
                <div className="flex bg-slate-900 p-1 rounded-lg">
                    <button onClick={() => setInputMode('manual')} className={`px-3 py-1 text-xs rounded ${inputMode === 'manual' ? 'bg-slate-700' : 'text-slate-500'}`}>Manual</button>
                    <button onClick={() => setInputMode('sheet')} className={`px-3 py-1 text-xs rounded ${inputMode === 'sheet' ? 'bg-brand-600' : 'text-slate-500'}`}>Sheets</button>
                </div>
            </div>

            {inputMode === 'sheet' && (
                <Card className="border-brand-500/20 bg-slate-900/40">
                    <div className="space-y-4">
                        <div>
                            <InputLabel label="Google Token" />
                            <input type="password" value={sheetState.accessToken} onChange={(e) => setSheetState({...sheetState, accessToken: e.target.value})} className="w-full px-3 py-2 bg-black border border-slate-800 rounded-lg text-xs font-mono" />
                        </div>
                        <div>
                            <InputLabel label="Spreadsheet ID" />
                            <div className="flex gap-2">
                                <input value={sheetState.spreadsheetId} onChange={(e) => setSheetState({...sheetState, spreadsheetId: e.target.value})} className="flex-1 px-3 py-2 bg-black border border-slate-800 rounded-lg text-xs font-mono" />
                                <Button variant="secondary" onClick={handleFetchTabs} className="px-3"><RefreshCw size={14}/></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={sheetState.selectedTab} onChange={(e) => setSheetState({...sheetState, selectedTab: e.target.value})} className="bg-black border border-slate-800 rounded-lg text-xs p-2">
                                <option value="">Select Tab</option>
                                {sheetState.tabs.map(t => <option key={t.sheetId} value={t.title}>{t.title}</option>)}
                            </select>
                            <input placeholder="Row #" value={sheetState.rowNumber} onChange={(e) => setSheetState({...sheetState, rowNumber: e.target.value})} className="bg-black border border-slate-800 rounded-lg text-xs p-2" />
                        </div>
                        <Button variant="outline" className="w-full text-brand-400 border-brand-900 hover:bg-brand-900/10" onClick={handleFetchTopic} isLoading={status === AppStatus.FETCHING_SHEET}>
                            <ArrowDownCircle size={14} className="mr-2"/> Fetch Target
                        </Button>
                    </div>
                </Card>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-4">
                <Card className="bg-slate-900/30">
                    <InputLabel label="Topic" />
                    <div className="flex gap-2">
                        <input value={request.topic} onChange={(e) => setRequest({...request, topic: e.target.value})} className="flex-1 px-3 py-2 bg-black border border-slate-800 rounded-lg" required />
                        <button type="button" onClick={() => setIsResearchModalOpen(true)} className="p-2 bg-purple-900/20 text-purple-400 rounded-lg"><Microscope size={18}/></button>
                    </div>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                    <div><InputLabel label="Geo" /><input value={request.geo} onChange={(e) => setRequest({...request, geo: e.target.value})} className="w-full px-3 py-2 bg-black border border-slate-800 rounded-lg" /></div>
                    <div><InputLabel label="Industry" /><input value={request.industry} onChange={(e) => setRequest({...request, industry: e.target.value})} className="w-full px-3 py-2 bg-black border border-slate-800 rounded-lg" /></div>
                </div>
                <textarea value={request.context} onChange={(e) => setRequest({...request, context: e.target.value})} rows={3} placeholder="Additional context..." className="w-full px-3 py-2 bg-black border border-slate-800 rounded-lg" />
              </div>
              <Button type="submit" className="w-full py-4 bg-brand-600 hover:bg-brand-500 font-bold" isLoading={status === AppStatus.GENERATING}>
                GENERATE INTELLIGENCE
              </Button>
            </form>
          </div>

          <div className="lg:col-span-8">
            {result ? (
              <div className="space-y-6">
                <ResultDisplay result={result} />
                <SheetIntegration seoResult={result} sheetState={sheetState} onStatusChange={(s, m) => { setStatus(s); if(m) showNotification(s === AppStatus.ERROR ? 'error' : 'success', m); }} />
              </div>
            ) : (
              <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-12 bg-slate-900/20">
                <div className="p-6 bg-slate-900 rounded-full mb-6 text-slate-600"><Target size={48}/></div>
                <h3 className="text-xl font-bold text-slate-400 mb-2">Engine Standby</h3>
                <p className="max-w-md text-slate-500 text-sm">Input your target keywords or sync with Google Sheets to begin generating intent-aware metadata grounded in live search data.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <KeywordResearchModal isOpen={isResearchModalOpen} onClose={() => setIsResearchModalOpen(false)} initialTopic={request.topic} onApplyKeywords={(kw) => setRequest(prev => ({...prev, context: `${prev.context}\nKeywords: ${kw.join(', ')}`}))} />
    </div>
  );
}
