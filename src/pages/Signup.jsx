import { useState } from "react";
import logo from "../assets/logo-new.png";
import Popup from "../components/Popup";
import { API_BASE, friendlyError } from "../lib/api";

export default function Signup({ onBackToLogin, invited }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  });

  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (popupOpen) setPopupOpen(false);
  };

  const showError = (message) => {
    setError(message);
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setPopupOpen(false);
    setSuccess("");

    const email = formData.email.trim();
    const displayName = formData.displayName.trim();

    if (email === "" || formData.password === "") {
      showError("Preencha o e-mail e a senha.");
      return;
    }

    if (email.length > 254) {
      showError("Informe um e-mail válido.");
      return;
    }

    if (formData.password.length < 6 || formData.password.length > 72) {
      showError("A senha deve ter entre 6 e 72 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = { email, password: formData.password };
      if (displayName !== "") body.displayName = displayName;

      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 409) {
          showError("Este e-mail já está cadastrado.");
          return;
        }
        if (response.status === 429 && data?.code === "email_rate_limit") {
          showError("O envio de e-mails de confirmação atingiu o limite agora. Espere alguns minutos antes de tentar de novo. Se você já se cadastrou, procure o e-mail na caixa de entrada e no spam.");
          return;
        }
        if (response.status === 429) {
          showError("Muitas tentativas. Tente novamente em alguns minutos.");
          return;
        }
        if (response.status === 400) {
          showError(friendlyError(400, data?.error, "Confira os dados informados. A senha precisa ter entre 6 e 72 caracteres."));
          return;
        }
        showError(friendlyError(response.status, data?.error, "Não foi possível criar sua conta."));
        return;
      }

      if (data?.sessionCreated === false) {
        setSuccess(
          "Conta criada! Abra o link que enviamos para o seu e-mail (veja também o spam) neste mesmo navegador e depois entre no sistema.",
        );
      } else {
        setSuccess("Conta criada com sucesso!");
      }
      setTimeout(() => onBackToLogin(), 1800);
    } catch (error) {
      console.error(error);
      showError("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page login-page--centered">
      <div className="login-background-grid" />
      <form className="login-card login-card--centered login-card--signup" onSubmit={handleSubmit}>
        <img src={logo} alt="Buddylog" className="login-centered-logo" />
        <div className="login-heading login-heading--centered">
          <span>Bem-vindo</span>
          <h1>Crie sua conta</h1>
          <p>{invited ? `Crie sua conta e depois entre para aceitar o convite.` : `Insira seu nome, e-mail e senha`}</p>
        </div>

        <label className="login-field">
          <span>Nome (opcional)</span>
          <input
            type="username"
            name="displayName"
            placeholder="Como devemos te chamar?"
            value={formData.displayName}
            onChange={handleChange}
            autoComplete="nickname"
          />
        </label>

        <label className="login-field">
          <span>E-mail</span>
          <input type="email" name="email" placeholder="operador@empresa.com" value={formData.email} onChange={handleChange} autoComplete="email" />
        </label>

        <label className="login-field login-field--password">
          <span>Senha</span>
          <div className="password-wrap">
            <input type={showPassword ? "text" : "password"} name="password" placeholder="Mínimo de 6 caracteres" value={formData.password} onChange={handleChange} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
          </div>
        </label>

        {error && <p className="login-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
        <button className="login-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando conta..." : "Criar conta"}
        </button>

        <button className="login-note login-signup-link" type="button" onClick={onBackToLogin}>
          Já tem uma conta? entre no sistema.
        </button>
      </form>

      <Popup
        open={popupOpen}
        onClose={handleClosePopup}
        title="Não foi possível criar sua conta"
        subtitle="Verifique o detalhe abaixo e tente novamente."
        error={error}
      />
    </main>
  );
}
