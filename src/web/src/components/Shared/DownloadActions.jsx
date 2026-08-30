import './DownloadActions.css';
import {
  getDownloadDestination,
  setDownloadDestination,
} from '../../lib/downloadDestination';
import DownloadFolderModal from './DownloadFolderModal';
import React, { useState } from 'react';
import { Button, Icon, Label } from 'semantic-ui-react';

const DownloadActions = ({
  disabled,
  downloadError,
  downloadRequest,
  fileCount,
  onDownload,
  totalSize,
}) => {
  const [destination, setDestination] = useState(getDownloadDestination);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelect = (path) => {
    setDestination(setDownloadDestination(path));
    setPickerOpen(false);
  };

  return (
    <span className="download-actions">
      <Button
        color="green"
        content="Download"
        disabled={disabled || downloadRequest === 'inProgress'}
        icon="download"
        label={{
          as: 'a',
          basic: false,
          content: `${fileCount} file${fileCount === 1 ? '' : 's'}, ${totalSize}`,
        }}
        labelPosition="right"
        onClick={() => onDownload(destination)}
      />
      <Button
        className="download-folder-button"
        disabled={disabled || downloadRequest === 'inProgress'}
        icon="folder outline"
        onClick={() => setPickerOpen(true)}
        title={destination || 'Default download folder'}
      >
        {destination || 'Default folder'}
      </Button>
      {downloadRequest === 'inProgress' && (
        <Icon
          loading
          name="circle notch"
          size="large"
        />
      )}
      {downloadRequest === 'complete' && (
        <Icon
          color="green"
          name="checkmark"
          size="large"
        />
      )}
      {downloadRequest === 'error' && (
        <span>
          <Icon
            color="red"
            name="x"
            size="large"
          />
          <Label>
            {downloadError?.data
              ? `${downloadError.data} (HTTP ${downloadError.status} ${downloadError.statusText})`
              : 'Download failed'}
          </Label>
        </span>
      )}
      <DownloadFolderModal
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        open={pickerOpen}
        selectedPath={destination}
      />
    </span>
  );
};

export default DownloadActions;
