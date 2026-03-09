'use client';

import * as React from 'react';
import { useFirebase, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Mail, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const PAYMENT_TERMS_OPTIONS = [
  { value: 'advance_30', label: 'Урьдчилгаа 30%' },
  { value: 'advance_40', label: 'Урьдчилгаа 40%' },
  { value: 'advance_50', label: 'Урьдчилгаа 50%' },
  { value: 'upon_completion', label: 'Тээвэрлэлт дуусаад' },
  { value: 'by_contract', label: 'Гэрээгээр тохиролцоно' },
] as const;

const VEHICLE_AVAILABILITY_OPTIONS = [
  { value: '8h', label: '8 цаг' },
  { value: '12h', label: '12 цаг' },
  { value: '24h', label: '24 цаг' },
  { value: '48h', label: '48 цаг' },
  { value: '7d', label: '7 хоног' },
  { value: '14d', label: '14 хоног' },
] as const;
import {
  TMS_REGIONS_COLLECTION,
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_VEHICLE_TYPES_COLLECTION,
  TMS_TRAILER_TYPES_COLLECTION,
  type TmsQuotation,
} from '@/app/tms/types';
import { useToast } from '@/hooks/use-toast';

interface Props {
  quotationId: string;
  quotation: TmsQuotation;
}

export function QuotationPdfView({ quotationId, quotation }: Props) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedTransportIds, setSelectedTransportIds] = React.useState<Set<string>>(
    new Set(quotation.transportations?.map(t => t.id) || [])
  );

  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  const { data: regions } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_REGIONS_COLLECTION) : null
  );
  const { data: serviceTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_SERVICE_TYPES_COLLECTION) : null
  );
  const { data: vehicleTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_VEHICLE_TYPES_COLLECTION) : null
  );
  const { data: trailerTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_TRAILER_TYPES_COLLECTION) : null
  );

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  const { data: companyProfile } = useDoc<any>(companyProfileRef);

  const transportations = quotation.transportations || [];

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedTransportIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTransportIds(newSet);
  };

  const getRegionName = (id?: string) => regions?.find((r) => r.id === id)?.name || '';
  const getServiceName = (id?: string) => serviceTypes?.find((s) => s.id === id)?.name || '';
  const getVehicleName = (id?: string) => vehicleTypes?.find((v) => v.id === id)?.name || '';
  const getTrailerName = (id?: string) => trailerTypes?.find((tr) => tr.id === id)?.name || '';

  const selectedTransports = transportations.filter(t => selectedTransportIds.has(t.id));

  // Calculate totals
  const totalAmount = selectedTransports.reduce((sum, t) => {
    const acceptedOffer = t.driverOffers?.find(o => o.isAccepted);
    const offerAmount = acceptedOffer?.offerAmount || 0;
    // Calculate final price based on profit margin
    const margin = t.profitMarginPercent || 0;
    const finalPrice = offerAmount * (1 + margin / 100);
    return sum + finalPrice;
  }, 0);

  const totalVat = selectedTransports.reduce((sum, t) => {
    if (!t.hasVat) return sum;
    const acceptedOffer = t.driverOffers?.find(o => o.isAccepted);
    const offerAmount = acceptedOffer?.offerAmount || 0;
    const margin = t.profitMarginPercent || 0;
    const finalPrice = offerAmount * (1 + margin / 100);
    return sum + (finalPrice * 0.1); // 10% VAT
  }, 0);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      
      const opt = {
        margin: 0,
        filename: `Quotation_${quotationId.substring(0, 4).toUpperCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: 'Амжилттай',
        description: 'PDF файл амжилттай татагдлаа.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: error.message || 'PDF үүсгэх үед алдаа гарлаа.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmail = async () => {
    // You can prompt for email or get it from customer data
    const emailTo = prompt('Илгээх и-мэйл хаягаа оруулна уу:', 'customer@example.com');
    if (!emailTo) return;

    setIsSendingEmail(true);
    try {
      // In a real scenario, you might want to send the PDF as an attachment,
      // but for now, we'll send a styled HTML email with the quotation details
      // or a link to view it online.
      
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: `Үнийн санал: Q${quotationId.substring(0, 4).toUpperCase()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #F05123;">Тээврийн үнийн санал</h2>
              <p>Сайн байна уу, ${quotation.customerName || 'Харилцагч'}</p>
              <p>Танд зориулан бэлтгэсэн тээврийн үнийн саналыг илгээж байна.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Үнийн саналын дугаар:</strong> Q${quotationId.substring(0, 4).toUpperCase()}</p>
                <p><strong>Нийт дүн:</strong> ${new Intl.NumberFormat('mn-MN').format(totalAmount + totalVat)} ₮</p>
                <p><strong>Сонгосон чиглэл:</strong> ${selectedTransports.length}</p>
              </div>

              <p>Дэлгэрэнгүй мэдээллийг систем рүү нэвтэрч харна уу эсвэл манай менежертэй холбогдоно уу.</p>
              
              <br/>
              <p style="font-size: 12px; color: #666;">Хүндэтгэсэн,<br/>Tumen Tech - Digital Trucking Company</p>
            </div>
          `
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.details || 'И-мэйл илгээхэд алдаа гарлаа');
      }

      toast({
        title: 'И-мэйл илгээгдлээ',
        description: `${emailTo} хаяг руу үнийн санал амжилттай илгээгдлээ.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: error.message,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top panel: Transport Selection & Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Тээвэрлэлт сонгох</CardTitle>
            <CardDescription>Үнийн саналд оруулах чиглэлүүдийг сонгоно уу</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleEmail} disabled={selectedTransportIds.size === 0 || isSendingEmail}>
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isSendingEmail ? 'Илгээж байна...' : 'И-мэйл илгээх'}
            </Button>
            <Button className="gap-2" onClick={handleDownload} disabled={selectedTransportIds.size === 0 || isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloading ? 'Татаж байна...' : 'PDF Татах'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {transportations.length === 0 ? (
              <div className="text-sm text-muted-foreground col-span-full">Тээвэрлэлт нэмэгдээгүй байна</div>
            ) : (
              transportations.map((t, index) => {
                const acceptedOffer = t.driverOffers?.find(o => o.isAccepted);
                const hasPrice = !!acceptedOffer;
                return (
                  <div key={t.id} className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`select-${t.id}`}
                      checked={selectedTransportIds.has(t.id)}
                      onCheckedChange={() => handleToggleSelect(t.id)}
                      disabled={!hasPrice}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`select-${t.id}`} className="text-sm font-medium cursor-pointer block truncate">
                        {getServiceName(t.serviceTypeId) || `Тээвэрлэлт #${index + 1}`}
                      </Label>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {getRegionName(t.loadingRegionId)} → {getRegionName(t.unloadingRegionId)}
                      </div>
                      {!hasPrice && (
                        <div className="text-[10px] text-destructive mt-1">Жолоочийн үнэ батлагдаагүй</div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview Container (A4 Landscape) */}
      <div className="flex justify-center w-full overflow-x-auto pb-8">
        <div 
          ref={printRef}
          className="bg-white text-black shadow-lg"
          style={{ 
            width: '297mm', // A4 landscape width
            minHeight: '210mm', // A4 landscape height
            padding: '20mm', // Standard print margins
            boxSizing: 'border-box'
          }}
        >
          {/* PDF Header */}
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{companyProfile?.legalName || companyProfile?.name || 'Байгууллагын нэр'}</p>
              {companyProfile?.address && <p className="text-gray-600">{companyProfile.address}</p>}
              {companyProfile?.website && <p className="text-blue-600">{companyProfile.website}</p>}
              {companyProfile?.phoneNumber && <p className="text-gray-600">{companyProfile.phoneNumber}</p>}
            </div>
            <div className="text-right flex flex-col items-end">
              {companyProfile?.logoUrl ? (
                <img 
                  src={`/_next/image?url=${encodeURIComponent(companyProfile.logoUrl)}&w=256&q=75`}
                  alt={companyProfile.name || 'Company Logo'} 
                  className="h-12 object-contain"
                />
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-[#F05123] tracking-wider">{companyProfile?.name || 'TUMEN TECH'}</h1>
                  <p className="text-xs text-gray-500 font-medium tracking-widest mt-1 uppercase">DIGITAL TRUCKING COMPANY</p>
                </>
              )}
            </div>
          </div>

          {/* Bill To & Quote Info */}
          <div className="flex justify-between items-end mb-8">
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 mb-2">BILL TO</h3>
              <p className="font-medium">{quotation.customerName || '—'}</p>
              <p className="text-gray-600">{quotation.customerResponsibleEmployeeName || ''}</p>
            </div>
            <div className="text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                <span className="text-gray-500">Quote No:</span>
                <span className="font-medium">Q{quotationId.substring(0, 4).toUpperCase()}</span>
                <span className="text-gray-500">Quote Date:</span>
                <span className="font-medium">{new Date().toLocaleDateString('mn-MN')}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-8 border border-[#4472C4] rounded-sm">
            <table className="w-full text-xs text-left" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[#4472C4] text-white">
                <tr>
                  <th className="px-2 py-2 text-center w-8">№</th>
                  <th className="px-2 py-2 w-[12%]">Үйлчилгээ</th>
                  <th className="px-2 py-2 w-[15%]">Ачаа</th>
                  <th className="px-2 py-2 w-[10%]">Эхлэх</th>
                  <th className="px-2 py-2 w-[10%]">Дуусах</th>
                  <th className="px-2 py-2 text-center w-[8%]">Зай</th>
                  <th className="px-2 py-2 w-[10%]">Машин</th>
                  <th className="px-2 py-2 w-[10%]">Даац</th>
                  <th className="px-2 py-2 text-center w-[5%]">Тоо</th>
                  <th className="px-2 py-2 text-right w-[10%]">Үнэлгээ</th>
                  <th className="px-2 py-2 text-right w-[8%]">НӨАТ ₮</th>
                  <th className="px-2 py-2 text-right w-[10%]">Нийт ₮</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {selectedTransports.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-2 py-6 text-center text-gray-500">
                      Тээвэрлэлт сонгогдоогүй эсвэл үнэ тодорхойгүй байна
                    </td>
                  </tr>
                ) : (
                  selectedTransports.map((t, i) => {
                    const acceptedOffer = t.driverOffers?.find(o => o.isAccepted);
                    const offerAmount = acceptedOffer?.offerAmount || 0;
                    const margin = t.profitMarginPercent || 0;
                    const unitPrice = offerAmount * (1 + margin / 100);
                    const vatAmount = t.hasVat ? unitPrice * 0.1 : 0;
                    const finalPrice = unitPrice + vatAmount;

                    const cargoNames = t.cargos?.map(c => `${c.name} (${c.quantity} ${c.unit})`).join(', ') || '—';

                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2.5 text-center text-gray-500 break-words">{i + 1}</td>
                        <td className="px-2 py-2.5 font-medium break-words">{getServiceName(t.serviceTypeId)}</td>
                        <td className="px-2 py-2.5 text-gray-600 break-words">{cargoNames}</td>
                        <td className="px-2 py-2.5 break-words">{getRegionName(t.loadingRegionId)}</td>
                        <td className="px-2 py-2.5 break-words">{getRegionName(t.unloadingRegionId)}</td>
                        <td className="px-2 py-2.5 text-center whitespace-nowrap break-words">{t.totalDistanceKm || 0} км</td>
                        <td className="px-2 py-2.5 break-words">{getVehicleName(t.vehicleTypeId)}</td>
                        <td className="px-2 py-2.5 break-words">{getTrailerName(t.trailerTypeId)}</td>
                        <td className="px-2 py-2.5 text-center break-words">{t.frequency || 1}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums break-words">{new Intl.NumberFormat('mn-MN').format(unitPrice)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums break-words">{t.hasVat ? new Intl.NumberFormat('mn-MN').format(vatAmount) : '-'}</td>
                        <td className="px-2 py-2.5 text-right font-medium tabular-nums break-words">{new Intl.NumberFormat('mn-MN').format(finalPrice)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

            {/* Terms and Conditions */}
          <div className="mb-8 border border-gray-200 rounded-sm">
            <div className="bg-gray-100 px-4 py-2 font-bold text-gray-700 w-fit rounded-br-sm text-sm border-r border-b border-gray-200">
              Тайлбар
            </div>
            <div className="p-6 space-y-2 text-sm text-gray-800">
              <p><span className="font-medium">Ачилт:</span> {quotation.loadingResponsibility === 'customer' ? 'Захиалагч тал хариуцна' : quotation.loadingResponsibility === 'carrier' ? 'Тээвэрлэгч тал хариуцна' : '—'}</p>
              <p><span className="font-medium">Буулгалт:</span> {quotation.unloadingResponsibility === 'customer' ? 'Захиалагч тал хариуцна' : quotation.unloadingResponsibility === 'carrier' ? 'Тээвэрлэгч тал хариуцна' : '—'}</p>
              <p><span className="font-medium">ТХ-ийн бэлэн байдал:</span> {VEHICLE_AVAILABILITY_OPTIONS.find(o => o.value === quotation.vehicleAvailability)?.label || '—'}</p>
              <p><span className="font-medium">Төлбөрийн нөхцөл:</span> {PAYMENT_TERMS_OPTIONS.find(o => o.value === quotation.paymentTerms)?.label || '—'}</p>
              <p><span className="font-medium">Даатгал:</span> {quotation.insurance || '—'}</p>
              {quotation.additionalConditions && (
                <p><span className="font-medium">Нэмэлт:</span> {quotation.additionalConditions}</p>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Нийт хөлс:</span>
                <span className="tabular-nums">{new Intl.NumberFormat('mn-MN').format(totalAmount)} ₮</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>НӨАТ (10%):</span>
                <span className="tabular-nums">{new Intl.NumberFormat('mn-MN').format(totalVat)} ₮</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span>Нийт дүн:</span>
                <span className="tabular-nums">{new Intl.NumberFormat('mn-MN').format(totalAmount + totalVat)} ₮</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
