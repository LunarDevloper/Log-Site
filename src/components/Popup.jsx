import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Popup({ open, onClose, title, subtitle, error }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open ]);

  if (!open) return null;

  return createPortal(
    <div className="popup-overlay" role="presentation" onClick={onClose}>
      <section
        className="popup"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="popup-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </header>

        {error && <p className="popup-error">{error}</p>}

        <button className="popup-exit" type="button" onClick={onClose}>
          Sair
        </button>
      </section>
    </div>,
    document.body,
  );
}
