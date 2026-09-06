import { filterResponse, getResponses } from '../../../lib/searches';
import { sleep } from '../../../lib/util';
import ErrorSegment from '../../Shared/ErrorSegment';
import LoaderSegment from '../../Shared/LoaderSegment';
import Switch from '../../Shared/Switch';
import Response from '../Response';
import SearchDetailHeader from './SearchDetailHeader';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  Button,
  Checkbox,
  Dropdown,
  Form,
  Icon,
  Segment,
} from 'semantic-ui-react';

const sortDropdownOptions = [
  {
    key: 'uploadSpeed',
    text: 'Upload Speed (Fastest to Slowest)',
    value: 'uploadSpeed',
  },
  {
    key: 'queueLength',
    text: 'Queue Depth (Least to Most)',
    value: 'queueLength',
  },
];

const SearchDetail = ({
  creating,
  disabled,
  onCreate,
  onRemove,
  onStop,
  removing,
  search,
  stopping,
}) => {
  const { fileCount, id, isComplete, lockedFileCount, responseCount, state } =
    search;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);

  const [results, setResults] = useState([]);

  // filters and sorting options
  const [hiddenResults, setHiddenResults] = useState([]);
  const [resultSort, setResultSort] = useState('uploadSpeed');
  const [hideLocked, setHideLocked] = useState(true);
  const [hideNoFreeSlots, setHideNoFreeSlots] = useState(false);
  const [foldResults, setFoldResults] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    exclude: '',
    include: '',
    isCBR: false,
    isLossless: false,
    isLossy: false,
    isVBR: false,
    minBitDepth: '',
    minBitRate: '',
    minFilesInFolder: '',
    minFileSize: '',
    minLength: '',
  });

  const handleFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const [displayCount, setDisplayCount] = useState(5);

  // when the search transitions from !isComplete -> isComplete,
  // fetch the results from the server
  useEffect(() => {
    const get = async () => {
      try {
        setLoading(true);

        // the results may not be ready yet.  this is very rare, but
        // if it happens the search will complete with no results.
        await sleep(500);

        const responses = await getResponses({ id });
        setResults(responses);
        setLoading(false);
      } catch (getError) {
        setError(getError);
        setLoading(false);
      }
    };

    if (isComplete) {
      get();
    }
  }, [id, isComplete]);

  // apply sorting and filters.  this can take a while for larger result
  // sets, so memoize it.
  const sortedAndFilteredResults = useMemo(() => {
    const sortOptions = {
      queueLength: { field: 'queueLength', order: 'asc' },
      uploadSpeed: { field: 'uploadSpeed', order: 'desc' },
    };

    const { field, order } = sortOptions[resultSort];

    const includeArr = advancedFilters.include
      .toLowerCase()
      .split(' ')
      .filter(Boolean);
    const excludeArr = advancedFilters.exclude
      .toLowerCase()
      .split(' ')
      .filter(Boolean);

    const filters = {
      ...advancedFilters,
      include: includeArr,
      exclude: excludeArr,
      minBitDepth: advancedFilters.minBitDepth
        ? Number.parseInt(advancedFilters.minBitDepth, 10)
        : 0,
      minBitRate: advancedFilters.minBitRate
        ? Number.parseInt(advancedFilters.minBitRate, 10)
        : 0,
      minFilesInFolder: advancedFilters.minFilesInFolder
        ? Number.parseInt(advancedFilters.minFilesInFolder, 10)
        : 0,
      minFileSize: advancedFilters.minFileSize
        ? Number.parseInt(advancedFilters.minFileSize, 10)
        : 0,
      minLength: advancedFilters.minLength
        ? Number.parseInt(advancedFilters.minLength, 10)
        : 0,
    };

    return results
      .filter((r) => !hiddenResults.includes(r.username))
      .map((r) => {
        if (hideLocked) {
          return { ...r, lockedFileCount: 0, lockedFiles: [] };
        }

        return r;
      })
      .map((response) => filterResponse({ filters, response }))
      .filter((r) => r.fileCount + r.lockedFileCount > 0)
      .filter((r) => !(hideNoFreeSlots && !r.hasFreeUploadSlot))
      .sort((a, b) => {
        if (order === 'asc') {
          return a[field] - b[field];
        }

        return b[field] - a[field];
      });
  }, [
    advancedFilters,
    hiddenResults,
    hideLocked,
    hideNoFreeSlots,
    resultSort,
    results,
  ]);

  // when a user uses the action buttons, we will *probably* re-use this component,
  // but with a new search ID.  clear everything to prepare for the transition
  const reset = () => {
    setLoading(false);
    setError(undefined);
    setResults([]);
    setHiddenResults([]);
    setDisplayCount(5);
  };

  const create = async ({ navigate, search: searchForCreate }) => {
    reset();
    onCreate({ navigate, search: searchForCreate });
  };

  const remove = async () => {
    reset();
    onRemove(search);
  };

  const filteredCount = results?.length - sortedAndFilteredResults.length;
  const remainingCount = sortedAndFilteredResults.length - displayCount;
  const loaded = !removing && !creating && !loading && results;

  if (error) {
    return <ErrorSegment caption={error?.message ?? error} />;
  }

  return (
    <>
      <SearchDetailHeader
        creating={creating}
        disabled={disabled}
        loaded={loaded}
        loading={loading}
        onCreate={create}
        onRemove={remove}
        onStop={onStop}
        removing={removing}
        search={search}
        stopping={stopping}
      />
      <Switch
        loading={loading && <LoaderSegment />}
        searching={
          !isComplete && (
            <LoaderSegment>
              {state === 'InProgress'
                ? `Found ${fileCount} files ${
                    lockedFileCount > 0
                      ? `(plus ${lockedFileCount} locked) `
                      : ''
                  }from ${responseCount} users`
                : 'Loading results...'}
            </LoaderSegment>
          )
        }
      >
        {loaded && (
          <Segment
            className="search-options"
            raised
          >
            <Dropdown
              button
              className="search-options-sort icon"
              floating
              icon="sort"
              labeled
              onChange={(_event, { value }) => setResultSort(value)}
              options={sortDropdownOptions}
              text={
                sortDropdownOptions.find((o) => o.value === resultSort).text
              }
            />
            <div className="search-option-toggles">
              <Checkbox
                checked={hideLocked}
                className="search-options-hide-locked"
                label="Hide Locked Results"
                onChange={() => setHideLocked(!hideLocked)}
                toggle
              />
              <Checkbox
                checked={hideNoFreeSlots}
                className="search-options-hide-no-slots"
                label="Hide Results with No Free Slots"
                onChange={() => setHideNoFreeSlots(!hideNoFreeSlots)}
                toggle
              />
              <Checkbox
                checked={foldResults}
                className="search-options-fold-results"
                label="Fold Results"
                onChange={() => setFoldResults(!foldResults)}
                toggle
              />
            </div>
            <Accordion style={{ marginTop: '1em' }}>
              <Accordion.Title
                active={filtersExpanded}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
              >
                <Icon name="dropdown" />
                Advanced Filters
              </Accordion.Title>
              <Accordion.Content active={filtersExpanded}>
                <Form>
                  <Form.Group widths="equal">
                    <Form.Input
                      fluid
                      label="Include Terms"
                      onChange={(_e, { value }) =>
                        handleFilterChange('include', value)
                      }
                      placeholder="e.g. lackluster container"
                      value={advancedFilters.include}
                    />
                    <Form.Input
                      fluid
                      label="Exclude Terms"
                      onChange={(_e, { value }) =>
                        handleFilterChange('exclude', value)
                      }
                      placeholder="e.g. bothersome"
                      value={advancedFilters.exclude}
                    />
                  </Form.Group>
                  <Form.Group widths="equal">
                    <Form.Input
                      fluid
                      label="Min Bitrate (kbps)"
                      onChange={(_e, { value }) =>
                        handleFilterChange('minBitRate', value)
                      }
                      placeholder="320"
                      type="number"
                      value={advancedFilters.minBitRate}
                    />
                    <Form.Input
                      fluid
                      label="Min Bit Depth"
                      onChange={(_e, { value }) =>
                        handleFilterChange('minBitDepth', value)
                      }
                      placeholder="24"
                      type="number"
                      value={advancedFilters.minBitDepth}
                    />
                    <Form.Input
                      fluid
                      label="Min File Size (Bytes)"
                      onChange={(_e, { value }) =>
                        handleFilterChange('minFileSize', value)
                      }
                      placeholder="10000000"
                      type="number"
                      value={advancedFilters.minFileSize}
                    />
                    <Form.Input
                      fluid
                      label="Min Files In Folder"
                      onChange={(_e, { value }) =>
                        handleFilterChange('minFilesInFolder', value)
                      }
                      placeholder="8"
                      type="number"
                      value={advancedFilters.minFilesInFolder}
                    />
                  </Form.Group>
                  <Form.Group inline>
                    <strong style={{ marginRight: '0.5em' }}>Format:</strong>
                    <Form.Checkbox
                      checked={advancedFilters.isCBR}
                      label="CBR Only"
                      onChange={(_e, { checked }) => {
                        handleFilterChange('isCBR', checked);
                        if (checked) handleFilterChange('isVBR', false);
                      }}
                    />
                    <Form.Checkbox
                      checked={advancedFilters.isVBR}
                      label="VBR Only"
                      onChange={(_e, { checked }) => {
                        handleFilterChange('isVBR', checked);
                        if (checked) handleFilterChange('isCBR', false);
                      }}
                    />
                    <strong style={{ marginLeft: '1em', marginRight: '0.5em' }}>Quality:</strong>
                    <Form.Checkbox
                      checked={advancedFilters.isLossless}
                      label="Lossless Only"
                      onChange={(_e, { checked }) => {
                        handleFilterChange('isLossless', checked);
                        if (checked) handleFilterChange('isLossy', false);
                      }}
                    />
                    <Form.Checkbox
                      checked={advancedFilters.isLossy}
                      label="Lossy Only"
                      onChange={(_e, { checked }) => {
                        handleFilterChange('isLossy', checked);
                        if (checked) handleFilterChange('isLossless', false);
                      }}
                    />
                    <Form.Button
                      content="Clear Filters"
                      icon="x"
                      onClick={() =>
                        setAdvancedFilters({
                          exclude: '',
                          include: '',
                          isCBR: false,
                          isLossless: false,
                          isLossy: false,
                          isVBR: false,
                          minBitDepth: '',
                          minBitRate: '',
                          minFilesInFolder: '',
                          minFileSize: '',
                          minLength: '',
                        })
                      }
                      size="small"
                      style={{ marginLeft: 'auto' }}
                      type="button"
                    />
                  </Form.Group>
                </Form>
              </Accordion.Content>
            </Accordion>
          </Segment>
        )}
        {loaded &&
          sortedAndFilteredResults.slice(0, displayCount).map((r) => (
            <Response
              disabled={disabled}
              isInitiallyFolded={foldResults}
              key={r.username}
              onHide={() => setHiddenResults([...hiddenResults, r.username])}
              response={r}
            />
          ))}
        {loaded &&
          (remainingCount > 0 ? (
            <Button
              className="showmore-button"
              fluid
              onClick={() => setDisplayCount(displayCount + 5)}
              primary
              size="large"
            >
              Show {remainingCount > 5 ? 5 : remainingCount} More Results{' '}
              {`(${remainingCount} remaining, ${filteredCount} hidden by filter(s))`}
            </Button>
          ) : filteredCount > 0 ? (
            <Button
              className="showmore-button"
              disabled
              fluid
              size="large"
            >{`All results shown. ${filteredCount} results hidden by filter(s)`}</Button>
          ) : (
            ''
          ))}
      </Switch>
    </>
  );
};

export default SearchDetail;
