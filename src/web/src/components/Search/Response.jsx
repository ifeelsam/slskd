import * as transfers from '../../lib/transfers';
import { getDirectoryContents } from '../../lib/users';
import { formatBytes, getDirectoryName } from '../../lib/util';
import DownloadActions from '../Shared/DownloadActions';
import DownloadFolderModal from '../Shared/DownloadFolderModal';
import FileList from '../Shared/FileList';
import React, { Component } from 'react';
import { toast } from 'react-toastify';
import { Card, Icon } from 'semantic-ui-react';

const buildTree = (response) => {
  let { files = [] } = response;
  const { lockedFiles = [] } = response;
  files = files.concat(lockedFiles.map((file) => ({ ...file, locked: true })));

  return files.reduce((dict, file) => {
    const directory = getDirectoryName(file.filename);
    const selectable = { selected: false, ...file };
    dict[directory] =
      dict[directory] === undefined
        ? [selectable]
        : dict[directory].concat(selectable);
    return dict;
  }, {});
};

class Response extends Component {
  constructor(props) {
    super(props);

    this.state = {
      contextPending: null, // { files: [] } waiting for folder picker
      contextPickerOpen: false,
      downloadError: '',
      downloadRequest: undefined,
      fetchingDirectoryContents: false,
      isFolded: this.props.isInitiallyFolded,
      tree: buildTree(this.props.response),
    };
  }

  componentDidUpdate(previousProps) {
    if (
      JSON.stringify(this.props.response) !==
      JSON.stringify(previousProps.response)
    ) {
      this.setState({ tree: buildTree(this.props.response) });
    }

    if (this.props.isInitiallyFolded !== previousProps.isInitiallyFolded) {
      this.setState({ isFolded: this.props.isInitiallyFolded });
    }
  }

  handleFileSelectionChange = (file, state) => {
    file.selected = state;
    this.setState((previousState) => ({
      downloadError: '',
      downloadRequest: undefined,
      tree: previousState.tree,
    }));
  };

  download = (username, files, destination) => {
    this.setState({ downloadRequest: 'inProgress' }, async () => {
      try {
        const requests = (files || []).map(({ filename, size }) => ({
          filename,
          size,
        }));

        if (destination) {
          await transfers.enqueueBatch({
            files: requests,
            options: { destination },
            username,
          });
        } else {
          await transfers.download({ files: requests, username });
        }

        this.setState({ downloadRequest: 'complete' });
      } catch (error) {
        this.setState({
          downloadError: error.response,
          downloadRequest: 'error',
        });
      }
    });
  };

