/*imports*/
import { useCallback, useEffect, useState } from "react";
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
import Convite from "./pages/Convite";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Perfil from "./pages/Perfil";
import { API_BASE, UNAUTHORIZED_EVENT, cachedFetch, invalidateApiCache } from "./lib/api";
import { clearPendingInvite, loadPendingInvite, storePendingInvite, takeInviteFromUrl } from "./lib/invite";
const STORAGE_KEY = "buddylog.group";

function stripParams(names) {
  const params = new URLSearchParams(window.location.search);
  for (const name of names) params.delete(name);
  const rest = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
}

// O link do e-mail de redefinição volta com ?redefinir=1 (sessão de recuperação já aberta)
function takeResetFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("redefinir") !== "1") return false;
    stripParams(["redefinir"]);
    return true;
  } catch {
    return false;
  }
}

// Erro de confirmação/recuperação que a API devolve em ?erro_auth=
function takeAuthErrorFromUrl() {
  try {
    const message = new URLSearchParams(window.location.search).get("erro_auth");
    if (!message) return "";
    stripParams(["erro_auth"]);
    return message.slice(0, 200);
  } catch {
    return "";
  }
}

// Link de e-mail que caiu na raiz do site (Site URL do Supabase): termina pelo /api
function forwardAuthCode() {
  try {
    const { search, hash } = window.location;
    const params = new URLSearchParams(search);
    const hasToken = params.has("code") || params.has("token_hash") || /access_token=/.test(hash);
    if (!hasToken || !/^https?:$/.test(window.location.protocol)) return false;
    window.location.replace(`${API_BASE}/auth/callback${search}${hash}`);
    return true;
  } catch {
    return false;
  }
}

function loadStoredGroup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredGroup() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada a limpar */
  }
}

