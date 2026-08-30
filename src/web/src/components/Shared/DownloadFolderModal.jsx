import './DownloadActions.css';
import {
  joinRelativePath,
  sanitizeDownloadDestination,
} from '../../lib/downloadDestination';
import { list } from '../../lib/files';
import React, { useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Header,
  Icon,
  Input,
  List,
  Message,
  Modal,
} from 'semantic-ui-react';

const DownloadFolderModal = ({ onClose, onSelect, open, selectedPath }) => {
  const [directories, setDirectories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initial = sanitizeDownloadDestination(selectedPath);
    setSegments(initial ? initial.split('/') : []);
    setNewFolder('');
    setError('');
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

  return (
    <Modal
      onClose={onClose}
      open={open}
      size="small"
    >
      <Header>
        <Icon name="folder outline" />
        <Header.Content>Download folder</Header.Content>
      </Header>
      <Modal.Content>
        <p className="download-folder-modal-help">
          Choose a folder inside the configured downloads directory. The folder
          is created automatically if it does not exist yet. Leave this as
          default to use the destination from settings.
        </p>
        <div className="download-folder-modal-path">
          <Breadcrumb>
            <Breadcrumb.Section
              active={segments.length === 0}
              link={segments.length > 0}
              onClick={() => setSegments([])}
            >
              downloads
            </Breadcrumb.Section>
            {segments.map((segment, index) => (
              <React.Fragment key={segments.slice(0, index + 1).join('/')}>
                <Breadcrumb.Divider icon="right angle" />
                <Breadcrumb.Section
                  active={index === segments.length - 1}
                  link={index < segments.length - 1}
                  onClick={() => setSegments(segments.slice(0, index + 1))}
                >
                  {segment}
                </Breadcrumb.Section>
              </React.Fragment>
            ))}
          </Breadcrumb>
        </div>
        {error ? (
          <Message
            content={
              typeof error === 'string' ? error : 'Failed to list folders'
            }
            negative
            size="small"
          />
        ) : null}
        <div className="download-folder-modal-list">
          {loading ? (
            <div className="download-folder-modal-empty">
              <Icon
                loading
                name="circle notch"
              />{' '}
              Loading folders…
            </div>
          ) : directories.length === 0 ? (
            <div className="download-folder-modal-empty">No subfolders</div>
          ) : (
            <List
              divided
              relaxed
              selection
            >
              {directories.map((directory) => (
                <List.Item
                  key={directory.name}
                  onClick={() => setSegments([...segments, directory.name])}
                >
                  <Icon name="folder" />
                  <List.Content>{directory.name}</List.Content>
                </List.Item>
              ))}
            </List>
          )}
        </div>
        <Input
          action={{
            content: 'Use',
            disabled: !sanitizeDownloadDestination(newFolder),
            onClick: addFolder,
          }}
          fluid
          onChange={(_event, data) => setNewFolder(data.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addFolder();
            }
          }}
          placeholder="New folder name"
          value={newFolder}
        />
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => selectPath(undefined)}>Use default</Button>
        <Button
          disabled={!canSelectCurrent}
          onClick={() => selectPath(currentPath)}
          primary
        >
          Download here
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default DownloadFolderModal;
