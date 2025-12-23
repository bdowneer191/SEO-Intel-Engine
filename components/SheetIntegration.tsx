import React, { useState, useEffect } from 'react';
import { Sheet, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { SeoResult, AppStatus, SheetState } from '../types';
import { writeSeoToSheet } from '../services/sheetsService';
import { Button, Card, InputLabel } from './UiComponents';

interface SheetIntegrationProps {
  seoResult: SeoResult | null;
  sheetState: SheetState;
  onStatusChange: (status: AppStatus, message?: string) => void;
  onTokenUpdate?: (token: string) => void;
}

export const SheetIntegration: React.FC<SheetIntegrationProps> = ({ 
  seoResult, 
  sheetState, 
  onStatusChange,
  onTokenUpdate
}) => {
  const [isWriting, setIsWriting] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Auto-save token to localStorage when it changes
  useEffect(() => {
    if (sheetState.accessToken) {
      localStorage.setItem('google_access_token', sheetState.accessToken);
    }
  }, [sheetState.accessToken]);

  // Retrieve token on initial load if missing in state
  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken && !sheetState.accessToken && onTokenUpdate) {
        onTokenUpdate(savedToken);
    }
  }, []);

  const handleSave = async () => {
    if (!seoResult || !sheetState.selectedTab || !sheetState.rowNumber) {
        onStatusChange(AppStatus.ERROR, "Missing sheet configuration (Tab or Row #).");
        return;
    }
    
    setIsWriting(true);
    onStatusChange(AppStatus.WRITING_SHEET);
    try {
      await writeSeoToSheet(
        sheetState.spreadsheetId,
        sheetState.selectedTab,
        parseInt(sheetState.rowNumber, 10),
        seoResult,
        sheetState.accessToken
      );
      onStatusChange(AppStatus.SUCCESS, `Successfully updated Row ${sheetState.rowNumber} in ${sheetState.selectedTab}!`);
      setShowTokenInput(false);
    } catch (error: any) {
      console.error(error);
      onStatusChange(AppStatus.ERROR, "Failed to write to sheet. Check permissions.");
      // If error is related to auth, show token input
      if (error.message && (error.message.includes("401") || error.message.includes("403") || error.message.includes("expired"))) {
          setShowTokenInput(true);
      }
    } finally {
      setIsWriting(false);
    }
  };

  const isConfigured = sheetState.spreadsheetId && sheetState.selectedTab && sheetState.rowNumber;

  return (
    <div className="space-y-4 mt-8 border-t border-slate-700 pt-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <div className="p-2 bg-green-600/20 text-green-400 rounded-lg">
            <Sheet size={20} />
          </div>
          <h2 className="text-lg font-semibold">Export to Google Sheet</h2>
        </div>
        <button 
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
        >
            {showTokenInput ? 'Hide Settings' : 'Settings'}
        </button>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
          <div className="space-y-4">
            {showTokenInput && onTokenUpdate && (
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 mb-2 animate-in slide-in-from-top-2">
                    <InputLabel label="Update Access Token (Auto-saved)" htmlFor="result-token" />
                    <input
                        id="result-token"
                        type="password"
                        value={sheetState.accessToken}
                        onChange={(e) => onTokenUpdate(e.target.value)}
                        placeholder="ya29.a0..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                        Updates are automatically saved to local storage.
                    </p>
                </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-400">
                    {isConfigured ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-slate-300 font-medium">Destination:</span>
                            <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                                {sheetState.selectedTab} / Row {sheetState.rowNumber}
                            </span>
                            <span className="text-xs text-slate-500 mt-1">
                            ID: ...{sheetState.spreadsheetId.slice(-6)}
                            </span>
                        </div>
                    ) : (
                        <span className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle size={14} />
                            Configure sheet settings in the left panel first.
                        </span>
                    )}
                </div>

                <Button
                    variant="primary"
                    className="w-full md:w-auto bg-green-600 hover:bg-green-500 focus:ring-green-500"
                    onClick={handleSave}
                    disabled={!seoResult || !isConfigured || isWriting}
                    isLoading={isWriting}
                >
                    <Save size={16} className="mr-2" />
                    {isWriting ? 'Writing...' : 'Write Data to Sheet'}
                </Button>
            </div>
          </div>
          
          {isConfigured && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 text-[10px] text-slate-500 flex items-center gap-2">
                <CheckCircle size={10} />
                Smart Match: We will attempt to match headers (e.g., "SEO Title") automatically.
            </div>
          )}
      </Card>
    </div>
  );
};