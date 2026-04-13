function Sk({ w, h, r = 8, style }: { w?: number | string; h: number; r?: number; style?: React.CSSProperties }) {
  return <div className="sk-block" style={{ width: w ?? '100%', height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

export function CardSkeleton() {
  return (
    <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <Sk w={80} h={12} r={6} />
      <Sk w={100} h={26} r={8} />
      <Sk w={60} h={11} r={5} />
    </div>
  );
}

function TableRowSk() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border-light)', gap: 12 }}>
      <Sk w={34} h={34} r={10} style={{ flexShrink: 0 }} />
      <Sk w="35%" h={14} r={6} />
      <Sk w="30%" h={13} r={6} style={{ marginLeft: 'auto' }} />
      <Sk w={60} h={13} r={6} />
      <Sk w={50} h={20} r={20} />
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '36px 40px 48px' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <Sk w={260} h={28} r={8} />
        <Sk w={200} h={14} r={6} style={{ marginTop: 10 }} />
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: projects table */}
        <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Sk w={80} h={16} r={6} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Sk w={100} h={30} r={8} />
              <Sk w={80} h={30} r={8} />
            </div>
          </div>
          <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', background: 'var(--bg)', display: 'flex', gap: 12 }}>
            <Sk w="30%" h={11} r={4} />
            <Sk w="25%" h={11} r={4} />
            <Sk w="15%" h={11} r={4} />
            <Sk w="10%" h={11} r={4} style={{ marginLeft: 'auto' }} />
          </div>
          {[1,2,3,4,5].map(i => <TableRowSk key={i} />)}
        </div>

        {/* Right: charts */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, overflow: 'hidden' }}>
            <Sk w={120} h={14} r={6} style={{ marginBottom: 12 }} />
            <Sk h={180} r={8} />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <Sk w={140} h={14} r={6} style={{ marginBottom: 16 }} />
            <Sk w={180} h={180} r={90} style={{ margin: '0 auto 16px' }} />
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-light)' }}>
                <Sk w={70} h={13} r={5} />
                <Sk w={50} h={13} r={5} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="w-full border-b border-gray-100 last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg">
      {/* Customer Name and Image */}
      <td className="relative overflow-hidden whitespace-nowrap py-3 pl-6 pr-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-100"></div>
          <div className="h-6 w-24 rounded bg-gray-100"></div>
        </div>
      </td>
      {/* Email */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-32 rounded bg-gray-100"></div>
      </td>
      {/* Amount */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-16 rounded bg-gray-100"></div>
      </td>
      {/* Date */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-16 rounded bg-gray-100"></div>
      </td>
      {/* Status */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-16 rounded bg-gray-100"></div>
      </td>
      {/* Actions */}
      <td className="whitespace-nowrap py-3 pl-6 pr-3">
        <div className="flex justify-end gap-3">
          <div className="h-[38px] w-[38px] rounded bg-gray-100"></div>
          <div className="h-[38px] w-[38px] rounded bg-gray-100"></div>
        </div>
      </td>
    </tr>
  );
}

export function InvoicesMobileSkeleton() {
  return (
    <div className="mb-2 w-full rounded-md bg-white p-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-8">
        <div className="flex items-center">
          <div className="mr-2 h-8 w-8 rounded-full bg-gray-100"></div>
          <div className="h-6 w-16 rounded bg-gray-100"></div>
        </div>
        <div className="h-6 w-16 rounded bg-gray-100"></div>
      </div>
      <div className="flex w-full items-center justify-between pt-4">
        <div>
          <div className="h-6 w-16 rounded bg-gray-100"></div>
          <div className="mt-2 h-6 w-24 rounded bg-gray-100"></div>
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-10 w-10 rounded bg-gray-100"></div>
          <div className="h-10 w-10 rounded bg-gray-100"></div>
        </div>
      </div>
    </div>
  );
}

export function InvoicesTableSkeleton() {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Customer
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Email
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th
                  scope="col"
                  className="relative pb-4 pl-3 pr-6 pt-2 sm:pr-6"
                >
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
