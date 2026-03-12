import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFiles, getFileContent, getDownloadUrl, startPreview, getPreviewStatus, PreviewStatus } from '../services/api';
import FileTree from '../components/FileTree';
import CodePreview from '../components/CodePreview';
import ChatPanel from '../components/ChatPanel';

type Tab = 'code' | 'preview';

export default function ResultPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('code');
  const [preview, setPreview] = useState<PreviewStatus>({ status: 'none' });
  const [previewStarting, setPreviewStarting] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!threadId) return;
    getFiles(threadId).then((f) => {
      setFiles(f);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !selectedFile) {
      setContent('');
      return;
    }
    getFileContent(threadId, selectedFile).then(setContent).catch(() => setContent('// Failed to load file'));
  }, [threadId, selectedFile]);

  // Poll preview status when installing/starting
  useEffect(() => {
    if (preview.status === 'installing' || preview.status === 'starting') {
      pollRef.current = setInterval(async () => {
        if (!threadId) return;
        try {
          const status = await getPreviewStatus(threadId);
          setPreview(status);
          if (status.status === 'running' || status.status === 'failed') {
            setPreviewStarting(false);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { /* ignore */ }
      }, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [preview.status, threadId]);

  const handleStartPreview = useCallback(async () => {
    if (!threadId) return;
    setPreviewStarting(true);
    try {
      const status = await startPreview(threadId);
      setPreview(status);
      setTab('preview');
    } catch {
      setPreviewStarting(false);
    }
  }, [threadId]);

  const handleFilesUpdated = useCallback((newFiles: string[]) => {
    setFiles(newFiles);
  }, []);

  const handleFileContentUpdated = useCallback((file: string, newContent: string) => {
    if (file === selectedFile) {
      setContent(newContent);
    }
  }, [selectedFile]);

  // Determine preview URL - use the same hostname as the current page
  const previewUrl = preview.port
    ? `http://${window.location.hostname}:${preview.port}`
    : '';

  if (loading) {
    return <div className="text-center text-gray-500 py-12">Loading...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* Main content area */}
      <div className={`flex flex-col min-w-0 ${chatOpen ? 'flex-1' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Generated Project</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                chatOpen
                  ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {chatOpen ? 'Hide Chat' : 'Modify'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              New Project
            </button>
            <a
              href={getDownloadUrl(threadId!)}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
            >
              Download ZIP
            </a>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setTab('code')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'code'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => {
              setTab('preview');
              if (preview.status === 'none') handleStartPreview();
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'preview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
          {preview.status === 'installing' || preview.status === 'starting' ? (
            <span className="ml-2 text-xs text-amber-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {preview.status === 'installing' ? 'Installing dependencies...' : 'Starting dev server...'}
            </span>
          ) : null}
        </div>

        {/* Code panel */}
        {tab === 'code' && (
          <div className="grid grid-cols-4 gap-4 flex-1 min-h-0">
            <div className="col-span-1 bg-white rounded-lg border border-gray-200 overflow-auto">
              <div className="p-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Files ({files.length})</span>
              </div>
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
              />
            </div>

            <div className="col-span-3 bg-white rounded-lg border border-gray-200 overflow-auto">
              {selectedFile ? (
                <>
                  <div className="p-3 border-b border-gray-200">
                    <span className="text-sm font-mono text-gray-600">{selectedFile}</span>
                  </div>
                  <CodePreview content={content} fileName={selectedFile} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Select a file to preview
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview panel */}
        {tab === 'preview' && (
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {preview.status === 'running' && previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="App Preview"
              />
            ) : preview.status === 'failed' ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-red-500">Preview failed: {preview.error}</p>
                <button
                  onClick={handleStartPreview}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Retry
                </button>
              </div>
            ) : preview.status === 'none' ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-gray-500">Start a local dev server to preview the generated app</p>
                <button
                  onClick={handleStartPreview}
                  disabled={previewStarting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {previewStarting ? 'Starting...' : 'Start Preview'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-gray-500">
                  {preview.status === 'installing' ? 'Installing dependencies...' : 'Starting dev server...'}
                </p>
                <p className="text-xs text-gray-400">This may take a minute</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat panel */}
      {chatOpen && threadId && (
        <div className="w-[380px] flex-shrink-0">
          <ChatPanel
            threadId={threadId}
            onFilesUpdated={handleFilesUpdated}
            onFileContentUpdated={handleFileContentUpdated}
            selectedFile={selectedFile}
          />
        </div>
      )}
    </div>
  );
}
