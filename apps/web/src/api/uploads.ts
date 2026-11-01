import { api } from './client';

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

// Uploads one photo and returns the stable path to save on the listing (not the
// presigned PUT URL, which stops working once it expires).
export async function uploadPhoto(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new UploadError(`${file.name} is over 5MB.`);
  const { uploadUrl, path } = await api<{ uploadUrl: string; path: string }>('/api/v1/catalog/uploads', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name }),
  });
  // Straight to Garage via its own presigned URL, not through api() — it carries its
  // own signature-based auth and would reject an extra Authorization header mismatch.
  const res = await fetch(uploadUrl, { method: 'PUT', body: file });
  if (!res.ok) throw new UploadError(`Could not upload ${file.name}.`);
  return path;
}

export async function uploadPhotos(files: File[], alreadyHave: number): Promise<string[]> {
  const room = MAX_PHOTOS - alreadyHave;
  if (room <= 0) throw new UploadError(`Up to ${MAX_PHOTOS} photos per listing.`);
  return Promise.all(files.slice(0, room).map(uploadPhoto));
}
