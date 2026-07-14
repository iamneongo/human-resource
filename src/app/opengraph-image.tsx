import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Nhân sự HRM';
export const size = {
  width: 1200,
  height: 630
};

export const contentType = 'image/png';

async function getLogoDataUrl() {
  const logoPath = path.join(process.cwd(), 'public', 'brand', 'app-logo.png');
  const logoBuffer = await readFile(logoPath);

  return `data:image/png;base64,${logoBuffer.toString('base64')}`;
}

export default async function OpenGraphImage() {
  const logoSrc = await getLogoDataUrl();

  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background: 'linear-gradient(135deg, #071428 0%, #0b2145 35%, #15397a 70%, #234df7 100%)',
        color: 'white',
        display: 'flex',
        height: '100%',
        justifyContent: 'space-between',
        padding: '56px',
        position: 'relative',
        width: '100%'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: '20px'
          }}
        >
          <div
            style={{
              alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: '28px',
              display: 'flex',
              height: '92px',
              justifyContent: 'center',
              width: '92px'
            }}
          >
            <img
              src={logoSrc}
              alt='Nhân sự HRM logo'
              width={62}
              height={62}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ fontSize: 24, letterSpacing: '0.22em', opacity: 0.72 }}>
              HUMAN RESOURCE MANAGEMENT
            </div>
            <div style={{ fontSize: 42, fontWeight: 700 }}>Nhân sự HRM</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxWidth: '760px'
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1
            }}
          >
            Nền tảng HRM tập trung cho tuyển dụng, chấm công và tiền lương.
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.78)',
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.45
            }}
          >
            Theo dõi hồ sơ nhân sự, hợp đồng, ca làm việc và vận hành payroll trong một giao diện
            thống nhất.
          </div>
        </div>
      </div>
    </div>,
    size
  );
}
