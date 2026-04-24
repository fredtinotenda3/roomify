// FILE: C:\Users\user\Desktop\roomify\lib\pdf.export.ts

import jsPDF from 'jspdf';

interface PDFExportOptions {
    title: string;
    beforeImage: string;
    afterImage: string;
    styleName: string;
    date: string;
    projectId: string;
}

export const exportToPDF = async (options: PDFExportOptions): Promise<void> => {
    const { title, beforeImage, afterImage, styleName, date, projectId } = options;
    
    return new Promise((resolve, reject) => {
        try {
            // Create PDF in landscape mode
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Add decorative header line
            pdf.setFillColor(249, 115, 22); // Primary color
            pdf.rect(0, 0, pageWidth, 8, 'F');
            
            // Add title
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(249, 115, 22);
            pdf.text(title, pageWidth / 2, 25, { align: 'center' });
            
            // Add subtitle
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Design Style: ${styleName}`, pageWidth / 2, 35, { align: 'center' });
            pdf.text(`Generated: ${date}`, pageWidth / 2, 42, { align: 'center' });
            pdf.text(`Project ID: ${projectId}`, pageWidth / 2, 49, { align: 'center' });
            
            // Add "Before" label
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('ORIGINAL FLOOR PLAN', pageWidth / 4, 62, { align: 'center' });
            
            // Add "After" label
            pdf.text('AI GENERATED 3D RENDER', (pageWidth * 3) / 4, 62, { align: 'center' });
            
            // Add style badge
            pdf.setFillColor(249, 115, 22);
            pdf.setDrawColor(249, 115, 22);
            pdf.roundedRect(pageWidth - 35, 8, 30, 8, 2, 2, 'F');
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text(styleName.toUpperCase(), pageWidth - 20, 14, { align: 'center' });
            
            // Load and add images
            const loadImage = (src: string): Promise<HTMLImageElement> => {
                return new Promise((resolveImg, rejectImg) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolveImg(img);
                    img.onerror = () => rejectImg(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
                    img.src = src;
                });
            };
            
            Promise.all([
                loadImage(beforeImage),
                loadImage(afterImage)
            ]).then(([beforeImg, afterImg]) => {
                // Calculate image dimensions
                const imageWidth = pageWidth * 0.38;
                const beforeHeight = (beforeImg.height * imageWidth) / beforeImg.width;
                const afterHeight = (afterImg.height * imageWidth) / afterImg.width;
                
                const imageY = 72;
                const maxHeight = pageHeight - imageY - 35;
                
                const finalBeforeHeight = Math.min(beforeHeight, maxHeight);
                const finalAfterHeight = Math.min(afterHeight, maxHeight);
                
                // Add before image (left side) with border
                pdf.setDrawColor(200, 200, 200);
                pdf.setFillColor(255, 255, 255);
                pdf.roundedRect(
                    pageWidth / 4 - imageWidth / 2 - 2,
                    imageY - 2,
                    imageWidth + 4,
                    finalBeforeHeight + 4,
                    2,
                    2,
                    'FD'
                );
                
                pdf.addImage(
                    beforeImg,
                    'JPEG',
                    pageWidth / 4 - imageWidth / 2,
                    imageY,
                    imageWidth,
                    finalBeforeHeight
                );
                
                // Add after image (right side) with border
                pdf.roundedRect(
                    (pageWidth * 3) / 4 - imageWidth / 2 - 2,
                    imageY - 2,
                    imageWidth + 4,
                    finalAfterHeight + 4,
                    2,
                    2,
                    'FD'
                );
                
                pdf.addImage(
                    afterImg,
                    'JPEG',
                    (pageWidth * 3) / 4 - imageWidth / 2,
                    imageY,
                    imageWidth,
                    finalAfterHeight
                );
                
                // Add comparison slider hint
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(150, 150, 150);
                pdf.text(
                    'Compare the original floor plan with the AI-generated 3D visualization',
                    pageWidth / 2,
                    pageHeight - 22,
                    { align: 'center' }
                );
                
                // Add footer with decorative line
                pdf.setDrawColor(249, 115, 22);
                pdf.setLineWidth(0.5);
                pdf.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18);
                
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(150, 150, 150);
                pdf.text(
                    'Generated by Roomify - AI Architectural Visualization Tool',
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
                
                // Add page number
                pdf.text(
                    'Page 1',
                    pageWidth - 20,
                    pageHeight - 10,
                    { align: 'right' }
                );
                
                // Save the PDF
                pdf.save(`roomify-${projectId}-${styleName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
                resolve();
            }).catch((error) => {
                console.error('Image loading error:', error);
                reject(new Error('Failed to load images for PDF export'));
            });
        } catch (error) {
            console.error('PDF generation error:', error);
            reject(error);
        }
    });
};