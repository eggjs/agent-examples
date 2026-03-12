interface CodePreviewProps {
  content: string;
  fileName: string;
}

export default function CodePreview({ content, fileName }: CodePreviewProps) {
  const lines = content.split('\n');
  const ext = fileName.split('.').pop() || '';

  // Simple language label
  const langMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TSX',
    js: 'JavaScript',
    jsx: 'JSX',
    css: 'CSS',
    json: 'JSON',
    html: 'HTML',
    md: 'Markdown',
  };

  const lang = langMap[ext] || ext.toUpperCase();

  return (
    <div className="relative">
      <div className="absolute top-2 right-3 text-xs text-gray-400">{lang}</div>
      <pre className="p-4 overflow-auto text-sm font-mono leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="inline-block w-10 text-right text-gray-300 select-none mr-4 flex-shrink-0">
                {i + 1}
              </span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
