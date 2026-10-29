function getCaretPosition(element) {
	const selection = window.getSelection();
	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		if (element.contains(range.commonAncestorContainer)) {
			return range;
		}
	}
	return null;
}

function insertAtCursor(element, content) {
	const selection = window.getSelection();
	const range = getCaretPosition(element);
	
	if (range) {
		range.deleteContents();
		range.insertNode(content);
		range.collapse(false);
		selection.removeAllRanges();
		selection.addRange(range);
	} else {
		element.appendChild(content);
	}
}

function criarMiniatura(dataUrl, maxWidth = 150, maxHeight = 100) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			
			let { width, height } = img;
			if (width > maxWidth) {
				height = (height * maxWidth) / width;
				width = maxWidth;
			}
			if (height > maxHeight) {
				width = (width * maxHeight) / height;
				height = maxHeight;
			}
			
			canvas.width = width;
			canvas.height = height;
			
			ctx.drawImage(img, 0, 0, width, height);
			
			const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
			resolve(thumbnailDataUrl);
		};
		img.src = dataUrl;
	});
}

function otimizarImagemBase64(dataUrl, maxDim = 1920, qualidade = 0.85) {
	return new Promise((resolve) => {
		if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
			resolve(dataUrl);
			return;
		}
		// Se for SVG ou GIF (animações) ou se já for leve (< 350KB), não precisa recomprimir
		if (dataUrl.startsWith('data:image/svg') || dataUrl.startsWith('data:image/gif') || dataUrl.length < 350000) {
			resolve(dataUrl);
			return;
		}
		const img = new Image();
		img.onload = () => {
			try {
				let { width, height } = img;
				// Se já cabe na dimensão e é razoavelmente leve, mantém
				if (width <= maxDim && height <= maxDim && dataUrl.length < 600000) {
					resolve(dataUrl);
					return;
				}
				if (width > maxDim || height > maxDim) {
					if (width > height) {
						height = Math.round((height * maxDim) / width);
						width = maxDim;
					} else {
						width = Math.round((width * maxDim) / height);
						height = maxDim;
					}
				}
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				// Preenche fundo branco caso seja PNG com transparência ao converter para JPEG
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(img, 0, 0, width, height);
				
				const otimizada = canvas.toDataURL('image/jpeg', qualidade);
				resolve((otimizada && otimizada.length < dataUrl.length) ? otimizada : dataUrl);
			} catch (err) {
				console.warn('Erro ao otimizar imagem no canvas:', err);
				resolve(dataUrl);
			}
		};
		img.onerror = () => resolve(dataUrl);
		img.src = dataUrl;
	});
}

async function processarArquivo(element, file) {
	const reader = new FileReader();
	reader.onload = async (readerEvent) => {
		let dataUrl = readerEvent.target.result;
		let content;
		
		if (file.type && file.type.startsWith('image/')) {
			// Otimiza a imagem original para web (max 1920px, JPEG 85%) antes de armazenar
			dataUrl = await otimizarImagemBase64(dataUrl, 1920, 0.85);
			const thumbnailDataUrl = await criarMiniatura(dataUrl);
			
			const imgContainer = document.createElement('div');
			imgContainer.className = 'image-container';
			imgContainer.style.display = 'inline-block';
			imgContainer.style.marginTop = '5px';
			imgContainer.style.marginBottom = '5px';
			imgContainer.contentEditable = 'false';
			
			const img = document.createElement('img');
			img.src = thumbnailDataUrl;
			img.style.maxWidth = '150px';
			img.style.maxHeight = '100px';
			img.style.display = 'block';
			img.style.border = '1px solid #ccc';
			img.style.borderRadius = '4px';
			img.style.cursor = 'pointer';
			img.title = `Clique para ver em tamanho real: ${file.name || 'imagem'}`;
			
			img.setAttribute('data-original-image', dataUrl);
			img.setAttribute('data-filename', file.name || 'imagem');
			img.setAttribute('data-mime', 'image/jpeg');
			
			imgContainer.appendChild(img);
			content = imgContainer;
		} else {
			const link = document.createElement('a');
			link.href = dataUrl;
			link.target = '_blank';
			link.download = file.name || 'anexo';
			link.textContent = file.name || 'anexo';
			link.style.display = 'inline-block';
			link.style.marginTop = '5px';
			link.className = 'attachment';
			link.setAttribute('data-filename', file.name || 'anexo');
			if (file.type) link.setAttribute('data-mime', file.type);
			link.contentEditable = 'false';
			content = link;
		}
		
		insertAtCursor(element, content);
		
		const br = document.createElement('br');
		insertAtCursor(element, br);
		
		if (element.oninput) {
			element.oninput();
		}
	};
	reader.readAsDataURL(file);
}

