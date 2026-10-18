import * as ImagePicker from 'expo-image-picker';
import { api } from '@/api/client';

const MAX_BYTES = 3 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class PickError extends Error {}

/**
 * Lets the user choose a photo, checks type and size, and uploads it.
 * Resolves with the stored URL, or null if the user cancelled. Throws PickError with a friendly message.
 */
export async function pickAndUploadImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.canAskAgain === false) {
    throw new PickError('Photo access is turned off. Enable it in your phone settings to upload an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const mime = asset.mimeType ?? 'image/jpeg';
  if (!OK_TYPES.includes(mime)) throw new PickError('Use a JPG, PNG or WebP image.');
  if (!asset.base64) throw new PickError('Could not read that image. Try another one.');
  if (Math.floor(asset.base64.length * 0.75) > MAX_BYTES) throw new PickError('That image is over 3 MB. Choose a smaller one.');

  const res = await api<{ url: string }>('/uploads', { method: 'POST', body: { dataUri: `data:${mime};base64,${asset.base64}` }, timeoutMs: 60_000 });
  return res.url;
}
