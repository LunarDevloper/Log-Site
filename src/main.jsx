import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./style/global.css";
import "./style/sidebar.css";
import "./style/navbar.css";
import "./style/dashboard.css";
import "./style/login.css";
import "./style/responsividade.css";
import "./style/tabela.css";
import "./style/popup.css";
import "./style/feedback.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
