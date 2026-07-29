"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVICE_PREFERENCES_STORAGE_KEY = void 0;
exports.loadDevicePreferences = loadDevicePreferences;
exports.saveDevicePreferences = saveDevicePreferences;
const preferences_1 = require("./preferences");
exports.DEVICE_PREFERENCES_STORAGE_KEY = "crossmath.device-preferences.v1";
async function loadDevicePreferences(storage) {
    try {
        const raw = await storage.getItem(exports.DEVICE_PREFERENCES_STORAGE_KEY);
        return raw === null ? preferences_1.DEFAULT_DEVICE_PREFERENCES : (0, preferences_1.parseDevicePreferences)(JSON.parse(raw));
    }
    catch {
        return preferences_1.DEFAULT_DEVICE_PREFERENCES;
    }
}
async function saveDevicePreferences(storage, preferences) {
    await storage.setItem(exports.DEVICE_PREFERENCES_STORAGE_KEY, JSON.stringify((0, preferences_1.parseDevicePreferences)(preferences)));
}