function setupDragAndDrop(elementId) {
	const element = document.getElementById(elementId);
	if (!element) return;

	element.addEventListener('dragover', (e) => {
		e.preventDefault();
		e.stopPropagation();
		element.classList.add('drag-over');
	});

	element.addEventListener('dragleave', (e) => {
		e.stopPropagation();
		element.classList.remove('drag-over');
	});

	element.addEventListener('drop', (e) => {
		e.preventDefault();
		e.stopPropagation();
		element.classList.remove('drag-over');

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			for (let i = 0; i < files.length; i++) {
				processarArquivo(element, files[i]);
			}
		}
	});
}

function abrirSeletorArquivo(elementId) {
	const fileInput = document.getElementById(`file_${elementId}`);
	if (fileInput) {
		fileInput.click();
	}
}

function processarArquivosSelecionados(elementId, files) {
	const element = document.getElementById(elementId);
	if (!element || !files) return;
	
	element.focus();
	
	for (let i = 0; i < files.length; i++) {
		processarArquivo(element, files[i]);
	}
	
	const fileInput = document.getElementById(`file_${elementId}`);
	if (fileInput) {
		fileInput.value = '';
	}
}

function salvarDadosComentarios() {
}

function updateEditablePlaceholder(element) {
	if (!element) return;
	
	const hasContent = element.innerHTML.trim() !== '';
	if (hasContent) {
		element.classList.remove('empty');
	} else {
		element.classList.add('empty');
	}
}

function autoResizeEditableContent(element) {
	if (!element) return;
	
	element.style.height = 'auto';
	
	const scrollHeight = element.scrollHeight;
	const minHeight = parseInt(window.getComputedStyle(element).minHeight, 10) || 120;
	const newHeight = Math.max(scrollHeight, minHeight);
	
	element.style.height = newHeight + 'px';
}

function getChapterFolderName(veiculo, sistema, capTitulo) {
	const sistemaIndex = sistema && veiculo.sistemas ? veiculo.sistemas.indexOf(sistema) + 1 : 1;
	return `Capítulo ${sistemaIndex} - ${capTitulo}`;
}

// =========================================================================
// MODAIS DE VISUALIZAÇÃO INTERATIVA: LINK / PASTA E IMAGENS ORIGINAIS
// =========================================================================

function fecharModaisVisualizacao() {
	const overlayLink = document.getElementById('preview-link-modal-overlay');
	if (overlayLink) overlayLink.remove();
	const overlayImg = document.getElementById('preview-image-modal-overlay');
	if (overlayImg) overlayImg.remove();
}

