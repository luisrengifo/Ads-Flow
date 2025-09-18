import React, { useState, useEffect, FC, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const campaignSchema = {
    type: Type.OBJECT,
    properties: {
        finalUrl: { type: Type.STRING, description: "A URL final relevante para o produto/serviço. Ex: https://example.com/produto" },
        displayPath1: { type: Type.STRING, description: "Primeiro caminho de exibição, até 15 caracteres." },
        displayPath2: { type: Type.STRING, description: "Segundo caminho de exibição, até 15 caracteres." },
        headlines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "15 títulos de anúncio, cada um com até 30 caracteres." },
        descriptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 descrições de anúncio, cada uma com até 90 caracteres." },
        companyName: { type: Type.STRING, description: "O nome da empresa, até 25 caracteres." },
        keywords: {
            type: Type.OBJECT,
            properties: {
                broad: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 palavras-chave de correspondência ampla." },
                phrase: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 palavras-chave de correspondência de frase (sem aspas)." },
                exact: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 palavras-chave de correspondência exata (sem colchetes)." },
            },
            required: ["broad", "phrase", "exact"]
        },
        sitelinks: {
            type: Type.ARRAY,
            description: "6 extensões de sitelink.",
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "O texto do sitelink, até 25 caracteres." },
                    description1: { type: Type.STRING, description: "Primeira linha de descrição do sitelink, até 35 caracteres." },
                    description2: { type: Type.STRING, description: "Segunda linha de descrição do sitelink, até 35 caracteres." }
                },
                required: ["text", "description1", "description2"]
            }
        },
        callouts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 frases de destaque, cada uma com até 25 caracteres." },
        structuredSnippets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 snippets estruturados, cada um com até 25 caracteres." },
        negativeKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de pelo menos 20 palavras-chave negativas relevantes." }
    },
    required: ["finalUrl", "displayPath1", "displayPath2", "headlines", "descriptions", "companyName", "keywords", "sitelinks", "callouts", "structuredSnippets", "negativeKeywords"]
};


interface CampaignData {
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
}

const EditableField: FC<{
    initialValue: string;
    onSave: (newValue: string) => void;
    onCopy: (text: string) => void;
}> = ({ initialValue, onSave, onCopy }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleSave = () => {
        onSave(value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="editable-field editing">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus
                />
                <button onClick={handleSave} className="edit-action-button save-button">✓</button>
                <button onClick={() => setIsEditing(false)} className="edit-action-button cancel-button">×</button>
            </div>
        );
    }

    return (
        <div className="editable-field">
            <span>{value}</span>
            <div className="field-actions">
                 <button className="icon-button" onClick={() => setIsEditing(true)} aria-label="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button className="icon-button" onClick={() => onCopy(value)} aria-label="Copy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
        </div>
    );
};

const ResultCard: FC<{ title: string; icon: string; children: ReactNode; fullWidth?: boolean; headerContent?: ReactNode }> = ({ title, icon, children, fullWidth = false, headerContent }) => (
    <div className={`result-card ${fullWidth ? 'full-width' : ''}`}>
        <div className="result-card-header">
            <h3>
                <span role="img" aria-hidden="true" style={{ marginRight: '10px' }}>{icon}</span>
                {title}
            </h3>
            {headerContent}
        </div>
        {children}
    </div>
);

