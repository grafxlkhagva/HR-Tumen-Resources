'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Search, Info } from 'lucide-react';
import { INSURANCE_TYPES } from '@/data/insurance-types';

export default function InsuranceTypesSettingsPage() {
  const [search, setSearch] = React.useState('');
  
  const filteredTypes = React.useMemo(() => {
    if (!search) return INSURANCE_TYPES;
    const searchLower = search.toLowerCase();
    return INSURANCE_TYPES.filter(
      type => type.code.includes(search) || type.name.toLowerCase().includes(searchLower)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">НДШТ лавлах сан</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Нийгмийн даатгалын шимтгэл төлөлтийн тайланд бүртгэх даатгуулагчийн төрлийн код
        </p>
      </div>

      <Card className="shadow-premium border-slate-200/60">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Даатгуулагчийн төрлийн код</CardTitle>
                <CardDescription>Ажил олгогчийн нийгмийн даатгалын шимтгэл төлөлтийн тайланд бүртгэх</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-bold">
              {INSURANCE_TYPES.length} төрөл
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Код эсвэл нэрээр хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Table */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[550px]">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                  <TableRow>
                    <TableHead className="w-[100px] font-bold">Код</TableHead>
                    <TableHead className="font-bold">Даатгуулагчийн төрөл</TableHead>
                    <TableHead className="w-[100px] font-bold text-center">Шимтгэл тооцох суурь</TableHead>
                    <TableHead className="w-[120px] font-bold text-right">Нийт НДШ %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((type, index) => (
                    <TableRow key={type.code} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell className="font-mono font-bold text-blue-600">{type.code}</TableCell>
                      <TableCell className="text-sm">{type.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={type.basis === 'ЦХТАО' ? 'default' : 'secondary'} className="text-[10px]">
                          {type.basis}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{type.total}</TableCell>
                    </TableRow>
                  ))}
                  {filteredTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Илэрц олдсонгүй
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          
          {/* Legend */}
          <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Товчилсон үгийн тайлбар:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <p><strong>ЦХТАО</strong> - Цалин хөлс, түүнтэй адилтгах орлого</p>
                <p><strong>ХХДХ</strong> - Хөдөлмөрийн хөлсний доод хэмжээ</p>
                <p><strong>НДШ</strong> - Нийгмийн даатгалын шимтгэл</p>
                <p><strong>НДЕХ</strong> - Нийгмийн даатгалын ерөнхий хууль</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
