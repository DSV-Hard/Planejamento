async function gerarPDF(sistemasParte2 = null) {
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

	const isSplit = Array.isArray(sistemasParte2) && sistemasParte2.length > 0;
	let partsToGenerate = [];

	if (isSplit) {
    const todosSistemas = dataPrincipalOriginal.sistemas;
    const sistemasParte1 = todosSistemas.filter(sistema => 
        !sistemasParte2.some(s2 => s2.sistema === sistema.sistema)
    );
    
    const pppParte1 = sistemasParte1.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);
    const pppParte2 = sistemasParte2.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);
    
    // Criar cópias profundas independentes para cada parte
    partsToGenerate.push({
        prefixo: "PARTE 1 - ",
        sufixoTitulo: " (PARTE 1)",
        dataPrincipal: {
            ...JSON.parse(JSON.stringify(dataPrincipalOriginal)),
            sistemas: JSON.parse(JSON.stringify(sistemasParte1)),
            ppp_calculado: pppParte1
        },
        dataAplicaveis: [],
        incluirInfoGerais: true
    });

    partsToGenerate.push({
        prefixo: "PARTE 2 - ",
        sufixoTitulo: " (PARTE 2)",
        dataPrincipal: {
            ...JSON.parse(JSON.stringify(dataPrincipalOriginal)),
            sistemas: JSON.parse(JSON.stringify(sistemasParte2)),
            ppp_calculado: pppParte2
        },
        dataAplicaveis: JSON.parse(JSON.stringify(dataAplicaveisOriginal)),
        incluirInfoGerais: true
    });

	} else {
		const pppTotal = dataPrincipalOriginal.sistemas.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);

		partsToGenerate.push({
			prefixo: "",
			sufixoTitulo: "",
			dataPrincipal: {
				...dataPrincipalOriginal,
				ppp_calculado: pppTotal
			},
			dataAplicaveis: dataAplicaveisOriginal,
			incluirInfoGerais: true
		});
	}

	for (const [index, part] of partsToGenerate.entries()) {
		const isLastPart = index === partsToGenerate.length - 1;
		await gerarPDFDocumento(part, isLastPart, dadosCompletos);
	}
	salvarComoJSON();
}

