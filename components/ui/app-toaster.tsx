import { Toaster } from "sonner";

/**
 * The app's single toast outlet (mounted once in the root layout so toasts
 * survive client navigation, e.g. "Event created" after redirecting to the
 * events list). Top-center: always in view, never under the mobile bottom
 * nav or the iPhone home indicator.
 */
export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      richColors
      closeButton
      duration={4000}
      visibleToasts={3}
      offset={{ top: 20 }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)", left: 12, right: 12 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !text-sm !shadow-2xl !font-sans",
          title: "!font-medium",
          description: "!text-xs !opacity-80",
        },
      }}
    />
  );
}
