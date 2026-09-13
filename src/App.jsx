/*imports*/
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Empresa from "./pages/Empresa";
import Movimentacoes from "./pages/Movimentacoes";
import Pedidos from "./pages/Pedidos";
import Robos from "./pages/Robos";
import Alertas from "./pages/Alertas";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authPage, setAuthPage] = useState("login");
  const [page, setPage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loggedIn) {
    return authPage === "login" ? (
      <Login onLogin={() => setLoggedIn(true)} onSignup={() => setAuthPage("signup")} />
    ) : (
      <Signup onBackToLogin={() => setAuthPage("login")} />
    );
  }

  const pages = {
    Dashboard: <Dashboard />,
    Estoque: <Estoque />,
    Empresa: <Empresa />,
    "Movimentações": <Movimentacoes />,
    Pedidos: <Pedidos />,
    "Robôs": <Robos />,
    Alertas: <Alertas />,
    "Relatórios": <Relatorios />,
    "Configurações": <Configuracoes />,
  };

  async function checkToken() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/check-token`, {
        method: "GET",
        credentials: "include",
      });
      if(!response.ok) {
        setLoggedIn(false);
      }
    }
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-wrap">
        <Navbar onMenu={() => setMenuOpen(true)} onLogout={() => setLoggedIn(false)} />
        <main className="main-content">{pages[page] ?? <Dashboard />}</main>
        <footer>© 2026 Buddy Log</footer>
      </div>
    </div>
  );
}
