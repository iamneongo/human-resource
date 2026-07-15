'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type ComboOption, Combobox } from '@/features/hr/common/combobox';
import { cn } from '@/lib/utils';

type FilterOption = {
  value: string;
  label: string;
};

interface EmployeesFiltersProps {
  search: string;
  departmentId: string;
  status: string;
  documentStatus: string;
  departments: ComboOption[];
  departmentSummary: Array<[string, number]>;
  statusOptions: FilterOption[];
  documentOptions: FilterOption[];
}

const ALL_DEPARTMENTS = '__all_departments__';
const ALL_STATUSES = '__all_statuses__';
const ALL_DOCUMENTS = '__all_documents__';

export function EmployeesFilters({
  search,
  departmentId,
  status,
  documentStatus,
  departments,
  departmentSummary,
  statusOptions,
  documentOptions
}: EmployeesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(search);
  const [departmentValue, setDepartmentValue] = useState(departmentId || ALL_DEPARTMENTS);
  const [statusValue, setStatusValue] = useState(status || ALL_STATUSES);
  const [documentValue, setDocumentValue] = useState(documentStatus || ALL_DOCUMENTS);

  const departmentComboboxOptions = useMemo(
    () => [{ value: ALL_DEPARTMENTS, label: 'Tất cả phòng ban' }, ...departments],
    [departments]
  );
  const statusComboboxOptions = useMemo(
    () => [{ value: ALL_STATUSES, label: 'Tất cả trạng thái' }, ...statusOptions],
    [statusOptions]
  );
  const documentComboboxOptions = useMemo(
    () => [{ value: ALL_DOCUMENTS, label: 'Tất cả tình trạng hồ sơ' }, ...documentOptions],
    [documentOptions]
  );

  const activeFilters = useMemo(() => {
    const filters: Array<{
      key: 'search' | 'departmentId' | 'status' | 'documentStatus';
      label: string;
    }> = [];

    if (searchValue.trim()) {
      filters.push({ key: 'search', label: `Tìm: ${searchValue.trim()}` });
    }

    const selectedDepartment = departmentComboboxOptions.find(
      (option) => option.value === departmentValue
    );
    if (departmentValue !== ALL_DEPARTMENTS && selectedDepartment) {
      filters.push({ key: 'departmentId', label: `Phòng ban: ${selectedDepartment.label}` });
    }

    const selectedStatus = statusComboboxOptions.find((option) => option.value === statusValue);
    if (statusValue !== ALL_STATUSES && selectedStatus) {
      filters.push({ key: 'status', label: `Trạng thái: ${selectedStatus.label}` });
    }

    const selectedDocument = documentComboboxOptions.find(
      (option) => option.value === documentValue
    );
    if (documentValue !== ALL_DOCUMENTS && selectedDocument) {
      filters.push({ key: 'documentStatus', label: `Hồ sơ: ${selectedDocument.label}` });
    }

    return filters;
  }, [
    departmentComboboxOptions,
    departmentValue,
    documentComboboxOptions,
    documentValue,
    searchValue,
    statusComboboxOptions,
    statusValue
  ]);

  function pushFilters(
    next?: Partial<Record<'search' | 'departmentId' | 'status' | 'documentStatus', string>>
  ) {
    const params = new URLSearchParams();

    const finalSearch = next?.search ?? searchValue.trim();
    const finalDepartment = next?.departmentId ?? departmentValue;
    const finalStatus = next?.status ?? statusValue;
    const finalDocument = next?.documentStatus ?? documentValue;

    if (finalSearch) {
      params.set('search', finalSearch);
    }

    if (finalDepartment && finalDepartment !== ALL_DEPARTMENTS) {
      params.set('departmentId', finalDepartment);
    }

    if (finalStatus && finalStatus !== ALL_STATUSES) {
      params.set('status', finalStatus);
    }

    if (finalDocument && finalDocument !== ALL_DOCUMENTS) {
      params.set('documentStatus', finalDocument);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function resetFilters() {
    setSearchValue('');
    setDepartmentValue(ALL_DEPARTMENTS);
    setStatusValue(ALL_STATUSES);
    setDocumentValue(ALL_DOCUMENTS);
    router.replace(pathname);
  }

  function removeFilter(key: 'search' | 'departmentId' | 'status' | 'documentStatus') {
    if (key === 'search') {
      setSearchValue('');
      pushFilters({ search: '' });
      return;
    }

    if (key === 'departmentId') {
      setDepartmentValue(ALL_DEPARTMENTS);
      pushFilters({ departmentId: ALL_DEPARTMENTS });
      return;
    }

    if (key === 'status') {
      setStatusValue(ALL_STATUSES);
      pushFilters({ status: ALL_STATUSES });
      return;
    }

    setDocumentValue(ALL_DOCUMENTS);
    pushFilters({ documentStatus: ALL_DOCUMENTS });
  }

  const hasFilters = activeFilters.length > 0;

  return (
    <div className='space-y-4'>
      <div className='rounded-2xl border bg-card p-4' data-tour='employees-departments'>
        <div className='mb-3 flex items-center gap-2 text-sm font-medium'>
          <Icons.teams className='size-4 text-muted-foreground' />
          Theo phòng ban
        </div>
        <div className='flex flex-wrap gap-2'>
          {departmentSummary.length > 0 ? (
            departmentSummary.map(([name, count]) => (
              <Badge
                key={name}
                variant='secondary'
                className='rounded-full border border-transparent px-3 py-1 text-sm font-medium'
              >
                {name}: {count}
              </Badge>
            ))
          ) : (
            <span className='text-muted-foreground text-sm'>
              Chưa có dữ liệu phòng ban để hiển thị.
            </span>
          )}
        </div>
      </div>

      <section className='rounded-2xl border bg-card p-4' data-tour='employees-filters'>
        <div
          role='toolbar'
          aria-orientation='horizontal'
          className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'
        >
          <div className='flex flex-1 flex-col gap-3'>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.3fr)_minmax(200px,1fr)_minmax(200px,1fr)_minmax(220px,1fr)]'>
              <div className='relative'>
                <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder='Mã NV, họ tên, phòng ban...'
                  className='h-10 pl-9'
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      pushFilters();
                    }
                  }}
                />
              </div>

              <Combobox
                options={departmentComboboxOptions}
                value={departmentValue}
                onChange={(value) => setDepartmentValue(value || ALL_DEPARTMENTS)}
                placeholder='Chọn phòng ban'
                searchPlaceholder='Tìm phòng ban...'
                emptyText='Không tìm thấy phòng ban.'
                triggerClassName='h-10'
              />

              <Combobox
                options={statusComboboxOptions}
                value={statusValue}
                onChange={(value) => setStatusValue(value || ALL_STATUSES)}
                placeholder='Chọn trạng thái'
                searchPlaceholder='Tìm trạng thái...'
                emptyText='Không tìm thấy trạng thái.'
                triggerClassName='h-10'
              />

              <Combobox
                options={documentComboboxOptions}
                value={documentValue}
                onChange={(value) => setDocumentValue(value || ALL_DOCUMENTS)}
                placeholder='Chọn tình trạng hồ sơ'
                searchPlaceholder='Tìm tình trạng hồ sơ...'
                emptyText='Không tìm thấy tình trạng hồ sơ.'
                triggerClassName='h-10'
              />
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-muted-foreground text-xs uppercase tracking-[0.18em]'>
                Bộ lọc đang áp dụng
              </span>
              {hasFilters ? (
                activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type='button'
                    onClick={() => removeFilter(filter.key)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm transition-colors',
                      'hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <span className='max-w-[240px] truncate'>{filter.label}</span>
                    <Icons.close className='size-3.5 text-muted-foreground' />
                  </button>
                ))
              ) : (
                <span className='text-muted-foreground text-sm'>Chưa chọn bộ lọc nào.</span>
              )}
            </div>
          </div>

          <div className='flex shrink-0 flex-wrap items-center gap-2 xl:pl-3'>
            <Button type='button' onClick={() => pushFilters()} className='h-10'>
              <Icons.adjustments className='size-4' />
              Áp dụng
            </Button>
            <Button
              type='button'
              variant='outline'
              className='h-10 border-dashed'
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              <Icons.close className='size-4' />
              Xóa lọc
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
