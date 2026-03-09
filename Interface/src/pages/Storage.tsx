export default function Storage() {
  return (
    <div className="p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full h-full custom-scrollbar">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">Storage</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base">Manage your buckets, folders, and cloud assets</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl h-11 px-5 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Create Bucket</span>
          </button>
          <button className="flex items-center gap-2 rounded-xl h-11 px-5 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
            <span className="material-symbols-outlined text-lg">upload</span>
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Storage Browser Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Root</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <span className="material-symbols-outlined">grid_view</span>
            </button>
            <button className="p-2 text-primary bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined">list</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="w-full @container">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">Size</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Row 1 */}
              <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">public-assets</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Folder</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">--</td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Oct 12, 2023</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">user-uploads</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Folder</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">--</td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Oct 15, 2023</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">data_object</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">backup-db-01.sql</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary">SQL</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">1.2 GB</td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Nov 01, 2023</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
              {/* Row 4 */}
              <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-purple-500">image</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">logo-vector.svg</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">SVG</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">45 KB</td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Nov 03, 2023</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
              {/* Row 5 */}
              <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-400">description</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">config-prod.yaml</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">YAML</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">12 KB</td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">Dec 10, 2023</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Showing 5 of 24 items</span>
          <div className="flex gap-2">
            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-2">
          <span className="material-symbols-outlined text-primary mb-2">share</span>
          <h3 className="font-bold text-slate-900 dark:text-white">Public Access</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Set up CDN and public URLs for your assets.</p>
          <button className="mt-2 text-xs font-bold text-primary hover:underline self-start">Manage Settings</button>
        </div>
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-2">
          <span className="material-symbols-outlined text-primary mb-2">history</span>
          <h3 className="font-bold text-slate-900 dark:text-white">Object Versioning</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Keep track of changes and restore previous versions.</p>
          <button className="mt-2 text-xs font-bold text-primary hover:underline self-start">Configure</button>
        </div>
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-2">
          <span className="material-symbols-outlined text-primary mb-2">security</span>
          <h3 className="font-bold text-slate-900 dark:text-white">Lifecycle Rules</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Automatically move or delete files after time.</p>
          <button className="mt-2 text-xs font-bold text-primary hover:underline self-start">Set Policies</button>
        </div>
      </div>
    </div>
  );
}
