document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('textInput');
    const textOverlay = document.getElementById('textOverlay');
    const generatePDFButton = document.getElementById('generatePDF');
    
    // Base URL for SVG files
    const baseUrl = 'https://tiboprive.github.io/SKC/';
    
    // Constants for exact measurements (in mm)
    const LAYOUT_WIDTH = 208.7;
    const LAYOUT_HEIGHT = 57.7;
    const TEXT_START_X = 127.2;
    const TEXT_START_Y = 28.8;
    const LETTER_HEIGHT = 12;

    // Calculate proportions
    const LETTER_HEIGHT_RATIO = LETTER_HEIGHT / LAYOUT_HEIGHT; // This gives us ~20.80%

    // DPI conversion (96 DPI to mm)
    const DPI_RATIO = 96/25.4;

    textInput.addEventListener('input', function(e) {
        // Convert to uppercase and remove invalid characters
        let text = e.target.value.toUpperCase().replace(/[^A-Z\s]/g, '');
        e.target.value = text;
        
        // Clear previous content
        textOverlay.innerHTML = '';
        
        // Add each letter with letter spacing
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            if (char === ' ') {
                // Add word space
                const wsImage = document.createElement('img');
                wsImage.crossOrigin = 'anonymous';
                wsImage.src = baseUrl + 'WS.svg';
                wsImage.style.height = '100%'; // Use 100% height instead of mm
                textOverlay.appendChild(wsImage);
            } else {
                // Add letter
                const letterImage = document.createElement('img');
                letterImage.crossOrigin = 'anonymous';
                letterImage.src = baseUrl + char + '.svg';
                letterImage.style.height = '100%'; // Use 100% height instead of mm
                textOverlay.appendChild(letterImage);
                
                // Add letter space if not last character
                if (i < text.length - 1) {
                    const lsImage = document.createElement('img');
                    lsImage.crossOrigin = 'anonymous';
                    lsImage.src = baseUrl + 'LS.svg';
                    lsImage.style.height = '100%'; // Use 100% height instead of mm
                    textOverlay.appendChild(lsImage);
                }
            }
        }
    });

    async function createTextLayer(letters, totalWidth, letterHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Convert mm to pixels
        canvas.width = Math.ceil(LAYOUT_WIDTH * DPI_RATIO);
        canvas.height = Math.ceil(LAYOUT_HEIGHT * DPI_RATIO);
        
        let totalLettersWidth = 0;
        const letterWidths = [];
        
        // Pre-load all images and calculate their widths
        for (const letter of letters) {
            try {
                const response = await fetch(letter.src, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
                
                const svgText = await response.text();
                const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
                
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const letterWidth = (img.width / img.height) * LETTER_HEIGHT * DPI_RATIO;
                        letterWidths.push({
                            width: letterWidth,
                            dataUrl: dataUrl
                        });
                        totalLettersWidth += letterWidth;
                        resolve();
                    };
                    img.onerror = () => reject(new Error(`Failed to load image: ${letter.src}`));
                    img.src = dataUrl;
                });
            } catch (error) {
                console.error('Failed to process letter:', letter.src, error);
                throw error;
            }
        }
        
        // Convert text starting position to pixels
        const startX = TEXT_START_X * DPI_RATIO - (totalLettersWidth / 2);
        const startY = TEXT_START_Y * DPI_RATIO;
        
        // Draw all letters
        let currentX = startX;
        for (const letterData of letterWidths) {
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.drawImage(img, 
                        currentX, 
                        startY - (LETTER_HEIGHT * DPI_RATIO / 2),
                        letterData.width,
                        LETTER_HEIGHT * DPI_RATIO
                    );
                    currentX += letterData.width;
                    resolve();
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = letterData.dataUrl;
            });
        }
        
        return canvas.toDataURL('image/png', 1.0);
    }

    async function createBackgroundLayer() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = Math.ceil(LAYOUT_WIDTH * DPI_RATIO);
        canvas.height = Math.ceil(LAYOUT_HEIGHT * DPI_RATIO);
        
        const backgroundImg = document.getElementById('backgroundImage');
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png', 1.0));
            };
            
            img.onerror = () => reject(new Error('Failed to load background image'));
            img.src = backgroundImg.src;
        });
    }

    generatePDFButton.addEventListener('click', async function() {
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('jsPDF library not loaded');
            }

            // Create PDF with exact dimensions
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [LAYOUT_HEIGHT, LAYOUT_WIDTH]
            });
            
            const letters = textOverlay.getElementsByTagName('img');
            if (letters.length === 0) {
                throw new Error('No letters to process');
            }

            const backgroundDataUrl = await createBackgroundLayer();
            const textDataUrl = await createTextLayer(letters, LAYOUT_WIDTH, LETTER_HEIGHT);
            
            // Add layers to PDF with exact measurements
            pdf.addImage(backgroundDataUrl, 'PNG', 0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT);
            pdf.addImage(textDataUrl, 'PNG', 0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT);
            
            pdf.save('layout.pdf');
            
        } catch (error) {
            console.error('PDF generation failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            alert('Failed to generate PDF. Please try again.');
        }
    });
});
