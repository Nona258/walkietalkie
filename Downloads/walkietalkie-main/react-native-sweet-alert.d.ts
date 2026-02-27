declare module 'react-native-sweet-alert' {
  export interface SweetAlertOptions {
    title?: string;
    subTitle?: string;
    confirmButtonTitle?: string;
    confirmButtonColor?: string;
    cancellable?: boolean;
  }

  const SweetAlert: {
    showAlertWithOptions(
      options: SweetAlertOptions,
      callback?: (buttonIndex: number) => void
    ): void;
  };

  export default SweetAlert;
}
