import { useEffect, useState } from 'react';
import { getSchoolResources, uploadResource, downloadResourceForOffline, deleteResource, uploadResourceOffline, getPendingUploads } from '../services/resources';
import { getOfflineItemsByPrefix } from '../utils/offlineStorage';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { isAdminUser } from '../utils/auth';
import FileSharingComponent from '../components/FileSharingComponent';

interface ResourcesPageProps {
  user: any;
}

const ResourcesPage = ({ user }: ResourcesPageProps) => {
  const [resources, setResources] = useState<any[]>([]);
  const [offlineResources, setOfflineResources] = useState<any[]>([]);
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const schoolResources = await getSchoolResources(user.schoolId);
      setResources(schoolResources);

      const offlineItems = await getOfflineItemsByPrefix('resource_');
      setOfflineResources(offlineItems
        .map((item) => item.value)
        .filter((resource: any) => resource.schoolId === user.schoolId)
      );

      if (isAdminUser()) {
        const pending = await getPendingUploads(user.schoolId);
        setPendingUploads(pending);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      setFeedback({ type: 'error', message: 'Unable to load resources' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();

    const handleSyncComplete = () => {
      loadResources();
    };

    window.addEventListener('syncademy:sync-complete', handleSyncComplete);
    return () => window.removeEventListener('syncademy:sync-complete', handleSyncComplete);
  }, [user.schoolId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file type (only PDF allowed)
      if (file.type !== 'application/pdf') {
        setFeedback({ type: 'error', message: 'Only PDF files are allowed' });
        setSelectedFile(null);
        return;
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'File size must be less than 10MB' });
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setFeedback({ type: '', message: '' });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!selectedFile) {
      setFeedback({ type: 'error', message: 'Please select a PDF file' });
      return;
    }

    if (!isAdminUser()) {
      setFeedback({ type: 'error', message: 'Only admins can upload resources' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      if (isOnline) {
        await uploadResource(selectedFile, user.schoolId, user.uid, description, (progress) => {
          setUploadProgress(progress);
        });
        setFeedback({ type: 'success', message: 'PDF uploaded successfully!' });
      } else {
        await uploadResourceOffline(selectedFile, user.schoolId, user.uid, description);
        setFeedback({ type: 'success', message: 'PDF saved offline. Will upload when online.' });
      }

      setSelectedFile(null);
      setDescription('');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload resources and pending uploads
      await loadResources();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Upload failed' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleViewPDF = (resource: any) => {
    if (resource.url) {
      window.open(resource.url, '_blank');
    } else if (resource.base64Data) {
      // For offline resources, create a blob URL
      const blob = new Blob([Uint8Array.from(atob(resource.base64Data.split(',')[1]), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const handleDownloadForOffline = async (resource: any) => {
    try {
      setLoading(true);
      await downloadResourceForOffline(resource.id, resource);

      const offlineItems = await getOfflineItemsByPrefix('resource_');
      const updated = offlineItems
        .map((item) => item.value)
        .filter((res: any) => res.schoolId === user.schoolId);
      setOfflineResources(updated);

      setFeedback({ type: 'success', message: `${resource.name} saved for offline access` });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to download resource' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resourceId: string, url: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteResource(resourceId, url);

      const schoolResources = await getSchoolResources(user.schoolId);
      setResources(schoolResources);

      setFeedback({ type: 'success', message: 'Resource deleted successfully' });
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete resource' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">📚 Resources</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Education materials & PDFs</h2>
          </div>
          <div className="flex gap-4">
            <div className="rounded-3xl bg-slate-950/80 px-6 py-4 text-slate-200 shadow-soft">
              <p className="text-sm text-slate-400">Available</p>
              <p className="mt-2 text-2xl font-semibold text-white">{resources.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 px-6 py-4 text-slate-200 shadow-soft">
              <p className="text-sm text-slate-400">Offline</p>
              <p className="mt-2 text-2xl font-semibold text-indigo-400">{offlineResources.length}</p>
            </div>
            <div
              className={`rounded-3xl px-6 py-4 shadow-soft ${
                isOnline
                  ? 'bg-green-950/40 border border-green-700'
                  : 'bg-red-950/40 border border-red-700'
              }`}
            >
              <p className="text-sm text-slate-400">Status</p>
              <p className={`mt-2 text-2xl font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isAdminUser() && (
        <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">📤 Upload PDF Resource</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select PDF File (Max 10MB)</label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-slate-400 mt-2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Chapter 5 - Mathematics"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>

            {!isOnline && (
              <p className="text-sm text-yellow-300">⚠️ PDF will be saved locally and uploaded when online.</p>
            )}

            {feedback.message && (
              <div
                className={`p-4 rounded-2xl text-sm ${
                  feedback.type === 'success'
                    ? 'bg-green-900/20 text-green-200 border border-green-700'
                    : 'bg-red-900/20 text-red-200 border border-red-700'
                }`}
              >
                {feedback.message}
              </div>
            )}
          </form>
        </div>
      )}

      {isAdminUser() && pendingUploads.length > 0 && (
        <div className="rounded-[24px] border border-yellow-700 bg-yellow-950/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">⏳ Pending Uploads</h3>
          <p className="text-yellow-300 text-sm mb-4">These PDFs will be uploaded automatically when you go online.</p>
          <div className="space-y-3">
            {pendingUploads.map((upload) => (
              <div key={upload.offlineKey} className="p-4 rounded-lg border border-yellow-700 bg-yellow-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">📄 {upload.name}</p>
                    <p className="text-yellow-300 text-sm mt-1">
                      Size: {(upload.fileSize / 1024 / 1024).toFixed(2)} MB • 
                      Added: {new Date(upload.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-1 rounded">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">📖 Available Resources</h3>
        {loading && <p className="text-slate-400">Loading...</p>}
        {resources.length === 0 && !loading ? (
          <p className="text-slate-400">No resources available yet</p>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <div key={resource.id} className="p-4 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white">📄 {resource.name}</p>
                    {resource.description && (
                      <p className="text-slate-400 text-sm mt-1">{resource.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>Size: {(resource.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      <span>Uploaded: {new Date(resource.uploadedAt).toLocaleDateString()}</span>
                      {resource.synced === false && (
                        <span className="text-yellow-400">⚠️ Offline</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewPDF(resource)}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleDownloadForOffline(resource)}
                      disabled={loading}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-60"
                    >
                      💾 Save Offline
                    </button>
                    {isAdminUser() && (
                      <button
                        onClick={() => handleDelete(resource.id, resource.url)}
                        disabled={loading}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-60"
                      >
                        🗑️ Delete
                      </button>
                    )}
                    <FileSharingComponent
                      fileName={resource.name}
                      fileType="resource"
                      fileData={resource}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {offlineResources.length > 0 && (
        <div className="rounded-[24px] border border-green-700 bg-green-950/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">💾 Offline Resources</h3>
          <div className="space-y-3">
            {offlineResources.map((resource) => (
              <div key={resource.id} className="p-4 rounded-lg border border-green-700 bg-green-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">📄 {resource.name}</p>
                    <p className="text-green-300 text-sm mt-1">
                      Size: {(resource.fileSize / 1024 / 1024).toFixed(2)} MB • 
                      Available offline
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewPDF(resource)}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
                    >
                      👁️ View
                    </button>
                    <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">Offline</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ResourcesPage;
