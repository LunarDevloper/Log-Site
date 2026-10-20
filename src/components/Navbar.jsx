import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { userInitials, userName } from "../lib/user";

export default function Navbar({ onMenu, onLogout, onProfile, onCompanies, user, groupName, onSwitchGroup }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function choose(action) {
    setOpen(false);
    action?.();
  }

  return (
    <header className="navbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Abrir menu"><Icon name="menu" /></button>
      <div className="search"><Icon name="search" size={16} /><input placeholder="Pesquisar..." /></div>
      <div className="navbar-actions">
        {groupName && (
          <button
            className="secondary-button navbar-group"
            type="button"
            onClick={onSwitchGroup}
            title="Trocar de empresa"
          >
            <span>{groupName}</span> · trocar
          </button>
        )}
        <span className="online"><i />Online</span>
        <button className="icon-button" aria-label="Notificações"><Icon name="bell" /></button>
        <div className="user-menu" ref={menuRef}>
          <button
            className="avatar avatar-button"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Abrir menu da conta"
            title={userName(user)}
          >
            {userInitials(user)}
          </button>
          {open && (
            <div className="user-menu__panel" role="menu">
              <div className="user-menu__head">
                <strong>{userName(user)}</strong>
                {user?.email && <small>{user.email}</small>}
              </div>
              <button type="button" role="menuitem" onClick={() => choose(onProfile)}>
                <Icon name="user" size={16} />Meu perfil
              </button>
              <button type="button" role="menuitem" onClick={() => choose(onCompanies)}>
                <Icon name="company" size={16} />Minhas empresas
              </button>
              <button type="button" role="menuitem" className="user-menu__danger" onClick={() => choose(onLogout)}>
                <Icon name="logout" size={16} />Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
