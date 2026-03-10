import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import AlertModal from '../components/AlertModal';

type Bucket = {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
};

type StorageFile = {
  id: string;
  bucketId: string;
  name: string;
  size: number;
  type: string;
  path: string;
  createdAt: string;
};

export default function Storage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateBucketModalOpen, setIsCreateBucketModalOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket.name);
    } else {
      setFiles([]);
    }
  }, [selectedBucket]);

  const fetchBuckets = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/storage/buckets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBuckets(data);
        if (data.length > 0 && !selectedBucket) {
          setSelectedBucket(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch buckets', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (bucketName: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/storage/buckets/${bucketName}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBucket = async () => {
    if (!newBucketName.trim()) return;
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/storage/buckets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBucketName, isPublic: false })
      });
      if (res.ok) {
        const data = await res.json();
        setBuckets([...buckets, data]);
        setSelectedBucket(data);
        setIsCreateBucketModalOpen(false);
        setNewBucketName('');
        showAlert('Success', 'Bucket created successfully', 'success');
      } else {
        const err = await res.json();
        showAlert('Error', err.error || 'Failed to create bucket', 'error');
      }
    } catch (err) {
      showAlert('Error', 'Failed to create bucket', 'error');
    }
  };

  const handleDeleteBucket = async (name: string) => {
    if (!confirm(`Are you sure you want to delete bucket "${name}" and all its contents?`)) return;
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/storage/buckets/${name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBuckets(buckets.filter(b => b.name !== name));
        if (selectedBucket?.name === name) {
          setSelectedBucket(null);
        }
        showAlert('Success', 'Bucket deleted successfully', 'success');
      }
    } catch (err) {
      showAlert('Error', 'Failed to delete bucket', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBucket) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/storage/buckets/${selectedBucket.name}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        fetchFiles(selectedBucket.name);
        showAlert('Success', 'File uploaded successfully', 'success');
      } else {
        const err = await res.json();
        showAlert('Error', err.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showAlert('Error', 'Upload failed', 'error');
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!selectedBucket) return;
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/storage/buckets/${selectedBucket.name}/files/${fileName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFiles(files.filter(f => f.name !== fileName));
        showAlert('Success', 'File deleted successfully', 'success');
      }
    } catch (err) {
      showAlert('Error', 'Failed to delete file', 'error');
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    if (!selectedBucket) return;
    const token = localStorage.getItem('gopherbase_access_token');
    const url = `${API_BASE}/storage/buckets/${selectedBucket.name}/files/${fileName}`;
    
    // Create a temporary link to download
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleViewFile = async (fileName: string) => {
    if (!selectedBucket) return;
    const token = localStorage.getItem('gopherbase_access_token');
    const url = `${API_BASE}/storage/buckets/${selectedBucket.name}/files/${fileName}`;
    
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch file");
      const blob = await res.blob();
      const viewUrl = window.URL.createObjectURL(blob);
      window.open(viewUrl, '_blank');
    } catch (err) {
      showAlert('Error', 'Failed to view file', 'error');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full h-full custom-scrollbar">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">Storage</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base">Manage your buckets, folders, and cloud assets</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreateBucketModalOpen(true)}
            className="flex items-center gap-2 rounded-xl h-11 px-5 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Create Bucket</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedBucket}
            className="flex items-center gap-2 rounded-xl h-11 px-5 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">upload</span>
            <span>Upload</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Bucket Sidebar */}
        <div className="w-64 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Buckets</h3>
          {buckets.map(bucket => (
            <div 
              key={bucket.id}
              onClick={() => setSelectedBucket(bucket)}
              className={`flex items-center justify-between group px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                selectedBucket?.id === bucket.id 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="material-symbols-outlined text-lg">
                  {bucket.isPublic ? 'public' : 'lock'}
                </span>
                <span className="text-sm font-semibold truncate">{bucket.name}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBucket(bucket.name);
                }}
                className={`p-1 rounded-md hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100 ${selectedBucket?.id === bucket.id ? 'text-white' : 'text-slate-400'}`}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          ))}
          {buckets.length === 0 && !loading && (
            <div className="text-xs text-slate-500 italic p-2 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No buckets yet
            </div>
          )}
        </div>

        {/* Storage Browser Panel */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
          {/* Table Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-sm">storage</span>
                <span>{selectedBucket ? selectedBucket.name : 'No Bucket Selected'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => selectedBucket && fetchFiles(selectedBucket.name)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          {/* Content Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
              </div>
            ) : !selectedBucket ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-4">
                <span className="material-symbols-outlined text-6xl">inventory_2</span>
                <p className="font-medium">Select or create a bucket to view files</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-10 backdrop-blur-sm">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Size</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uploaded</th>
                    <th className="px-6 py-4 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {files.map(file => (
                    <tr key={file.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-primary">
                            {file.type.startsWith('image/') ? 'image' : 'description'}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {file.type.startsWith('image/') && (
                            <button 
                              onClick={() => handleViewFile(file.name)}
                              className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                              title="View Image"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleDownloadFile(file.name)}
                            className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                            title="Download"
                          >
                            <span className="material-symbols-outlined text-lg">download</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteFile(file.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {files.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                        No files in this bucket
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Bucket Modal */}
      <AnimatePresence>
        {isCreateBucketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_circle</span>
                Create New Bucket
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Bucket Name</label>
                  <input 
                    type="text"
                    value={newBucketName}
                    onChange={(e) => setNewBucketName(e.target.value)}
                    placeholder="my-awesome-bucket"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsCreateBucketModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateBucket}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
