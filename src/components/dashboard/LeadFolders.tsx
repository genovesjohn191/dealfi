import React, { useState } from 'react';
import { Folder, Plus, X, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { LeadFolder } from '../../types';

interface LeadFoldersProps {
  folders: LeadFolder[];
  selectedFolder: LeadFolder | null;
  onSelectFolder: (folder: LeadFolder | null) => void;
  onCreateFolder: (name: string, color: string) => void;
  onUpdateFolder: (folder: LeadFolder) => void;
  onDeleteFolder: (folderId: string) => void;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' },
];

export default function LeadFolders({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder
}: LeadFoldersProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<LeadFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].value);
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), selectedColor);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0].value);
      setShowNewFolder(false);
    }
  };

  const handleUpdateFolder = () => {
    if (editingFolder && newFolderName.trim()) {
      onUpdateFolder({
        ...editingFolder,
        name: newFolderName.trim(),
        color: selectedColor
      });
      setEditingFolder(null);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0].value);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Folders</h2>
        <button
          onClick={() => setShowNewFolder(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            !selectedFolder
              ? 'bg-ocean-700 text-white'
              : 'bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50'
          }`}
        >
          <Folder className="w-4 h-4" />
          All Leads
        </button>

        {folders.map((folder) => (
          <div key={folder.id} className="relative group">
            <button
              onClick={() => onSelectFolder(folder)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                selectedFolder?.id === folder.id
                  ? 'bg-ocean-700 text-white'
                  : 'bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${folder.color}`} />
              {folder.name}
            </button>

            <button
              onClick={() => setShowFolderMenu(folder.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition"
            >
              <MoreVertical className="w-4 h-4 text-ocean-400" />
            </button>

            {showFolderMenu === folder.id && (
              <div className="absolute right-0 top-full mt-1 bg-ocean-800 rounded-lg shadow-lg py-1 z-10">
                <button
                  onClick={() => {
                    setEditingFolder(folder);
                    setNewFolderName(folder.name);
                    setSelectedColor(folder.color);
                    setShowFolderMenu(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-ocean-300 hover:bg-ocean-700/50 w-full"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDeleteFolder(folder.id);
                    setShowFolderMenu(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-ocean-700/50 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New/Edit Folder Modal */}
      {(showNewFolder || editingFolder) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-ocean-800 rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingFolder ? 'Edit Folder' : 'New Folder'}
              </h3>
              <button
                onClick={() => {
                  setShowNewFolder(false);
                  setEditingFolder(null);
                }}
                className="text-ocean-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input w-full"
                  placeholder="Enter folder name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-8 h-8 rounded-full ${color.value} ${
                        selectedColor === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-ocean-800'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="btn-primary w-full"
              >
                {editingFolder ? 'Update Folder' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}