'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { Building2, Users, Briefcase, FileSpreadsheet, LifeBuoy, Package, Truck } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from '@/components/ui/command';
import type { Company, Contact, Deal, Quote, Ticket, Product, Carrier } from '../_types';

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * ⌘K глобал хайлт — компани / харилцагч / deal / үнийн санал / тикетийг нэг дороос.
 * Клиент талд аль хэдийн ачаалагдсан collection-уудаас шүүнэ (нэмэлт унших зардалгүй).
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter();
    const { firestore } = useFirebase();

    // Зөвхөн диалог нээгдсэн үед л collection-уудыг сонсоно.
    const companiesRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_companies') : null),
        [firestore, open],
    );
    const contactsRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_contacts') : null),
        [firestore, open],
    );
    const dealsRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_deals') : null),
        [firestore, open],
    );
    const quotesRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_quotes') : null),
        [firestore, open],
    );
    const ticketsRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_tickets') : null),
        [firestore, open],
    );

    const { data: companies } = useCollection<Company>(companiesRef);
    const { data: contacts } = useCollection<Contact>(contactsRef);
    const { data: deals } = useCollection<Deal>(dealsRef);
    const productsRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_products') : null),
        [firestore, open],
    );
    const carriersRef = useMemoFirebase(
        () => (firestore && open ? collection(firestore, 'crm_carriers') : null),
        [firestore, open],
    );

    const { data: quotes } = useCollection<Quote>(quotesRef);
    const { data: tickets } = useCollection<Ticket>(ticketsRef);
    const { data: products } = useCollection<Product>(productsRef);
    const { data: carriers } = useCollection<Carrier>(carriersRef);

    const go = React.useCallback(
        (href: string) => {
            onOpenChange(false);
            router.push(href);
        },
        [onOpenChange, router],
    );

    const contactName = (c: Contact) =>
        [c.lastName, c.firstName].filter(Boolean).join(' ') || c.email || 'Нэргүй харилцагч';

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput placeholder="Компани, харилцагч, deal, үнийн санал, тикет хайх..." />
            <CommandList>
                <CommandEmpty>Илэрц олдсонгүй.</CommandEmpty>

                {companies && companies.length > 0 && (
                    <CommandGroup heading="Компаниуд">
                        {companies.slice(0, 60).map((c) => (
                            <CommandItem
                                key={c.id}
                                value={`company ${c.name} ${c.registerNo ?? ''} ${c.kam ?? ''}`}
                                onSelect={() => go(`/crm/companies/${c.id}`)}
                            >
                                <Building2 className="mr-2 h-4 w-4 text-cyan-600" />
                                <span className="truncate">{c.name}</span>
                                {c.kam && (
                                    <span className="ml-auto text-[11px] text-muted-foreground">{c.kam}</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {contacts && contacts.length > 0 && (
                    <CommandGroup heading="Харилцагчид">
                        {contacts.slice(0, 60).map((c) => (
                            <CommandItem
                                key={c.id}
                                value={`contact ${contactName(c)} ${c.email ?? ''} ${c.phone ?? ''}`}
                                onSelect={() => go(`/crm/contacts/${c.id}`)}
                            >
                                <Users className="mr-2 h-4 w-4 text-indigo-600" />
                                <span className="truncate">{contactName(c)}</span>
                                {c.jobTitle && (
                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                        {c.jobTitle}
                                    </span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {deals && deals.length > 0 && (
                    <CommandGroup heading="Deal">
                        {deals.slice(0, 60).map((d) => (
                            <CommandItem
                                key={d.id}
                                value={`deal ${d.name} ${d.kam ?? ''} ${d.direction ?? ''}`}
                                onSelect={() => go(`/crm/deals/${d.id}`)}
                            >
                                <Briefcase className="mr-2 h-4 w-4 text-amber-600" />
                                <span className="truncate">{d.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {quotes && quotes.length > 0 && (
                    <CommandGroup heading="Үнийн санал">
                        {quotes.slice(0, 60).map((q) => (
                            <CommandItem
                                key={q.id}
                                value={`quote ${q.number ?? ''} ${q.title}`}
                                onSelect={() => go(`/crm/quotes/${q.id}`)}
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                <span className="truncate">
                                    {q.number ? `${q.number} · ` : ''}
                                    {q.title}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {tickets && tickets.length > 0 && (
                    <CommandGroup heading="Гомдол/Дэмжлэг">
                        {tickets.slice(0, 60).map((t) => (
                            <CommandItem
                                key={t.id}
                                value={`ticket ${t.subject}`}
                                onSelect={() => go(`/crm/tickets/${t.id}`)}
                            >
                                <LifeBuoy className="mr-2 h-4 w-4 text-rose-600" />
                                <span className="truncate">{t.subject}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {products && products.length > 0 && (
                    <CommandGroup heading="Бараа/Үйлчилгээ">
                        {products.slice(0, 40).map((p) => (
                            <CommandItem
                                key={p.id}
                                value={`product ${p.name} ${p.sku ?? ''} ${p.category ?? ''}`}
                                onSelect={() => go(`/crm/products/${p.id}`)}
                            >
                                <Package className="mr-2 h-4 w-4 text-violet-600" />
                                <span className="truncate">{p.name}</span>
                                {p.sku && (
                                    <span className="ml-auto text-[11px] text-muted-foreground">{p.sku}</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {carriers && carriers.length > 0 && (
                    <CommandGroup heading="Тээвэрчин">
                        {carriers.slice(0, 40).map((c) => (
                            <CommandItem
                                key={c.id}
                                value={`carrier ${c.name} ${c.trailer ?? ''} ${c.phone ?? ''}`}
                                onSelect={() => go(`/crm/carriers/${c.id}`)}
                            >
                                <Truck className="mr-2 h-4 w-4 text-sky-600" />
                                <span className="truncate">{c.name}</span>
                                {c.trailer && (
                                    <span className="ml-auto text-[11px] text-muted-foreground">{c.trailer}</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
