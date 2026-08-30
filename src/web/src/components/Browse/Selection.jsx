import { joinRelativePath } from '../../lib/downloadDestination';
import * as transfers from '../../lib/transfers';
import { formatBytes } from '../../lib/util';
import DownloadActions from '../Shared/DownloadActions';
import FileBrowser from './FileBrowser';
import React, { Component } from 'react';
import { toast } from 'react-toastify';
import { Card } from 'semantic-ui-react';

// because the entire browse response is stored in indexeddb, it is possible for us
// to display more files than can be saved in the (much faster) local storage state
// limit the number of selected files to 5k to avoid overrunning this limit
// 5k files is also a LOT to enqueue at once
const MAX_SELECTED_FILES = 5_000;

const initialState = {
  downloadError: '',
  downloadRequest: undefined,
  files: [],
};

const getAllFilesFromNode = (node, separator) => {
  const direct = (node.files || []).map((f) => ({
    ...f,
    filename: `${node.name}${separator}${f.filename}`,
  }));
  return [
    ...direct,
    ...(node.children || []).flatMap((child) =>
      getAllFilesFromNode(child, separator),
    ),
  ];
};

class Selection extends Component {
  constructor(props) {
    super(props);
    const selectedFilenames = new Set(props.defaultSelectedFiles || []);
    this.state = {
      ...initialState,
      expandedDirectory: props.defaultSubdirectory ?? null,
      files: getAllFilesFromNode(props.node, props.separator).map((f) => ({
        selected: selectedFilenames.has(f.filename),
        ...f,
      })),
    };
  }

  componentDidUpdate(previousProps) {
    if (this.props.node?.name !== previousProps.node?.name) {
      this.setState({
        ...initialState,
        expandedDirectory: this.props.node?.children?.[0]?.name ?? null,
        files: getAllFilesFromNode(this.props.node, this.props.separator).map(
          (f) => ({ selected: false, ...f }),
        ),
      });
    }
  }

  handleSelectionChange = (selectedFilenames) => {
    if (selectedFilenames.length > MAX_SELECTED_FILES) {
      toast.error(
        `Maximum number of selected files is limited to ${MAX_SELECTED_FILES.toLocaleString()}. Narrow your selection.`,
      );
      return;
    }

    const selectedSet = new Set(selectedFilenames);
    this.setState(
      (prevState) => ({
        downloadError: '',
        downloadRequest: undefined,
        files: prevState.files.map((f) => ({
          ...f,
          selected: selectedSet.has(f.filename),
        })),
      }),
      () =>
        this.props.onStateChange?.({
          files: selectedFilenames,
          subdirectory: this.state.expandedDirectory,
        }),
    );
  };

  handleExpandedDirectoryChange = (name) => {
    this.setState({ expandedDirectory: name }, () =>
      this.props.onStateChange?.({
        files: this.state.files
          .filter((f) => f.selected)
          .map((f) => f.filename),
        subdirectory: this.state.expandedDirectory,
      }),
    );
  };

  handleDownload = (selectedDestination) => {
    const { name, separator, username } = this.props;
    const selectedFiles = this.state.files.filter((f) => f.selected);
    const parent = name.split(separator).slice(0, -1).join(separator);
    const prefix = name + separator;

    this.setState({ downloadRequest: 'inProgress' }, async () => {
      try {
        const groups = new Map();
        for (const file of selectedFiles) {
          const relative = file.filename.startsWith(prefix)
            ? file.filename.slice(prefix.length)
            : file.filename;
          const parts = relative.split(separator).filter(Boolean);
          const group = parts.length > 1 ? parts[0] : '';
          if (!groups.has(group)) {
            groups.set(group, []);
          }

          groups.get(group).push(file);
        }

        const rootFiles = groups.get('') || [];
        if (rootFiles.length > 0) {
          const files = rootFiles.map(({ filename, size }) => ({
            filename,
            size,
          }));

          if (selectedDestination) {
            await transfers.enqueueBatch({
              files,
              options: { destination: selectedDestination },
              username,
            });
          } else {
            await transfers.download({ files, username });
          }
        }

        for (const [dirName, dirFiles] of groups) {
          if (dirName === '') {
            continue;
          }

          const remoteDestination = (prefix + dirName)
            .slice(parent.length > 0 ? parent.length + 1 : 0)
            .split(separator)
            .join('/');
          const destination = selectedDestination
            ? joinRelativePath(selectedDestination, remoteDestination)
            : remoteDestination;
          await transfers.enqueueBatch({
            files: dirFiles.map(({ filename, size }) => ({ filename, size })),
            options: { destination },
            username,
          });
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

  render() {
    const { directorySuffix, locked, node, onClose, separator } = this.props;
    const { downloadError, downloadRequest, expandedDirectory, files } =
      this.state;

    const selectedFiles = files.filter((f) => f.selected);
    const totalSize = formatBytes(
      selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0),
    );

    return (
      <Card
        className="result-card"
        raised
      >
        <Card.Content>
          <div className="browse-selection-content">
            <FileBrowser
              directorySuffix={directorySuffix}
              disabled={downloadRequest === 'inProgress'}
              expandedDirectory={expandedDirectory}
              files={files}
              locked={locked}
              onClose={onClose}
              onExpandedDirectoryChange={this.handleExpandedDirectoryChange}
              onSelectionChange={this.handleSelectionChange}
              rootDirectory={node}
              separator={separator}
            />
          </div>
        </Card.Content>
        {selectedFiles.length > 0 && (
          <Card.Content extra>
            <DownloadActions
              downloadError={downloadError}
              downloadRequest={downloadRequest}
              fileCount={selectedFiles.length}
              onDownload={this.handleDownload}
              totalSize={totalSize}
            />
          </Card.Content>
        )}
      </Card>
    );
  }
}

export default Selection;
