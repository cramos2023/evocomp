
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Position } from '@/modules/job-evaluation/types/position';

// Función para formatear datos para exportar
const formatExportData = (positions: Position[]) => {
  // Filtrar posiciones que tienen resultados calculados
  const validPositions = positions.filter(p => p.result);
  
  if (validPositions.length === 0) {
    throw new Error('No hay posiciones con resultados calculados para exportar');
  }
  
  // Datos para la tabla principal
  const mainTableData = validPositions.map(position => ({
    'Título del Puesto': position.jobTitle || 'Sin título',
    'Clase de Posición': position.result?.positionClass || '-',
    'Grado RCS': position.result?.rcsGrade || '-',
    'Puntos Totales': position.result?.totalPoints || 0,
  }));
  
  // Datos detallados de dimensiones por posición
  const detailedData = validPositions.map(position => ({
    'Título del Puesto': position.jobTitle || 'Sin título',
    'País': position.country || '-',
    'Tamaño de Organización': position.orgSize || '-',
    'Reportes Directos': position.directReports || '-',
    'Flujo de Carrera': position.careerStream || '-',
    'Función': position.careerFunction || '-',
    'Familia de Trabajo': position.jobFamily || '-',
    'Nivel de Carrera': position.careerLevel || '-',
    // Criterios de evaluación
    'Impacto': position.impact || 0,
    'Contribución': position.contribution || 0,
    'Tamaño': position.size || 0,
    'Comunicación': position.communication || 0,
    'Marco': position.frame || 0,
    'Innovación': position.innovation || 0,
    'Complejidad': position.complexity || 0,
    'Conocimiento': position.knowledge || 0,
    'Equipos': position.teams || 0,
    'Amplitud': position.breadth || 0,
    'Riesgo': position.risk || 0,
    'Entorno': position.environment || 0,
    // Resultados
    'Clase de Posición': position.result?.positionClass || '-',
    'Grado RCS': position.result?.rcsGrade || '-',
    'Puntos Totales': position.result?.totalPoints || 0,
    // Puntos por dimensión
    'Puntos Impacto-Contribución': position.result?.pointsImpactContribution || 0,
    'Puntos Tamaño': position.result?.pointsSize || 0,
    'Puntos Comunicación-Marco': position.result?.pointsCommunicationFrame || 0,
    'Puntos Innovación-Complejidad': position.result?.pointsInnovationComplexity || 0,
    'Puntos Conocimiento-Equipos': position.result?.pointsKnowledgeTeams || 0,
    'Puntos Amplitud': position.result?.pointsBreadth || 0,
    'Puntos Riesgo-Entorno': position.result?.pointsRiskEnvironment || 0,
  }));
  
  return { mainTableData, detailedData };
};

