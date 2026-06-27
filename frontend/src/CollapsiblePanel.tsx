import { ReactNode } from 'react';

interface CollapsiblePanelProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  onClose?: () => void;
  children: ReactNode;
  panelRef?: React.RefObject<HTMLElement>;
}

export function CollapsiblePanel({
  title,
  open,
  onToggle,
  onClose,
  children,
  panelRef
}: CollapsiblePanelProps) {
  return (
    <section className="details-panel collapsible-panel" ref={panelRef as React.RefObject<HTMLElement>}>
      <div className="details-header">
        <button type="button" className="collapse-toggle" onClick={onToggle}>
          <span className={`chevron ${open ? 'open' : ''}`} aria-hidden>›</span>
          <h2>{title}</h2>
        </button>
        {onClose && (
          <button type="button" className="close-button" onClick={onClose}>Закрыть</button>
        )}
      </div>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}
