export async function generatePDFFromElement(element, filename = 'documento') {
    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 10
    const usableW = pageW - margin * 2
    const usableH = pageH - margin * 2

    // Cuántos píxeles del canvas equivalen a una página A4
    const canvasPageH = Math.floor((canvas.width / usableW) * usableH)

    let yOffset = 0

    while (yOffset < canvas.height) {
        const sliceH = Math.min(canvasPageH, canvas.height - yOffset)

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceH

        const ctx = pageCanvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        ctx.drawImage(canvas, 0, -yOffset)

        const imgData = pageCanvas.toDataURL('image/png')
        const imgH = (sliceH * usableW) / canvas.width

        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, margin, usableW, imgH)

        yOffset += sliceH
    }

    pdf.save(`${filename}.pdf`)
}

export function fmt(n) {
    return (n || 0).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}