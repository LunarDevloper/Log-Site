import { useState } from "react";
import logo from "../assets/logo-new.png";

export default function Signup({ onBackToLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  /*marcos substitui aquele baguil do email e do password, na requisição o json tem
  que ser mandado como um só*/
  const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    /*ah e nesse baguil criei uma função pra modularizar mais o código, nesse caso
    como ele tem tudo em um json só tem q pegar os elementos anteriores.*/
  const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

  const handleGoogleSubmit = (e) => {
    e.preventDefault();
    setError("Cadastro com Google ainda não está disponível.");
  }
  
  /*basicamente isso aqui pega a url do servidor e manda um post request,
  dps com o credentials true ele retorna o token de usuario.*/
  const handleSubmit = async(e) => {
    e.preventDefault();

    setError("");

    if (formData.email.trim() === '' || formData.password === '') {
      setError("Preencha o e-mail e a senha.");
      return;
    }

    if(formData.email.length > 254) {
      setError("Informe um e-mail válido.");
      return;
    }
  
    if(formData.password.length < 6 || formData.password.length > 72) {
      setError("A senha deve ter entre 6 e 72 caracteres.");
      return;
    };

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/auth/signup', {
        method: 'POST',
        headers: {
                    'Content-Type': 'application/json'
                },
        credentials: 'include', 
        body: JSON.stringify(formData)
      });
      if(!response.ok) {
        if(response.status === 409) {
          setError("Este e-mail já está cadastrado.");
          return;
        }
        if(response.status === 400) {
          setError("Confira os dados informados.");
          return;
        }
        if(response.status === 429) {
          setError("Muitas tentativas. Tente novamente em alguns minutos.");
          return;
        }
        setError("Não foi possível criar sua conta.");
        return;
      };
      alert('Conta criada com sucesso!');
      onBackToLogin();
    } catch(error) {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  

  return (
    <main className="login-page login-page--centered">
      <div className="login-background-grid" />
      <form className="login-card login-card--centered" onSubmit={handleSubmit}>
        <img src={logo} alt="Buddylog" className="login-centered-logo" />
        <div className="login-heading login-heading--centered">
          <span>Bem-vindo</span>
          <h1>Crie sua conta</h1>
          <p>Insira seu Email e Senha</p>
        </div>

        <label className="login-field">
          <span>E-mail</span>
          <input type="email" name = "email" placeholder="operador@empresa.com" value={formData.email} onChange={handleChange} autoComplete="email" />
        </label>

        <label className="login-field">
          <span>Senha</span>
          <div className="password-wrap">
            <input type={showPassword ? "text" : "password"} name = "password" placeholder="Digite sua senha" value={formData.password} onChange={handleChange} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
          </div>
        </label>

        <div className="login-options">
          <label><input type="checkbox" /> <span>Lembrar de mim</span></label>
          <button type="button">Esqueci minha senha</button>
        </div>

        {error && <p className="login-error">{error}</p>}
        <button className="login-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando conta..." : "Criar conta"}
        </button>

        <div className="login-divider"><span>ou</span></div>
        <button className="google-login" type="button" onClick={handleGoogleSubmit}>
          <svg className="google-icon" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.963 10.706A5.42 5.42 0 0 1 3.682 9c0-.592.102-1.168.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.45.347 2.823.956 4.038l3.007-2.332Z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
          </svg>
          <span>Continuar com Google</span>
        </button>
        <button className="login-note login-signup-link" type="button" onClick={onBackToLogin}>
          Já tem uma conta? entre no sistema.
        </button>
      </form>
    </main>
  );
}
