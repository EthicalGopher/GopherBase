import { useState, useEffect } from 'react';
import { API_BASE, safeJson } from '../contexts/AuthContext';

export default function Settings() {
  const [aiProvider, setAiProvider] = useState<'ollama' | 'gemini'>('ollama');
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.AI_PROVIDER) setAiProvider(data.AI_PROVIDER.toLowerCase() === 'gemini' ? 'gemini' : 'ollama');
        if (data.GEMINI_API_KEY) setGeminiKey(data.GEMINI_API_KEY);
        if (data.OLLAMA_HOST) setOllamaHost(data.OLLAMA_HOST);
      }
    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  };

  const handleSave = async (key: string, value: string) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, value })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Setting ${key} saved successfully!` });
        // Refresh config after save
        await fetchConfig();
      } else {
        const data = await safeJson(res);
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingKey(null);
    }
  };

  const updateProvider = async (provider: 'ollama' | 'gemini') => {
    // Only update local state if save is successful to prevent desync
    await handleSave('AI_PROVIDER', provider);
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto max-w-4xl mx-auto w-full h-full custom-scrollbar text-slate-900 dark:text-white">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base">Configure your GopherBase instance.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
        }`}>
          <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500">smart_toy</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Configuration</h2>
                <p className="text-sm text-slate-500">Choose your AI brain and configure connection settings.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => updateProvider('ollama')}
                disabled={savingKey === 'AI_PROVIDER'}
                className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-200 relative group ${
                  aiProvider === 'ollama' 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3 mb-3 w-full">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    aiProvider === 'ollama' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {aiProvider === 'ollama' && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                  </div>
                  <span className="font-bold text-lg">Ollama</span>
                  {savingKey === 'AI_PROVIDER' && aiProvider === 'ollama' && (
                    <span className="ml-auto w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                  Run models locally on your hardware. Best for privacy and offline usage. Supports Mistral, Llama, and more.
                </p>
              </button>

              <button
                onClick={() => updateProvider('gemini')}
                disabled={savingKey === 'AI_PROVIDER'}
                className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-200 relative group ${
                  aiProvider === 'gemini' 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3 mb-3 w-full">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    aiProvider === 'gemini' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {aiProvider === 'gemini' && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                  </div>
                  <span className="font-bold text-lg">Google Gemini</span>
                  {savingKey === 'AI_PROVIDER' && aiProvider === 'gemini' && (
                    <span className="ml-auto w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                  High-performance cloud models. Incredible reasoning and large context windows. Requires an API key.
                </p>
              </button>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              {aiProvider === 'ollama' ? (
                <div className="space-y-3 animate-in fade-in duration-500">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Ollama Host URL</label>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Default: http://localhost:11434
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">link</span>
                      <input
                        type="text"
                        value={ollamaHost}
                        onChange={(e) => setOllamaHost(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleSave('OLLAMA_HOST', ollamaHost)}
                      disabled={savingKey !== null}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                    >
                      {savingKey === 'OLLAMA_HOST' ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">save</span>
                      )}
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">info</span>
                    GopherBase uses <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">mistral:7b-instruct</code> by default with Ollama.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-500">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Gemini API Key</label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1">
                      Get Key <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                    </a>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">key</span>
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="Enter your Google AI API key..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleSave('GEMINI_API_KEY', geminiKey)}
                      disabled={savingKey !== null}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                    >
                      {savingKey === 'GEMINI_API_KEY' ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">save</span>
                      )}
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">info</span>
                    GopherBase uses <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">gemini-2.5-flash</code> for optimal speed and cost.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm opacity-50 relative overflow-hidden group">
           <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-500">person</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Account Settings</h2>
                <p className="text-sm text-slate-500">Manage your profile and authentication.</p>
              </div>
            </div>
          </div>
          <div className="p-12 flex flex-col items-center justify-center text-center">
             <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">construction</span>
             <p className="font-bold text-slate-400">Settings Coming Soon</p>
             <p className="text-sm text-slate-500">User profile management is currently under development.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
