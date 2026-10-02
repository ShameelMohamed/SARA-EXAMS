declare global {
  interface Window {
    electronAPI: {
      isElectron: boolean;
      onSecurityEvent: (callback: (data: any) => void) => void;
      openSecureExam: (url: string) => Promise<void>;
      closeSecureExam: () => Promise<void>;
    };
  }
}
export {};