function abrirModalVisualizacaoLink(urlOuPath, tipoTexto = '') {
	fecharModaisVisualizacao();

	const isPath = /^[a-zA-Z]:\\|^\\\\/.test(urlOuPath.trim());
	const titulo = isPath ? '📁 Caminho da Pasta' : '🔗 Visualizar Link';
	const urlFormatada = isPath ? urlOuPath : (urlOuPath.startsWith('http') ? urlOuPath : `http://${urlOuPath}`);

	const overlay = document.createElement('div');
	overlay.id = 'preview-link-modal-overlay';
	overlay.className = 'modal-overlay';
	overlay.style.position = 'fixed';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100vw';
	overlay.style.height = '100vh';
	overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
	overlay.style.backdropFilter = 'blur(3px)';
	overlay.style.display = 'flex';
	overlay.style.justifyContent = 'center';
	overlay.style.alignItems = 'center';
	overlay.style.zIndex = '100000';

	const modal = document.createElement('div');
	modal.className = 'modal-content';
	modal.style.backgroundColor = '#fff';
	modal.style.padding = '25px 30px';
	modal.style.borderRadius = '12px';
	modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
	modal.style.maxWidth = '550px';
	modal.style.width = '90%';
	modal.style.boxSizing = 'border-box';
	modal.style.textAlign = 'left';

	modal.innerHTML = `
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
			<h3 style="margin: 0; color: #333; font-size: 1.25em;">${titulo}</h3>
			<button type="button" id="btn-fechar-link-x" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
		</div>
		<p style="font-size: 0.9em; color: #666; margin-top: 0; margin-bottom: 8px;">Conteúdo colado no formulário:</p>
		<div style="background-color: #f7f9fa; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; font-family: Consolas, monospace; font-size: 13px; color: #1f2937; word-break: break-all; max-height: 180px; overflow-y: auto; user-select: all; line-height: 1.4;">${urlOuPath}</div>
		<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
			${!isPath ? `<button type="button" id="btn-abrir-link-url" class="orange-button" style="padding: 8px 16px;">🌐 Abrir no Navegador</button>` : ''}
			<button type="button" id="btn-copiar-link-url" class="orange-button" style="padding: 8px 16px;">📋 Copiar</button>
			<button type="button" id="btn-fechar-link-url" style="padding: 8px 16px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 5px; cursor: pointer; font-size: 14px;">Fechar</button>
		</div>
	`;

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	const fechar = () => {
		fecharModaisVisualizacao();
	};

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) fechar();
	});

	modal.querySelector('#btn-fechar-link-x').onclick = fechar;
	modal.querySelector('#btn-fechar-link-url').onclick = fechar;

	const btnAbrir = modal.querySelector('#btn-abrir-link-url');
	if (btnAbrir) {
		btnAbrir.onclick = () => {
			window.open(urlFormatada, '_blank');
		};
	}

	const btnCopiar = modal.querySelector('#btn-copiar-link-url');
	btnCopiar.onclick = () => {
		copiarTextoParaClipboard(urlOuPath, btnCopiar);
	};

	const onKeyDown = (e) => {
		if (e.key === 'Escape') {
			fechar();
			document.removeEventListener('keydown', onKeyDown);
		}
	};
	document.addEventListener('keydown', onKeyDown);
}

function abrirModalVisualizacaoImagem(srcOriginal, nomeArquivo = 'Imagem') {
	fecharModaisVisualizacao();

	const overlay = document.createElement('div');
	overlay.id = 'preview-image-modal-overlay';
	overlay.style.position = 'fixed';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100vw';
	overlay.style.height = '100vh';
	overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
	overlay.style.backdropFilter = 'blur(4px)';
	overlay.style.display = 'flex';
	overlay.style.flexDirection = 'column';
	overlay.style.justifyContent = 'center';
	overlay.style.alignItems = 'center';
	overlay.style.zIndex = '100000';
	overlay.style.padding = '20px';
	overlay.style.boxSizing = 'border-box';

	const header = document.createElement('div');
	header.style.display = 'flex';
	header.style.justifyContent = 'space-between';
	header.style.alignItems = 'center';
	header.style.maxWidth = '92vw';
	header.style.width = '100%';
	header.style.marginBottom = '10px';
	header.style.color = '#fff';

	const title = document.createElement('span');
	title.textContent = nomeArquivo;
	title.style.fontSize = '14px';
	title.style.opacity = '0.9';
	title.style.textOverflow = 'ellipsis';
	title.style.overflow = 'hidden';
	title.style.whiteSpace = 'nowrap';

	const closeBtn = document.createElement('button');
	closeBtn.innerHTML = '&times;';
	closeBtn.style.background = 'none';
	closeBtn.style.border = 'none';
	closeBtn.style.color = '#fff';
	closeBtn.style.fontSize = '30px';
	closeBtn.style.cursor = 'pointer';
	closeBtn.style.padding = '0 8px';
	closeBtn.style.lineHeight = '1';

	header.appendChild(title);
	header.appendChild(closeBtn);

	const img = document.createElement('img');
	img.src = srcOriginal;
	img.style.maxWidth = '92vw';
	img.style.maxHeight = '80vh';
	img.style.objectFit = 'contain';
	img.style.borderRadius = '6px';
	img.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
	img.style.backgroundColor = '#fff';

	const footer = document.createElement('div');
	footer.style.display = 'flex';
	footer.style.gap = '10px';
	footer.style.marginTop = '14px';

	const btnAbrirAba = document.createElement('button');
	btnAbrirAba.className = 'orange-button';
	btnAbrirAba.style.padding = '6px 14px';
	btnAbrirAba.style.fontSize = '13px';
	btnAbrirAba.textContent = '🔍 Abrir em Nova Aba';
	btnAbrirAba.onclick = () => {
		const novaJanela = window.open();
		if (novaJanela) {
			novaJanela.document.write(`<img src="${srcOriginal}" style="max-width:100%; height:auto;" alt="Imagem">`);
		}
	};

	const btnFechar = document.createElement('button');
	btnFechar.style.padding = '6px 14px';
	btnFechar.style.fontSize = '13px';
	btnFechar.style.border = '1px solid #666';
	btnFechar.style.backgroundColor = '#333';
	btnFechar.style.color = '#fff';
	btnFechar.style.borderRadius = '5px';
	btnFechar.style.cursor = 'pointer';
	btnFechar.textContent = 'Fechar';

	footer.appendChild(btnAbrirAba);
	footer.appendChild(btnFechar);

	overlay.appendChild(header);
	overlay.appendChild(img);
	overlay.appendChild(footer);
	document.body.appendChild(overlay);

	const fechar = () => {
		fecharModaisVisualizacao();
	};

	closeBtn.onclick = fechar;
	btnFechar.onclick = fechar;
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) fechar();
	});

	const onKeyDown = (e) => {
		if (e.key === 'Escape') {
			fechar();
			document.removeEventListener('keydown', onKeyDown);
		}
	};
	document.addEventListener('keydown', onKeyDown);
}

