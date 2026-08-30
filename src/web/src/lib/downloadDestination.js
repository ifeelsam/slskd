const STORAGE_KEY = 'slskd-download-destination';

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
