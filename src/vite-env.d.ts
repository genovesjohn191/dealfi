/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeAllListeners: (event: string) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    send: (method: string, params?: any[]) => Promise<any>;
  };
}