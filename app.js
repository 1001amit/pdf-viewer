const fileInput = document.getElementById('file-input');
const pdfRender = document.getElementById('pdf-render');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumElem = document.getElementById('page-num');
const pageCountElem = document.getElementById('page-count');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const fullscreenBtn = document.getElementById('fullscreen');
const downloadBtn = document.getElementById('download');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const nightModeBtn = document.getElementById('night-mode');
const bookmarkBtn = document.getElementById('bookmark-page');
const bookmarksContainer = document.getElementById('bookmarks');
const thumbnailsContainer = document.getElementById('thumbnails');
const pageJumpInput = document.getElementById('page-jump-input');
const pageJumpBtn = document.getElementById('page-jump-btn');
const rotatePageBtn = document.getElementById('rotate-page');
const metadataContainer = document.getElementById('metadata');
const buttonColorInput = document.getElementById('button-color');
const themeSelect = document.getElementById('theme-select');

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumPending = null;
let zoomScale = 1.5;
let pdfFile = null;
let bookmarks = [];
let currentRotation = 0;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

const renderPage = num => {
    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: zoomScale, rotation: currentRotation });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = {
            canvasContext: ctx,
            viewport
        };

        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;

            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        }).catch(err => {
            console.error('Page render error:', err);
        });

        pdfRender.innerHTML = '';
        pdfRender.appendChild(canvas);

        pageNumElem.textContent = num;
        updateNavigationButtons();
    }).catch(err => {
        console.error('Get page error:', err);
    });
};

const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
};

const showPrevPage = () => {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
};

const showNextPage = () => {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
};

const updateNavigationButtons = () => {
    prevPageBtn.disabled = (pageNum <= 1);
    nextPageBtn.disabled = (pageNum >= pdfDoc.numPages);
};

const zoomIn = () => {
    zoomScale += 0.5;
    renderPage(pageNum);
};

const zoomOut = () => {
    if (zoomScale <= 1) return;
    zoomScale -= 0.5;
    renderPage(pageNum);
};

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.body.classList.add('fullscreen-mode');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            document.body.classList.remove('fullscreen-mode');
        }
    }
};

const downloadPDF = () => {
    if (!pdfFile) return;

    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile.name;
    a.click();
    URL.revokeObjectURL(url);
};

const toggleNightMode = () => {
    document.body.classList.toggle('night-mode');
};

const addBookmark = () => {
    bookmarks.push(pageNum);
    renderBookmarks();
};

const renderBookmarks = () => {
    bookmarksContainer.innerHTML = '';
    bookmarks.forEach(page => {
        const bookmark = document.createElement('div');
        bookmark.textContent = `Page ${page}`;
        bookmark.classList.add('bookmark');
        bookmark.addEventListener('click', () => {
            pageNum = page;
            renderPage(pageNum);
        });
        bookmarksContainer.appendChild(bookmark);
    });
};

const searchInPDF = query => {
    pdfDoc.getPage(pageNum).then(page => {
        return page.getTextContent();
    }).then(textContent => {
        const text = textContent.items.map(item => item.str).join(' ');
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index !== -1) {
            alert(`Found "${query}" on page ${pageNum}`);
        } else {
            alert(`"${query}" not found on page ${pageNum}`);
        }
    }).catch(err => {
        console.error('Search error:', err);
    });
};

const jumpToPage = () => {
    const pageNumber = parseInt(pageJumpInput.value);
    if (pageNumber && pageNumber > 0 && pageNumber <= pdfDoc.numPages) {
        pageNum = pageNumber;
        queueRenderPage(pageNumber);
    } else {
        alert('Invalid page number');
    }
};

const rotatePage = () => {
    currentRotation = (currentRotation + 90) % 360;
    renderPage(pageNum);
};

const displayMetadata = metadata => {
    metadataContainer.innerHTML = `
        <h5>PDF Metadata</h5>
        <p><strong>Title:</strong> ${metadata.info.Title || 'N/A'}</p>
        <p><strong>Author:</strong> ${metadata.info.Author || 'N/A'}</p>
        <p><strong>Subject:</strong> ${metadata.info.Subject || 'N/A'}</p>
        <p><strong>Keywords:</strong> ${metadata.info.Keywords || 'N/A'}</p>
        <p><strong>Creation Date:</strong> ${metadata.info.CreationDate || 'N/A'}</p>
        <p><strong>Modification Date:</strong> ${metadata.info.ModDate || 'N/A'}</p>
    `;
};

const loadPDF = (typedArray, password = null) => {
    const loadingTask = pdfjsLib.getDocument({ data: typedArray, password });
    loadingTask.promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        pageCountElem.textContent = pdfDoc.numPages;
        renderPage(pageNum);
        generateThumbnails();
        pdfDoc.getMetadata().then(metadata => {
            displayMetadata(metadata);
        }).catch(err => {
            console.error('Metadata error:', err);
        });
    }).catch(err => {
        if (err.name === 'PasswordException') {
            const userPassword = prompt('This PDF is password protected. Please enter the password:');
            if (userPassword) {
                loadPDF(typedArray, userPassword);
            }
        } else {
            console.error('PDF load error:', err);
            alert('Error loading PDF. Please try another file.');
        }
    });
};

const generateThumbnails = () => {
    pdfDoc.getPage(1).then(page => {
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pdfDoc.getPage(i).then(page => {
                createThumbnail(page, i);
            }).catch(err => {
                console.error('Generate thumbnails error:', err);
            });
        }
    }).catch(err => {
        console.error('Get page error:', err);
    });
};

const createThumbnail = (page, num) => {
    const thumbnail = document.createElement('div');
    thumbnail.classList.add('thumbnail');

    const thumbnailCanvas = document.createElement('canvas');
    const thumbnailCtx = thumbnailCanvas.getContext('2d');
    const viewport = page.getViewport({ scale: 0.2 });
    thumbnailCanvas.height = viewport.height;
    thumbnailCanvas.width = viewport.width;

    const renderCtx = {
        canvasContext: thumbnailCtx,
        viewport
    };

    page.render(renderCtx).promise.then(() => {
        thumbnail.appendChild(thumbnailCanvas);
        thumbnailsContainer.appendChild(thumbnail);

        thumbnail.addEventListener('click', () => {
            pageNum = num;
            renderPage(pageNum);
        });
    }).catch(err => {
        console.error('Thumbnail render error:', err);
    });
};

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    pdfFile = file;
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function () {
        const typedArray = new Uint8Array(this.result);
        loadPDF(typedArray);
    };
});

prevPageBtn.addEventListener('click', showPrevPage);
nextPageBtn.addEventListener('click', showNextPage);
zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);
fullscreenBtn.addEventListener('click', toggleFullscreen);
downloadBtn.addEventListener('click', downloadPDF);
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchInPDF(query);
    } else {
        alert('Please enter a search term.');
    }
});
nightModeBtn.addEventListener('click', toggleNightMode);
bookmarkBtn.addEventListener('click', addBookmark);
pageJumpBtn.addEventListener('click', jumpToPage);
rotatePageBtn.addEventListener('click', rotatePage);