  getFullDirectory = async (username, directory) => {
    this.setState({ fetchingDirectoryContents: true });

    try {
      const oldTree = { ...this.state.tree };
      const oldFiles = oldTree[directory];

      try {
        // some clients might send more than one directory in the response,
        // if the requested directory contains subdirectories. the root directory
        // is always first, and for now we'll only display the contents of that.
        const allDirectories = await getDirectoryContents({
          directory,
          username,
        });
        const theRootDirectory = allDirectories?.[0];

        // some clients might send an empty response for some reason
        if (!theRootDirectory) {
          throw new Error('No directories were included in the response');
        }

        const { files, name } = theRootDirectory;

        // the api returns file names only, so we need to prepend the directory
        // to make it look like a search result.  we also need to preserve
        // any file selections, so check the old files and assign accordingly
        const fixedFiles = files.map((file) => ({
          ...file,
          filename: `${directory}\\${file.filename}`,
          selected:
            oldFiles.find(
              (f) => f.filename === `${directory}\\${file.filename}`,
            )?.selected ?? false,
        }));

        oldTree[name] = fixedFiles;
        this.setState({ tree: { ...oldTree } });
      } catch (error) {
        throw new Error(`Failed to process directory response: ${error}`, {
          cause: error,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data ?? error?.message ?? error);
    } finally {
      this.setState({ fetchingDirectoryContents: false });
    }
  };

  handleToggleFolded = () => {
    this.setState((previousState) => ({ isFolded: !previousState.isFolded }));
  };

  /**
   * Open the folder-picker wizard for a right-click context action.
   * `files` is the array of files to download once the user picks a destination.
   */
  openContextPicker = (files) => {
    if (!files || files.length === 0) return;
    this.setState({ contextPending: { files }, contextPickerOpen: true });
  };

  handleContextPickerSelect = (destination) => {
    const { contextPending } = this.state;
    this.setState({ contextPickerOpen: false, contextPending: null });
    if (contextPending?.files?.length > 0) {
      this.download(
        this.props.response.username,
        contextPending.files,
        destination,
      );
    }
  };

  handleContextPickerClose = () => {
    this.setState({ contextPickerOpen: false, contextPending: null });
  };

  render() {
    const { response } = this.props;
    const free = response.hasFreeUploadSlot;

    const {
      contextPickerOpen,
      downloadError,
      downloadRequest,
      fetchingDirectoryContents,
      isFolded,
      tree,
    } = this.state;

    const selectedFiles = Object.keys(tree)
      .reduce((list, dict) => list.concat(tree[dict]), [])
      .filter((f) => f.selected);

    const selectedSize = formatBytes(
      selectedFiles.reduce((total, f) => total + f.size, 0),
    );

    return (
      <Card
        className="result-card"
        raised
      >
        <Card.Content>
          <Card.Header>
            <Icon
              link
              name={isFolded ? 'chevron right' : 'chevron down'}
              onClick={this.handleToggleFolded}
            />
            <Icon
              color={free ? 'green' : 'yellow'}
              name="circle"
            />
            {response.username}
            <Icon
              className="close-button"
              color="red"
              link
              name="close"
              onClick={() => this.props.onHide()}
            />
          </Card.Header>
          <Card.Meta className="result-meta">
            <span>
              Upload Speed: {formatBytes(response.uploadSpeed)}/s, Free Upload
              Slot: {free ? 'YES' : 'NO'}, Queue Length: {response.queueLength}
            </span>
          </Card.Meta>
          {((!isFolded && Object.keys(tree)) || []).map((directory) => (
            <FileList
              directoryName={directory}
              disabled={downloadRequest === 'inProgress'}
              files={tree[directory]}
              footer={
                <button
                  disabled={fetchingDirectoryContents}
                  onClick={() =>
                    this.getFullDirectory(response.username, directory)
                  }
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  type="button"
                >
                  <Icon
                    loading={fetchingDirectoryContents}
                    name={fetchingDirectoryContents ? 'circle notch' : 'search'}
                  />
                  Search for Additional Files in This Directory
                </button>
              }
              key={directory}
              locked={tree[directory].find((file) => file.locked)}
              onDownloadAs={(file) => this.openContextPicker([file])}
              onDownloadFile={(file) => this.openContextPicker([file])}
              onDownloadFolder={(dir) => {
                const allFiles = tree[dir] ?? [];
                this.openContextPicker(allFiles);
              }}
              onSelectionChange={this.handleFileSelectionChange}
            />
          ))}
        </Card.Content>
        {selectedFiles.length > 0 && (
          <Card.Content extra>
            <DownloadActions
              disabled={this.props.disabled}
              downloadError={downloadError}
              downloadRequest={downloadRequest}
              fileCount={selectedFiles.length}
              onDownload={(destination) =>
                this.download(response.username, selectedFiles, destination)
              }
              totalSize={selectedSize}
            />
          </Card.Content>
        )}
        {/* Folder picker wizard for right-click context menu actions */}
        <DownloadFolderModal
          onClose={this.handleContextPickerClose}
          onSelect={this.handleContextPickerSelect}
          open={contextPickerOpen}
          selectedPath={undefined}
        />
      </Card>
    );
  }
}

export default Response;
