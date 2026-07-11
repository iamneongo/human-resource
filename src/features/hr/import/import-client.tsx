'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { importEmployees } from './actions';
import { EMPLOYEE_IMPORT_FIELDS, type EmployeeImportRow } from './normalize';

const SKIP = '__skip__';

function guess(field: string, label: string, columns: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zà-ỹ0-9]/gi, '');
  const targets = [norm(field), norm(label)];
  const found = columns.find((c) => {
    const nc = norm(c);
    return targets.some((t) => nc.includes(t) || t.includes(nc));
  });
  return found ?? SKIP;
}

export function ImportClient() {
  const [columns, setColumns] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [fileName, setFileName] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  async function onFile(file: File) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      blankrows: false,
      defval: ''
    });
    // Dòng header = dòng đầu tiên có ≥2 ô chữ
    const headerIdx = matrix.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2);
    if (headerIdx < 0) {
      toast.error('Không đọc được cột từ file.');
      return;
    }
    const header = matrix[headerIdx].map(
      (h, i) => String(h).replace(/\r?\n/g, ' ').trim() || `Cột ${i + 1}`
    );
    const dataRows = matrix.slice(headerIdx + 1).map((r) => {
      const obj: Record<string, unknown> = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ''));
      return obj;
    });
    setColumns(header);
    setRows(dataRows);
    setFileName(file.name);
    // auto map
    const auto: Record<string, string> = {};
    for (const f of EMPLOYEE_IMPORT_FIELDS) auto[f.key] = guess(f.key, f.label, header);
    setMapping(auto);
    toast.success(`Đã đọc ${dataRows.length} dòng, ${header.length} cột.`);
  }

  function mapRows(): EmployeeImportRow[] {
    return rows.map((r) => {
      const out: Record<string, string> = {};
      for (const f of EMPLOYEE_IMPORT_FIELDS) {
        const col = mapping[f.key];
        if (col && col !== SKIP) out[f.key] = String(r[col] ?? '').trim();
      }
      return out as EmployeeImportRow;
    });
  }

  function onImport() {
    const codeMapped = mapping['employeeCode'];
    const nameMapped = mapping['fullName'];
    if (!codeMapped || codeMapped === SKIP || !nameMapped || nameMapped === SKIP) {
      toast.error('Bắt buộc map "Mã nhân viên" và "Họ và tên".');
      return;
    }
    startTransition(async () => {
      const res = await importEmployees(mapRows());
      if (res.ok) {
        toast.success(`Import xong: thêm ${res.inserted}, bỏ qua ${res.skipped}.`);
        if (res.errors.length) toast.warning(`${res.errors.length} dòng lỗi bị bỏ.`);
        router.push('/dashboard/hr/employees');
      } else {
        toast.error(res.error);
      }
    });
  }

  const preview = rows.slice(0, 8);

  return (
    <div className='space-y-6'>
      {/* Bước 1: upload */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>1. Chọn file Excel / CSV</CardTitle>
          <CardDescription>Hỗ trợ .xlsx, .xls, .csv — dòng đầu là tiêu đề cột.</CardDescription>
        </CardHeader>
        <CardContent>
          <label
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center text-sm',
              'hover:bg-muted/50'
            )}
          >
            <input
              type='file'
              accept='.xlsx,.xls,.csv'
              className='hidden'
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <Icons.upload className='text-muted-foreground h-5 w-5' />
            <span className='text-muted-foreground'>{fileName || 'Bấm để chọn file'}</span>
          </label>
        </CardContent>
      </Card>

      {columns.length > 0 && (
        <>
          {/* Bước 2: map cột */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>2. Ánh xạ cột</CardTitle>
              <CardDescription>
                Chọn cột trong file tương ứng với từng trường hệ thống.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {EMPLOYEE_IMPORT_FIELDS.map((f) => (
                <div key={f.key} className='flex flex-col gap-1.5'>
                  <Label className='text-xs'>
                    {f.label}
                    {'required' in f && f.required ? ' *' : ''}
                  </Label>
                  <Select
                    value={mapping[f.key] ?? SKIP}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP}>— bỏ qua —</SelectItem>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bước 3: preview */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>3. Xem trước ({rows.length} dòng)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {EMPLOYEE_IMPORT_FIELDS.filter(
                        (f) => mapping[f.key] && mapping[f.key] !== SKIP
                      ).map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>
                        {EMPLOYEE_IMPORT_FIELDS.filter(
                          (f) => mapping[f.key] && mapping[f.key] !== SKIP
                        ).map((f) => (
                          <TableCell key={f.key}>{String(r[mapping[f.key]] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className='mt-4 flex justify-end'>
                <Button onClick={onImport} disabled={pending}>
                  {pending ? 'Đang import...' : `Import ${rows.length} dòng`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
