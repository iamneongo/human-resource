/* eslint-disable no-console */
/**
 * Seed dữ liệu tổ chức + nhân viên mẫu cho HRM.
 *   bun run src/db/seed.ts
 */
import 'dotenv/config';

import { db } from './index';
import { costCenters, departments, employees, positions } from './schema';

async function main() {
  console.log('Seeding organization data...');

  const [ccOps] = await db
    .insert(costCenters)
    .values({ code: 'CC-OPS', name: 'Khối vận hành' })
    .returning();

  const [deptIT, deptHR, deptSales] = await db
    .insert(departments)
    .values([
      { code: 'IT', name: 'Phòng Công nghệ', costCenterId: ccOps.id },
      { code: 'HR', name: 'Phòng Nhân sự', costCenterId: ccOps.id },
      { code: 'SALES', name: 'Phòng Kinh doanh', costCenterId: ccOps.id }
    ])
    .returning();

  const [posDev, posHR, posSale] = await db
    .insert(positions)
    .values([
      { code: 'DEV', title: 'Lập trình viên', departmentId: deptIT.id },
      { code: 'HRO', title: 'Chuyên viên nhân sự', departmentId: deptHR.id },
      { code: 'SALE', title: 'Nhân viên kinh doanh', departmentId: deptSales.id }
    ])
    .returning();

  await db.insert(employees).values([
    {
      employeeCode: 'NV0001',
      fullName: 'Nguyễn Văn An',
      email: 'an.nguyen@example.com',
      gender: 'male',
      status: 'active',
      hireDate: '2023-01-15',
      departmentId: deptIT.id,
      positionId: posDev.id
    },
    {
      employeeCode: 'NV0002',
      fullName: 'Trần Thị Bình',
      email: 'binh.tran@example.com',
      gender: 'female',
      status: 'probation',
      hireDate: '2024-06-01',
      departmentId: deptHR.id,
      positionId: posHR.id
    },
    {
      employeeCode: 'NV0003',
      fullName: 'Lê Hoàng Cường',
      email: 'cuong.le@example.com',
      gender: 'male',
      status: 'active',
      hireDate: '2022-09-10',
      departmentId: deptSales.id,
      positionId: posSale.id
    }
  ]);

  console.log('✓ Seed hoàn tất.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
