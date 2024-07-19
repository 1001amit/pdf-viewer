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
const thumbnailsContainer = document.getElementById('thumbnails');

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumPending = null;
let zoomScale = 1.5;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let pdfFile = null;

const renderPage = num => {
    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: zoomScale });
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
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
};

const createThumbnail = (page, num) => {
    const thumbnail = document.createElement('div');
    thumbnail.classList.add('thumbnail');
    const thumbnailCanvas = document.createElement('canvas');
    const thumbnailCtx = thumbnailCanvas.getContext('2d');

    const viewport = page.getViewport({ scale: 0.2 });
    thumbnailCanvas.height = viewport.height;
    thumbnailCanvas.width = viewport.width;

    page.render({
        canvasContext: thumbnailCtx,
        viewport
    }).promise.then(() => {
        const img = document.createElement('img');
        img.src = thumbnailCanvas.toDataURL();
        thumbnail.appendChild(img);
    }).catch(err => {
        console.error('Thumbnail render error:', err);
    });

    thumbnail.addEventListener('click', () => {
        pageNum = num;
        queueRenderPage(num);
    });

    thumbnailsContainer.appendChild(thumbnail);
};

const generateThumbnails = () => {
    thumbnailsContainer.innerHTML = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        pdfDoc.getPage(i).then(page => {
            createThumbnail(page, i);
        }).catch(err => {
            console.error('Get thumbnail page error:', err);
        });
    }
};

const downloadPDF = () => {
    if (pdfFile) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfFile);
        link.download = 'downloaded.pdf';
        link.click();
    } else {
        alert('Please upload a PDF file first.');
    }
};

const searchInPDF = (query) => {
    pdfDoc.getPage(pageNum).then(page => {
        page.getTextContent().then(textContent => {
            const textItems = textContent.items;
            const regex = new RegExp(query, 'gi');
            let text = '';

            for (const item of textItems) {
                text += item.str + ' ';
            }

            if (regex.test(text)) {
                alert(`Found "${query}" on page ${pageNum}`);
            } else {
                alert(`"${query}" not found on page ${pageNum}`);
            }
        }).catch(err => {
            console.error('Text content error:', err);
        });
    }).catch(err => {
        console.error('Get page error:', err);
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
        pdfjsLib.getDocument(typedArray).promise.then(pdfDoc_ => {
            pdfDoc = pdfDoc_;
            pageCountElem.textContent = pdfDoc.numPages;
            renderPage(pageNum);
            generateThumbnails();
        }).catch(err => {
            console.error('PDF load error:', err);
            alert('Error loading PDF. Please try another file.');
        });
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

