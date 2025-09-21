import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, Session, AuthError } from '@supabase/supabase-js';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// --- Type Definitions ---
type CampaignData = {
  finalUrl: string;
  displayPath1: string;
  displayPath2: string;
  headlines: string[];
  descriptions: string[];
  companyName: string;
  keywords: {
    broad: string[];
    phrase: string[];
    exact: string[];
  };
  sitelinks: {
    text: string;
    description1: string;
    description2: string;
  }[];
  callouts: string[];
  structuredSnippets: string[];
  negativeKeywords: string[];
};

// --- Supabase Client Initialization ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helper Functions & Constants ---
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => password.length >= 6;

// --- UI Components ---

const AuthModal = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // UX Enhancements State
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Por favor, insira um e-mail válido.');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword && !validatePassword(newPassword)) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
    } else {
      setPasswordError(null);
    }
  };
  
  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError || passwordError || !email || !password) {
      setError("Por favor, corrija os erros antes de continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    
    const action = isLogin ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error: authError } = await action({ email, password });

    if (authError) {
      setError(authError.message);
    } else if (!isLogin) {
      setMessage('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <h2>{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
        
        <button className="btn google-btn" onClick={handleGoogleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.6114V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"></path><path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.6114C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.96182 14.4205 5.23727 13.0182 4.56545 11.1818H1.55636V13.4441C3.03364 16.2027 5.79545 18 9 18Z" fill="#34A853"></path><path d="M4.56545 11.1818C4.35636 10.5632 4.24091 9.89909 4.24091 9.18545C4.24091 8.47182 4.35636 7.80773 4.56545 7.18909V4.92682H1.55636C0.822273 6.32909 0.363636 7.91591 0.363636 9.23136C0.363636 10.5468 0.822273 12.1336 1.55636 13.5359L4.56545 11.1818Z" fill="#FBBC05"></path><path d="M9 3.95C10.2318 3.95 11.295 4.36182 12.0818 5.10182L15.0218 2.34455C13.4618 0.891818 11.4255 0 9 0C5.79545 0 3.03364 1.79727 1.55636 4.55591L4.56545 6.81818C5.23727 4.98182 6.96182 3.95 9 3.95Z" fill="#EA4335"></path></svg>
          Continuar com o Google
        </button>

        <div className="divider">OU</div>
        
        <form onSubmit={handleAuthAction}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={handleEmailChange} required />
            {emailError && <p className="error-text">{emailError}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="password-input-wrapper">
              <input id="password" className="input-field" type={showPassword ? 'text' : 'password'} value={password} onChange={handlePasswordChange} onKeyUp={checkCapsLock} onKeyDown={checkCapsLock} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? 
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                }
              </button>
            </div>
            {passwordError && <p className="error-text">{passwordError}</p>}
            {isCapsLockOn && <p className="caps-lock-warning">Caps Lock está ativado</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}</button>
        </form>
        {error && <p className="error-text" style={{textAlign: 'center', marginTop: '1rem'}}>{error}</p>}
        {message && <p className="feedback-text" style={{textAlign: 'center', marginTop: '1rem', color: '#28a745'}}>{message}</p>}
        <div className="auth-modal-switch">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}>
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesPage = ({ onLoginClick }: { onLoginClick: () => void }) => (
  <div className="sales-page">
    <h1>Crie Campanhas para Google Ads 10x mais Rápido com IA</h1>
    <p>O Ads Flow gera estruturas completas com palavras-chave, anúncios e extensões em segundos. Otimize seu tempo e maximize seus resultados.</p>
    <button className="btn btn-primary" onClick={onLoginClick}>Comece Agora</button>
  </div>
);

const CampaignGenerator = ({ session }: { session: Session }) => {
    const [prompt, setPrompt] = useState('');
    const [campaign, setCampaign] = useState<CampaignData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("O prompt não pode estar vazio.");
            return;
        }
        setLoading(true);
        setError(null);
        setCampaign(null);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('generate-campaign', {
                body: { prompt },
            });

            if (functionError) {
                const context = (functionError as any).context;
                let errorMessage = functionError.message;
                if (context && context.json) {
                    try { const errorBody = await context.json(); if (errorBody.error) errorMessage = errorBody.error; } catch (e) {}
                }
                throw new Error(errorMessage);
            }
            setCampaign(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogout = async () => await supabase.auth.signOut();
    
    return (
      <div className="app-container">
          <header className="app-header">
              <h1>Gerador de Campanhas</h1>
              <div className="user-info">
                  <span>{session.user.email}</span>
                  <button onClick={handleLogout} className="btn btn-danger">Sair</button>
              </div>
          </header>
          
          <div className="form-group">
            <label htmlFor="prompt">Descreva seu produto ou serviço:</label>
            <textarea
                id="prompt"
                className="input-field"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: 'Uma loja online que vende carteiras de couro artesanais para homens.'"
                disabled={loading}
            />
          </div>

          <button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="btn btn-primary">
              {loading ? 'Gerando...' : 'Gerar Campanha'}
          </button>
          
          {loading && <p className="feedback-text">Gerando campanha, isso pode levar um momento...</p>}
          {error && <p className="error-text"><strong>Erro:</strong> {error}</p>}
          {campaign && <CampaignDisplay campaign={campaign} prompt={prompt} />}
      </div>
    );
};

const CampaignDisplay = ({ campaign, prompt }: { campaign: CampaignData, prompt: string }) => {
  const renderList = (items: string[]) => <ul className="result-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;

  const handlePrint = async () => {
    try {
      const response = await fetch('/print_template.html');
      if (!response.ok) throw new Error('Template de impressão não encontrado.');
      
      let template = await response.text();

      const escapeHtml = (text: string) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // Build campaign content HTML
      let contentHtml = '';
      contentHtml += `<h2>Títulos (Headlines)</h2><div class="section-content"><ul>${campaign.headlines.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul></div>`;
      contentHtml += `<h2>Descrições</h2><div class="section-content"><ul>${campaign.descriptions.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul></div>`;
      
      contentHtml += `<h2>Palavras-chave</h2>
        <table class="keywords-table">
          <thead><tr><th>Ampla</th><th>Frase</th><th>Exata</th></tr></thead>
          <tbody><tr>
            <td><ul>${campaign.keywords.broad.map(k => `<li>${escapeHtml(k)}</li>`).join('')}</ul></td>
            <td><ul>${campaign.keywords.phrase.map(k => `<li>"${escapeHtml(k)}"</li>`).join('')}</ul></td>
            <td><ul>${campaign.keywords.exact.map(k => `<li>[${escapeHtml(k)}]</li>`).join('')}</ul></td>
          </tr></tbody>
        </table>`;

      contentHtml += `<h2>Sitelinks</h2>${campaign.sitelinks.map(s => `
        <div class="sitelink-item">
          <h4>${escapeHtml(s.text)}</h4>
          <p>${escapeHtml(s.description1)}<br/>${escapeHtml(s.description2)}</p>
        </div>`).join('')}`;

      contentHtml += `<h2>Frases de Destaque (Callouts)</h2><div class="section-content"><ul>${campaign.callouts.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`;
      contentHtml += `<h2>Snippets Estruturados</h2><div class="section-content"><ul>${campaign.structuredSnippets.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`;
      contentHtml += `<h2>Palavras-chave Negativas</h2><ul class="negative-keywords-list">${campaign.negativeKeywords.map(n => `<li>-${escapeHtml(n)}</li>`).join('')}</ul>`;

      // Replace placeholders
      template = template.replace(/\[CAMPAIGN_TITLE\]/g, escapeHtml(`${campaign.companyName} - Campanha Google Ads`));
      template = template.replace(/\[PROMPT\]/g, escapeHtml(prompt));
      template = template.replace(/\[GENERATION_DATE\]/g, new Date().toLocaleDateString('pt-BR'));
      template = template.replace('[CAMPAIGN_CONTENT]', contentHtml);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(template);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } else {
        alert('Por favor, habilite pop-ups para imprimir o relatório.');
      }
    } catch (error) {
      console.error("Erro ao gerar impressão:", error);
      alert("Não foi possível gerar o relatório para impressão.");
    }
  };

  return (
    <div className="result-container">
      <div className="result-header">
        <h2>Campanha Gerada</h2>
        <button onClick={handlePrint} className="btn btn-secondary">
          <span>🖨️</span> Imprimir / Exportar PDF
        </button>
      </div>

      <details className="result-section" open>
        <summary>Informações Gerais</summary>
        <div className="result-content">
          <p><strong>Empresa:</strong> {campaign.companyName}</p>
          <p><strong>URL Final:</strong> <a href={campaign.finalUrl} target="_blank" rel="noopener noreferrer">{campaign.finalUrl}</a></p>
          <p><strong>Caminho de Exibição:</strong> /{campaign.displayPath1}/{campaign.displayPath2}</p>
        </div>
      </details>
      {Object.entries(campaign).map(([key, value]) => {
        if (['companyName', 'finalUrl', 'displayPath1', 'displayPath2', 'keywords'].includes(key)) return null;
        const title = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        if (Array.isArray(value) && value.length > 0) {
          if (typeof value[0] === 'string') {
            return <details key={key} className="result-section"><summary>{title} ({value.length})</summary><div className="result-content">{renderList(value as string[])}</div></details>;
          } else if (typeof value[0] === 'object' && value[0] !== null && (value[0] as any).text) { // Sitelinks
            return <details key={key} className="result-section"><summary>{title} ({value.length})</summary><div className="result-content"><ul className="result-list">{value.map((s: any, i) => <li key={i}><strong>{s.text}</strong><br />{s.description1}<br />{s.description2}</li>)}</ul></div></details>;
          }
        }
        return null;
      })}
       <details className="result-section">
        <summary>Palavras-chave</summary>
        <div className="result-content keyword-group">
            <h4>Correspondência Ampla ({(campaign.keywords?.broad ?? []).length})</h4>{renderList(campaign.keywords?.broad ?? [])}
            <h4>Correspondência de Frase ({(campaign.keywords?.phrase ?? []).length})</h4>{renderList((campaign.keywords?.phrase ?? []).map(k => `"${k}"`))}
            <h4>Correspondência Exata ({(campaign.keywords?.exact ?? []).length})</h4>{renderList((campaign.keywords?.exact ?? []).map(k => `[${k}]`))}
        </div>
      </details>
    </div>
  );
};

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) setShowLogin(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
      return <div>Carregando...</div>; // Simple loader
    }
    
    if (session) {
      return <CampaignGenerator session={session} />;
    }
    
    if (showLogin) {
      return <AuthModal />;
    }

    return <SalesPage onLoginClick={() => setShowLogin(true)} />;
}

// --- DOM Rendering ---
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount the application.");

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
        <Analytics />
    </React.StrictMode>
);