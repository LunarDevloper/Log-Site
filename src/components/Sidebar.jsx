import Icon from "./Icon";
import logo from "../assets/logo-new.png";


const items = [
  ["Dashboard", "dashboard"],["Estoque", "stock"], ["Empresa", "company"], ["Movimentações", "movements"],
  ["Pedidos", "orders"], ["Robôs", "robots"], ["Alertas", "alerts"],
  ["Relatórios", "reports"], ["Configurações", "settings"],
];

export default function Sidebar({ page, onNavigate, open, onClose }) {
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
        <div className="sidebar-user">
          <div className="avatar">OP</div>
          <div className="sidebar-user__info"><strong>OP</strong><small>Sistema online</small></div>
        </div>
      </aside>
    </>
  );
}
