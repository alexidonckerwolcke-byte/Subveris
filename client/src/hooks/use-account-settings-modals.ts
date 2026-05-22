// Hook to use account settings modals from parent components
export function useAccountSettingsModals() {
  const emailTrigger = document.querySelector("[data-testid='open-email-modal']") as HTMLButtonElement;
  const passwordTrigger = document.querySelector("[data-testid='open-password-modal']") as HTMLButtonElement;
  const twoFATrigger = document.querySelector("[data-testid='open-2fa-modal']") as HTMLButtonElement;
  const deleteAccountTrigger = document.querySelector("[data-testid='open-delete-alert']") as HTMLButtonElement;
  const exportTrigger = document.querySelector("[data-testid='export-data-handler']") as HTMLButtonElement;

  return {
    openEmailModal: () => emailTrigger?.click(),
    openPasswordModal: () => passwordTrigger?.click(),
    openTwoFAModal: () => twoFATrigger?.click(),
    openDeleteAccount: () => deleteAccountTrigger?.click(),
    exportData: () => exportTrigger?.click(),
  };
}
