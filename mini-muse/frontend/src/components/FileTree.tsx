import { useMemo } from 'react';

interface FileTreeProps {
  files: string[];
  selectedFile: string;
  onSelect: (file: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files.sort()) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = { name, path, children: [], isFile };
        current.push(node);
      }
      current = node.children;
    }
  }

  return root;
}

function TreeItem({ node, selectedFile, onSelect, depth }: {
  node: TreeNode;
  selectedFile: string;
  onSelect: (file: string) => void;
  depth: number;
}) {
  const isSelected = node.path === selectedFile;

  return (
    <div>
      <button
        onClick={() => node.isFile && onSelect(node.path)}
        className={`w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-1.5 ${
          isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
        } ${!node.isFile ? 'font-medium' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        <span className="text-xs">{node.isFile ? '📄' : '📁'}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ files, selectedFile, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          selectedFile={selectedFile}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}
