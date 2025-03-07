document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('textInput');
    const textOverlay = document.getElementById('textOverlay');
    const generatePDFButton = document.getElementById('generatePDF');
    
    // Letter height in mm
    const letterHeight = 15;
    
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
                wsImage.src = 'WS.svg';
                wsImage.style.height = `${letterHeight}mm`;
                textOverlay.appendChild(wsImage);
            } else {
                // Add letter
                const letterImage = document.createElement('img');
                letterImage.src = `${char}.svg`;
                letterImage.style.height = `${letterHeight}mm`;
                textOverlay.appendChild(letterImage);
                
                // Add letter space if not last character
                if (i < text.length - 1) {
                    const lsImage = document.createElement('img');
                    lsImage.src = 'LS.svg';
                    lsImage.style.height = `${letterHeight}mm`;
                    textOverlay.appendChild(lsImage);
                }
            }
        }
    });
    
    generatePDFButton.addEventListener('click', async function() {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        
        // Create PDF with mm units
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [57.7, 208.7]
        });
        
        try {
            // Load background image
            const backgroundImg = document.getElementById('backgroundImage');
            
            // Function to convert SVG to data URL
            const svgToDataUrl = async (svgElement) => {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
                return URL.createObjectURL(svgBlob);
            };
            
            // Add background
            pdf.addImage(backgroundImg.src, 'PNG', 0, 0, 208.7, 57.7);
            
            // Add letters
            const letters = textOverlay.getElementsByTagName('img');
            let currentX = 127.2;
            
            for (const letter of letters) {
                const response = await fetch(letter.src);
                const svgText = await response.text();
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;
                
                // Get original SVG dimensions
                const viewBox = svgElement.viewBox.baseVal;
                const originalWidth = viewBox.width;
                const originalHeight = viewBox.height;
                
                // Calculate width while maintaining aspect ratio
                const width = (originalWidth / originalHeight) * letterHeight;
                
                // Convert SVG to data URL
                const dataUrl = await svgToDataUrl(svgElement);
                
                // Add image to PDF
                pdf.addImage(
                    dataUrl,
                    'SVG',
                    currentX,
                    28.8 - (letterHeight / 2),
                    width,
                    letterHeight
                );
                
                currentX += width;
            }
            
            // Save PDF
            pdf.save('layout.pdf');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    });
});