export default function App() {
  const [forwarding] = useState(forwardAuthCode);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [authNotice, setAuthNotice] = useState(takeAuthErrorFromUrl);
  const [authPage, setAuthPage] = useState("login");
  const [resetMode, setResetMode] = useState(takeResetFromUrl);
  const [page, setPage] = useState("Empresa");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(loadStoredGroup);
  const [invite, setInvite] = useState(() => takeInviteFromUrl() ?? loadPendingInvite());
  const loggedIn = !!user;

  useEffect(() => {
    if (forwarding) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await cachedFetch(`${API_BASE}/auth/me`, { credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && data?.user) setUser(data.user);
      } catch {
        /* sem sessão persistida, mantém tela de login */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [forwarding]);

  const resetSession = useCallback((notice = "") => {
    invalidateApiCache();
    setUser(null);
    setSelectedGroup(null);
    clearStoredGroup();
    setPage("Empresa");
    setMenuOpen(false);
    setAuthPage("login");
    setAuthNotice(notice);
  }, []);

  // Qualquer 401 fora do login significa que a sessão caiu: volta para o login
  useEffect(() => {
    function handleUnauthorized() {
      resetSession("Sua sessão expirou. Entre novamente para continuar.");
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [resetSession]);

  function handleLogin(nextUser) {
    setAuthNotice("");
    setUser(nextUser ?? { displayName: null, email: null });
  }

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

  function handleOpenInvite(code) {
    storePendingInvite(code);
    setInvite(code);
  }

  function closeInvite() {
    clearPendingInvite();
    setInvite(null);
  }

  function handleInviteAccepted(group) {
    closeInvite();
    handleSelectGroup(group);
  }

  // Grupo atual deixou de existir para o usuário (saiu da empresa no perfil)
  function handleLeftGroup(groupId) {
    if (selectedGroup?.id !== groupId) return;
    setSelectedGroup(null);
    clearStoredGroup();
  }

  async function handleLogout({ everywhere = false } = {}) {
    try {
      await cachedFetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ everywhere }),
      });
    } catch {
      /* sai mesmo sem resposta da API */
    }
    resetSession(everywhere ? "Você saiu de todos os aparelhos." : "Você saiu da sua conta.");
  }

  function openProfile() {
    setMenuOpen(false);
    setPage("Perfil");
  }

  function openCompanies() {
    setMenuOpen(false);
    setPage("Empresa");
  }

  if (forwarding || (checking && !resetMode)) {
    return (
      <main className="app-splash" aria-busy="true">
        <span className="app-splash__dot" />
        <p>{forwarding ? "Confirmando seu acesso..." : "Carregando..."}</p>
      </main>
    );
  }

  if (resetMode) {
    return (
      <ResetPassword
        onDone={() => { setResetMode(false); window.location.reload(); }}
        onRequestNew={() => { setResetMode(false); resetSession(); setAuthPage("forgot"); }}
      />
    );
  }

  if (!loggedIn) {
    if (authPage === "forgot") return <ForgotPassword onBackToLogin={() => setAuthPage("login")} />;
    return authPage === "login" ? (
      <Login
        invited={!!invite}
        notice={authNotice}
        onLogin={handleLogin}
        onSignup={() => { setAuthNotice(""); setAuthPage("signup"); }}
        onForgot={() => { setAuthNotice(""); setAuthPage("forgot"); }}
      />
    ) : (
      <Signup invited={!!invite} onBackToLogin={() => setAuthPage("login")} />
    );
  }

  const navbarProps = {
    user,
    onLogout: handleLogout,
    onProfile: openProfile,
    onCompanies: openCompanies,
  };

  const profilePage = (
    <Perfil
      user={user}
      onUserChange={setUser}
      onLogout={handleLogout}
      onLeftGroup={handleLeftGroup}
      onOpenGroup={handleSelectGroup}
    />
  );

  if (invite) {
    return (
      <div className="app-shell">
        <div className="main-wrap">
          <Navbar onMenu={() => {}} {...navbarProps} />
          <main className="main-content"><Convite code={invite} onAccepted={handleInviteAccepted} onCancel={closeInvite} /></main>
          <footer>© 2026 Buddy Log</footer>
        </div>
      </div>
    );
  }

  if (!selectedGroup) {
    return (
      <div className="app-shell">
        <div className="main-wrap">
          <Navbar onMenu={() => {}} {...navbarProps} />
          <main className="main-content">
            {page === "Perfil"
              ? profilePage
              : <Empresa onSelect={handleSelectGroup} onInviteCode={handleOpenInvite} />}
          </main>
          <footer>© 2026 Buddy Log</footer>
        </div>
      </div>
    );
  }

  const pages = {
    Dashboard: <Dashboard group={selectedGroup} />,
    Estoque: <Estoque group={selectedGroup} />,
    Empresa: <Empresa onSelect={handleSelectGroup} onInviteCode={handleOpenInvite} selectedId={selectedGroup.id} />,
    "Movimentações": <Movimentacoes group={selectedGroup} />,
    Equipe: <Equipe group={selectedGroup} />,
    Perfil: profilePage,
    Pedidos: <Placeholder group={selectedGroup} title="Pedidos" subtitle="Acompanhamento dos pedidos" columns={['Pedido', 'Cliente', 'Data', 'Prioridade', 'Status']} stats={['Pendentes', 'Separando', 'Transporte', 'Concluídos']} icon="🧾" emptyTitle="Pedidos em breve" emptySubtitle="A área de pedidos ainda está em construção. O estoque e as movimentações já funcionam." />,
    "Robôs": <Placeholder group={selectedGroup} title="Robôs" subtitle="Frota de robôs autônomos" columns={['Robô', 'Status', 'Bateria', 'Localização', 'Missão']} stats={['Online', 'Carregando', 'Manutenção', 'Offline']} icon="🤖" emptyTitle="Frota em breve" emptySubtitle="Os robôs ainda não estão conectados. Acompanhe a operação pelo Dashboard." />,
    Alertas: <Placeholder group={selectedGroup} title="Alertas" subtitle="Central de alertas operacionais" columns={['Nível', 'Tipo', 'Mensagem', 'Data', 'Status']} stats={['Críticos', 'Altos', 'Médios', 'Informativos']} icon="⚠️" emptyTitle="Sem alertas por enquanto" emptySubtitle="Quando houver estoque baixo ou eventos importantes, eles aparecem aqui." />,
    "Relatórios": <Placeholder group={selectedGroup} title="Relatórios" subtitle="Indicadores e análises" columns={['Relatório', 'Período', 'Categoria', 'Formato', 'Status']} stats={['Movimentações', 'Eficiência', 'Pedidos', 'Tempo médio']} icon="📊" emptyTitle="Relatórios em breve" emptySubtitle="Use o Dashboard e as Movimentações para acompanhar os números por enquanto." />,
    "Configurações": <Placeholder group={selectedGroup} title="Configurações" subtitle="Preferências do sistema" columns={['Configuração', 'Descrição', 'Categoria', 'Valor', 'Status']} stats={['Empresa', 'Usuários', 'Integrações', 'Sistema']} icon="⚙️" emptyTitle="Ajustes em breve" emptySubtitle="As configurações avançadas chegam em breve. Seus dados e a senha ficam em Meu perfil." />,
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={setPage}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        onProfile={openProfile}
        onLogout={handleLogout}
      />
      <div className="main-wrap">
        <Navbar
          onMenu={() => setMenuOpen(true)}
          groupName={selectedGroup.name}
          onSwitchGroup={openCompanies}
          {...navbarProps}
        />
        <main className="main-content">{pages[page] ?? <Dashboard group={selectedGroup} />}</main>
        <footer>© 2026 Buddy Log</footer>
      </div>
    </div>
  );
}
