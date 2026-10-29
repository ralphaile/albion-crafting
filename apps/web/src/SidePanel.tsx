import { type ReactNode, useEffect, useId, useRef } from "react";

import styles from "./SidePanel.module.css";

// A sheet over the right of the page. It closes on Escape, a click outside it
// or its × button, and tells the owner through onClose.
export function SidePanel({
  heading,
  closeLabel,
  open,
  onClose,
  footer,
  children,
}: {
  heading: ReactNode;
  closeLabel: string;
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- a click outside the panel lands on the dialog's backdrop; keyboards close it with Escape
    <dialog
      ref={dialogRef}
      className={styles.panel}
      aria-labelledby={headingId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dialogRef.current?.close();
        }
      }}
    >
      <div className={styles.sheet}>
        <header className={styles.header}>
          <h2 id={headingId} className={styles.heading}>
            {heading}
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            onClick={() => {
              dialogRef.current?.close();
            }}
          >
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 2l6 6M8 2L2 8" />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer !== undefined && (
          <footer className={styles.footer}>{footer}</footer>
        )}
      </div>
    </dialog>
  );
}