// Exportar a PDF con formato elegante
export const exportToPDF = (positions: Position[]) => {
  try {
    const { mainTableData, detailedData } = formatExportData(positions);
    
    // Crear documento PDF con orientación horizontal
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configuración de colores y estilos
    const primaryColor = '#9b87f5';
    const secondaryColor = '#7E69AB';
    const textColor = '#1A1F2C';
    
    // Añadir título y fecha
    doc.setFontSize(20);
    doc.setTextColor(secondaryColor);
    doc.text('Informe de Evaluación de Posiciones', 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 22);
    
    // Añadir tabla resumen
    doc.setFontSize(14);
    doc.setTextColor(secondaryColor);
    doc.text('Resumen de Posiciones', 14, 30);
    
    autoTable(doc, {
      startY: 35,
      head: [Object.keys(mainTableData[0])],
      body: mainTableData.map(item => Object.values(item)),
      headStyles: {
        fillColor: primaryColor,
        textColor: '#FFFFFF',
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: '#F1F0FB'
      },
      styles: {
        cellPadding: 3,
        fontSize: 10
      }
    });
    
    // Añadir información detallada para cada posición
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    
    detailedData.forEach((position, index) => {
      // Verificar si necesitamos una nueva página
      if (currentY > 180) {
        doc.addPage();
        currentY = 15;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(secondaryColor);
      doc.text(`Detalles de Posición: ${position['Título del Puesto']}`, 14, currentY);
      
      // Crear subconjuntos para una mejor visualización
      const orgInfo = {
        'País': position['País'],
        'Tamaño de Organización': position['Tamaño de Organización'],
        'Reportes Directos': position['Reportes Directos'],
        'Flujo de Carrera': position['Flujo de Carrera'],
        'Función': position['Función'],
        'Familia de Trabajo': position['Familia de Trabajo'],
        'Nivel de Carrera': position['Nivel de Carrera']
      };
      
      const evaluationCriteria = {
        'Impacto': position['Impacto'],
        'Contribución': position['Contribución'],
        'Tamaño': position['Tamaño'],
        'Comunicación': position['Comunicación'],
        'Marco': position['Marco'],
        'Innovación': position['Innovación'],
        'Complejidad': position['Complejidad'],
        'Conocimiento': position['Conocimiento'],
        'Equipos': position['Equipos'],
        'Amplitud': position['Amplitud'],
        'Riesgo': position['Riesgo'],
        'Entorno': position['Entorno']
      };
      
      const results = {
        'Clase de Posición': position['Clase de Posición'],
        'Grado RCS': position['Grado RCS'],
        'Puntos Totales': position['Puntos Totales'],
        'Puntos Impacto-Contribución': position['Puntos Impacto-Contribución'],
        'Puntos Tamaño': position['Puntos Tamaño'],
        'Puntos Comunicación-Marco': position['Puntos Comunicación-Marco'],
        'Puntos Innovación-Complejidad': position['Puntos Innovación-Complejidad'],
        'Puntos Conocimiento-Equipos': position['Puntos Conocimiento-Equipos'],
        'Puntos Amplitud': position['Puntos Amplitud'],
        'Puntos Riesgo-Entorno': position['Puntos Riesgo-Entorno']
      };
      
      // Información organizacional
      currentY += 7;
      autoTable(doc, {
        startY: currentY,
        head: [['Información Organizacional', '']],
        body: Object.entries(orgInfo),
        theme: 'grid',
        headStyles: {
          fillColor: '#6E59A5',
          textColor: '#FFFFFF'
        },
        styles: {
          cellPadding: 2,
          fontSize: 9
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 }
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 5;
      
      // Verificar espacio para la siguiente tabla
      if (currentY > 180) {
        doc.addPage();
        currentY = 15;
      }
      
      // Criterios de evaluación
      autoTable(doc, {
        startY: currentY,
        head: [['Criterios de Evaluación', '']],
        body: Object.entries(evaluationCriteria),
        theme: 'grid',
        headStyles: {
          fillColor: '#6E59A5',
          textColor: '#FFFFFF'
        },
        styles: {
          cellPadding: 2,
          fontSize: 9
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 }
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 5;
      
      // Verificar espacio para la siguiente tabla
      if (currentY > 180) {
        doc.addPage();
        currentY = 15;
      }
      
      // Resultados
      autoTable(doc, {
        startY: currentY,
        head: [['Resultados', '']],
        body: Object.entries(results),
        theme: 'grid',
        headStyles: {
          fillColor: '#6E59A5',
          textColor: '#FFFFFF'
        },
        styles: {
          cellPadding: 2,
          fontSize: 9
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 }
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      if (index < detailedData.length - 1) {
        if (currentY > 180) {
          doc.addPage();
          currentY = 15;
        } else {
          doc.line(14, currentY - 5, 280, currentY - 5);
        }
      }
    });
    
    // Añadir pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor('#666666');
      doc.text(
        `Sistema de Evaluación de Posiciones - Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Guardar el archivo
    doc.save('EvaluacionPosiciones.pdf');
    return true;
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return false;
  }
};

// Exportar a CSV
export const exportToCSV = (positions: Position[]) => {
  try {
    const { detailedData } = formatExportData(positions);
    
    // Convertir a CSV con PapaParse
    const csv = Papa.unparse(detailedData);
    
    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Crear URL para descargar
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'EvaluacionPosiciones.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error al generar CSV:', error);
    return false;
  }
};
