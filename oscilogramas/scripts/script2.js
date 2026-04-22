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

async function processarArquivo(element, file) {
	const reader = new FileReader();
	reader.onload = async (readerEvent) => {
		const dataUrl = readerEvent.target.result;
		let content;
		
		if (file.type && file.type.startsWith('image/')) {
			const thumbnailDataUrl = await criarMiniatura(dataUrl);
			
			const imgContainer = document.createElement('div');
			imgContainer.className = 'image-container';
			imgContainer.style.display = 'inline-block';
			imgContainer.style.marginTop = '5px';
			imgContainer.style.marginBottom = '5px';
			
			const img = document.createElement('img');
			img.src = thumbnailDataUrl;
			img.style.maxWidth = '150px';
			img.style.maxHeight = '100px';
			img.style.display = 'block';
			img.style.border = '1px solid #ccc';
			img.style.borderRadius = '4px';
			img.style.cursor = 'pointer';
			img.title = `Clique para ver em tamanho real: ${file.name}`;
			
			img.setAttribute('data-original-image', dataUrl);
			img.setAttribute('data-filename', file.name || 'imagem');
			img.setAttribute('data-mime', file.type);
			
			img.addEventListener('click', () => {
				const modal = document.createElement('div');
				modal.style.position = 'fixed';
				modal.style.top = '0';
				modal.style.left = '0';
				modal.style.width = '100%';
				modal.style.height = '100%';
				modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
				modal.style.display = 'flex';
				modal.style.justifyContent = 'center';
				modal.style.alignItems = 'center';
				modal.style.zIndex = '10000';
				modal.style.cursor = 'pointer';
				
				const modalImg = document.createElement('img');
				modalImg.src = dataUrl;
				modalImg.style.maxWidth = '90%';
				modalImg.style.maxHeight = '90%';
				modalImg.style.objectFit = 'contain';
				
				modal.appendChild(modalImg);
				document.body.appendChild(modal);
				
				modal.addEventListener('click', () => {
					document.body.removeChild(modal);
				});
			});
			
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