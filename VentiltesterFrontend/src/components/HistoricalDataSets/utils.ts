import { LoadedData } from './types';

export function formatValue(v: any): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p.join(', ');
      if (typeof p === 'object') return JSON.stringify(p);
    } catch { }
    return v;
  }
  return String(v);
}

export function getMesskurveData(loadedData: LoadedData | null): number[] | null {
  if (!loadedData?.data?.groups) return null;
  
  for (const groupName in loadedData.data.groups) {
    const params = loadedData.data.groups[groupName];
    const messkurveParam = params.find((p: any) => 
      p.name === 'pMesskurven' || p.name === 'pMesskurve'
    );
    
    if (messkurveParam?.value) {
      try {
        const parsed = typeof messkurveParam.value === 'string' 
          ? JSON.parse(messkurveParam.value) 
          : messkurveParam.value;
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse pMesskurve data:', e);
      }
    }
  }
  return null;
}

export function exportToJSON(loadedData: LoadedData | null): void {
  if (!loadedData) {
    alert('No data loaded to export');
    return;
  }

  const dataStr = JSON.stringify(loadedData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${loadedData.name || 'dataset'}_${loadedData.id}_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(loadedData: LoadedData | null): void {
  if (!loadedData) {
    alert('No data loaded to export');
    return;
  }

  const rows: string[] = [];
  
  // Add header row with metadata
  rows.push('Dataset Information');
  rows.push(`Name,${loadedData.name}`);
  rows.push(`ID,${loadedData.id}`);
  rows.push(`Created At,${new Date(loadedData.createdAt).toLocaleString()}`);
  if (loadedData.identifierNumber) {
    rows.push(`Identifier Number,${loadedData.identifierNumber}`);
  }
  if (loadedData.comment) {
    rows.push(`Comment,"${loadedData.comment.replace(/"/g, '""')}"`);
  }
  rows.push('');

  // Add parameter data
  if (loadedData.data?.groups) {
    rows.push('Group,Parameter Name,Value');
    
    Object.keys(loadedData.data.groups).forEach(groupName => {
      const params = loadedData.data.groups[groupName];
      params.forEach((param: any) => {
        const value = formatValue(param.value);
        const escapedValue = value.includes(',') || value.includes('"') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
        rows.push(`${groupName},${param.name},${escapedValue}`);
      });
    });
  } else {
    rows.push('Data');
    rows.push(JSON.stringify(loadedData.data));
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${loadedData.name || 'dataset'}_${loadedData.id}_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
