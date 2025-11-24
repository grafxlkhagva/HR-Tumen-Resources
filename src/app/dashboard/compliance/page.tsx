'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import {
  suggestComplianceUpdates,
  type SuggestComplianceUpdatesOutput,
} from '@/ai/flows/suggest-compliance-updates';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompliancePage() {
  const [documentText, setDocumentText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] =
    React.useState<SuggestComplianceUpdatesOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleScan = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await suggestComplianceUpdates({ documentText });
      setResult(response);
    } catch (e) {
      setError('An error occurred while scanning the document.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compliance AI Tool</CardTitle>
            <CardDescription>
              Paste your employment document text below to scan for compliance
              updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your employee handbook, contract, or policy text here..."
              className="min-h-[400px] text-sm"
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              disabled={isLoading}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleScan} disabled={isLoading || !documentText}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Scan Document
            </Button>
          </CardFooter>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
             <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle>Compliance Suggestions</CardTitle>
             </div>
            <CardDescription>
              AI-powered recommendations will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                 <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex h-full items-center justify-center">
                <p className="text-destructive">{error}</p>
              </div>
            )}
            {!isLoading && !result && !error && (
                 <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full border bg-muted p-4">
                        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                        Your analysis results will be displayed here.
                    </p>
                </div>
            )}
            {result && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p>{result.suggestions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
