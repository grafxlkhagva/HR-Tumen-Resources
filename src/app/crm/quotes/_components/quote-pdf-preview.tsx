'use client';

import * as React from 'react';
import {
    computeLineTotal,
    formatMoney,
    type Company,
    type Contact,
    type Quote,
} from '../../_types';

interface QuotePdfPreviewProps {
    quote: Quote;
    contact?: Contact;
    company?: Company;
    organization?: { name?: string; logoUrl?: string };
}

export const QuotePdfPreview = React.forwardRef<HTMLDivElement, QuotePdfPreviewProps>(
    function QuotePdfPreview({ quote, contact, company, organization }, ref) {
        const fullContactName = contact
            ? [contact.lastName, contact.firstName].filter(Boolean).join(' ') ||
              contact.email ||
              ''
            : '';

        return (
            <div
                ref={ref}
                className="bg-white text-slate-900"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '20mm',
                    fontFamily:
                        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '11px',
                    lineHeight: 1.5,
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-900">
                    <div>
                        {organization?.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={organization.logoUrl}
                                alt={organization.name || 'Logo'}
                                style={{ height: 40, marginBottom: 12 }}
                            />
                        )}
                        <div className="text-base font-bold">
                            {organization?.name || 'Манай компани'}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold tracking-tight">ҮНИЙН САНАЛ</div>
                        {quote.number && (
                            <div className="text-sm font-mono text-slate-600 mt-1">
                                {quote.number}
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                            Хүлээн авагч
                        </div>
                        {company && (
                            <div className="text-sm font-semibold">{company.name}</div>
                        )}
                        {fullContactName && <div className="text-sm">{fullContactName}</div>}
                        {contact?.email && (
                            <div className="text-xs text-slate-600">{contact.email}</div>
                        )}
                        {contact?.phone && (
                            <div className="text-xs text-slate-600">{contact.phone}</div>
                        )}
                        {company?.address && (
                            <div className="text-xs text-slate-600">{company.address}</div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                            Огноо
                        </div>
                        {quote.issueDate && (
                            <div className="text-sm">
                                <span className="text-slate-500">Гарсан: </span>
                                {quote.issueDate}
                            </div>
                        )}
                        {quote.expiryDate && (
                            <div className="text-sm">
                                <span className="text-slate-500">Дуусах: </span>
                                {quote.expiryDate}
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-lg font-bold mb-4">{quote.title}</h1>

                {/* Line items */}
                <table className="w-full mb-6 border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="text-left text-[10px] uppercase tracking-wider px-3 py-2 border-b border-slate-300">
                                №
                            </th>
                            <th className="text-left text-[10px] uppercase tracking-wider px-3 py-2 border-b border-slate-300">
                                Бараа / Үйлчилгээ
                            </th>
                            <th className="text-right text-[10px] uppercase tracking-wider px-2 py-2 border-b border-slate-300">
                                Тоо
                            </th>
                            <th className="text-right text-[10px] uppercase tracking-wider px-2 py-2 border-b border-slate-300">
                                Нэгж үнэ
                            </th>
                            <th className="text-right text-[10px] uppercase tracking-wider px-2 py-2 border-b border-slate-300">
                                Хөнг.
                            </th>
                            <th className="text-right text-[10px] uppercase tracking-wider px-2 py-2 border-b border-slate-300">
                                Татвар
                            </th>
                            <th className="text-right text-[10px] uppercase tracking-wider px-3 py-2 border-b border-slate-300">
                                Дүн
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {quote.lineItems.map((item, idx) => {
                            const t = computeLineTotal(item);
                            return (
                                <tr key={item.id} className="border-b border-slate-200">
                                    <td className="px-3 py-2 align-top text-slate-500">{idx + 1}</td>
                                    <td className="px-3 py-2 align-top">
                                        <div className="font-medium">{item.name}</div>
                                        {item.description && (
                                            <div className="text-xs text-slate-600">
                                                {item.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-2 py-2 align-top text-right tabular-nums">
                                        {item.quantity}
                                    </td>
                                    <td className="px-2 py-2 align-top text-right tabular-nums">
                                        {formatMoney(item.unitPrice, quote.currency)}
                                    </td>
                                    <td className="px-2 py-2 align-top text-right tabular-nums">
                                        {item.discountPercent ? `${item.discountPercent}%` : '—'}
                                    </td>
                                    <td className="px-2 py-2 align-top text-right tabular-nums">
                                        {item.taxRate ? `${item.taxRate}%` : '—'}
                                    </td>
                                    <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                                        {formatMoney(t.total, quote.currency)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="ml-auto max-w-xs space-y-1.5 mb-8">
                    <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Дэд дүн</span>
                        <span className="tabular-nums">
                            {formatMoney(quote.subtotal, quote.currency)}
                        </span>
                    </div>
                    {quote.totalDiscount > 0 && (
                        <div className="flex justify-between gap-4 text-sm">
                            <span className="text-slate-500">Хөнгөлөлт</span>
                            <span className="tabular-nums text-emerald-700">
                                − {formatMoney(quote.totalDiscount, quote.currency)}
                            </span>
                        </div>
                    )}
                    {quote.totalTax > 0 && (
                        <div className="flex justify-between gap-4 text-sm">
                            <span className="text-slate-500">Татвар</span>
                            <span className="tabular-nums">
                                {formatMoney(quote.totalTax, quote.currency)}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between gap-4 pt-2 mt-1 border-t-2 border-slate-900">
                        <span className="text-base font-bold">Нийт</span>
                        <span className="text-base font-bold tabular-nums">
                            {formatMoney(quote.total, quote.currency)}
                        </span>
                    </div>
                </div>

                {/* Notes / Terms */}
                {(quote.notes || quote.terms) && (
                    <div className="space-y-4 pt-6 border-t border-slate-200">
                        {quote.notes && (
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                    Тэмдэглэл
                                </div>
                                <p className="text-xs whitespace-pre-wrap">{quote.notes}</p>
                            </div>
                        )}
                        {quote.terms && (
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                    Гэрээний нөхцөл
                                </div>
                                <p className="text-xs whitespace-pre-wrap">{quote.terms}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    },
);
