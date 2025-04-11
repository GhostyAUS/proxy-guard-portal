
// Type declarations for Electron integration
interface ElectronAPI {
  execute: (command: string) => Promise<{
    exitCode: number;
    stdout?: string;
    stderr?: string;
  }>;
}

// Extend the global Window interface
interface Window {
  electron?: ElectronAPI;
}
