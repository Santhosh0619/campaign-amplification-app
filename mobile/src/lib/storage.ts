import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Secure storage on device; AsyncStorage on web (SecureStore is native only). Every call is guarded
// because storage can be unavailable (private mode, corrupt data) and must never crash the app.

export async function getItem(key: string): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignored: the value simply will not persist.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignored.
  }
}

/** Non-sensitive JSON cache (draft copies, filters). */
export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored.
  }
}