function copiarTextoParaClipboard(texto, btnElement) {
	const feedback = () => {
		if (btnElement) {
			const textoOriginal = btnElement.textContent;
			btnElement.textContent = '✓ Copiado!';
			btnElement.style.backgroundColor = '#28a745';
			btnElement.style.color = '#fff';
			setTimeout(() => {
				btnElement.textContent = textoOriginal;
				btnElement.style.backgroundColor = '';
				btnElement.style.color = '';
			}, 2000);
		}
	};

	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(texto).then(feedback).catch(() => fallbackCopiar(texto, feedback));
	} else {
		fallbackCopiar(texto, feedback);
	}
}

function fallbackCopiar(texto, callback) {
	const textarea = document.createElement('textarea');
	textarea.value = texto;
	textarea.style.position = 'fixed';
	textarea.style.left = '-9999px';
	document.body.appendChild(textarea);
	textarea.select();
	try {
		document.execCommand('copy');
		if (callback) callback();
	} catch (err) {
		alert('Não foi possível copiar automaticamente. Selecione o texto e use Ctrl+C.');
	}
	document.body.removeChild(textarea);
}

// Listener global com delegação de eventos para miniaturas de imagem e links nos campos editáveis
document.addEventListener('click', (e) => {
	// 1. Miniatura de imagem
	const imgEl = e.target.closest('img');
	if (imgEl) {
		if (imgEl.closest('#cabecalho') || imgEl.id === 'logo') {
			return;
		}
		if (imgEl.hasAttribute('data-original-image') || imgEl.closest('.editable-content') || imgEl.closest('.image-container')) {
			e.preventDefault();
			e.stopPropagation();
			const originalSrc = imgEl.getAttribute('data-original-image') || imgEl.src;
			const filename = imgEl.getAttribute('data-filename') || imgEl.alt || 'Imagem';
			abrirModalVisualizacaoImagem(originalSrc, filename);
			return;
		}
	}

	// 2. Links ("LINK", "PASTA", anexos ou links dentro de .editable-content)
	const linkEl = e.target.closest('a');
	if (linkEl && (linkEl.closest('.editable-content') || ['LINK', 'PASTA'].includes(linkEl.textContent.trim()) || linkEl.classList.contains('attachment'))) {
		const href = linkEl.getAttribute('href') || linkEl.getAttribute('title') || '';
		if (href && !href.startsWith('data:')) {
			e.preventDefault();
			e.stopPropagation();
			abrirModalVisualizacaoLink(href, linkEl.textContent.trim());
			return;
		}
	}
});
