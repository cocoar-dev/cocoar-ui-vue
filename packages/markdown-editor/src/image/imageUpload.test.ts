import { describe, it, expect } from 'vitest';
import { imageFilesFrom } from './imageUpload';

/** Build a minimal `DataTransfer`-shaped object with the given files. */
function dataTransferWith(files: File[]): DataTransfer {
  return { files } as unknown as DataTransfer;
}

function fileOfType(name: string, type: string): File {
  return new File(['x'], name, { type });
}

describe('imageFilesFrom', () => {
  it('returns [] for null data', () => {
    expect(imageFilesFrom(null)).toEqual([]);
  });

  it('returns [] when there are no files', () => {
    expect(imageFilesFrom(dataTransferWith([]))).toEqual([]);
  });

  it('keeps only image/* files', () => {
    const png = fileOfType('a.png', 'image/png');
    const jpg = fileOfType('b.jpg', 'image/jpeg');
    const txt = fileOfType('c.txt', 'text/plain');
    const result = imageFilesFrom(dataTransferWith([png, txt, jpg]));
    expect(result).toEqual([png, jpg]);
  });

  it('drops non-image files entirely', () => {
    const pdf = fileOfType('doc.pdf', 'application/pdf');
    expect(imageFilesFrom(dataTransferWith([pdf]))).toEqual([]);
  });
});
