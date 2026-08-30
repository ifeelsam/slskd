import './DownloadActions.css';
import {
  addQuickLocation,
  getQuickLocations,
  joinRelativePath,
  removeQuickLocation,
  sanitizeDownloadDestination,
} from '../../lib/downloadDestination';
import { list } from '../../lib/files';
import React, { useEffect, useState } from 'react';
import { Icon, Message, Modal } from 'semantic-ui-react';

const DownloadFolderModal = ({ onClose, onSelect, open, selectedPath }) => {
  const [directories, setDirectories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [segments, setSegments] = useState([]);
  const [quickLocations, setQuickLocations] = useState([]);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'saved'

  useEffect(() => {
    if (!open) {
      return;
    }

    const initial = sanitizeDownloadDestination(selectedPath);
    setSegments(initial ? initial.split('/') : []);
    setNewFolder('');
    setNewLocationName('');
    setError('');
    setQuickLocations(getQuickLocations());
  }, [open, selectedPath]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchDirectories = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await list({
          root: 'downloads',
          subdirectory: segments.join('/'),
        });
        setDirectories(result?.directories ?? []);
      } catch (fetchError) {
        setDirectories([]);
        setError(
          fetchError?.response?.data ??
            fetchError?.message ??
            'Failed to list folders',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDirectories();
  }, [open, segments]);

  const currentPath = segments.join('/');
  const canSelectCurrent = segments.length > 0;

  const selectPath = (path) => {
    onSelect(sanitizeDownloadDestination(path));
  };

  const addFolder = () => {
    const next = joinRelativePath(currentPath, newFolder);
    if (!next || next === currentPath) {
      return;
    }

    selectPath(next);
  };

  const handlePinCurrent = () => {
    const name =
      newLocationName.trim() || segments[segments.length - 1] || currentPath;
    const updated = addQuickLocation(name, currentPath);
    setQuickLocations(updated);
    setNewLocationName('');
  };

  const handleRemoveQuickLocation = (name) => {
    const updated = removeQuickLocation(name);
    setQuickLocations(updated);
  };

  const navigateTo = (path) => {
    const sanitized = sanitizeDownloadDestination(path);
    setSegments(sanitized ? sanitized.split('/') : []);
    setActiveTab('browse');
  };

  const isCurrentPinned = quickLocations.some(
    (loc) => loc.path === currentPath,
  );

  return (
    <Modal
      className="dfm-modal"
      onClose={onClose}
      open={open}
      size="small"
    >
      {/* ── Header ── */}
      <div className="dfm-header">
        <div className="dfm-header-title">
          <Icon name="folder open outline" />
          Download Folder
        </div>
        <button
          aria-label="Close"
          className="dfm-close-btn"
          onClick={onClose}
          type="button"
        >
          <Icon name="close" />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="dfm-tabs">
        <button
          className={`dfm-tab${activeTab === 'browse' ? ' dfm-tab--active' : ''}`}
          onClick={() => setActiveTab('browse')}
          type="button"
        >
          <Icon name="folder" />
          Browse
        </button>
        <button
          className={`dfm-tab${activeTab === 'saved' ? ' dfm-tab--active' : ''}`}
          onClick={() => setActiveTab('saved')}
          type="button"
        >
          <Icon name="star" />
          {`Saved (${quickLocations.length})`}
        </button>
      </div>

      <div className="dfm-body">
        {activeTab === 'browse' && (
          <>
            {/* ── Address Bar ── */}
            <div className="dfm-address-bar">
              <button
                className="dfm-address-home"
                onClick={() => setSegments([])}
                title="Go to downloads root"
                type="button"
              >
                <Icon name="home" />
              </button>
              <div className="dfm-breadcrumb">
                <button
                  className={`dfm-crumb${segments.length === 0 ? ' dfm-crumb--active' : ' dfm-crumb--link'}`}
                  onClick={() => setSegments([])}
                  title="downloads"
                  type="button"
                >
                  downloads
                </button>
                {segments.map((segment, index) => (
                  <React.Fragment key={segments.slice(0, index + 1).join('/')}>
                    <Icon
                      className="dfm-crumb-divider"
                      name="chevron right"
                    />
                    <button
                      className={`dfm-crumb${index === segments.length - 1 ? ' dfm-crumb--active' : ' dfm-crumb--link'}`}
                      onClick={() => setSegments(segments.slice(0, index + 1))}
                      title={segment}
                      type="button"
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              {/* Reset to default */}
              <button
                className="dfm-reset-btn"
                onClick={() => selectPath(undefined)}
                title="Reset to default download folder"
                type="button"
              >
                <Icon name="undo" />
                Default
              </button>
            </div>

            {/* ── Error ── */}
            {error ? (
              <Message
                content={
                  typeof error === 'string' ? error : 'Failed to list folders'
                }
                negative
                size="small"
              />
            ) : null}

            {/* ── Folder List ── */}
            <div className="dfm-list-wrapper">
              {loading ? (
                <div className="dfm-empty">
                  <Icon
                    loading
                    name="circle notch"
                  />{' '}
                  Loading folders…
                </div>
              ) : directories.length === 0 ? (
                <div className="dfm-empty">
                  <Icon name="folder outline" />
                  No subfolders
                </div>
              ) : (
                <ul className="dfm-list">
                  {directories.map((directory) => (
                    <li
                      className="dfm-list-item"
                      key={directory.name}
                    >
                      <button
                        className="dfm-list-item-btn"
                        onClick={() =>
                          setSegments([...segments, directory.name])
                        }
                        title={directory.name}
                        type="button"
                      >
                        <Icon
                          className="dfm-item-icon"
                          name="folder"
                        />
                        <span className="dfm-item-name">{directory.name}</span>
                        <Icon
                          className="dfm-item-chevron"
                          name="chevron right"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Current selection / Download Here bar ── */}
            <div className="dfm-selection-bar">
              <div className="dfm-selection-path">
                <Icon name="download" />
                <span
                  className="dfm-selection-label"
                  title={currentPath || 'Default (from settings)'}
                >
                  {currentPath || 'Default (from settings)'}
                </span>
              </div>
              <div className="dfm-selection-actions">
                {canSelectCurrent && (
                  <button
                    className={`dfm-pin-btn${isCurrentPinned ? ' dfm-pin-btn--active' : ''}`}
                    onClick={() => {
                      if (isCurrentPinned) {
                        const loc = quickLocations.find(
                          (l) => l.path === currentPath,
                        );

                        if (loc) {
                          handleRemoveQuickLocation(loc.name);
                        }
                      } else {
                        handlePinCurrent();
                      }
                    }}
                    title={
                      isCurrentPinned
                        ? 'Remove from saved locations'
                        : 'Save this location'
                    }
                    type="button"
                  >
                    <Icon name={isCurrentPinned ? 'star' : 'star outline'} />
                  </button>
                )}
                <button
                  className="dfm-download-here-btn"
                  disabled={!canSelectCurrent}
                  onClick={() => selectPath(currentPath)}
                  type="button"
                >
                  <Icon name="download" />
                  Download here
                </button>
              </div>
            </div>

            {/* ── New folder ── */}
            <div className="dfm-new-folder">
              <div className="dfm-new-folder-label">
                <Icon name="folder outline" />
                New folder
              </div>
              <div className="dfm-new-folder-row">
                <input
                  className="dfm-new-folder-input"
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addFolder();
                    }
                  }}
                  placeholder="Folder name (e.g. Movies/Action)"
                  type="text"
                  value={newFolder}
                />
                <button
                  className="dfm-new-folder-btn"
                  disabled={!sanitizeDownloadDestination(newFolder)}
                  onClick={addFolder}
                  type="button"
                >
                  Create &amp; use
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'saved' && (
          <div className="dfm-saved-panel">
            <p className="dfm-saved-help">
              Save frequently used folders as quick-access shortcuts. They
              appear as buttons next to the Download button.
            </p>
            {quickLocations.length === 0 ? (
              <div className="dfm-empty dfm-empty--saved">
                <Icon name="star outline" />
                No saved locations yet.
                <br />
                <small>Browse to a folder and click ☆ to save it.</small>
              </div>
            ) : (
              <ul className="dfm-saved-list">
                {quickLocations.map((loc) => (
                  <li
                    className="dfm-saved-item"
                    key={loc.name}
                  >
                    <Icon name="star" />
                    <div className="dfm-saved-item-info">
                      <span className="dfm-saved-item-name">{loc.name}</span>
                      <span className="dfm-saved-item-path">{loc.path}</span>
                    </div>
                    <div className="dfm-saved-item-actions">
                      <button
                        className="dfm-saved-use-btn"
                        onClick={() => navigateTo(loc.path)}
                        type="button"
                      >
                        <Icon name="folder open" />
                        Browse
                      </button>
                      <button
                        className="dfm-saved-use-btn dfm-saved-use-btn--primary"
                        onClick={() => selectPath(loc.path)}
                        type="button"
                      >
                        <Icon name="download" />
                        Use
                      </button>
                      <button
                        className="dfm-saved-remove-btn"
                        onClick={() => handleRemoveQuickLocation(loc.name)}
                        title="Remove"
                        type="button"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add current browser location */}
            <div className="dfm-saved-add">
              <div className="dfm-new-folder-label">
                <Icon name="plus" />
                Save current browsed folder
              </div>
              <div className="dfm-new-folder-row">
                <input
                  className="dfm-new-folder-input"
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePinCurrent();
                    }
                  }}
                  placeholder={`Name (default: "${segments[segments.length - 1] || 'downloads'}")`}
                  type="text"
                  value={newLocationName}
                />
                <button
                  className="dfm-new-folder-btn"
                  disabled={!canSelectCurrent}
                  onClick={handlePinCurrent}
                  title={
                    canSelectCurrent
                      ? `Save "${currentPath}"`
                      : 'Navigate to a folder first'
                  }
                  type="button"
                >
                  <Icon name="star" />
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DownloadFolderModal;
