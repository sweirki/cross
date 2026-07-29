import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StringStorage } from "./GameSessionStorage";

export const asyncGameSessionStorage: StringStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
