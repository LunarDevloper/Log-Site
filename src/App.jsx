/*imports*/
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Empresa from "./pages/Empresa";
import Movimentacoes from "./pages/Movimentacoes";
import Equipe from "./pages/Equipe";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Placeholder from "./pages/Placeholder";
import { API_BASE } from "./lib/api";
const STORAGE_KEY = "buddylog.group";

function loadStoredGroup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authPage, setAuthPage] = useState("login");
  const [page, setPage] = useState("Empresa");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(loadStoredGroup);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!cancelled && response.ok) setLoggedIn(true);
      } catch {
        /* sem sessão persistida, mantém tela de login */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleSelectGroup(group) {
    if (!group?.id) return;
    setSelectedGroup(group);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    } catch {
      /* storage indisponível, segue só em memória */
    }
    setPage("Dashboard");
  }

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      /* sai mesmo sem resposta da API */
    }
    setLoggedIn(false);
    setSelectedGroup(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nada a limpar */
    }
    setPage("Empresa");
  }

  if (!loggedIn) {
    return authPage === "login" ? (
      <Login onLogin={() => setLoggedIn(true)} onSignup={() => setAuthPage("signup")} />
    ) : (
      <Signup onBackToLogin={() => setAuthPage("login")} />
    );
  }

  if (!selectedGroup) {
    return (
      <div className="app-shell">
        <div className="main-wrap">
          <Navbar onMenu={() => {}} onLogout={handleLogout} />
          <main className="main-content"><Empresa onSelect={handleSelectGroup} /></main>
          <footer>© 2026 Buddy Log</footer>
        </div>
      </div>
    );
  }

  const pages = {
    Dashboard: <Dashboard group={selectedGroup} />,
    Estoque: <Estoque group={selectedGroup} />,
    Empresa: <Empresa onSelect={handleSelectGroup} selectedId={selectedGroup.id} />,
    "Movimentações": <Movimentacoes group={selectedGroup} />,
    Equipe: <Equipe group={selectedGroup} />,
    Pedidos: <Placeholder group={selectedGroup} title="Pedidos" subtitle="Acompanhamento dos pedidos" columns={['Pedido', 'Cliente', 'Data', 'Prioridade', 'Status']} stats={['Pendentes', 'Separando', 'Transporte', 'Concluídos']} icon="🧾" emptyTitle="Pedidos em breve" emptySubtitle="A área de pedidos ainda está em construção. O estoque e as movimentações já funcionam." />,
    "Robôs": <Placeholder group={selectedGroup} title="Robôs" subtitle="Frota de robôs autônomos" columns={['Robô', 'Status', 'Bateria', 'Localização', 'Missão']} stats={['Online', 'Carregando', 'Manutenção', 'Offline']} icon="🤖" emptyTitle="Frota em breve" emptySubtitle="Os robôs ainda não estão conectados. Acompanhe a operação pelo Dashboard." />,
    Alertas: <Placeholder group={selectedGroup} title="Alertas" subtitle="Central de alertas operacionais" columns={['Nível', 'Tipo', 'Mensagem', 'Data', 'Status']} stats={['Críticos', 'Altos', 'Médios', 'Informativos']} icon="⚠️" emptyTitle="Sem alertas por enquanto" emptySubtitle="Quando houver estoque baixo ou eventos importantes, eles aparecem aqui." />,
    "Relatórios": <Placeholder group={selectedGroup} title="Relatórios" subtitle="Indicadores e análises" columns={['Relatório', 'Período', 'Categoria', 'Formato', 'Status']} stats={['Movimentações', 'Eficiência', 'Pedidos', 'Tempo médio']} icon="📊" emptyTitle="Relatórios em breve" emptySubtitle="Use o Dashboard e as Movimentações para acompanhar os números por enquanto." />,
    "Configurações": <Placeholder group={selectedGroup} title="Configurações" subtitle="Preferências do sistema" columns={['Configuração', 'Descrição', 'Categoria', 'Valor', 'Status']} stats={['Empresa', 'Usuários', 'Integrações', 'Sistema']} icon="⚙️" emptyTitle="Ajustes em breve" emptySubtitle="As configurações avançadas chegam em breve. A troca de empresa fica no topo." />,
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-wrap">
        <Navbar
          onMenu={() => setMenuOpen(true)}
          onLogout={handleLogout}
          groupName={selectedGroup.name}
          onSwitchGroup={() => setPage("Empresa")}
        />
        <main className="main-content">{pages[page] ?? <Dashboard group={selectedGroup} />}</main>
        <footer>© 2026 Buddy Log</footer>
      </div>
    </div>
  );
}
