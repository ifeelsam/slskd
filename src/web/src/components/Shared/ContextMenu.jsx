import './ContextMenu.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from 'semantic-ui-react';

/**
 * A lightweight right-click context menu component.
 *
 * Usage:
 *   const { bindContextMenu, contextMenu } = useContextMenu();
 *   <tr {...bindContextMenu(item)} />
 *   {contextMenu((item) => (
 *     <>
 *       <ContextMenuItem icon="download" onClick={() => doSomething(item)}>Download</ContextMenuItem>
 *     </>
 *   ))}
 */

export const useContextMenu = () => {
  const [state, setState] = useState({
    item: null,
    visible: false,
    x: 0,
    y: 0,
  });
  const ref = useRef(null);

  const open = useCallback((event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setState({ item, visible: true, x: event.clientX, y: event.clientY });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (!state.visible) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        close();
      }
    };

    const keyHandler = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [state.visible, close]);

  const bindContextMenu = useCallback(
    (item) => ({
      onContextMenu: (event) => open(event, item),
    }),
    [open],
  );

  const contextMenu = useCallback(
    (renderFn) =>
      state.visible ? (
        <ContextMenu
          item={state.item}
          onClose={close}
          ref={ref}
          x={state.x}
          y={state.y}
        >
          {renderFn(state.item)}
        </ContextMenu>
      ) : null,
    [close, state],
  );

  return { bindContextMenu, close, contextMenu };
};

const ContextMenu = React.forwardRef(({ children, onClose, x, y }, ref) => {
  // Keep the menu within the viewport
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: x + rect.width > vw ? vw - rect.width - 8 : x,
      y: y + rect.height > vh ? vh - rect.height - 8 : y,
    });
  }, [x, y]);

  return (
    <div
      className="ctx-menu"
      ref={(node) => {
        menuRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      style={{ left: pos.x, top: pos.y }}
    >
      {React.Children.map(children, (child) =>
        child ? React.cloneElement(child, { onClose }) : null,
      )}
    </div>
  );
});

ContextMenu.displayName = 'ContextMenu';

export const ContextMenuItem = ({
  children,
  disabled,
  icon,
  onClick,
  onClose,
}) => (
  <button
    className={`ctx-menu-item${disabled ? ' ctx-menu-item--disabled' : ''}`}
    disabled={disabled}
    onClick={() => {
      if (!disabled) {
        onClick?.();
        onClose?.();
      }
    }}
    type="button"
  >
    {icon && <Icon name={icon} />}
    <span>{children}</span>
  </button>
);

export const ContextMenuDivider = () => <div className="ctx-menu-divider" />;

export default ContextMenu;
