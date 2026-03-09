'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
} from '@/components/patterns/data-table';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CreateTransportDialog } from './create-transport-dialog';
import {
  TMS_TRANSPORT_MANAGEMENT_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_SERVICE_TYPES_COLLECTION,
  type TmsTransportManagement,
  type TmsCustomer,
  type TmsServiceType
} from '@/app/tms/types';
import { format } from 'date-fns';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Ноорог', variant: 'secondary' },
  planning: { label: 'Төлөвлөж буй', variant: 'default' },
  active: { label: 'Идэвхтэй', variant: 'success' },
  completed: { label: 'Дууссан', variant: 'default' },
  cancelled: { label: 'Цуцлагдсан', variant: 'destructive' },
};

export default function TransportManagementPage() {
  const { firestore } = useFirebase();
  const [createOpen, setCreateOpen] = React.useState(false);

  // Fetch Transport Managements
  const tmsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore]
  );
  const { data: items = [], isLoading } = useCollection<TmsTransportManagement>(tmsQuery);

  // Fetch references to show names
  const servicesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_SERVICE_TYPES_COLLECTION)) : null),
    [firestore]
  );
  const { data: services = [] } = useCollection<TmsServiceType>(servicesQuery);

  const customersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_CUSTOMERS_COLLECTION)) : null),
    [firestore]
  );
  const { data: customers = [] } = useCollection<TmsCustomer>(customersQuery);

  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || '—';
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || '—';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Тээврийн удирдлага"
          description="Тээвэрлэлтийн үйл явцын нэгдсэн хяналт"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тээврийн удирдлага' },
          ]}
          actions={
            <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ тээврийн удирдлага үүсгэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Код / Огноо</DataTableColumn>
              <DataTableColumn>Харилцагч</DataTableColumn>
              <DataTableColumn>Үйлчилгээ</DataTableColumn>
              <DataTableColumn>Төрөл</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
              <DataTableColumn align="right"></DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          
          {isLoading && <DataTableLoading columns={6} rows={5} />}
          
          {!isLoading && items.length === 0 && (
            <DataTableEmpty
              columns={6}
              message="Тээврийн удирдлага бүртгэгдээгүй байна."
            />
          )}

          {!isLoading && items.length > 0 && (
            <DataTableBody>
              {items.map((item) => {
                const statusInfo = STATUS_MAP[item.status] || { label: item.status, variant: 'secondary' };
                const dateStr = item.createdAt?.toDate ? format(item.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '—';
                
                return (
                  <DataTableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => window.location.href = `/tms/transport-management/${item.id}`}
                  >
                    <DataTableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary hover:underline">{item.code || item.id.slice(0, 8)}</span>
                        <span className="text-xs text-muted-foreground">{dateStr}</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="font-medium">
                      {getCustomerName(item.customerId)}
                    </DataTableCell>
                    <DataTableCell>
                      {getServiceName(item.serviceTypeId)}
                    </DataTableCell>
                    <DataTableCell>
                      {item.isContracted ? (
                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Гэрээт</Badge>
                      ) : (
                        <Badge variant="outline">Нэг удаагийн</Badge>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={statusInfo.variant as any}>
                        {statusInfo.label}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          )}
        </DataTable>
      </div>

      <CreateTransportDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
