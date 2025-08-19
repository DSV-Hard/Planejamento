# Planejamento de Veículos

Este projeto é uma aplicação em HTML/JavaScript para auxiliar no **planejamento técnico de veículos**.  
A ferramenta permite cadastrar informações detalhadas do veículo principal e de veículos aplicáveis, incluindo sistemas elétricos, opcionais, dificuldades e observações importantes para o desenvolvimento.

## 🚀 Funcionalidades

- **Cadastro do veículo principal** com:
  - Link do card (ClickUp)
  - Veículo de referência
  - IDs de diagramas e fusíveis
  - Pasta do veículo
  - Comentários importantes
  - Itens de série e opcionais (transmissão, chave, start/stop, ar-condicionado, tração, extras)
  - Capítulos de sistemas (com possibilidade de anexar imagens e arquivos por drag & drop)
  - Dados de dificuldade e justificativas

- **Cadastro de veículos aplicáveis**:
  - Informações gerais semelhantes ao veículo principal
  - Itens de série e opcionais
  - Capítulos de sistemas com desenvolvimento detalhado
  - Dados de dificuldade e justificativas

- **Gerenciamento de sistemas e capítulos**:
  - Adicionar e remover capítulos dinamicamente
  - Campos para módulos, nomes, códigos e conectores
  - Área de desenvolvimento com suporte a imagens e anexos

- **Importação e exportação**:
  - Salvar planejamento em **JSON**
  - Carregar planejamento a partir de JSON
  - Gerar **PDF** automaticamente com toda a estrutura
  - Gerar **ZIP** contendo imagens e anexos organizados em pastas por capítulo

## 📂 Estrutura do Projeto

- `Planejamento.html` → Interface principal do sistema  
- Bibliotecas externas usadas via CDN:
  - [jsPDF](https://github.com/parallax/jsPDF) (geração de PDFs)
  - [html2canvas](https://github.com/niklasvh/html2canvas) (renderização de imagens no PDF)
  - [JSZip](https://stuk.github.io/jszip/) (compressão de arquivos em ZIP)

## 🛠️ Como Usar

1. Abra o arquivo `Planejamento.html` em um navegador moderno (Chrome, Edge, Firefox).
2. Preencha as informações do **veículo principal**.
3. Adicione **veículos aplicáveis** conforme necessário.
4. Inclua sistemas, anexos e observações no planejamento.
5. Clique em:
   - **💾 Salvar Planejamento** → Exporta para JSON
   - **📥 Carregar Planejamento** → Importa JSON salvo anteriormente
   - **📄 Gerar PDF/ZIP** → Exporta relatório em PDF e compacta anexos em ZIP

## ⚠️ Observações

- As imagens e anexos adicionados via drag & drop são incluídos no ZIP final.
- A aba **Veículos Aplicáveis** inicia vazia até que sejam adicionados veículos.
- Existe um bug conhecido ao **mover imagens dentro das áreas editáveis**, podendo causar problemas na renderização no PDF.

## 📌 Próximos Passos

- Corrigir bug de movimentação de imagens.
- Melhorar visualização dos anexos dentro do PDF.
- Adicionar suporte a exportação para outros formatos (ex.: Excel).

---

✍️ Desenvolvido para auxiliar no planejamento técnico de veículos, com foco em documentação organizada e exportação completa.
