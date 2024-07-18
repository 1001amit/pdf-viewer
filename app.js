
const fileInput = document.getElementById('file-input');
const pdfRender = document.getElementById('pdf-render');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumElem = document.getElementById('page-num');
const pageCountElem = document.getElementById('page-count');

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumPending = null;

const scale = 1.5;
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

const renderPage = num => {
    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
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
        });

        pdfRender.innerHTML = '';
        pdfRender.appendChild(canvas);

        pageNumElem.textContent = num;
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

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
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
        });
    };
});

prevPageBtn.addEventListener('click', showPrevPage);
nextPageBtn.addEventListener('click', showNextPage);
