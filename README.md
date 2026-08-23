# Projeto-Integrador - NutriCare

# Integrantes: 
- Eliza Freitas de Castro
- Guilherme Santana dos Santos
- João Vitor de Morais Alecrim
- Pedro Vinícius Rodrigues de Pereira Nunes
- Thiago Kenji Ikuta

# Descrição
Esse repositório consiste no desenvolvimento de um site com ferramentas auxiliadoras para nutricionistas e seus pacientes. Em sua versão final é previsto: a possibilidade de fazer login e cadastro no site; ter acesso a listas nutricionais e de compras; chat entre nutricionista e seus pacientes 1:1; sistema de notificações e lembrete;

## Link Resumo Executivo: 
https://docs.google.com/document/d/1w40eF5QYKog1Rj22_BCrdCqP8hqQKt0aKfcndPbvxDc/edit?usp=sharing

# Instruções de Execução:

Frontend:
Em um terminal digite os seguintes comandos:
Set-Location .\frontend
npm install  
npm run dev

Backend: 
 Em um terminal digite os seguintes comandos:
 Set-Location .\nutri-backend
 python -m venv .venv
 .venv\Scripts\activate
 pip install -r requirements.txt
 python -m uvicorn app.main:app --reload

---

## EVOLUÇÃO — Início vs. Estado atual

| Área | Início | Estado atual |
|---|---|---|
| **Autenticação** | Login/registro simples, sem renovação | JWT refresh automático com singleton promise, sem race condition |
| **Rotas** | ~5 rotas básicas | 14 rotas, todas protegidas via `RequireAuth` |
| **Dashboard** | Cards estáticos por role | Badges de não lidas, banner de convites, avatar, cards específicos por role |
| **Dieta do paciente** | Visualização estática | Checklist reativo, gráfico de adesão, view semana/dia, histórico de peso, PDF |
| **Editor de plano** | Apenas visualização | Editor inline por dia + aplicar para todos os dias |
| **Busca de alimentos** | Campo de texto livre | Autocomplete TACO com 80+ alimentos brasileiros, auto-preenchimento de quantidade e unidade |
| **Mensagens** | Chat básico sem estado de leitura | Mark-as-read, badges, polling, notificações nativas do browser |
| **Perfil** | Setup obrigatório apenas | Edição completa com avatar, especialidade, dados de saúde por role |
| **Convites** | Vínculo direto e imediato | Fluxo de convite com aceitar/recusar no Dashboard |
| **Histórico** | Nenhum | Histórico de planos do paciente com status e nutricionista |
| **Backend** | ~8 endpoints básicos | 20+ endpoints, validações de role, enriquecimento entre tabelas |
| **Segurança API** | Token sem renovação | Interceptor Axios com singleton promise evita refreshes paralelos |

---
# Contribuições Rndividuais:
- Eliza Freitas de Castro: Telas Figma, Implementação do botão de login/cadastro por Google e Apple.
- Guilherme Santana dos Santos: Auxilio na documentação do projeto.
- João Vitor de Morais Alecrim: Criação,atualização e manutenção de novas telas do frontend
- Pedro Vinícius Rodrigues de Pereira Nunes: Auxilio no backend, atualização do README
- Thiago Kenji Ikuta: Auxilio no backend e integração do frontend com o backend.

## OBS: Evidências visuais disponíveis no Resumo Rxecutivo.
