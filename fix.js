import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add react-router-dom imports
content = content.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';"
);

// We will replace currentView with location and navigate logic
content = content.replace(
  "export default function App() {",
  `export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
`
);

// Remove currentView state
content = content.replace(
  /const \[currentView, setCurrentView\] = useState.*?;\n/g,
  ""
);

// Let's replace setCurrentView calls with navigate
content = content.replace(/setCurrentView\(prev => prev === 'welcome' \? 'list' : prev\);/g, "if (location.pathname === '/') navigate('/motos');");
content = content.replace(/setCurrentView\('list'\);/g, "navigate('/motos');");
content = content.replace(/setCurrentView\('add'\)/g, "navigate('/motos/adicionar')");
content = content.replace(/setCurrentView\('edit'\)/g, "navigate(`/motos/${selectedMoto?.id}/editar`)");
content = content.replace(/setCurrentView\('finance'\)/g, "navigate(`/motos/${selectedMoto?.id}/simular`)");
content = content.replace(/setCurrentView\('acessorios'\)/g, "navigate('/acessorios')");
content = content.replace(/setCurrentView\('add_acessorio'\)/g, "navigate('/acessorios/adicionar')");
content = content.replace(/setCurrentView\('edit_acessorio'\)/g, "navigate(`/acessorios/${selectedAcessorio?.id}/editar`)");
content = content.replace(/setCurrentView\(isAdmin \? 'list' : 'welcome'\)/g, "navigate(isAdmin ? '/motos' : '/')");


fs.writeFileSync('src/App_stage1.tsx', content);
console.log("Stage 1 done");
