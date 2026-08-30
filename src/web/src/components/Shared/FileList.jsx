import {
  formatAttributes,
  formatBytes,
  formatSeconds,
  getFileName,
} from '../../lib/util';
import {
  ContextMenuDivider,
  ContextMenuItem,
  useContextMenu,
} from './ContextMenu';
import React, { useState } from 'react';
import { Checkbox, Header, Icon, List, Table } from 'semantic-ui-react';

const FileList = ({
  directoryName,
  disabled,
  files,
  footer,
  locked,
  onClose,
  onDownloadAs,
  onDownloadFile,
  onDownloadFolder,
  onSelectionChange,
}) => {
  const [folded, setFolded] = useState(false);
  const { bindContextMenu, contextMenu } = useContextMenu();

  return (
    <div style={{ opacity: locked ? 0.5 : 1 }}>
      <Header
        className="filelist-header"
        size="small"
      >
        <div>
          <Icon
            link={!locked}
            name={locked ? 'lock' : folded ? 'folder' : 'folder open'}
            onClick={() => !locked && setFolded(!folded)}
            size="large"
          />
          {directoryName}

          {Boolean(onClose) && (
            <Icon
              className="close-button"
              color="red"
              link
              name="close"
              onClick={() => onClose()}
            />
          )}
        </div>
      </Header>
      {!folded && files && files.length > 0 && (
        <List>
          <List.Item>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="filelist-selector">
                    <Checkbox
                      checked={files.filter((f) => !f.selected).length === 0}
                      disabled={disabled}
                      fitted
                      onChange={(event, data) =>
                        files.map((f) => onSelectionChange(f, data.checked))
                      }
                    />
                  </Table.HeaderCell>
                  <Table.HeaderCell className="filelist-filename">
                    File
                  </Table.HeaderCell>
                  <Table.HeaderCell className="filelist-size">
                    Size
                  </Table.HeaderCell>
                  <Table.HeaderCell className="filelist-attributes">
                    Attributes
                  </Table.HeaderCell>
                  <Table.HeaderCell className="filelist-length">
                    Length
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {files
                  .sort((a, b) => (a.filename > b.filename ? 1 : -1))
                  .map((f) => (
                    <Table.Row
                      key={f.filename}
                      {...bindContextMenu(f)}
                    >
                      <Table.Cell className="filelist-selector">
                        <Checkbox
                          checked={f.selected}
                          disabled={disabled}
                          fitted
                          onChange={(event, data) =>
                            onSelectionChange(f, data.checked)
                          }
                        />
                      </Table.Cell>
                      <Table.Cell className="filelist-filename">
                        {locked ? <Icon name="lock" /> : ''}
                        {getFileName(f.filename)}
                      </Table.Cell>
                      <Table.Cell className="filelist-size">
                        {formatBytes(f.size)}
                      </Table.Cell>
                      <Table.Cell className="filelist-attributes">
                        {formatAttributes(f)}
                      </Table.Cell>
                      <Table.Cell className="filelist-length">
                        {formatSeconds(f.length)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
              </Table.Body>
              {footer && (
                <Table.Footer fullWidth>
                  <Table.Row>
                    <Table.HeaderCell colSpan="5">{footer}</Table.HeaderCell>
                  </Table.Row>
                </Table.Footer>
              )}
            </Table>
          </List.Item>
        </List>
      )}

      {/* Right-click context menu */}
      {contextMenu((file) => (
        <>
          <ContextMenuItem
            disabled={disabled || !file}
            icon="download"
            onClick={() => onDownloadFile?.(file)}
          >
            Download file to…
          </ContextMenuItem>
          <ContextMenuItem
            disabled={disabled || !file || !onDownloadAs}
            icon="folder open"
            onClick={() => onDownloadAs?.(file)}
          >
            Download as… (choose folder)
          </ContextMenuItem>
          <ContextMenuDivider />
          <ContextMenuItem
            disabled={disabled || !onDownloadFolder}
            icon="folder"
            onClick={() => onDownloadFolder?.(directoryName)}
          >
            Download folder to…
          </ContextMenuItem>
        </>
      ))}
    </div>
  );
};

export default FileList;
