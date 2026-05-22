import { Toaster } from "sonner";

export function Toast() {
  return (
    <Toaster
      position="top-right"
      closeButton
      duration={1250}
      offset={{ right: 4 }}
      toastOptions={{
        classNames: {
          toast: "liuguang-toast",
          success: "liuguang-toast-success",
          error: "liuguang-toast-error",
          info: "liuguang-toast-info",
          warning: "liuguang-toast-warning",
          title: "liuguang-toast-title",
          description: "liuguang-toast-description",
          closeButton: "liuguang-toast-close"
        }
      }}
    />
  );
}
