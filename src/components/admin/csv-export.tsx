'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';

type ExportType = 'payments' | 'entries' | 'companies';

// Placeholder function - this would be implemented as a server action
async function exportToCsv(type: ExportType, fromDate?: string, toDate?: string): Promise<Blob> {
  // TODO: Implement actual CSV export logic
  // For now, create a mock CSV
  let csvContent = '';

  switch (type) {
    case 'payments':
      csvContent = `결제ID,회사명,회사코드,기간시작,기간종료,총인원,단가,총금액,결제일\n`;
      csvContent += `PAY001,삼성전자,1234,2024-01-01,2024-01-31,100,8000,800000,2024-02-01\n`;
      csvContent += `PAY002,LG전자,5678,2024-01-01,2024-01-31,50,8000,400000,2024-02-01\n`;
      break;
    case 'entries':
      csvContent = `등록ID,회사명,회사코드,등록일,인원수,서명자,결제여부\n`;
      csvContent += `ENT001,삼성전자,1234,2024-01-15,5,홍길동,Y\n`;
      csvContent += `ENT002,LG전자,5678,2024-01-16,3,김철수,Y\n`;
      break;
    case 'companies':
      csvContent = `회사ID,회사명,회사코드,담당자,연락처,사업자번호,주소\n`;
      csvContent += `COM001,삼성전자,1234,홍길동,010-1234-5678,123-45-67890,서울시 강남구\n`;
      csvContent += `COM002,LG전자,5678,김철수,010-8765-4321,987-65-43210,서울시 서초구\n`;
      break;
  }

  // Convert to blob with BOM for proper Korean encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return blob;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function CsvExport() {
  const [exportType, setExportType] = useState<ExportType>('payments');
  const [fromDate, setFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, startExporting] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const exportTypeOptions = [
    { value: 'payments' as const, label: '결제 내역', filename: 'payments' },
    { value: 'entries' as const, label: '등록 내역', filename: 'entries' },
    { value: 'companies' as const, label: '회사 목록', filename: 'companies' },
  ];

  const handleExport = () => {
    const selectedOption = exportTypeOptions.find(opt => opt.value === exportType);
    if (!selectedOption) return;

    startExporting(async () => {
      try {
        setMessage(null);
        const blob = await exportToCsv(exportType, fromDate, toDate);
        const filename = `${selectedOption.filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
        downloadBlob(blob, filename);
        setMessage('CSV 파일이 성공적으로 다운로드되었습니다.');
      } catch (error) {
        console.error('CSV export failed:', error);
        setMessage('CSV 내보내기에 실패했습니다.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">데이터 내보내기</h2>
        <p className="mt-1 text-sm text-slate-500">
          선택한 데이터를 CSV 파일로 다운로드할 수 있습니다.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="exportType" className="text-xs font-medium text-slate-600">
              내보낼 데이터
            </label>
            <select
              id="exportType"
              value={exportType}
              onChange={(e) => setExportType(e.target.value as ExportType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {exportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isExporting ? 'CSV 생성 중...' : 'CSV 다운로드'}
            </button>
          </div>
        </div>

        {(exportType === 'payments' || exportType === 'entries') && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fromDate" className="text-xs font-medium text-slate-600">
                시작일
              </label>
              <input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="toDate" className="text-xs font-medium text-slate-600">
                종료일
              </label>
              <input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
        )}

        {message && (
          <div className={`rounded-lg p-4 text-sm ${
            message.includes('실패')
              ? 'bg-rose-50 text-rose-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}>
            {message}
          </div>
        )}

        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">CSV 파일 정보</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc space-y-1 pl-5">
                  <li>파일은 UTF-8 BOM 인코딩으로 저장되어 한글이 정상적으로 표시됩니다.</li>
                  <li>Excel에서 바로 열어보실 수 있습니다.</li>
                  <li>파일명에는 내보낸 날짜와 시간이 포함됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}