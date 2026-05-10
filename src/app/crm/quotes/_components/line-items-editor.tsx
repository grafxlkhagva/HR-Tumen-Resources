'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    computeLineTotal,
    computeQuoteTotals,
    formatMoney,
    type Product,
    type QuoteLineItem,
} from '../../_types';

interface LineItemsEditorProps {
    items: QuoteLineItem[];
    onChange: (items: QuoteLineItem[]) => void;
    products: Product[];
    currency: string;
    readonly?: boolean;
}

function makeId(): string {
    return `li_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function LineItemsEditor({
    items,
    onChange,
    products,
    currency,
    readonly,
}: LineItemsEditorProps) {
    const totals = React.useMemo(() => computeQuoteTotals(items), [items]);

    const addEmpty = () => {
        onChange([
            ...items,
            {
                id: makeId(),
                name: '',
                quantity: 1,
                unitPrice: 0,
                discountPercent: 0,
                taxRate: 0,
            },
        ]);
    };

    const addFromProduct = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        onChange([
            ...items,
            {
                id: makeId(),
                productId: product.id,
                name: product.name,
                description: product.description,
                quantity: 1,
                unitPrice: product.unitPrice,
                discountPercent: 0,
                taxRate: product.taxRate || 0,
            },
        ]);
    };

    const updateItem = (id: string, patch: Partial<QuoteLineItem>) => {
        onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    };

    const removeItem = (id: string) => {
        onChange(items.filter((it) => it.id !== id));
    };

    const productOptions = React.useMemo(
        () =>
            products
                .filter((p) => p.isActive !== false)
                .map((p) => ({
                    value: p.id,
                    label: p.name,
                    description: `${formatMoney(p.unitPrice, p.currency)}${p.sku ? ` · ${p.sku}` : ''}`,
                })),
        [products],
    );

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-semibold">Бараа/үйлчилгээ</h3>
                {!readonly && (
                    <div className="flex items-center gap-2">
                        {productOptions.length > 0 && (
                            <div className="w-56">
                                <SearchableSelect
                                    options={productOptions}
                                    value=""
                                    onValueChange={(v) => {
                                        if (v) addFromProduct(v);
                                    }}
                                    placeholder="Каталогоос нэмэх..."
                                    searchPlaceholder="Бараа хайх..."
                                />
                            </div>
                        )}
                        <Button size="sm" variant="outline" onClick={addEmpty} className="h-9">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Гар
                        </Button>
                    </div>
                )}
            </div>

            {items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    Хоосон. Дээрх товчоор бараа нэмж эхлээрэй.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                                <th className="text-left font-medium px-3 py-2">Нэр</th>
                                <th className="text-right font-medium px-2 py-2 w-16">Тоо</th>
                                <th className="text-right font-medium px-2 py-2 w-28">Нэгж үнэ</th>
                                <th className="text-right font-medium px-2 py-2 w-16">Хөнг %</th>
                                <th className="text-right font-medium px-2 py-2 w-16">Татвар %</th>
                                <th className="text-right font-medium px-3 py-2 w-32">Дүн</th>
                                {!readonly && <th className="w-9" />}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const t = computeLineTotal(item);
                                return (
                                    <tr
                                        key={item.id}
                                        className="border-b last:border-b-0 hover:bg-muted/20"
                                    >
                                        <td className="px-3 py-2 align-top">
                                            <Input
                                                value={item.name}
                                                onChange={(e) =>
                                                    updateItem(item.id, { name: e.target.value })
                                                }
                                                placeholder="Бараа эсвэл үйлчилгээний нэр"
                                                disabled={readonly}
                                                className="h-8 mb-1 border-transparent hover:border-border focus:border-input"
                                            />
                                            <Input
                                                value={item.description || ''}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        description: e.target.value || undefined,
                                                    })
                                                }
                                                placeholder="Тайлбар (заавал биш)"
                                                disabled={readonly}
                                                className="h-7 text-xs border-transparent hover:border-border focus:border-input text-muted-foreground"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        quantity: Number(e.target.value) || 0,
                                                    })
                                                }
                                                disabled={readonly}
                                                className="h-8 text-right tabular-nums"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        unitPrice: Number(e.target.value) || 0,
                                                    })
                                                }
                                                disabled={readonly}
                                                className="h-8 text-right tabular-nums"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step="0.1"
                                                value={item.discountPercent ?? 0}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        discountPercent:
                                                            Number(e.target.value) || 0,
                                                    })
                                                }
                                                disabled={readonly}
                                                className="h-8 text-right tabular-nums"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step="0.1"
                                                value={item.taxRate ?? 0}
                                                onChange={(e) =>
                                                    updateItem(item.id, {
                                                        taxRate: Number(e.target.value) || 0,
                                                    })
                                                }
                                                disabled={readonly}
                                                className="h-8 text-right tabular-nums"
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                                            {formatMoney(t.total, currency)}
                                        </td>
                                        {!readonly && (
                                            <td className="px-2 py-2 align-top">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-muted-foreground hover:text-rose-600"
                                                    aria-label="Устгах"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Totals */}
            {items.length > 0 && (
                <div className="border-t bg-muted/20 px-4 py-3">
                    <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                        <Row label="Дэд дүн" value={formatMoney(totals.subtotal, currency)} />
                        {totals.totalDiscount > 0 && (
                            <Row
                                label="Хөнгөлөлт"
                                value={`− ${formatMoney(totals.totalDiscount, currency)}`}
                                className="text-emerald-700"
                            />
                        )}
                        {totals.totalTax > 0 && (
                            <Row label="Татвар" value={formatMoney(totals.totalTax, currency)} />
                        )}
                        <div className="pt-1.5 mt-1.5 border-t">
                            <Row
                                label="Нийт"
                                value={formatMoney(totals.total, currency)}
                                bold
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Row({
    label,
    value,
    bold,
    className,
}: {
    label: string;
    value: string;
    bold?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('flex items-center justify-between gap-4', className)}>
            <span
                className={cn('text-muted-foreground', bold && 'text-foreground font-semibold text-base')}
            >
                {label}
            </span>
            <span
                className={cn(
                    'tabular-nums',
                    bold && 'text-foreground font-bold text-base',
                )}
            >
                {value}
            </span>
        </div>
    );
}