const AdPreview: FC<{
    headline1: string;
    headline2: string;
    description1: string;
    finalUrl: string;
    displayPath1: string;
}> = ({ headline1, headline2, description1, finalUrl, displayPath1 }) => {

    const safeGetHostname = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch (e) {
            return "seusite.com";
        }
    };
    
    const displayUrl = `${safeGetHostname(finalUrl)}${displayPath1 ? '/' + displayPath1 : ''}`;
    
    return (
        <div className="ad-preview-mobile-frame">
            <div className="ad-preview-google-ui">
                <div className="ad-preview-header">
                    <svg className="ad-preview-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" /></svg>
                    <svg className="google-logo" viewBox="0 0 184 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M30.3421 46.8181C27.994 46.8181 25.9602 46.1249 24.2407 44.7385C22.5212 43.3521 21.3934 41.5181 20.8573 39.2365H39.5855V35.9363C39.5855 34.0205 39.1171 32.321 38.1804 30.8378C37.2436 29.3546 35.9647 28.1724 34.3438 27.2912C32.7228 26.41 30.8676 25.9694 28.7782 25.9694C26.1795 25.9694 23.9458 26.623 22.077 27.9302C20.2082 29.2374 18.8079 30.9818 17.8711 33.1633C16.9344 35.3448 16.466 37.7801 16.466 40.4691C16.466 43.0761 16.9454 45.4405 17.9042 47.5621C18.863 49.6837 20.239 51.4111 22.0321 52.7443C23.8251 54.0775 25.9787 54.7441 28.4972 54.7441C31.788 54.7441 34.396 53.9458 36.3182 52.3492C38.2404 50.7526 39.4687 48.7776 39.9948 46.4397H30.7069L30.3421 46.8181Z" fill="#EA4335"></path>
                        <path d="M57.9495 54.2185C59.5705 54.2185 61.0384 53.7901 62.3533 52.9333C63.6681 52.0765 64.6769 50.9288 65.3796 49.4901L61.859 47.7809C61.3807 48.7405 60.6779 49.4463 59.7508 49.9079C58.8236 50.3695 57.9436 50.5925 57.1107 50.5925C55.9363 50.5925 54.9149 50.2592 54.0465 49.5926C53.1781 48.926 52.5855 48.0166 52.2687 46.8639H66.4566V45.6997C66.4566 42.4833 65.407 39.8845 63.3176 37.9025C61.2282 35.9205 58.5298 34.9315 55.228 34.9315C52.4884 34.9315 50.081 35.6157 48.0058 36.9837C45.9306 38.3517 44.3547 40.1857 43.278 42.4855C42.2013 44.7853 41.663 47.3389 41.663 50.1463C41.663 52.8719 42.1901 55.3541 43.2458 57.5937C44.3014 59.8333 45.8564 61.6173 47.912 62.9465C49.9677 64.2757 52.4226 64.9423 55.2772 64.9423C57.4308 64.9423 59.2783 64.5513 60.8202 63.7693C62.362 62.9873 63.6065 61.9447 64.5542 60.6415L61.6318 58.464L57.9495 54.2185Z" fill="#FBBC05"></p>
                        <path d="M78.6835 20.3069C77.4046 19.0147 75.8197 18.3686 73.9248 18.3686C72.0298 18.3686 70.4449 19.0147 69.166 20.3069C67.8871 21.5991 67.2476 23.2109 67.2476 25.1423C67.2476 27.0737 67.8871 28.6855 69.166 29.9777C70.4449 31.2699 72.0298 31.916 73.9248 31.916C75.8197 31.916 77.4046 31.2699 78.6835 29.9777C79.9624 28.6855 80.6018 27.0737 80.6018 25.1423C80.6018 23.2109 79.9624 21.5991 78.6835 20.3069ZM75.6698 27.5411C75.1437 28.0583 74.5512 28.3169 73.8913 28.3169C73.2314 28.3169 72.6389 28.0583 72.1128 27.5411C71.5867 27.0239 71.3236 26.3475 71.3236 25.5119C71.3236 24.6763 71.5867 24.0039 72.1128 23.4907C72.6389 22.9775 73.2314 22.7209 73.8913 22.7209C74.5512 22.7209 75.1437 22.9775 75.6698 23.4907C76.1959 24.0039 76.459 24.6763 76.459 25.5119C76.459 26.3475 76.1959 27.0239 75.6698 27.5411Z" fill="#4285F4"></p>
                        <path d="M106.321 27.5411C105.795 28.0583 105.203 28.3169 104.543 28.3169C103.883 28.3169 103.29 28.0583 102.764 27.5411C102.238 27.0239 101.975 26.3475 101.975 25.5119C101.975 24.6763 102.238 24.0039 102.764 23.4907C103.29 22.9775 103.883 22.7209 104.543 22.7209C105.203 22.7209 105.795 22.9775 106.321 23.4907C106.847 24.0039 107.11 24.6763 107.11 25.5119C107.11 26.3475 106.847 27.0239 106.321 27.5411ZM89.3353 20.3069C88.0564 19.0147 86.4715 18.3686 84.5766 18.3686C82.6817 18.3686 81.0967 19.0147 79.8178 20.3069C78.5389 21.5991 77.8995 23.2109 77.8995 25.1423C77.8995 27.0737 78.5389 28.6855 79.8178 29.9777C81.0967 31.2699 82.6817 31.916 84.5766 31.916C86.4715 31.916 88.0564 31.2699 89.3353 29.9777C90.6142 28.6855 91.2537 27.0737 91.2537 25.1423C91.2537 23.2109 90.6142 21.5991 89.3353 20.3069ZM86.3216 27.5411C85.7955 28.0583 85.203 28.3169 84.5431 28.3169C83.8832 28.3169 83.2907 28.0583 82.7646 27.5411C82.2385 27.0239 81.9754 26.3475 81.9754 25.5119C81.9754 24.6763 82.2385 24.0039 82.7646 23.4907C83.2907 22.9775 83.8832 22.7209 84.5431 22.7209C85.203 22.7209 85.7955 22.9775 86.3216 23.4907C86.8477 24.0039 87.1108 24.6763 87.1108 25.5119C87.1108 26.3475 86.8477 27.0239 86.3216 27.5411Z" fill="#4285F4"></path>
                        <path d="M96.6575 64V18.816H100.22V64H96.6575Z" fill="#34A853"></path>
                        <path d="M116.347 27.5411C115.821 28.0583 115.228 28.3169 114.568 28.3169C113.909 28.3169 113.316 28.0583 112.79 27.5411C112.264 27.0239 112.001 26.3475 112.001 25.5119C112.001 24.6763 112.264 24.0039 112.79 23.4907C113.316 22.9775 113.909 22.7209 114.568 22.7209C115.228 22.7209 115.821 22.9775 116.347 23.4907C116.873 24.0039 117.136 24.6763 117.136 25.5119C117.136 26.3475 116.873 27.0239 116.347 27.5411ZM113.784 41.5995L116.29 40.3547C116.036 39.9263 115.758 39.5447 115.454 39.2114C115.15 38.8781 114.657 38.5125 113.975 38.1145C113.293 37.7165 112.518 37.4089 111.65 37.1917C110.782 36.9745 109.914 36.8659 109.046 36.8659C107.567 36.8659 106.338 37.2883 105.358 38.1343C104.379 38.9803 103.889 40.1095 103.889 41.5219C103.889 42.7119 104.25 43.7147 104.972 44.5303C105.694 45.3459 106.639 45.9895 107.808 46.4611C108.976 46.9327 110.33 47.3307 111.87 47.6547C113.409 47.9787 114.908 48.4031 116.368 48.9275C117.828 49.4519 119.034 50.1875 119.986 51.1343C120.938 52.0811 121.414 53.2807 121.414 54.7331C121.414 56.5563 120.738 58.0775 119.386 59.2967C118.034 60.5159 116.323 61.1255 114.254 61.1255C112.834 61.1255 111.51 60.8531 110.281 60.3083C109.052 59.7635 107.972 59.0135 107.039 58.0583L109.604 55.7727C110.302 56.4947 111.092 57.0671 111.975 57.4895C112.858 57.9119 113.682 58.1231 114.448 58.1231C115.682 58.1231 116.643 57.7575 117.332 57.0263C118.02 56.2951 118.364 55.3727 118.364 54.2591C118.364 53.1131 118.02 52.2035 117.332 51.5303C116.643 50.8571 115.738 50.3111 114.618 49.8927C113.498 49.4743 112.214 49.0743 110.766 48.6927C109.318 48.3111 107.882 47.8531 106.458 47.3187C105.034 46.7843 103.864 46.0383 102.948 45.0807C102.032 44.1231 101.574 42.9275 101.574 41.4947C101.574 39.8835 102.162 38.5307 103.338 37.4363C104.514 36.3419 105.996 35.7947 107.784 35.7947C109.136 35.7947 110.364 36.0579 111.47 36.5843C112.576 37.1107 113.486 37.8163 114.198 38.6995L113.784 41.5995Z" fill="#FBBC05"></path>
                        <path d="M127.34 64V0.551998H130.902V64H127.34Z" fill="#4285F4"></path>
                        <path d="M141.656 27.5411C141.13 28.0583 140.537 28.3169 139.877 28.3169C139.218 28.3169 138.625 28.0583 138.099 27.5411C137.573 27.0239 137.31 26.3475 137.31 25.5119C137.31 24.6763 137.573 24.0039 138.099 23.4907C138.625 22.9775 139.218 22.7209 139.877 22.7209C140.537 22.7209 141.13 22.9775 141.656 23.4907C142.182 24.0039 142.445 24.6763 142.445 25.5119C142.445 26.3475 142.182 27.0239 141.656 27.5411ZM138.127 64V37.316H141.689V64H138.127Z" fill="#EA4335"></path>
                        <path d="M157.971 50.1423C157.287 50.9405 156.408 51.5275 155.332 51.9031C154.256 52.2787 153.112 52.4665 151.899 52.4665C150.17 52.4665 148.691 52.0223 147.462 51.1343C146.233 50.2463 145.31 49.0935 144.691 47.6763C144.072 46.2591 143.763 44.6923 143.763 42.9759C143.763 41.2271 144.072 39.6499 144.691 38.2443C145.31 36.8387 146.228 35.6911 147.452 34.8003C148.676 33.9095 150.149 33.4641 151.872 33.4641C153.513 33.4641 154.918 33.8457 156.087 34.6087L154.516 37.0543C153.766 36.5603 152.924 36.3133 151.992 36.3133C150.628 36.3133 149.544 36.8265 148.738 37.8527C147.933 38.8789 147.53 40.2383 147.53 41.9307V43.6661H158.42V41.7429C158.42 40.0181 158.055 38.6009 157.324 37.4905C156.593 36.3801 155.572 35.5341 154.26 34.9525L156.344 32.2635L152.534 30.045L150.137 33.2513C149.339 32.8427 148.428 32.5517 147.406 32.3783C146.385 32.2049 145.345 32.1182 144.288 32.1182H144.272L144.256 32.1282V32.1462L144.24 32.1642C143.498 33.3022 142.924 34.5838 142.518 36.0086C142.112 37.4334 141.91 38.9666 141.91 40.6082V40.6222L141.922 40.6502C142.158 43.1934 142.844 45.4746 143.98 47.4942C145.116 49.5138 146.648 51.1594 148.578 52.431C150.508 53.7026 152.756 54.3384 155.322 54.3384C156.516 54.3384 157.644 54.1434 158.704 53.7534C159.764 53.3634 160.712 52.8018 161.548 52.0686L157.971 50.1423Z" fill="#EA4335"></path>
                        <path d="M168.311 64H164.748V37.316H168.311V64ZM166.529 32.0835C167.808 30.7913 167.808 28.8599 166.529 27.5677C165.25 26.2755 163.284 26.2755 162.005 27.5677C160.726 28.8599 160.726 30.7913 162.005 32.0835C163.284 33.3757 165.25 33.3757 166.529 32.0835Z" fill="#34A853"></path>
                        <path d="M182.729 50.1423L179.153 52.0686C178.316 52.8018 177.368 53.3634 176.308 53.7534C175.248 54.1434 174.12 54.3384 172.926 54.3384C170.36 54.3384 168.112 53.7026 166.182 52.431C164.252 51.1594 162.72 49.5138 162.584 47.4942C161.448 45.4746 160.762 43.1934 160.526 40.6502L160.514 40.6222V40.6082C160.514 38.9666 160.716 37.4334 161.122 36.0086C161.528 34.5838 162.102 33.3022 162.844 32.1642L162.859 32.1462V32.1282L162.876 32.1182H162.892C163.948 32.1182 164.989 32.2049 166.01 32.3783C167.032 32.5517 167.942 32.8427 168.741 33.2513L171.138 30.045L174.948 32.2635L172.863 34.9525C174.176 35.5341 175.196 36.3801 175.928 37.4905C176.658 38.6009 177.024 40.0181 177.024 41.7429H177.039V43.6661H183.124V41.9307C183.124 40.2383 182.722 38.8789 181.916 37.8527C181.112 36.8265 180.028 36.3133 178.663 36.3133C177.732 36.3133 176.889 36.5603 176.139 37.0543L174.568 34.6087C175.736 33.8457 177.142 33.4641 178.783 33.4641C180.506 33.4641 181.979 33.9095 183.203 34.8003C184.426 35.6911 185.344 36.8387 185.964 38.2443C186.583 39.6499 186.892 41.2271 186.892 42.9759C186.892 44.6923 186.583 46.2591 185.964 47.6763C185.344 49.0935 184.422 50.2463 183.192 51.1343C181.963 52.0223 180.484 52.4665 178.755 52.4665C177.542 52.4665 176.4 52.2787 175.323 51.9031C174.248 51.5275 173.368 50.9405 172.684 50.1423L182.729 50.1423Z" fill="#4285F4"></path>
                    </svg>
                    <div className="ad-preview-profile-icon"></div>
                </div>
                <div className="ad-preview-search-bar">
                    <svg className="ad-preview-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>
                </div>
                <div className="ad-preview-filters">
                    <div className="filter-chip active"></div>
                    <div className="filter-chip"></div>
                    <div className="filter-chip"></div>
                    <div className="filter-chip"></div>
                </div>
            </div>
            <div className="ad-preview-unit">
                <strong className="ad-preview-sponsored">Patrocinado</strong>
                <div className="ad-preview-source">
                    <div className="ad-preview-favicon">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285f4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <span className="ad-preview-display-url">{displayUrl}</span>
                </div>
                <h3 className="ad-preview-headline">{headline1} - {headline2}</h3>
                <p className="ad-preview-description">{description1}</p>
            </div>
            <div className="ad-result-placeholder">
                <div className="placeholder-line title"></div>
                <div className="placeholder-line text"></div>
                <div className="placeholder-line text short"></div>
            </div>
             <div className="ad-result-placeholder">
                <div className="placeholder-line title"></div>
                <div className="placeholder-line text"></div>
                <div className="placeholder-line text short"></div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [theme, setTheme] = useState('dark');
    const [sitelinkBaseUrl, setSitelinkBaseUrl] = useState('');

    useEffect(() => {
        document.body.className = `${theme}-mode`;
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Por favor, descreva o contexto da sua campanha.');
            return;
        }
        setLoading(true);
        setError('');
        setCampaignData(null);
        setSitelinkBaseUrl('');

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Gere uma estrutura completa de campanha de Google Ads (Rede de Pesquisa) para o seguinte contexto: "${prompt}". A resposta DEVE ser um JSON válido que siga o schema fornecido.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: campaignSchema,
                },
            });

            const parsedData = JSON.parse(result.text);
            setCampaignData(parsedData);
            setSitelinkBaseUrl(parsedData.finalUrl || 'https://sitedocliente.com');
        } catch (e) {
            console.error(e);
            setError('Ocorreu um erro ao gerar a campanha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleUpdateData = (path: (string | number)[], value: string) => {
        if (!campaignData) return;
    
        setCampaignData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy
            let current = newData;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newData;
        });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 1500);
    };
    
    const formatSitelinkUrl = (baseUrl: string, index: number): string => {
        let cleanUrl = (baseUrl || 'https://sitedocliente.com').trim();
        const queryIndex = cleanUrl.indexOf('?');
        if (queryIndex !== -1) cleanUrl = cleanUrl.substring(0, queryIndex);
        const hashIndex = cleanUrl.indexOf('#');
        if (hashIndex !== -1) cleanUrl = cleanUrl.substring(0, hashIndex);
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        const utmParams = `/?utm_source=google-ads&utm_campaign=sitelink&utm_content=0${index + 1}`;
        return cleanUrl + utmParams;
    };
    
    const handleExport = (format: 'txt' | 'csv') => {
        if (!campaignData) return;
        
        let content = '';
        const filename = `campanha_google_ads_${new Date().toISOString().split('T')[0]}`;

        const { keywords, headlines, descriptions, sitelinks, callouts, structuredSnippets, negativeKeywords, ...rest } = campaignData;

        if (format === 'txt') {
            content = `ESTRUTURA DA CAMPANHA GOOGLE ADS\n=================================\n\n`;
            content += `URL Final: ${rest.finalUrl}\n`;
            content += `Caminho de Exibição: /${rest.displayPath1}/${rest.displayPath2}\n`;
            content += `Nome da Empresa: ${rest.companyName}\n\n`;
            
            content += `Títulos:\n${headlines.map(h => `- ${h}`).join('\n')}\n\n`;
            content += `Descrições:\n${descriptions.map(d => `- ${d}`).join('\n')}\n\n`;
            
            content += `Palavras-chave (Ampla):\n${keywords.broad.map(k => `- ${k}`).join('\n')}\n\n`;
            content += `Palavras-chave (Frase):\n${keywords.phrase.map(k => `- "${k.replace(/"/g, '')}"`).join('\n')}\n\n`;
            content += `Palavras-chave (Exata):\n${keywords.exact.map(k => `- [${k.replace(/\[|\]/g, '')}]`).join('\n')}\n\n`;
            
            content += `Sitelinks:\n${sitelinks.map((s, i) => `- ${s.text}\n  - ${s.description1}\n  - ${s.description2}\n  - ${formatSitelinkUrl(sitelinkBaseUrl, i)}`).join('\n\n')}\n\n`;
            content += `Frases de Destaque:\n${callouts.map(c => `- ${c}`).join('\n')}\n\n`;
            content += `Snippets Estruturados:\n${structuredSnippets.map(s => `- ${s}`).join('\n')}\n\n`;
            content += `Palavras-chave Negativas:\n${negativeKeywords.map(n => `- ${n}`).join('\n')}`;
            
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.txt`;
            a.click();
            URL.revokeObjectURL(url);

        } else if (format === 'csv') {
            content = 'Tipo de Ativo,Valor 1,Valor 2,Valor 3\n';
            headlines.forEach(h => content += `Título,"${h}"\n`);
            descriptions.forEach(d => content += `Descrição,"${d}"\n`);
            keywords.broad.forEach(k => content += `Palavra-chave (Ampla),${k}\n`);
            keywords.phrase.forEach(k => content += `Palavra-chave (Frase),"${k.replace(/"/g, '')}"\n`);
            keywords.exact.forEach(k => content += `Palavra-chave (Exata),[${k.replace(/\[|\]/g, '')}]\n`);
            sitelinks.forEach((s, i) => content += `Sitelink,"${s.text}","${s.description1} | ${s.description2}","${formatSitelinkUrl(sitelinkBaseUrl, i)}"\n`);
            callouts.forEach(c => content += `Frase de Destaque,"${c}"\n`);
            structuredSnippets.forEach(s => content += `Snippet Estruturado,"${s}"\n`);
            negativeKeywords.forEach(n => content += `Palavra-chave Negativa,${n}\n`);
            
            const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
    
    const getPopulatedHtml = async (data: CampaignData, promptText: string, baseUrl: string): Promise<string> => {
        try {
            const response = await fetch('/print_template.html');
            if (!response.ok) throw new Error('Template não encontrado');
            let template = await response.text();

            const createList = (items: string[]) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;

            const keywordsHtml = `
                <table class="keywords-table">
                    <thead>
                        <tr>
                            <th>Ampla</th>
                            <th>Frase</th>
                            <th>Exata</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${createList(data.keywords.broad)}</td>
                            <td>${createList(data.keywords.phrase.map(k => `"${k.replace(/"/g, '')}"`))}</td>
                            <td>${createList(data.keywords.exact.map(k => `[${k.replace(/\[|\]/g, '')}]`))}</td>
                        </tr>
                    </tbody>
                </table>`;

            const sitelinksHtml = data.sitelinks.map((s, i) => `
                <div class="sitelink-item">
                    <h4>${s.text}</h4>
                    <p>${s.description1}<br/>${s.description2}</p>
                    <a href="${formatSitelinkUrl(baseUrl, i)}">${formatSitelinkUrl(baseUrl, i)}</a>
                </div>
            `).join('');

            const contentHtml = `
                <h2>Informações Gerais</h2>
                <div class="section-content">
                    <ul>
                        <li><strong>URL Final:</strong> ${data.finalUrl}</li>
                        <li><strong>Caminho de Exibição:</strong> /${data.displayPath1}/${data.displayPath2}</li>
                        <li><strong>Nome da Empresa:</strong> ${data.companyName}</li>
                    </ul>
                </div>

                <h2>Títulos</h2>
                <div class="section-content">${createList(data.headlines)}</div>

                <h2>Descrições</h2>
                <div class="section-content">${createList(data.descriptions)}</div>

                <h2>Palavras-chave</h2>
                ${keywordsHtml}

                <h2>Sitelinks</h2>
                ${sitelinksHtml}

                <h2>Frases de Destaque</h2>
                <div class="section-content">${createList(data.callouts)}</div>

                <h2>Snippets Estruturados</h2>
                <div class="section-content">${createList(data.structuredSnippets)}</div>

                <h2>Palavras-chave Negativas</h2>
                <ul class="negative-keywords-list">${data.negativeKeywords.map(k => `<li>-${k}</li>`).join('')}</ul>
            `;

            template = template.replace(/\[CAMPAIGN_TITLE\]/g, 'Estrutura de Campanha Google Ads');
            template = template.replace(/\[PROMPT\]/g, promptText);
            template = template.replace(/\[GENERATION_DATE\]/g, new Date().toLocaleDateString('pt-BR'));
            template = template.replace('[CAMPAIGN_CONTENT]', contentHtml);
            
            return template;
        } catch (e) {
            console.error("Erro ao popular o template:", e);
            throw e;
        }
    };
    
    const handlePrint = async () => {
        if (!campaignData) return;

        try {
            const htmlString = await getPopulatedHtml(campaignData, prompt, sitelinkBaseUrl);
            const printWindow = window.open('', '_blank');
            
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(htmlString);
                printWindow.document.close();

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 500);
            } else {
                 throw new Error("Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.");
            }
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            setError("Ocorreu um erro ao preparar o documento para impressão.");
        }
    };

    const handleCopyAll = (data: string[]) => {
        if (!data) return;
        handleCopy(data.join('\n'));
    };

    const handleCopyAllKeywords = () => {
        if (!campaignData) return;
        const { broad, phrase, exact } = campaignData.keywords;
        const content = `Ampla:\n${broad.join('\n')}\n\nFrase:\n${phrase.map(k => `"${k.replace(/"/g, '')}"`).join('\n')}\n\nExata:\n${exact.map(k => `[${k.replace(/\[|\]/g, '')}]`).join('\n')}`;
        handleCopy(content);
    };
    
    const handleCopyAllSitelinks = () => {
        if (!campaignData) return;
        const content = campaignData.sitelinks.map((s, i) => {
            return `Texto: ${s.text}\nDescrição 1: ${s.description1}\nDescrição 2: ${s.description2}\nURL: ${formatSitelinkUrl(sitelinkBaseUrl, i)}`;
        }).join('\n\n');
        handleCopy(content);
    };

    const handleCopyAllNegative = () => {
        if (!campaignData || !campaignData.negativeKeywords) return;
        const formattedKeywords = campaignData.negativeKeywords.map(k => `-${k}`).join(', ');
        handleCopy(formattedKeywords);
    };

    return (
        <div className="container">
            <header>
                 <h1 className="app-name"><span>Ads Flow</span></h1>
                 <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
            </header>
            
            <main>
                <div className="input-section">
                    <h2 className="title-neon">
                        É Inteligênte, É Único, É <span className="title-gradient">Ads Flow</span>
                    </h2>
                    <p>
                       Crie campanhas no Google Ads em <strong className="highlight-white">segundos</strong>. Insira o contexto da sua marca, produto ou serviço e deixe que o Ads Flow gere uma estrutura <strong className="highlight-white">completa e otimizada</strong> para a Rede de Pesquisa.
                    </p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Crie uma campanha para uma loja de Sapatos em São Paulo, focada no público feminino entre 25-40 anos. Destaque o frete grátis e a produção sustentável."
                        disabled={loading}
                        rows={5}
                    />
                    <button className="generate-button" onClick={handleGenerate} disabled={loading}>
                        {loading ? (
                            <div className="spinner"></div>
                        ) : (
                            'Gerar Estrutura'
                        )}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {loading && (
                     <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Estamos construindo uma Estrutura de Campanhas Google Ads na Rede de Pesquisa...</p>
                    </div>
                )}
                
                {campaignData && (
                    <div className="results-section">
                        <div className="export-controls">
                           <h3>Exportar Estrutura</h3>
                           <div className="export-buttons">
                               <button onClick={() => handleExport('txt')}>
                                   <span role="img" aria-hidden="true">📄</span> Exportar TXT
                               </button>
                               <button onClick={() => handleExport('csv')}>
                                   <span role="img" aria-hidden="true">📊</span> Exportar CSV
                               </button>
                               <button onClick={handlePrint}>
                                   <span role="img" aria-hidden="true">🖨️</span> Imprimir / PDF
                               </button>
                           </div>
                       </div>

                         <div className="ad-previews-grid">
                           {[0, 1, 2].map(i => (
                               <AdPreview 
                                   key={i}
                                   headline1={campaignData.headlines?.[i % campaignData.headlines.length] || ''}
                                   headline2={campaignData.headlines?.[(i + 1) % campaignData.headlines.length] || ''}
                                   description1={campaignData.descriptions?.[i % campaignData.descriptions.length] || ''}
                                   finalUrl={campaignData.finalUrl}
                                   displayPath1={campaignData.displayPath1}
                               />
                           ))}
                       </div>
                       
                        <div className="results-grid">
                            <ResultCard 
                                icon="🔑" 
                                title="Palavras-chave"
                                headerContent={<button className="copy-all-button" onClick={handleCopyAllKeywords}>Copiar Todas</button>}
                            >
                                <h4>Ampla</h4>
                                <ul>{campaignData.keywords.broad.map((kw, i) => <li key={`b-${i}`}><EditableField initialValue={kw} onSave={(v) => handleUpdateData(['keywords', 'broad', i], v)} onCopy={handleCopy} /></li>)}</ul>
                                <h4>Frase</h4>
                                <ul>{campaignData.keywords.phrase.map((kw, i) => <li key={`p-${i}`}><EditableField initialValue={`"${kw.replace(/"/g, '')}"`} onSave={(v) => handleUpdateData(['keywords', 'phrase', i], v.replace(/"/g, ''))} onCopy={handleCopy} /></li>)}</ul>
                                <h4>Exata</h4>
                                <ul>{campaignData.keywords.exact.map((kw, i) => <li key={`e-${i}`}><EditableField initialValue={`[${kw.replace(/\[|\]/g, '')}]`} onSave={(v) => handleUpdateData(['keywords', 'exact', i], v.replace(/\[|\]/g, ''))} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="🏷️" 
                                title="Títulos"
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.headlines)}>Copiar Todas</button>}
                            >
                                <p className="card-description">Quanto mais idéias de títulos você inserir, maiores serão as chances de o Google Ads veicular anúncios associados às consultas de pesquisa dos clientes em potencial, o que pode melhorar a performance da publicidade.</p>
                                <ul>{campaignData.headlines.map((h, i) => <li key={`h-${i}`}><EditableField initialValue={h} onSave={(v) => handleUpdateData(['headlines', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="📝" 
                                title="Descrições" 
                                fullWidth={true}
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.descriptions)}>Copiar Todas</button>}
                            >
                                <p className="card-description">Quanto mais idéias de descrições você inserir, maiores serão as chances de o Google Ads veicular anúncios associados às consultas de pesquisa dos clientes em potencial, o que pode melhorar a performance da publicidade.</p>
                                <ul>{campaignData.descriptions.map((d, i) => <li key={`d-${i}`}><EditableField initialValue={d} onSave={(v) => handleUpdateData(['descriptions', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>

                            <ResultCard 
                                icon="🔗" 
                                title="Sitelinks" 
                                fullWidth={true}
                                headerContent={<button className="copy-all-button" onClick={handleCopyAllSitelinks}>Copiar Todas</button>}
                            >
                                <p className="card-description">Adicione links aos anúncios para direcionar as pessoas a páginas específicas do seu site (por exemplo, a página de um determinado produto ou que mostra o horário de funcionamento da loja).</p>
                                <div className="sitelink-url-input">
                                    <label htmlFor="sitelink-base-url">URL Base para Sitelinks:</label>
                                    <input
                                        id="sitelink-base-url"
                                        type="text"
                                        value={sitelinkBaseUrl}
                                        onChange={(e) => setSitelinkBaseUrl(e.target.value)}
                                        placeholder="https://sitedocliente.com"
                                    />
                                    <p>
                                        Insira a <strong className="highlight-white">URL principal sem a / no final</strong> que será usada nos sitelinks. O código de rastreamento será adicionado automaticamente.
                                    </p>
                                </div>
                                <div className="sitelinks-grid">
                                    {campaignData.sitelinks.map((s, i) => (
                                        <div key={`sl-${i}`} className="sitelink-item">
                                            <strong><EditableField initialValue={s.text} onSave={(v) => handleUpdateData(['sitelinks', i, 'text'], v)} onCopy={handleCopy} /></strong>
                                            <div className="sitelink-descriptions">
                                                <EditableField initialValue={s.description1} onSave={(v) => handleUpdateData(['sitelinks', i, 'description1'], v)} onCopy={handleCopy} />
                                                <EditableField initialValue={s.description2} onSave={(v) => handleUpdateData(['sitelinks', i, 'description2'], v)} onCopy={handleCopy} />
                                            </div>
                                            <small>{formatSitelinkUrl(sitelinkBaseUrl, i)}</small>
                                        </div>
                                    ))}
                                </div>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="✨" 
                                title="Frases de Destaque"
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.callouts)}>Copiar Todas</button>}
                            >
                                <p className="card-description">As frases de destaque podem melhorar seus anúncios de texto por meio da promoção de ofertas exclusivas para os compradores, como frete grátis ou atendimento ao cliente 24 horas.</p>
                                <ul>{campaignData.callouts.map((c, i) => <li key={`c-${i}`}><EditableField initialValue={c} onSave={(v) => handleUpdateData(['callouts', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                            <ResultCard 
                                icon="📑" 
                                title="Snippets Estruturados"
                                headerContent={<button className="copy-all-button" onClick={() => handleCopyAll(campaignData.structuredSnippets)}>Copiar Todas</button>}
                            >
                                <p className="card-description">Snippets estruturados são recursos que destacam aspectos específicos dos seus produtos e serviços. Eles aparecem abaixo do seu anúncio de texto em formato de cabeçalho (por exemplo: "Destinos") e lista de valores (por exemplo: "Havaí, Costa Rica, África do Sul").</p>
                                <ul>{campaignData.structuredSnippets.map((s, i) => <li key={`s-${i}`}><EditableField initialValue={s} onSave={(v) => handleUpdateData(['structuredSnippets', i], v)} onCopy={handleCopy} /></li>)}</ul>
                            </ResultCard>
                            
                           <ResultCard 
                                icon="⛔" 
                                title="Palavras-chave Negativas" 
                                fullWidth={true}
                                headerContent={
                                    <button className="copy-all-button" onClick={handleCopyAllNegative}>Copiar Todas</button>
                                }
                            >
                                <ul className="negative-keywords-list">
                                    {campaignData.negativeKeywords.map((n, i) => <li key={`n-${i}`}><EditableField initialValue={n} onSave={(v) => handleUpdateData(['negativeKeywords', i], v)} onCopy={handleCopy} /></li>)}
                                </ul>
                            </ResultCard>
                        </div>
                    </div>
                )}
                {copiedText && <div className="copy-feedback">Copiado!</div>}
            </main>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}