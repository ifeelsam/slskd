import {
  joinRelativePath,
  sanitizeDownloadDestination,
} from './downloadDestination';

describe('joinRelativePath', () => {
  it('joins segments with forward slashes', () => {
    expect(joinRelativePath('Music', 'Jazz')).toBe('Music/Jazz');
  });

  it('drops empty, dot, and traversal segments', () => {
    expect(joinRelativePath('Music', '..', 'Jazz', '.', '')).toBe('Music/Jazz');
  });

  it('normalizes mixed separators', () => {
    expect(joinRelativePath('Music\\Jazz', '2024/Live')).toBe(
      'Music/Jazz/2024/Live',
    );
  });
});

describe('sanitizeDownloadDestination', () => {
  it('returns undefined for empty or unsafe values', () => {
    expect(sanitizeDownloadDestination('')).toBeUndefined();
    expect(sanitizeDownloadDestination('..')).toBeUndefined();
    expect(sanitizeDownloadDestination('/')).toBeUndefined();
    expect(sanitizeDownloadDestination(null)).toBeUndefined();
  });

  it('returns a relative path', () => {
    expect(sanitizeDownloadDestination(' Music/Jazz ')).toBe('Music/Jazz');
  });
});