async function gerarPDFDocumento(partData, isLastPart, dadosCompletosJSON) {
	
	const { prefixo, sufixoTitulo, dataPrincipal, dataAplicaveis, incluirInfoGerais } = partData;

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
		if (!htmlString || !htmlString.trim()) {
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

	let indexLinks = [];
	let targetPages = {};
	
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		addText(`ÍNDICE RÁPIDO (P/ APLICÁVEIS):`, 14, "bold", 0);
		
		for (const [index, veiculo] of dataAplicaveis.entries()) {
			if (y > pageHeight - margin) { doc.addPage(); y = margin; }
			
			const prefixText = `Veículo Aplicável #${index + 1} - `;
			const refText = veiculo.dadosGerais.veiculo || 'Sem referência';
			
			doc.setFontSize(10);
			doc.setTextColor(0, 0, 255);
			
			doc.setFont('helvetica', 'bold');
			const prefixWidth = doc.getTextWidth(prefixText);
			doc.text(prefixText, margin, y);
			
			doc.setFont('helvetica', 'italic');
			const remainingWidth = doc.internal.pageSize.width - margin * 2 - prefixWidth;
			const refLines = doc.splitTextToSize(refText, remainingWidth);
			
			let currentLineY = y;
			for(let i = 0; i < refLines.length; i++) {
				if (currentLineY > pageHeight - margin) { doc.addPage(); currentLineY = margin; }
				
				const line = refLines[i];
				const lineWidth = doc.getTextWidth(line);
				const drawX = i === 0 ? margin + prefixWidth : margin;
				doc.text(line, drawX, currentLineY);
				
				const clickableX = margin;
				const clickableW = i === 0 ? prefixWidth + lineWidth : lineWidth;
				
				doc.setDrawColor(0, 0, 255);
				doc.setLineWidth(0.3);
				doc.line(clickableX, currentLineY + 1, clickableX + clickableW, currentLineY + 1);
				
				indexLinks.push({
					index: index,
					page: doc.internal.getCurrentPageInfo().pageNumber,
					x: clickableX,
					y: currentLineY,
					w: clickableW,
					h: 12 * 0.3527
				});
				
				if (i < refLines.length - 1) {
					currentLineY += lineHeight;
				}
			}
			y = currentLineY + lineHeight;
		}
		doc.setTextColor(0, 0, 0);
		y += lineHeight;
		addSeparatorLine();
		y += lineHeight;
	}
	
	addCenteredText(`PLANEJAMENTO - VEÍCULO PRINCIPAL${sufixoTitulo}`, 20, 'bold');
	addColoredText(dataPrincipal.clickup, 14, 'italic', 0, titleColor);
	
	if (incluirInfoGerais) {
		y += lineHeight * 2;
		addColoredText("INFORMAÇÕES GERAIS", 18, 'bold', 0, titleColor);
		y += lineSpacing;
		addLabeledValue('PLANEJADO POR', dataPrincipal.planejado_por);
		addText('- VEÍCULO REFERÊNCIA:', 12, "bold", 0);
		addText(dataPrincipal.veiculo, 10, "italic", 4);
		y += lineHeight;
		addLabeledValue('ID DIAGRAMAS', dataPrincipal.iddiagramas);
		addLabeledValue('ID FUSÍVEIS', dataPrincipal.idfusiveis);
		
		y += lineHeight;
		
		addText('- PASTA DO VEÍCULO:', 12, "bold", 0);
		y = await addRichContent(dataPrincipal.pasta, y, 4, rootPrincipal, null, -1);
				
		y += lineHeight;
		
		addText('- IMPORTANTE PARA O DESENVOLVIMENTO:', 12, 'bold', 0);
		y = await addRichContent(dataPrincipal.comentarios, y, 4, rootPrincipal, null, -1);
		
		y += 14;
		
		addLabeledValue('ASSOCIAÇÃO / CHASSI', dataPrincipal.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dataPrincipal.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A'));
		if (dataPrincipal.aplicacao_chassi_texto) {
			addText(dataPrincipal.aplicacao_chassi_texto, 12, 'normal', 4);
		}
		
		y += lineHeight;
		
		addText('- PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM:', 12, 'bold', 0);
		y = await addRichContent(dataPrincipal.ilustracao_texto || 'Nenhum pedido.', y, 4, rootPrincipal, null, -1);
		
		y += lineHeight * 2;
		
		addLabeledValue('PESQUISA', dataPrincipal.pesquisa === 'sim' ? 'Sim' : 'Não');
		if (dataPrincipal.pesquisa === 'sim' && dataPrincipal.pesquisa_texto) {
			y = await addRichContent(dataPrincipal.pesquisa_texto, y, 4, rootPrincipal, null, -1);
		}
		
		y += lineHeight * 2;
	}

	addColoredText("SISTEMAS", 18, 'bold', 0, titleColor);
	y += lineSpacing;
	
	if (dataPrincipal.sistemas && dataPrincipal.sistemas.length > 0) {
		for (const [idx, sistema] of dataPrincipal.sistemas.entries()) {
			if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
			y += lineSpacing / 2;

			let tituloCapitulo = sistema.sistema || '';
			if (sistema.sistema === 'Iluminação') {
				if (sistema.tipo_iluminacao === 'interna') tituloCapitulo = 'ILUMINAÇÃO INTERNA';
				else if (sistema.tipo_iluminacao === 'externa') tituloCapitulo = 'ILUMINAÇÃO EXTERNA';
				else if (sistema.tipo_iluminacao === 'ambos') tituloCapitulo = 'ILUMINAÇÃO INTERNA E EXTERNA';
				else tituloCapitulo = 'ILUMINAÇÃO';
			} else if (sistema.sistema === 'Fusíveis e Relés') {
				const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
				tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
			} else if (sistema.sistema === 'Outro' && !tituloCapitulo) {
				tituloCapitulo = 'Outro (Não especificado)'.toUpperCase();
			} else {
				tituloCapitulo = tituloCapitulo.toUpperCase();
			}
			
			addHighlightedText(`${tituloCapitulo}`, 14, 'bold', 0, 212, 255, 214);
			
			let linhaTransferencia = '';
			if (sistema.transferencia === 'transferencia') linhaTransferencia = `- Transferência - ID: ${sistema.idtransf || ''}`;
			else if (sistema.transferencia === 'zero') linhaTransferencia = `- Fazer do Zero`;
			else if (sistema.transferencia === 'modificar') linhaTransferencia = `- Modificar Publicado`;
			if (linhaTransferencia) addText(linhaTransferencia, 12, "bold", 0);
			
			addLabeledValue('Nº páginas prevista', `${sistema.transferencia === 'modificar' ? '0' : (sistema.paginasprev || '')}`);
			
			const isCaixasForm = sistema.sistema === "Fusíveis e Relés";
			const isPaginasFixas = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
			const isModuloDedicado = String(sistema.modulo_dedicado).toLowerCase() === 'sim';
			
			if (!isCaixasForm && !isPaginasFixas) {
				addLabeledValue('Módulo Dedicado', isModuloDedicado ? 'Sim' : 'Não');
			}

			// EXIBE OS CAMPOS DE MÓDULO se não for caixas/páginas fixas E tiver módulo dedicado
			if (!isCaixasForm && !isPaginasFixas && isModuloDedicado) {
				addLabeledValue('Módulo principal', `${sistema.modulo || ''}`);
				addLabeledValue('Nome no material', `${sistema.nomematerial || ''}`);
				addText(`- Códigos de Conectores:`, 12, "bold", 0);
				addText(`${sistema.codconectores || ''}`, 12, 'normal', 4);
				addText(`- Código de Peça / Link:`, 12, "bold", 0);
				y = await addRichContent(sistema.codmodulo, y, 4, rootPrincipal, sistema, idx);
				y += 6;
			}
			y += 6;

			addText('DESENVOLVIMENTO:', 14, "bold", 0);
			y += lineSpacing / 2;

			// RENDERIZA O DESENVOLVIMENTO baseado no tipo
			if (isCaixasForm) {
				if (sistema.caixas && sistema.caixas.length > 0) {
					for (const [caixaIdx, caixa] of sistema.caixas.entries()) {
						addText(`- Caixa ${caixaIdx + 1}: ${caixa.nome || 'Sem nome'}`, 12, "bold", 0);
						y = await addRichContent(caixa.descricoes, y, 4, rootPrincipal, sistema, idx);
						y += lineHeight * 2;
					}
				} else { addText('Nenhuma caixa adicionada.', 12, 'italic', 4); y += lineHeight; }
			} 
			else if (isPaginasFixas || !isModuloDedicado) {
				if (sistema.paginas && sistema.paginas.length > 0) {
					for (const [paginaIdx, pagina] of sistema.paginas.entries()) {
						addText(`- Página ${paginaIdx + 1}:`, 12, "bold", 0);
						y = await addRichContent(pagina.conteudo, y, 4, rootPrincipal, sistema, idx);
						y += lineHeight * 2;
					}
				} else { addText('Nenhuma página adicionada.', 12, 'italic', 4); y += lineHeight; }
			} 
			else {
				addText(`- Página de Localização:`, 12, "bold", 0);
				y = await addRichContent(sistema.pagloc, y, 4, rootPrincipal, sistema, idx);
				y += lineHeight * 2;
				addText(`- Página de Conectores:`, 12, "bold", 0);
				y = await addRichContent(sistema.pagcon, y, 4, rootPrincipal, sistema, idx);
				y += lineHeight * 2;
				addText(`- Página de Diagramas:`, 12, "bold", 0);
				y = await addRichContent(sistema.pagdiag, y, 4, rootPrincipal, sistema, idx);
				y += lineHeight * 2;
			}
		}
	} else {
		addText("Nenhum sistema adicionado (nesta parte).", 12, "italic", 4); y += lineHeight; }
	y += lineHeight;
	addSeparatorLine();
	y += lineHeight;

	if (dataAplicaveis && dataAplicaveis.length > 0) {
		doc.addPage();
		y = margin;
		addCenteredText("PLANEJAMENTO - VEÍCULOS APLICÁVEIS", 20, 'bold');
		for (const [index, veiculo] of dataAplicaveis.entries()) {
			if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
			
			y += lineSpacing;
			y += lineHeight;
			
			targetPages[index] = doc.internal.getCurrentPageInfo().pageNumber;
			
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
			
			y += lineHeight * 2;
			
			addText('- IMPORTANTE PARA O DESENVOLVIMENTO:', 12, 'bold');
			y = await addRichContent(veiculo.dadosGerais.comentarios, y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			
			y += lineHeight;
			y += lineHeight / 2;
			
			addLabeledValue('ASSOCIAÇÃO / CHASSI', veiculo.dadosGerais.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (veiculo.dadosGerais.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A'));
			if (veiculo.dadosGerais.aplicacao_chassi_texto) {
				addText(veiculo.dadosGerais.aplicacao_chassi_texto, 12, 'normal', 4);
			}
			y += lineHeight;

			addText('- PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM:', 12, 'bold');
			y = await addRichContent(veiculo.dadosGerais.ilustracao_texto || 'Nenhum pedido.', y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			
			y += lineHeight * 2;
			
			addLabeledValue('PESQUISA', veiculo.dadosGerais.pesquisa === 'sim' ? 'Sim' : 'Não');
			if (veiculo.dadosGerais.pesquisa === 'sim' && veiculo.dadosGerais.pesquisa_texto) {
				y = await addRichContent(veiculo.dadosGerais.pesquisa_texto, y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			}
						
			y += lineHeight * 2;
			
			addColoredText("SISTEMAS", 18, 'bold', 0, titleColor);
			if (veiculo.sistemas && veiculo.sistemas.length > 0) {
				for (const [idx, sistema] of veiculo.sistemas.entries()) {
					if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
					y += lineHeight;

					let tituloCapitulo = sistema.sistema || '';
					if (sistema.sistema === 'Iluminação') {
						if (sistema.tipo_iluminacao === 'interna') tituloCapitulo = 'ILUMINAÇÃO INTERNA';
						else if (sistema.tipo_iluminacao === 'externa') tituloCapitulo = 'ILUMINAÇÃO EXTERNA';
						else if (sistema.tipo_iluminacao === 'ambos') tituloCapitulo = 'ILUMINAÇÃO INTERNA E EXTERNA';
						else tituloCapitulo = 'ILUMINAÇÃO';
					} else if (sistema.sistema === 'Fusíveis e Relés') {
						const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
						tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
					} else if (sistema.sistema === 'Outro' && !tituloCapitulo) {
						tituloCapitulo = 'Outro (Não especificado)'.toUpperCase();
					} else {
						tituloCapitulo = tituloCapitulo.toUpperCase();
					}
					
					addHighlightedText(`${tituloCapitulo}`, 14, 'bold', 0, 250, 231, 67);
					
					if (sistema.transferencia === 'transferencia_principal') {
						const idPrincipal = (sistema.sistema === 'Fusíveis e Relés')
							? dataPrincipal.idfusiveis
							: dataPrincipal.iddiagramas;
						addLabeledValue('Transferência (do Principal) - ID', ` ${idPrincipal || 'N/A'}`);
					} else if (sistema.transferencia === 'transferencia_outro') {
						addLabeledValue('Transferência (Outro) - ID', ` ${sistema.idtransf || 'N/A'}`);
					} else if (sistema.transferencia === 'modificar') {
						addText(`- Modificar Publicado`, 12, "normal", 0);
					}
					addLabeledValue('Nº páginas prevista', sistema.transferencia === 'modificar' ? '0' : sistema.paginasprev);
					
					const isCaixasForm = sistema.sistema === "Fusíveis e Relés";
					const isPaginasFixas = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
					const isModuloDedicado = String(sistema.modulo_dedicado).toLowerCase() === 'sim';

					if (!isCaixasForm && !isPaginasFixas) {
						addLabeledValue('Módulo Dedicado', isModuloDedicado ? 'Sim' : 'Não');
					}

					if (!isCaixasForm && !isPaginasFixas && isModuloDedicado) {
						addLabeledValue('Módulo principal', sistema.modulo || '');
						addLabeledValue('Nome no material', sistema.nomematerial || '');
						addText(`- Códigos de Conectores:`, 12, "bold", 0);
						addText(sistema.codconectores || '', 12, 'normal', 4);
						addText(`- Código de Peça / Link:`, 12, "bold", 0);
						y = await addRichContent(sistema.codmodulo, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 6;
					}
					y += 6;
					
					addText(`DESENVOLVIMENTO:`, 14, "bold", 0);
					y += lineSpacing / 2;
					
					if (isCaixasForm) {
						if (sistema.caixas && sistema.caixas.length > 0) {
							for (const caixa of sistema.caixas) {
								addText(`- ${caixa.nome || 'Caixa'}:`, 12, "bold", 0);
								y = await addRichContent(caixa.descricoes, y, 4, rootPrincipal, sistema, idx);
								y += 5;
							}
						} else { addText('Nenhuma caixa adicionada.', 12, 'italic', 4); y += lineHeight; }
					} 
					else if (isPaginasFixas || !isModuloDedicado) {
						if (sistema.paginas && sistema.paginas.length > 0) {
							for (const [pIdx, pagina] of sistema.paginas.entries()) {
								const tituloPg = pagina.titulo || `Página ${pIdx + 1}`;
								addText(`- ${tituloPg}:`, 12, "bold", 0);
								y = await addRichContent(pagina.conteudo, y, 4, rootPrincipal, sistema, idx);
								y += 8;
							}
						} else {
							addText('Nenhuma página adicionada.', 12, 'italic', 4);
							y += lineHeight;
						}
					} 
					else {
						addText(`- Página de Localização:`, 12, "bold", 0);
						y = await addRichContent(sistema.pagloc, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 12;
						
						addText(`- Página de Conectores:`, 12, "bold", 0);
						y = await addRichContent(sistema.pagcon, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 12;
						
						addText(`- Página de Diagramas:`, 12, "bold", 0);
						y = await addRichContent(sistema.pagdiag, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 12;
					}
				}
			} else {
				addText("Nenhum sistema adicionado.", 12, "normal", 4); y += lineHeight;}
		
			y += lineHeight;
			addSeparatorLine();
		}
	}

	if (y > pageHeight - margin * 6) { doc.addPage(); y = margin; }
	
	addColoredText("DADOS DO CARD", 18, 'bold', 0, titleColor);
	y += lineHeight;
	
	const getMultiplicadorPrincipal = (dificuldade) => {
		switch (dificuldade) {
			case "Fácil": return 0.70;
			case "Médio": return 1.00;
			case "Difícil": return 1.30;
			case "Carroceria Fácil": return 1.05;
			case "Carroceria Médio": return 1.50;
			case "Carroceria Difícil": return 1.75;
			default: return 1.00;
		}
	};

	const getMultiplicadorAplicaveis = (dificuldade) => {
		switch (dificuldade) {
			case "Fácil": return 0.50;
			case "Moderado": return 0.75;
			case "Médio": return 1.00;
			default: return 1.00;
		}
	};
	
	const dificuldadeExibir = (prefixo === "PARTE 2 - " && dataPrincipal.dificuldade_parte2) 
		? dataPrincipal.dificuldade_parte2 
		: dataPrincipal.dificuldade;

	let somaTotal = dataPrincipal.ppp_calculado || 0;
	let somaTransferidas = 0, somaCriadas = 0;
	let tempoTotalPrincipal = 0;
	
	if (dataPrincipal.sistemas) {
		dataPrincipal.sistemas.forEach(s => {
			const paginas = parseInt(s.paginasprev) || 0;
			if (s.transferencia === 'transferencia' || s.transferencia === 'modificar') {
				somaTransferidas += paginas;
				if (s.transferencia === 'transferencia') tempoTotalPrincipal += (paginas * 1.825);
			} else {
				somaCriadas += paginas;
				tempoTotalPrincipal += (paginas * 3.65);
			}
		});
	}
	
	const multPrinc = getMultiplicadorPrincipal(dificuldadeExibir);
	const estimativaPrincipal = (tempoTotalPrincipal * multPrinc).toFixed(2).replace('.', ',');
	
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		addHighlightedText(`VEÍCULO PRINCIPAL`, 14, 'bold', 0, 212, 255, 214);
	}
	
	addLabeledValue('DIFICULDADE', `${dificuldadeExibir || 'Não informada'}`);	
	addLabeledValue('PPP (Total)', `${somaTotal} | Criadas: ${somaCriadas} | Transferidas: ${somaTransferidas}`);	
	addLabeledValue('ESTIMATIVA DE TEMPO', ` ${estimativaPrincipal} horas`);	
	
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		y += lineSpacing;
		let somaTotalAplicaveis = 0, somaTransferidasAplicaveis = 0;
		let tempoTotalAplicaveis = 0;
		
		dataAplicaveis.forEach(v => {
			if (v.sistemas && v.sistemas.length > 0) {
				v.sistemas.forEach(s => {
					const paginas = parseInt(s.paginasprev) || 0;
					somaTotalAplicaveis += paginas;
					if (s.transferencia === 'transferencia_principal' || s.transferencia === 'transferencia_outro' || s.transferencia === 'modificar') {
						somaTransferidasAplicaveis += paginas;
						if (s.transferencia !== 'modificar') tempoTotalAplicaveis += (paginas * 1.825);
					} else {
						tempoTotalAplicaveis += (paginas * 3.65);
					}
				});
			}
		});
		
		const multAplic = getMultiplicadorAplicaveis(dataPrincipal.dificuldade_aplicaveis);
		const estimativaAplicaveis = (tempoTotalAplicaveis * multAplic).toFixed(2).replace('.', ',');
		
		addHighlightedText(`VEÍCULOS APLICÁVEIS`, 14, 'bold', 0, 250, 231, 67);
		addLabeledValue('DIFICULDADE', `${dataPrincipal.dificuldade_aplicaveis || 'Não informada'}`);
		addLabeledValue('PPA (Total)', ` ${somaTotalAplicaveis} | Aplicadas: ${somaTransferidasAplicaveis}`);
		addLabeledValue('ESTIMATIVA DE TEMPO', ` ${estimativaAplicaveis} horas`);
	}
	
	let nomeBase = "planejamento";
	if (dataPrincipal.veiculo && dataPrincipal.veiculo.includes('>')) {
		const partes = dataPrincipal.veiculo.split('>');
		if (partes.length >= 5) {
			const ano = partes[1].trim();
			const modelo = partes[3].trim();
			const motor = partes[4].trim();
			nomeBase = `Planejamento - ${ano} ${modelo} ${motor}`;
		}
	} else if (dataPrincipal.veiculo) {
		nomeBase = `Planejamento - ${dataPrincipal.veiculo}`;
	}
	
	for (const linkInfo of indexLinks) {
		const targetPage = targetPages[linkInfo.index];
		if (targetPage) {
			doc.setPage(linkInfo.page);
			doc.link(linkInfo.x, linkInfo.y - linkInfo.h, linkInfo.w, linkInfo.h + 2, { pageNumber: targetPage });
		}
	}
	
	const nomeArquivoPDF = `${prefixo}${nomeBase}.pdf`;
	doc.save(nomeArquivoPDF);
}

function abrirModalDivisaoPDF() {
	document.getElementById('pdfSplitModal').style.display = 'flex';
}

function fecharModalDivisaoPDF() {
	document.getElementById('pdfSplitModal').style.display = 'none';
}

function abrirModalSelecaoCapitulos() {
	fecharModalDivisaoPDF();
	const dataPrincipal = coletarDadosFormulario().principal;
	const sistemas = dataPrincipal.sistemas;
	
	const checkboxesDiv = document.getElementById('capitulos-checkboxes');
	checkboxesDiv.innerHTML = '';

	if (!sistemas || sistemas.length === 0) {
		checkboxesDiv.innerHTML = '<p style="text-align: center; color: #f44336; font-weight: bold;">NENHUM CAPÍTULO ENCONTRADO. O PDF será gerado em parte única.</p>';
		document.getElementById('confirmSelection').textContent = 'GERAR PDF ÚNICO';
	} else {
		document.getElementById('confirmSelection').textContent = 'OK';
		sistemas.forEach((sistema, index) => {
			const label = document.createElement('label');
			label.innerHTML = `<input type="checkbox" data-index="${index}" data-nome="${sistema.sistema}" value="${sistema.sistema}"> Capítulo: ${sistema.sistema} (Páginas: ${sistema.paginasprev || '0'})`;
			checkboxesDiv.appendChild(label);
		});
	}

	document.getElementById('chapterSelectionModal').style.display = 'flex';
}

function fecharModalSelecaoCapitulos() {
	document.getElementById('chapterSelectionModal').style.display = 'none';
}

function toggleParte2Principal() {
    const radio = document.querySelector('input[name="qtd_partes"]:checked');
    const containerUnica = document.getElementById('card-parte-unica-container');
    const containerDuasPartes = document.getElementById('card-duas-partes-container');

    if (!radio) return;

    if (radio.value === 'uma') {
        if (containerUnica) containerUnica.style.display = 'block';
        if (containerDuasPartes) containerDuasPartes.style.display = 'none';
    } else if (radio.value === 'duas') {
        if (containerUnica) containerUnica.style.display = 'none';
        if (containerDuasPartes) containerDuasPartes.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
	
	const splitSim = document.getElementById('splitSim');
	const splitNao = document.getElementById('splitNao');

	if (splitSim && splitNao) {
		splitSim.addEventListener('click', abrirModalSelecaoCapitulos);
		splitNao.addEventListener('click', () => {
			fecharModalDivisaoPDF();
			gerarPDF(null);
		});
	} else {
		console.error("Erro: Botões do modal 'pdfSplitModal' (splitSim, splitNao) não encontrados.");
	}

	const confirmSelection = document.getElementById('confirmSelection');
	const cancelSelection = document.getElementById('cancelSelection');
	
	if (confirmSelection && cancelSelection) {
		cancelSelection.addEventListener('click', fecharModalSelecaoCapitulos);

		confirmSelection.addEventListener('click', () => {
			const dataPrincipal = coletarDadosFormulario().principal;
			const todosSistemas = dataPrincipal.sistemas;
			const checkboxes = document.querySelectorAll('#capitulos-checkboxes input[type="checkbox"]:checked');
			
			const sistemasSelecionadosParaParte2 = [];

			checkboxes.forEach(checkbox => {
				const nomeSistema = checkbox.getAttribute('data-nome');
				const sistemaEncontrado = todosSistemas.find(s => s.sistema === nomeSistema);
				if (sistemaEncontrado) {
					sistemasSelecionadosParaParte2.push(sistemaEncontrado);
				}
			});
			
			fecharModalSelecaoCapitulos();
			gerarPDF(sistemasSelecionadosParaParte2); 
		});
	} else {
		console.error("Erro: Botões do modal 'chapterSelectionModal' (confirmSelection, cancelSelection) não encontrados.");
	}  
	
     alternarAbas('principal');
     setupDragAndDrop('comentarios');
     setupEditableContent('comentarios');
	
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
