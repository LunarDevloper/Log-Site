import Icon from "./Icon";
import logo from "../assets/logo-new.png";
import { userInitials, userName } from "../lib/user";


const items = [
  ["Empresa", "company"], ["Dashboard", "dashboard"],["Estoque", "stock"], ["Movimentações", "movements"], ["Equipe", "team"],
  ["Pedidos", "orders"], ["Robôs", "robots"], ["Alertas", "alerts"],
  ["Relatórios", "reports"], ["Configurações", "settings"],
];

export default function Sidebar({ page, onNavigate, open, onClose, user, onProfile, onLogout }) {
  return (
    <>
      <button className={`backdrop ${open ? "show" : ""}`} onClick={onClose} aria-label="Fechar menu" />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand"><img className="" src={logo} alt="BuddyLog" /></div>
        <nav>
          {items.map(([label, icon]) => (
            <button key={label} className={page === label ? "active" : ""} onClick={() => { onNavigate(label); onClose(); }}>
              <Icon name={icon} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          <button
            type="button"
            className={`sidebar-user ${page === "Perfil" ? "active" : ""}`}
            onClick={onProfile}
            title="Meu perfil"
          >
            <div className="avatar">{userInitials(user)}</div>
            <div className="sidebar-user__info">
              <strong>{userName(user)}</strong>
              <small>{user?.email ?? `Meu perfil`}</small>
            </div>
          </button>
          <button type="button" className="sidebar-logout" onClick={() => { onClose(); onLogout(); }}>
            <Icon name="logout" size={16} /><span>Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
}
