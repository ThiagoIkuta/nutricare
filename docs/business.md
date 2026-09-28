# App Nutricionista — Documentação Negocial

## 1. Visão Geral

O projeto "App Nutricionista" consiste no desenvolvimento de uma plataforma web voltada ao acompanhamento nutricional, com o objetivo de centralizar ferramentas que facilitem a comunicação, organização de dietas e acompanhamento entre nutricionistas e pacientes.

A solução busca modernizar o processo de acompanhamento alimentar, tornando-o mais eficiente, acessível e contínuo.

---

## 2. Problema / Oportunidade

O acompanhamento nutricional tradicional apresenta desafios como:

- comunicação descentralizada entre nutricionista e paciente
- uso de múltiplas ferramentas (WhatsApp, papel, planilhas)
- dificuldade de adesão do paciente à dieta
- falta de organização das informações alimentares

Além disso:

- Mais de 57% da população brasileira possui excesso de peso (Vigitel 2023)
- O mercado de saúde digital cresce mais de 15% ao ano

Esses fatores indicam a necessidade de soluções digitais integradas.

---

## 3. Público-Alvo

### Nutricionistas
- Profissionais que desejam acompanhar pacientes digitalmente
- Necessitam organizar dietas e informações de forma estruturada

### Pacientes
- Pessoas que desejam acompanhar sua dieta
- Buscam praticidade e comunicação direta com o profissional

---

## 4. Proposta de Valor

A plataforma oferece:

- Centralização de todas as informações nutricionais
- Comunicação direta e organizada
- Acompanhamento contínuo da dieta
- Geração automática de lista de compras
- Facilidade de uso e acesso

Diferencial:
> Integração completa entre dieta, comunicação e acompanhamento em um único sistema.

---

## 5. Benefícios da Solução

### Para o Nutricionista
- Melhor organização de pacientes
- Acompanhamento mais eficiente
- Redução de retrabalho

### Para o Paciente
- Maior clareza da dieta
- Melhor adesão alimentar
- Facilidade de comunicação

### Para o Sistema de Saúde
- Incentivo a hábitos saudáveis
- Apoio à prevenção de doenças

---

## 6. Contexto de Uso

O sistema pode ser utilizado em:

- clínicas de nutrição
- atendimento particular
- acompanhamento remoto (online)
- uso pessoal para controle alimentar

Fluxo típico:

1. usuário cria conta e escolhe o papel (nutricionista ou paciente)
2. nutricionista vincula o paciente (direto ou por convite, que o paciente aceita ou recusa)
3. nutricionista cria a dieta do zero ou a partir de um modelo (preset) e ativa o plano
4. paciente recebe a notificação, acompanha a dieta, marca o que consumiu e gera a lista de compras
5. lembretes (refeição, água, medicação) ajudam o paciente a manter a rotina
6. nutricionista acompanha a adesão de cada paciente e prioriza quem precisa de atenção
7. comunicação ocorre via chat, com texto e imagens

---

## 7. Funcionalidades Principais

Situação em setembro/2026:

| Funcionalidade | Situação |
|---|---|
| autenticação de usuários (email/senha) | implementada |
| login social (Google / Apple) | iniciada — o redirecionamento funciona, o retorno ao app ainda não |
| cadastro e gerenciamento de perfis (incluindo foto e histórico de peso) | implementada |
| vínculo nutricionista-paciente com convite | implementada |
| criação de dietas, com edição por dia | implementada |
| modelos de dieta (presets) reutilizáveis | implementada (5 modelos prontos + modelos próprios) |
| busca de alimentos da Tabela TACO | implementada |
| checklist da dieta e acompanhamento de adesão | implementada — adesão registrada no servidor e visível ao nutricionista |
| sugestão de receitas por refeição | implementada |
| lista de compras automática (com compartilhamento via WhatsApp) | implementada |
| chat entre nutricionista e paciente (texto e imagem) | implementada |
| notificações e lembretes | implementada — dentro do app, sem push ou e-mail |
| relatório de adesão em PDF | implementada — ainda precisa usar os dados de adesão do servidor |

---

## 8. Considerações Finais

O projeto apresenta alto potencial de aplicação prática, alinhando tecnologia e saúde para melhorar o acompanhamento nutricional e promover qualidade de vida.