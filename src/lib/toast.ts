import { format } from "date-fns";
import { type ExternalToast, toast as sonnerToast } from "sonner";

export const formatToastTimestamp = (date = new Date()): string =>
  format(date, "h:mm:ss a");

const withTimestamp = (options?: ExternalToast): ExternalToast => {
  const timestamp = formatToastTimestamp();
  const description = options?.description
    ? `${options.description} • ${timestamp}`
    : timestamp;

  return {
    ...options,
    description,
  };
};

/**
 * Custom toast wrapper to ensure timestamps are displayed and errors/warnings are persistent.
 */
export const toast = Object.assign(
  (message: string | React.ReactNode, options?: ExternalToast) =>
    sonnerToast(message, withTimestamp(options)),
  {
    ...sonnerToast,
    success: (message: string | React.ReactNode, options?: ExternalToast) =>
      sonnerToast.success(message, withTimestamp(options)),
    info: (message: string | React.ReactNode, options?: ExternalToast) =>
      sonnerToast.info(message, withTimestamp(options)),
    warning: (message: string | React.ReactNode, options?: ExternalToast) =>
      sonnerToast.warning(message, {
        duration: Infinity,
        closeButton: true,
        ...withTimestamp(options),
      }),
    error: (message: string | React.ReactNode, options?: ExternalToast) =>
      sonnerToast.error(message, {
        duration: Infinity,
        closeButton: true,
        ...withTimestamp(options),
      }),
  },
);
