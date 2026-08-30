const STORAGE_KEY = 'slskd-download-destination';
const QUICK_LOCATIONS_KEY = 'slskd-download-quick-locations';

const isUnsafeSegment = (segment) =>
  !segment || segment === '.' || segment === '..';

export const joinRelativePath = (...parts) =>
  parts
    .flatMap((part) => String(part ?? '').split(/[\\/]/u))
    .map((segment) => segment.trim())
    .filter((segment) => !isUnsafeSegment(segment))
    .join('/');

export const sanitizeDownloadDestination = (path) => {
  if (typeof path !== 'string') {
    return undefined;
  }

  const joined = joinRelativePath(path);
  return joined || undefined;
};

export const getDownloadDestination = () => {
  try {
    return sanitizeDownloadDestination(localStorage.getItem(STORAGE_KEY));
  } catch {
    return undefined;
  }
};

export const setDownloadDestination = (path) => {
  const sanitized = sanitizeDownloadDestination(path);

  try {
    if (sanitized) {
      localStorage.setItem(STORAGE_KEY, sanitized);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore quota / private-mode failures
  }

  return sanitized;
};

/**
 * Quick locations are named shortcuts to frequently used download folders.
 * Stored as an array of { name, path } objects.
 */
export const getQuickLocations = () => {
  try {
    const raw = localStorage.getItem(QUICK_LOCATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setQuickLocations = (locations) => {
  try {
    localStorage.setItem(QUICK_LOCATIONS_KEY, JSON.stringify(locations));
  } catch {
    // ignore quota / private-mode failures
  }

  return locations;
};

export const addQuickLocation = (name, path) => {
  const sanitized = sanitizeDownloadDestination(path);
  if (!sanitized || !name?.trim()) return getQuickLocations();

  const existing = getQuickLocations();
  // Replace if same name, otherwise append
  const updated = existing.some((loc) => loc.name === name.trim())
    ? existing.map((loc) =>
        loc.name === name.trim() ? { name: name.trim(), path: sanitized } : loc,
      )
    : [...existing, { name: name.trim(), path: sanitized }];

  return setQuickLocations(updated);
};

export const removeQuickLocation = (name) => {
  const updated = getQuickLocations().filter((loc) => loc.name !== name);
  return setQuickLocations(updated);
};
