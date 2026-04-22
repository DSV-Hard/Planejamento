async function gerarPDF() {
	// 1. Validar formulário
	const erros = validarFormularioGlobal();
	if (erros.length > 0) {
		const lista = document.getElementById('lista-campos-faltando');
		lista.innerHTML = '';
		erros.forEach(erro => {
			const li = document.createElement('li');
			li.textContent = erro;
			lista.appendChild(li);
		});
		document.getElementById('validation-modal').style.display = 'flex';
		return; 
	}

	// 2. Coletar todos os dados
	const dadosCompletos = coletarDadosFormulario();
	const dataPrincipalOriginal = dadosCompletos.principal;
	const dataAplicaveisOriginal = dadosCompletos.aplicaveis;

	// 3. Gerar o documento PDF
	await gerarPDFDocumento(dataPrincipalOriginal, dataAplicaveisOriginal, dadosCompletos);
	salvarComoJSON();
}

async function gerarPDFDocumento(dataPrincipal, dataAplicaveis, dadosCompletosJSON) {
	const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
	
	let y = 10;
	const margin = 10;
	const lineHeight = 7;
	const pageHeight = doc.internal.pageSize.height;
	const lineSpacing = 6;
	
	const sanitizeName = (name) => (name || '').toString().replace(/[\\\/:*?"<>|]/g, '').trim().slice(0, 120) || 'Sem título';
	
	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
	}

	function parseRgb(rgbString) {
		const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
	}
	
	function mapFontSize(size) {
		const sizeNum = parseInt(size);
		const sizeMap = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18 };
		return sizeMap[sizeNum] || 12;
	}
     
	function htmlToFragments(element, parentStyle = {}, listState = null) {
		let fragments = [];
		const defaultStyle = {
			fontStyle: 'italic',
			fontWeight: 'normal',
			textDecoration: 'none',
			color: [0, 0, 0],
			fontSize: 12,
			isLink: false,
			url: '',
			isPath: false
		};
		let currentStyle = { ...defaultStyle, ...parentStyle };

		for (const node of element.childNodes) {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent;
				if (text && (text.trim().length > 0 || text === ' ' || text.includes('\n'))) {
					const isLikelyPath = /^[a-zA-Z]:\\|^\\\\/.test(text.trim());
					const isLikelyUrl = /(https?:\/\/|www\.)/.test(text.trim());
					
					fragments.push({
						type: isLikelyUrl ? 'link' : 'text',
						text: text, 
						style: {
							...currentStyle,
							isLink: isLikelyUrl,
							url: isLikelyUrl ? (text.trim().startsWith('http') ? text.trim() : 'http://' + text.trim()) : '',
							isPath: isLikelyPath,
							textDecoration: 'none',
							fontStyle: 'italic',
							color: isLikelyPath ? [0, 128, 0] : (isLikelyUrl ? [0, 0, 255] : currentStyle.color)
						}
					});
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				let newStyle = { ...currentStyle };
				let specialFragment = null;
				let nextListState = listState;
				let skipChildren = false;

				if (['div', 'p'].includes(node.tagName.toLowerCase())) {
					if (fragments.length > 0 && fragments[fragments.length - 1].type !== 'br') {
						fragments.push({ type: 'br' });
					}
				}

				switch (node.tagName.toLowerCase()) {
					case 'b': case 'strong': newStyle.fontWeight = 'bold'; break;
					case 'i': case 'em': newStyle.fontStyle = 'italic'; break;
					case 'u': newStyle.textDecoration = 'underline'; break;
					case 'font':
						if (node.color) newStyle.color = hexToRgb(node.color);
						if (node.size) newStyle.fontSize = mapFontSize(node.size);
						break;
					case 'span':
						if (node.style.color) newStyle.color = parseRgb(node.style.color);
						if (node.style.fontWeight === 'bold') newStyle.fontWeight = 'bold';
						if (node.style.fontStyle === 'italic') newStyle.fontStyle = 'italic';
						break;
					case 'br': specialFragment = { type: 'br' }; break;
					case 'img':
						specialFragment = {
							type: 'image',
							src: node.getAttribute('data-original-image'),
							filename: node.getAttribute('data-filename') || 'imagem.png',
							style: { ...currentStyle }
						};
						break;
					case 'a':
						const href = node.getAttribute('href') || '';
						const isLikelyPath = /^[a-zA-Z]:\\|^\\\\/.test(href.trim());
						const isLikelyUrl = /(https?:\/\/|www\.)/.test(href.trim());

						if (isLikelyPath) {
							fragments.push({
								type: 'text',
								text: href,
								style: {
									...currentStyle,
									isPath: true,
									fontStyle: 'italic',
									color: [0, 128, 0]
								}
							});
							skipChildren = true;
						} else if (isLikelyUrl) {
							fragments.push({
								type: 'link',
								text: href,
								link: href.startsWith('http') ? href : 'http://' + href,
								style: {
									...currentStyle,
									fontStyle: 'italic',
									color: [0, 0, 255]
								}
							});
							skipChildren = true;
						} else if (node.classList.contains('attachment')) {
							specialFragment = {
								type: 'attachment',
								src: node.getAttribute('href'),
								filename: node.getAttribute('data-filename') || 'anexo',
								style: { ...currentStyle }
							};
							skipChildren = true;
						} else {
							newStyle.isLink = true;
							newStyle.url = href;
							newStyle.color = [0, 0, 255];
						}
						break;
					case 'ul': nextListState = { type: 'ul' }; break;
					case 'ol': nextListState = { type: 'ol', counter: 1 }; break;
					case 'li':
						if (fragments.length > 0 && fragments[fragments.length - 1].type !== 'br') {
							fragments.push({ type: 'br' });
						}
						if (listState) {
							let indent = '    ';
							let marker = listState.type === 'ul' ? '•  ' : `${listState.counter++}.  `;
							fragments.push({ type: 'text', text: indent + marker, style: currentStyle });
						}
						break;
				}

				if (specialFragment) fragments.push(specialFragment);

				if (node.hasChildNodes() && !skipChildren) {
					fragments = fragments.concat(htmlToFragments(node, newStyle, nextListState));
				}

				if (['ul', 'ol'].includes(node.tagName.toLowerCase())) {
					if (fragments.length > 0 && fragments[fragments.length - 1].type !== 'br') {
						fragments.push({ type: 'br' });
					}
				}
			}
		}
		return fragments;
	}

	async function renderFragments(fragments, x, startY, maxWidth, rootFolder, sistema, idx, isAplicavel = false, veiculo = null, veiculoIndex = 0) {
		let currentX = x;
		let currentY = startY;
		const pageBottom = pageHeight - margin;
		
		const getCombinedFontStyle = (style) => {
			if (style.fontWeight === 'bold' && style.fontStyle === 'italic') return 'bolditalic';
			if (style.fontWeight === 'bold') return 'bold';
			if (style.fontStyle === 'italic') return 'italic';
			return 'normal';
		};

		const applyStyle = (style) => {
			doc.setFontSize(style.fontSize || 12);
			doc.setFont('helvetica', getCombinedFontStyle(style));
			doc.setTextColor(style.color[0], style.color[1], style.color[2]);
		};

		for (const fragment of fragments) {
			if (currentY > pageBottom) {
				doc.addPage();
				currentY = margin;
				currentX = x;
			}

			if (fragment.type === 'text' || fragment.type === 'link') {
			if (fragment.style && fragment.style.isPath) {
				let pathFontSize = fragment.style.fontSize || 12;
				const pathText = fragment.text;
				
				applyStyle({ ...fragment.style, fontSize: pathFontSize });
				let textWidth = doc.getTextWidth(pathText);
				
				while (textWidth > maxWidth && pathFontSize > 6) {
					pathFontSize -= 0.5;
					doc.setFontSize(pathFontSize);
					textWidth = doc.getTextWidth(pathText);
				}
				
				if (textWidth > maxWidth) {
					let remainingText = pathText;
					const lines = [];
					
					while (remainingText.length > 0) {
						let fitLength = remainingText.length;
						let part = remainingText;
						
						while (doc.getTextWidth(part) > maxWidth && fitLength > 1) {
							fitLength--;
							part = remainingText.substring(0, fitLength);
						}
						
						if (fitLength < remainingText.length) {
							const lastBackslash = part.lastIndexOf('\\');
							if (lastBackslash > Math.floor(fitLength * 0.5)) {
								fitLength = lastBackslash + 1;
							}
						}
						
						lines.push(remainingText.substring(0, fitLength));
						remainingText = remainingText.substring(fitLength);
					}
					
					for (const line of lines) {
						if (currentY > pageBottom) {
							doc.addPage();
							currentY = margin;
						}
						doc.text(line, x, currentY);
						currentY += lineHeight;
					}
				} else {
					if (currentY > pageBottom) {
						doc.addPage();
						currentY = margin;
					}
					doc.text(pathText, x, currentY);
					currentY += lineHeight;
				}
				
				currentX = x;
				continue;
			}
				
				if (fragment.type === 'link' || (fragment.style && fragment.style.isLink)) {
					applyStyle(fragment.style);
					
					let urlDest = fragment.link || (fragment.style && fragment.style.url) || fragment.text;
					urlDest = urlDest.trim();
					
					if (!urlDest.startsWith('http') && !urlDest.startsWith('mailto:')) {
						urlDest = 'http://' + urlDest;
					}
					
					const displayLinkText = "LINK";
					const tw = doc.getTextWidth(displayLinkText);
					const th = (fragment.style.fontSize || 12) * 0.3527;

					doc.setTextColor(0, 0, 255);
					doc.text(displayLinkText, currentX, currentY);
					doc.link(currentX, currentY - th, tw, th, { url: urlDest });
					
					doc.setDrawColor(0, 0, 255);
					doc.line(currentX, currentY + 0.5, currentX + tw, currentY + 0.5);
					
					currentX += tw + 2;
				} 
				else {
					applyStyle(fragment.style);
					const textContent = fragment.text || "";
					const lines = textContent.split('\n');

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						if (line.length > 0 || lines.length > 1) {
							const words = line.split(/(\s+)/).filter(w => w.length > 0);
							for (const word of words) {
								const wordWidth = doc.getTextWidth(word);
								if (currentX + wordWidth > (x + maxWidth) && word.trim().length > 0) {
									currentY += lineHeight;
									currentX = x;
									if (currentY > pageBottom) { doc.addPage(); currentY = margin; }
								}
								doc.text(word, currentX, currentY);
								currentX += wordWidth;
							}
						}
						if (i < lines.length - 1) {
							currentY += lineHeight;
							currentX = x;
							if (currentY > pageBottom) { doc.addPage(); currentY = margin; }
						}
					}
				}
			} else if (fragment.type === 'br') {
						currentY += lineHeight;
						currentX = x;
					} else if (fragment.type === 'image' && fragment.src) {
						if (currentY + 20 > pageBottom) { doc.addPage(); currentY = margin; currentX = x; }
						
						try {
							const imgProps = doc.getImageProperties(fragment.src);
							
							const pxToMm = 0.264583;
							let imgW = imgProps.width * pxToMm;
							let imgH = imgProps.height * pxToMm;

							if (imgW > maxWidth) {
								imgW = maxWidth;
								imgH = (imgProps.height * imgW) / imgProps.width; 
							}

							const maxPageHeight = pageBottom - margin;
							if (imgH > maxPageHeight) {
								imgH = maxPageHeight;
								imgW = (imgProps.width * imgH) / imgProps.height;
							}

							if (currentY + imgH > pageBottom) {
								doc.addPage();
								currentY = margin;
							}

							doc.addImage(fragment.src, imgProps.fileType, x, currentY, imgW, imgH);
							
							currentY += imgH + 5; 
							currentX = x;
						} catch (err) {
							console.error("Erro ao renderizar imagem:", err);
							applyStyle({ ...fragment.style, color: [150, 0, 0], fontStyle: 'italic' });
							const zipText = `${fragment.filename} (ARQUIVO ANEXADO - Erro ao renderizar)`;
							doc.text(zipText, currentX, currentY);
							currentX += doc.getTextWidth(zipText) + 2;
							}

					} else if (fragment.type === 'attachment') {
						if (currentY + 20 > pageBottom) { doc.addPage(); currentY = margin; currentX = x; }

						applyStyle({ ...fragment.style, color: [0, 0, 150], fontStyle: 'italic' });
						const zipText = `${fragment.filename} (SALVO NA PASTA MATERIAIS)`;
						doc.text(zipText, currentX, currentY);
						currentX += doc.getTextWidth(zipText) + 2;
					}
				}

				return currentY;
			}
	
	const addText = (text, size, style = 'normal', indent = 0) => {
		if (!text) return;
		const maxWidth = doc.internal.pageSize.width - (margin * 2) - indent;
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		const paragraphs = String(text).split('\n');
		for (const paragraph of paragraphs) {
			const lines = doc.splitTextToSize(paragraph, maxWidth);
			for (const line of lines) {
				if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
				doc.text(line, margin + indent, y);
				y += lineHeight;
			}
		}
	};

	const addLabeledValue = (label, value, indent = 0, size = 12) => {
		if (value === undefined || value === null || String(value).trim() === '') return;
		const fullLabel = `- ${label}: `;
		const fullValue = String(value);
		const availableWidth = doc.internal.pageSize.width - margin * 2;
		const x = margin + indent;
		doc.setFontSize(size);
		doc.setFont('helvetica', 'bold');
		const labelWidth = doc.getTextWidth(fullLabel);
		doc.setFont('helvetica', 'normal');
		const valueWidth = availableWidth - x - labelWidth;
		const paragraphs = fullValue.split('\n');
		let isFirstLineOfValue = true;
		for (const paragraph of paragraphs) {
			const lines = doc.splitTextToSize(paragraph, valueWidth);
			for (const line of lines) {
				 if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
				if (isFirstLineOfValue) {
					doc.setFont('helvetica', 'bold');
					doc.text(fullLabel, x, y);
					doc.setFont('helvetica', 'normal');
					doc.text(line, x + labelWidth, y);
					isFirstLineOfValue = false;
				} else {
					doc.text(line, x + labelWidth, y);
				}
				y += lineHeight;
			}
		}
	};

	async function addRichContent(htmlString, startY, indent, rootFolder, sistema, idx, isAplicavel = false, veiculo = null, veiculoIndex = 0) {
		if (!htmlString || !htmlString.trim() || htmlString === '<br>') {
			addText('Nenhum conteúdo informado.', 12, 'italic', indent);
			return y + lineHeight;
		}
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = htmlString;
		const fragments = htmlToFragments(tempDiv);
		const finalY = await renderFragments(fragments, margin + indent, startY, doc.internal.pageSize.width - (margin * 2) - indent, rootFolder, sistema, idx, isAplicavel, veiculo, veiculoIndex);
		doc.setTextColor(0, 0, 0);
		return finalY;
	}

	const addCenteredText = (text, size, style = 'normal', color = [0, 0, 0]) => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		doc.setTextColor(color[0], color[1], color[2]);
		const textWidth = doc.getTextWidth(text);
		const centerX = (doc.internal.pageSize.width - textWidth) / 2;
		doc.text(text, centerX, y);
		y += lineHeight;
		doc.setTextColor(0, 0, 0);
	};
	
	const addColoredText = (text, size, style = 'normal', indent = 0, color = [0, 0, 0]) => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		doc.setTextColor(color[0], color[1], color[2]);
		const textWidth = doc.getTextWidth(text);
		const centerX = (doc.internal.pageSize.width - textWidth) / 2;
		doc.text(text, centerX, y);
		y += lineHeight;
		doc.setTextColor(0, 0, 0);
	};

	const addHighlightedText = (text, size, style = 'bold', indent = 0, r = 212, g = 255, b = 214) => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		const x = margin + indent;
		const textWidth = doc.getTextWidth(text);
		const rectX = x - 2;
		const rectY = y - lineHeight + 1.5;
		const rectW = textWidth + 4;
		const rectH = lineHeight;
		doc.setFillColor(r, g, b);
		doc.rect(rectX, rectY, rectW, rectH, 'F');
		doc.setTextColor(0, 0, 0);
		doc.text(text, x, y);
		y += lineHeight;
	};
	
	const addSeparatorLine = () => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setDrawColor(128, 128, 128);
		doc.setLineWidth(0.5);
		doc.line(margin, y, doc.internal.pageSize.width - margin, y);
		y += lineHeight;
	};
	
	const titleColor = [68, 114, 196];
	const rootPrincipal = dataPrincipal.rootPath || '';
	const rootAplicaveis = dataAplicaveis.rootPath || '';
	
	// --- VEÍCULO PRINCIPAL ---
	
	addCenteredText(`OSCILOGRAMAS - VEÍCULO PRINCIPAL`, 20, 'bold');
	addColoredText(dataPrincipal.clickup, 14, 'italic', 0, titleColor);
	
	y += lineHeight * 2;
	addColoredText("INFORMAÇÕES GERAIS", 18, 'bold', 0, titleColor);
	y += lineSpacing;
	addLabeledValue('DESENVOLVEDOR', dataPrincipal.planejado_por);
	addText('- VEÍCULO REFERÊNCIA:', 12, "bold", 0);
	addText(dataPrincipal.veiculo, 10, "italic", 4);
	y += lineHeight;
	addLabeledValue('ID DIAGRAMAS', dataPrincipal.iddiagramas);
	addLabeledValue('ID FUSÍVEIS', dataPrincipal.idfusiveis);
	
	y += lineHeight;
	
	addText('- PASTA DO VEÍCULO:', 12, "bold", 0);
	y = await addRichContent(dataPrincipal.pasta, y, 4, rootPrincipal, null, -1);
	
	y += lineHeight;
	
	addLabeledValue('ASSOCIAÇÃO / CHASSI', dataPrincipal.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dataPrincipal.aplicacao_chassi === 'ajustar' ? 'Ajustar associação' : 'N/A'));
	if (dataPrincipal.aplicacao_chassi_texto) {
		addText(dataPrincipal.aplicacao_chassi_texto, 12, 'normal', 4);
	}
	
	y += lineHeight * 2;
	
	addColoredText("CAPÍTULOS", 18, 'bold', 0, titleColor);
	y += lineSpacing;
	
	if (dataPrincipal.sistemas && dataPrincipal.sistemas.length > 0) {
		for (const [idx, sistema] of dataPrincipal.sistemas.entries()) {
			if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
			y += lineSpacing / 2;

			let tituloCapitulo = (sistema.sistema || `Capítulo ${idx + 1}`).toUpperCase();
			addHighlightedText(`${tituloCapitulo}`, 14, 'bold', 0, 212, 255, 214);
			
			addText(`- DESCRIÇÃO GERAL:`, 12, "bold", 0);
			y = await addRichContent(sistema.descricao, y, 4, rootPrincipal, sistema, idx);
			y += lineHeight * 2;
		}
		
		y += lineHeight * 2;
		
	} else { addText("Nenhum capítulo adicionado.", 12, "italic", 4); y += lineHeight; }
	y += lineHeight;
	addSeparatorLine();
	y += lineHeight;

	//VEÍCULOS APLICÁVEIS ------------------------------------------------------------------------------------------------------------
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		doc.addPage();
		y = margin;
		addCenteredText("OSCILOGRAMAS - VEÍCULOS APLICÁVEIS", 20, 'bold');
		for (const [index, veiculo] of dataAplicaveis.entries()) {
			if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
			y += lineSpacing;
			y += lineHeight;
			
			addColoredText(`VEÍCULO APLICÁVEL #${index + 1}`, 18, "bold", 0, titleColor);
			y += lineSpacing;
			
			addText('- VEÍCULO REFERÊNCIA:', 12, "bold", 0);
			addText(veiculo.dadosGerais.veiculo, 10, "italic", 4);
			
			y += lineSpacing;
			
			addLabeledValue('ID DIAGRAMAS', veiculo.dadosGerais.iddiagramas);
			addLabeledValue('ID FUSÍVEIS', veiculo.dadosGerais.idfusiveis);
			
			y += lineSpacing;
			
			addText('- PASTA DO VEÍCULO:', 12, "bold");
			y = await addRichContent(veiculo.dadosGerais.pasta, y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			
			y += lineHeight;
			
			addLabeledValue('ASSOCIAÇÃO / CHASSI', veiculo.dadosGerais.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (veiculo.dadosGerais.aplicacao_chassi === 'ajustar' ? 'Ajustar associação' : 'N/A'));
			if (veiculo.dadosGerais.aplicacao_chassi_texto) {
				addText(veiculo.dadosGerais.aplicacao_chassi_texto, 12, 'normal', 4);
			}
			y += lineHeight * 2;
			
			addColoredText("CAPÍTULOS", 18, 'bold', 0, titleColor);
			if (veiculo.sistemas && veiculo.sistemas.length > 0) {
				for (const [idx, sistema] of veiculo.sistemas.entries()) {
					if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
					y += lineHeight;

					let tituloCapitulo = (sistema.sistema || `Capítulo ${idx + 1}`).toUpperCase();
					addHighlightedText(`${tituloCapitulo}`, 14, 'bold', 0, 250, 231, 67);
					
					addText(`- DESCRIÇÃO GERAL:`, 12, "bold", 0);
					y = await addRichContent(sistema.descricao, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
					y += lineHeight * 2;
				}
				y += lineHeight * 2;
			} else {
				addText("Nenhum capítulo adicionado.", 12, "normal", 4); y += lineHeight;}
		
			y += lineHeight;
			addSeparatorLine();
		}
	}
	
	let nomeBase = "oscilogramas";
	if (dataPrincipal.veiculo && dataPrincipal.veiculo.includes('>')) {
		const partes = dataPrincipal.veiculo.split('>');
		if (partes.length >= 5) {
			const ano = partes[1].trim();
			const modelo = partes[3].trim();
			const motor = partes[4].trim();
			nomeBase = `Oscilogramas - ${ano} ${modelo} ${motor}`;
		}
	} else if (dataPrincipal.veiculo) {
		nomeBase = `Oscilogramas - ${dataPrincipal.veiculo}`;
	}
	
	const nomeArquivoPDF = `${nomeBase}.pdf`;
	doc.save(nomeArquivoPDF);
}

function abrirModalDivisaoPDF() {
	gerarPDF();
}

document.addEventListener('DOMContentLoaded', (event) => {
     alternarAbas('principal');
	
	document.querySelectorAll('.editable-content').forEach(el => {
		updateEditablePlaceholder(el);
		autoResizeEditableContent(el);
	});
 });

 window.addEventListener('beforeunload', function (e) {
     const confirmationMessage = 'AVISO: Todas as alterações não salvas serão perdidas';
     e.returnValue = confirmationMessage;
     return confirmationMessage;
 });