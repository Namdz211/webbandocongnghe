const AUTH_STORAGE_KEYS = [
    'token',
    'user',
    'electro-store-auth',
];

export function clearStoredAuth() {
    AUTH_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
    });
}
